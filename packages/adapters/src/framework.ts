/**
 * Main framework class that orchestrates all interceptors
 */

import type { AppConfig, FrameworkOptions } from '../../core/src';
import {
  StorageManager,
  PromptInterceptorImpl,
  AttachmentBlockerImpl,
  ResponseModifierImpl,
  GraphQLInterceptorImpl,
  FetchInterceptorImpl,
} from '../../core/src';

export class SecureAIFramework {
  private config: AppConfig;
  private storage: StorageManager;
  private graphQLInterceptor: GraphQLInterceptorImpl | null = null;
  private fetchInterceptor: FetchInterceptorImpl | null = null;
  private promptInterceptor: PromptInterceptorImpl | null = null;
  private attachmentBlocker: AttachmentBlockerImpl | null = null;
  private responseModifier: ResponseModifierImpl | null = null;
  private enableLogging: boolean;
  private isActive: boolean = false;

  constructor(options: FrameworkOptions) {
    this.config = options.config;
    this.storage = new StorageManager(options.storageKey);
    this.enableLogging = options.enableLogging ?? false;
  }

  /**
   * Initialize and activate the framework
   */
  activate(): void {
    if (this.isActive) {
      if (this.enableLogging) {
        console.warn('[SecureAI] Framework already active');
      }
      return;
    }

    // Check if current URL matches the app config
    const urlMatch = this.matchesUrl();
    if (!urlMatch) {
      if (this.enableLogging) {
        console.log('[SecureAI] URL does not match config, skipping activation');
      }
      return;
    }

    this.isActive = true;

    // Initialize prompt interceptor
    if (this.config.interceptors.prompt) {
      //this.initializePromptInterceptor();
      if (this.config.interceptors.apiMode === "graphql") {
        this.initializeGraphQLInterceptor();
      } else if (this.config.interceptors.apiMode === "fetch") {
        this.initializeFetchInterceptor();
      }
    }

    // Initialize attachment blocker
    if (this.config.interceptors.attachment) {
      this.initializeAttachmentBlocker();
    }

    // Initialize response modifier (bonus feature)
    if (this.config.interceptors.response) {
     // this.initializeResponseModifier();
    }

    if (this.enableLogging) {
      console.log('[SecureAI] Framework activated for:', this.config.name);
    }
  }

  /**
   * Deactivate the framework
   */
  deactivate(): void {
    if (!this.isActive) {
      return;
    }

    if (this.attachmentBlocker) {
      //this.attachmentBlocker.destroy();
      this.attachmentBlocker = null;
    }



    this.isActive = false;

    if (this.enableLogging) {
      console.log('[SecureAI] Framework deactivated');
    }
  }

  /**
   * Check if current URL matches the app config
   */
  private matchesUrl(): boolean {
    const currentUrl = window.location.href;
    const pattern = this.config.urlPattern;

    if (typeof pattern === 'string') {
      return currentUrl.includes(pattern);
    } else if (pattern instanceof RegExp) {
      return pattern.test(currentUrl);
    }

    return false;
  }



  /**
   * Initialize graphql interceptor
   */
  private initializeGraphQLInterceptor(): void {
    if (this.config.interceptors.prompt) {
        const selectors = {
          promptInput: this.config.selectors.promptInput,
          submitBtn: this.config.selectors.submitButton,
        };
        this.promptInterceptor = new PromptInterceptorImpl(
          this.storage,
          'modify me',
          'modified',
          this.enableLogging,
          this.config.name,
          selectors,
        );
    }

    if (this.config.interceptors.response) {
      const selectors = {
        container: this.config.selectors.responseContainer,
        text: this.config.selectors.responseText,
      };

      this.responseModifier = new ResponseModifierImpl(selectors, this.enableLogging, this.storage, this.config.name);
    }

    this.graphQLInterceptor = new GraphQLInterceptorImpl(this.promptInterceptor, this.responseModifier);
  }


  private initializeFetchInterceptor(): void {
    if (this.config.interceptors.prompt) {
      const selectors = {
        promptInput: this.config.selectors.promptInput,
        submitBtn: this.config.selectors.submitButton,
      };

      this.promptInterceptor = new PromptInterceptorImpl(this.storage, 'modify me', 'modified', this.enableLogging, this.config.name, selectors);
    }

    if (this.config.interceptors.response) {
      const selectors = {
        container: this.config.selectors.responseContainer,
        text: this.config.selectors.responseText,
      };

      this.responseModifier = new ResponseModifierImpl(selectors, this.enableLogging, this.storage, this.config.name);
    }
    this.fetchInterceptor = new FetchInterceptorImpl(this.responseModifier, this.storage);
  }

