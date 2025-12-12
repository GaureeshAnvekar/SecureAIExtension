import { ResponseModifierImpl } from "../common/response-modifier";
import { StorageManager } from "../common/storage";


export class FetchInterceptorImpl {
  private responseModifier: ResponseModifierImpl | null;
  private storage: StorageManager;

  constructor(responseModifier: ResponseModifierImpl | null, storage: StorageManager) {
    this.responseModifier = responseModifier;
    this.patchFetch();
    this.storage = storage;
  }

  private patchFetch(): void {
    const origFetch = window.fetch.bind(window);
    const self = this;

    (window as any).fetch = function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      // Get URL as string
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const isOpenRouterStream =
        typeof url === "string" &&
        url.includes("/api/v1/responses");

      if (typeof url === "string" && url.includes("chat?room=")) {
        const conversationId = url.split("chat?room=")[1].split("&")[0];
        self.storage.updatePrompt("SecureAI_captured_prompts", self.storage.getPromptCount() - 1, { conversationId });
      }

      // If not our target URL, just pass through
      if (!isOpenRouterStream) {
        return origFetch(input, init);
      }

      // Intercept the streaming response
      return origFetch(input, init).then((resp) => {
        try {
          // No body => nothing to stream
          if (!resp.body) {
            return resp;
          }

          // Split the stream in two:
          // - appStream goes back to the site (so UI still works)
          // - tapStream is for our side-effect (watching for completion)
          const [appStream, tapStream] = resp.body.tee();

          // Start watching tapStream for completion
          self.watchStreamCompletion(tapStream, url);

          // Return a new Response that uses appStream
          const cloned = new Response(appStream, {
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
          });

          // Preserve .url if needed
          Object.defineProperty(cloned, "url", {
            value: resp.url,
            writable: false,
          });

          return cloned;
        } catch (e) {
          console.warn("[FetchInterceptor] error wiring stream", e);
          return resp;
        }
      });
    };

  }

  private watchStreamCompletion(
    stream: ReadableStream<Uint8Array>,
    url: string
  ) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
  
    // Buffer for partial UTF-8 → text
    let buffer = "";
  
    // Collect only "response.output_text.done" → text
    const collectedTexts: string[] = [];
  
    const processTextChunk = (textChunk: string, isFlush = false) => {
      buffer += textChunk;
  
      // Split by newline – SSE lines
      const lines = buffer.split(/\r?\n/);
  
      // Keep the last partial line if we’re not flushing
      if (!isFlush) {
        buffer = lines.pop() ?? "";
      } else {
        buffer = "";
      }
  
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith(":")) continue;       // comment line
        if (!line.startsWith("data:")) continue;  // only care about data: lines
  
        const dataStr = line.slice(5).trim();      // after "data:"
        if (!dataStr || dataStr === "[DONE]") {
          continue;
        }
  
        try {
          const evt = JSON.parse(dataStr);
  
          // 🔴 Only keep "response.output_text.done"
          if (evt.type === "response.output_text.done") {
            const text: unknown = evt.text;
            if (typeof text === "string" && text.length > 0) {
              collectedTexts.push(text);
            }
          }
        } catch {
          // Not JSON, ignore
        }
      }
    };
  
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
  
          if (done) {
            // Flush any remaining buffered text
            if (buffer.length > 0) {
              processTextChunk("", true);
            }
  
            const fullText = collectedTexts.join("");
  
            this.responseModifier?.record(fullText);
            this.responseModifier?.processResponse();
            break;
          }
  
          if (value) {
            const textChunk = decoder.decode(value, { stream: true });
            processTextChunk(textChunk);
          }
        }
      } catch (err) {
        console.warn("[FetchInterceptor] error while reading tap stream", err);
      } finally {
        reader.releaseLock();
      }
    })();
  }  
}
