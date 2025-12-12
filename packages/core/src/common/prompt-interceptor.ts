/**
 * Prompt interceptor for capturing and modifying user input
 */

import type { CapturedPrompt, PromptInterceptor } from './types';
import { StorageManager } from './storage';

export class PromptInterceptorImpl implements PromptInterceptor {
  private storage: StorageManager;
  private modificationPattern: string;
  private replacementText: string;
  private enableLogging: boolean;
  private appName: string;
  private selectors: {
    promptInput?: string;
    submitBtn?: string;
  };

  constructor(
    storage: StorageManager,
    modificationPattern: string = 'modify me',
    replacementText: string = 'modified',
    enableLogging: boolean = false,
    appName: string,
    selectors: {
      promptInput?: string;
      submitBtn?: string;
    }
  ) {
    this.storage = storage;
    this.modificationPattern = modificationPattern;
    this.replacementText = replacementText;
    this.enableLogging = enableLogging;
    this.appName = appName;
    this.selectors = selectors;

    if (this.appName === "OpenRouter") this.initializePromptListener();
  }

  /**
   * Capture user input and conversation ID
   */
  capture(input: string, conversationId?: string): void {
    if (this.enableLogging) {
      console.log('[SecureAI] Captured prompt:', { input, conversationId });
    }
  }

  /**
   * Modify prompt text if it matches the pattern
   */
  modify(input: string): string {
    if (input.includes(this.modificationPattern)) {
      const modified = input.replace(
        new RegExp(this.modificationPattern, 'gi'),
        this.replacementText
      );
      if (this.enableLogging) {
        console.log('[SecureAI] Modified prompt:', { original: input, modified });
      }
      return modified;
    }
    return input;
  }

  /**
   * Record captured prompt to storage
   */
  record(prompt: CapturedPrompt): void {
    this.storage.recordPrompt(prompt);
    if (this.enableLogging) {
      console.log('[SecureAI] Recorded prompt:', prompt);
    }
  }

  /**
   * Process and record a prompt
   */
  process(input: string, conversationId?: string): string {
    this.capture(input, conversationId);
    const modified = this.modify(input);
    
    const prompt: CapturedPrompt = {
      text: modified,
      conversationId,
      timestamp: Date.now(),
      url: window.location.href,
    };
    
    this.record(prompt);
    
    return modified;
  }

  initializePromptListener(): void {
    const waitForTextarea = () => {
      const input = document.querySelector(
        this.selectors.promptInput as string
      ) as HTMLTextAreaElement | null;
  
      const submitBtn = document
      .querySelector(
        this.selectors.submitBtn as string
      )
      ?.closest("button");
  
      if (!input || !submitBtn) {
        // Retry every 200ms until React renders it
        return setTimeout(waitForTextarea, 200);
      }
  
      // Grab the native value setter from the prototype
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
  
      if (!valueSetter) {
        console.warn("Could not get native value setter");
        return;
      }
  
      const setNativeValue = (el: HTMLTextAreaElement, value: string) => {
        valueSetter!.call(el, value);
      };
  
      // Shared logic: modify prompt, record it, and push it into React state
      const handleSubmit = () => {
        const original = input.value;
        const modified = this.modify(original);
        const url = window.location.href;
        const conversationId = url.split("room=")[1];
  
        this.record({
          text: modified,
          conversationId,
          timestamp: Date.now(),
          url,
        });
  
        // Update via native setter so React sees it as a real change
        setNativeValue(input, modified);
  
        // Tell React that the value changed
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
  
      // 1) Enter key path
      input.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            // Stop the built-in submit/newline behavior
            e.stopImmediatePropagation();
            e.preventDefault();
  
            // Modify + record prompt
            handleSubmit();
  
            // Programmatically click the send button so React still does its normal flow
            setTimeout(() => {
              submitBtn.dispatchEvent(
                new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                })
              );
            }, 0);
          }
        },
        true // capture so we run before React's own handler
      );
  
      // 2) Explicit click path
      submitBtn.addEventListener(
        "click",
        (e: MouseEvent) => {
          // Ignore synthetic clicks created by our own code above
          if (!e.isTrusted) return;
  
          // User clicked the button: modify + record prompt *before* React reads it
          handleSubmit();
        },
        true // capture so we run before React's onClick
      );
  
      
    };
  
    waitForTextarea();
  }
  
  
  

  /**
   * Initialization to fetch prompt directly from prompt element
   */
  /*
  initializePromptListener(): void {
    const waitForTextarea = () => {
      const input: any = document.querySelector(
        this.selectors.promptInput as string
      );

      const submitBtn: any = document.querySelector(
        this.selectors.submitBtn as string
      );

      if (!input || !submitBtn) {
        // Retry every 200ms until React renders it
        return setTimeout(waitForTextarea, 200);
      }
    
      // Grab the native value setter from the prototype
      const valueSetter: any = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
    
      if (!valueSetter) {
        console.warn("Could not get native value setter");
        return;
      }
    
      function setNativeValue(el: any, value: any) {
        valueSetter.call(el, value);
      }
    
      input.addEventListener(
        "keydown",
        (e: any) => {
          if (e.key === "Enter" && !e.shiftKey) {
            // Stop the built-in submit on Enter
            e.stopImmediatePropagation();
            e.preventDefault();
    
            const original = input.value;
            const modified = this.modify(original);
            const url = window.location.href;

            this.record({
              text: modified,
              conversationId: url.split("room=")[1],
              timestamp: Date.now(),
              url: url,
            });

            // 1) Update via native setter so React sees it as a real change
            setNativeValue(input, modified);
    
            // 2) Tell React about the change
            input.dispatchEvent(new Event("input", { bubbles: true }));
    
            // 3) Click the send button after state is updated
            setTimeout(() => {
              const sendBtn = document
                .querySelector(
                  this.selectors.submitBtn as string
                )
                ?.closest("button");
    
              if (sendBtn) {
                console.log("Found send button, clicking...");
                sendBtn.dispatchEvent(
                  new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  })
                );
              } else {
                console.warn("Send button not found");
              }
            }, 0);
          }
        },
        true // capture so we run before React's own handler
      );
    
      console.log("Textarea interceptor with native setter installed");
    };
    
    waitForTextarea();
  }*/

}