  /**
   * Initialize prompt interceptor
   */
  private initializePromptInterceptor(): void {
    if (!this.config.selectors.promptInput || !this.config.selectors.submitButton) {
      if (this.enableLogging) {
        console.warn('[SecureAI] Prompt interceptor selectors not configured');
      }
      return;
    }



    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupPromptInterception();
      });
    } else {
      this.setupPromptInterception();
    }
  }

  /**
   * Setup prompt interception handlers
   */
  private setupPromptInterception(): void {
    const inputSelector = this.config.selectors.promptInput!;
    const submitSelector = this.config.selectors.submitButton!;
    const conversationIdSelector = this.config.selectors.conversationId;
    let setupComplete = false;

    const interceptSubmission = () => {
      let input: HTMLElement | null | undefined= document.querySelector<HTMLElement>(inputSelector);
      let innerSpan = input?.querySelector<HTMLElement>('span[data-lexical-text="true"]');
      if (!input) {
        return;
      }

      const isFormInput = (input as HTMLInputElement | HTMLTextAreaElement).value !== undefined;
      const originalValue = isFormInput
        ? (input as HTMLInputElement | HTMLTextAreaElement).value
        : (input.textContent ?? '');
      const conversationId = conversationIdSelector
        ? this.getElementText(conversationIdSelector)
        : undefined;

      // Process the prompt
      const modifiedValue = this.promptInterceptor!.process(originalValue, conversationId);

      // Update the input value if it was modified
      if (modifiedValue !== originalValue) {
        if (isFormInput) {
          // Standard input/textarea
          (input as HTMLInputElement | HTMLTextAreaElement).value = modifiedValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Contenteditable / text container
          innerSpan!.textContent = modifiedValue;
          input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      }
    };

    const setupListeners = () => {
      if (setupComplete) {
        return;
      }

      // Intercept form submissions
      const submitButton = document.querySelector(submitSelector);
      if (submitButton) {
      submitButton.addEventListener('click', (_e: Event) => {
        interceptSubmission();
      }, true); // Use capture phase to intercept early
        setupComplete = true;
      }

      // Intercept Enter key in input / contenteditable
      const input = document.querySelector<HTMLElement>(inputSelector);
      
      if (input) {
        
        // After defining interceptSubmission and knowing inputSelector / submitSelector:
        window.addEventListener(
          'keydown',
          (e: Event) => {
            const keyEvent = e as KeyboardEvent;
            const target = e.target as HTMLElement | null;

            if (!target) return;
            if (keyEvent.key !== 'Enter' || keyEvent.shiftKey) return;

            // Only intercept when typing in our prompt input
            if (!target.matches(inputSelector) && !target.closest(inputSelector)) return;

            // 1) Modify the value *before* anything else sees this event
            interceptSubmission();

            // 2) Stop the original Enter from reaching other handlers
            keyEvent.stopImmediatePropagation();
            keyEvent.preventDefault();

            // 3) Trigger the site's normal submit path (click the send button)
            const submitButton = document.querySelector<HTMLElement>(submitSelector);
            if (submitButton) {
              submitButton.click();
            }
          },
          true // capture: runs before bubble-phase handlers
        );


        /*input.addEventListener('keydown', (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            interceptSubmission();
          }
        }, true);*/
        setupComplete = true;
      }
    };

    // Try initial setup
    setupListeners();

    /*
    // Use MutationObserver to handle dynamically added elements
    const observer = new MutationObserver(() => {
      setupListeners();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });*/
  }

  /**
   * Initialize attachment blocker
   */
  private initializeAttachmentBlocker(): void {
    const selectors = this.config.selectors.attachmentButton;
    if (!selectors) {
      if (this.enableLogging) {
        console.warn('[SecureAI] Attachment blocker selectors not configured');
      }
      return;
    }

    this.attachmentBlocker = new AttachmentBlockerImpl(selectors, this.enableLogging);
    this.attachmentBlocker.hide();
    this.attachmentBlocker.observe();
  }


  /**
   * Initialize response modifier
   */
  private initializeResponseModifier(): void {
    const selectors = {
      container: this.config.selectors.responseContainer,
      text: this.config.selectors.responseText,
    };

    if (!selectors.container && !selectors.text) {
      if (this.enableLogging) {
        console.warn('[SecureAI] Response modifier selectors not configured');
      }
      return;
    }

    //this.responseModifier = new ResponseModifierImpl(selectors, this.enableLogging);
  }

  /**
   * Get text content from element
   */
  private getElementText(selector: string): string | undefined {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() || undefined;
  }

  /**
   * Get storage manager (for external access)
   */
  getStorage(): StorageManager {
    return this.storage;
  }
}

