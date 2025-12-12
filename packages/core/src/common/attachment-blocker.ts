/**
 * Attachment button blocker
 */

import type { AttachmentBlocker } from './types';

export class AttachmentBlockerImpl implements AttachmentBlocker {
  private selectors: string[];
  private hiddenElements: Set<HTMLElement> = new Set();
  private observer: MutationObserver | null = null;
  private enableLogging: boolean;

  constructor(selectors: string | string[], enableLogging: boolean = false) {
    this.selectors = Array.isArray(selectors) ? selectors : [selectors];
    this.enableLogging = enableLogging;
  }

  /**
   * Hide attachment buttons
   */
  hide(): void {
    const waitForAttachmentButton = () => {
      const attachmentButton = document.querySelector(
        this.selectors[0] as string
      ) as HTMLElement | null;
  
  
      if (!attachmentButton) {
        // Retry every 200ms until React renders it
        return setTimeout(waitForAttachmentButton, 200);
      }

      const originalDisplay = attachmentButton.style.display;
      attachmentButton.style.display = 'none';
      attachmentButton.setAttribute('data-SecureAI-original-display', originalDisplay);
      this.hiddenElements.add(attachmentButton);
    }

    waitForAttachmentButton();

  }

  /**
   * Observe DOM changes and hide new attachment buttons
   */
  observe(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    setTimeout(() => {
      this.observer = new MutationObserver(() => {
        this.hide();
      });
  
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 3000);
  }

  /**
   * Cleanup observer
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Restore original display values
    this.hiddenElements.forEach(element => {
      const originalDisplay = element.getAttribute('data-SecureAI-original-display');
      if (originalDisplay !== null) {
        element.style.display = originalDisplay;
      } else {
        element.style.display = '';
      }
    });
    
    this.hiddenElements.clear();
  }
}

