/**
 * LLM response modifier (Bonus feature)
 */

import type { ResponseModifier } from './types';
import { StorageManager } from './storage';

export class ResponseModifierImpl implements ResponseModifier {
  private selectors: {
    container?: string;
    text?: string;
  };
  private observer: MutationObserver | null = null;
  private processedElements: WeakSet<HTMLElement> = new WeakSet();
  private enableLogging: boolean;
  private storage: StorageManager;
  private appName: string;

  constructor(
    selectors: { container?: string; text?: string },
    enableLogging: boolean = false,
    storage: StorageManager,
    appName: string
  ) {
    this.selectors = selectors;
    this.enableLogging = enableLogging;
    this.storage = storage;
    this.appName = appName;
  }

  /**
   * Generate a random GUID
   */
  private generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Process a single element
   */
  public processResponse(): void {

    const divs = document.querySelectorAll(this.selectors.text as string);

    let last;
    if (this.appName === 'OpenRouter') last = divs[divs.length - 1];
    else last = divs[divs.length - 2];
    
    // Delay by 1 animation frame so React finishes its last commit
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        last.textContent = this.generateGUID();
      });
    });

  }


  /**
   * Record captured response to storage
   */
  record(response: string | null): void {
    this.storage.recordResponse(response);
    if (this.enableLogging) {
      console.log('[SecureAI] Recorded prompt:', prompt);
    }
  }  
}

