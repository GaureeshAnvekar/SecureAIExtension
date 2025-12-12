// augment XMLHttpRequest so we can safely store metadata on it
import {
    PromptInterceptorImpl,
    ResponseModifierImpl,
  } from '../../../core/src';


declare global {
    interface XMLHttpRequest {
      __myUrl?: string;
      __patchedBody?: string;
    }
  }
  
  export class GraphQLInterceptorImpl {
    private promptInterceptor: PromptInterceptorImpl | null;
    private responseModifier: ResponseModifierImpl | null;
    // Add this at class level if you want to accumulate full messages per bot_request_id
    private messageBuffers = new Map<string, string>();

    constructor( promptInterceptor: PromptInterceptorImpl | null, responseModifier: ResponseModifierImpl | null) {
      this.promptInterceptor = promptInterceptor;
      this.responseModifier = responseModifier;
      this.patchXHR();
    }
  
    private patchXHR(): void {
      const self = this;
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
  
      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string,
        ...rest: any[]
      ): any {
        // "this" is the XHR instance
        this.__myUrl = url;
        return (origOpen as any).call(this, method, url, ...rest);
      };
  
      XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null
      ): any {
        // "this" is still the native XHR instance
        self.handleSend(this, body, self);
  
        // Intercept response
        this.addEventListener("readystatechange", () => {
          if (this.readyState === 4) {
            self.handleResponse(this);
          }
        });
  
        return origSend.call(this, body as any);
      };
    }
  
    private handleSend(
      xhr: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
      graphQLInterceptorInstance?: GraphQLInterceptorImpl
    ): void {
      // xhr = real XMLHttpRequest instance
      // body = request body (string/FormData/URLSearchParams/Blob/etc.)
  
      if (!xhr.__myUrl || !xhr.__myUrl.includes("graph.meta.ai/graphql")) return;
  

      try {
        if (
          typeof xhr.__myUrl === "string" &&
          xhr.__myUrl.startsWith("https://graph.meta.ai/graphql")
        ) {

  
          // ---- Case A: FormData ----
          if (body instanceof FormData) {
            const varsStr: any = body.get("variables");
            if (varsStr) {
              try {
                const vars = JSON.parse(varsStr);
  
                const msg = vars?.message || vars?.messages;
                if (msg && msg.sensitive_string_value) {
                  const original = msg.sensitive_string_value;
                  const conversationId = vars.externalConversationId || "";
  
                  //const modified = original.replace(/modify me/g, "modified");
                  const modified = graphQLInterceptorInstance?.promptInterceptor!.process(original, conversationId);
                  msg.sensitive_string_value = modified;

  
                  // write back
                  vars.message = msg;
                  body.set("variables", JSON.stringify(vars));
                }
              } catch (e) {
                console.warn("[XHR patch] Failed to parse FormData vars", e);
              }
            }
          }
  
          // ---- Case B: URLSearchParams or string ----
          else {
            let params = null;
  
            if (body instanceof URLSearchParams) {
              params = body;
            } else if (typeof body === "string") {
              params = new URLSearchParams(body);
            }
  
            if (params) {
              const varsStr = params.get("variables");
              if (varsStr) {
                try {
                  const vars = JSON.parse(varsStr);
  
                  const msg = vars?.message || vars?.messages;
                  if (msg && msg.sensitive_string_value) {
                    const original = msg.sensitive_string_value;
  
                    const modified = original.replace(/modify me/g, "modified");
                    msg.sensitive_string_value = modified;
  
                    vars.message = msg;
                    params.set("variables", JSON.stringify(vars));
  
                    // If original was string, serialize back to string
                    if (typeof body === "string") {
                      body = params.toString();
                    } else {
                      // body was URLSearchParams – just reuse it
                      body = params;
                    }
                  }
                } catch (e) {
                  console.warn("[XHR patch] Failed to parse vars JSON", e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("[XHR patch] error in patched send", e);
      }


    }
  

    private handleResponse(xhr: XMLHttpRequest): void {
      try {
        // Only care about Meta AI GraphQL
        if (!xhr.__myUrl || !xhr.__myUrl.includes("graph.meta.ai/graphql")) return;

        const raw = xhr.responseText;
        if (!raw) return;

        // Meta uses NDJSON-style streaming: multiple JSON objects separated by newlines
        const lines = raw
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0);

        for (const line of lines) {
          let json: any;
          try {
            json = JSON.parse(line);
          } catch {
            // Some lines might be non-JSON, ignore them
            continue;
          }

          // We only care about the send-message stream label/path
          const path = json.path as any[] | undefined;
          if (!path || path[0] !== "xfb_silverstone_send_message") {
            continue;
          }

          // Your sample structure: json.data.node.bot_response_message
          const node = json.data?.node;
          if (!node) continue;

          const brm = node.bot_response_message;
          if (!brm) continue;

          const botRequestId: string = brm.bot_request_id || brm.id || "unknown";

          const agentSteps = brm.content?.agent_steps ?? [];
          let chunkText = "";

          for (const step of agentSteps) {
            const blocks = step?.composed_text?.content ?? [];
            for (const block of blocks) {
              const t = block?.text;
              if (typeof t === "string" && t.length > 0) {
                chunkText += t;
              }
            }
          }

          if (chunkText) {

            // Accumulate full message per bot_request_id
            const prev = this.messageBuffers.get(botRequestId) || "";
            this.messageBuffers.set(botRequestId, chunkText);
          }

          // When extensions.is_final is true, the stream is done
          const isFinal = json.extensions?.is_final === true;
          if (isFinal) {
            const full = this.messageBuffers.get(botRequestId) || "";

            if (this.responseModifier) {
              this.responseModifier.record(full);
              this.responseModifier.processResponse();
            }

            // TODO: here you can:
            // - swap the DOM text for a GUID
            // - store in localStorage, etc.

            this.messageBuffers.delete(botRequestId);
          }
        }
      } catch (err) {
        console.warn("Failed to parse response", err);
      }
    }

    
  }
  