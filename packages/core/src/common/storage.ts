/**
 * LocalStorage manager for recording captured prompts
 */

import type { CapturedPrompt } from './types';

const DEFAULT_STORAGE_KEY_PROMPTS = 'SecureAI_captured_prompts';
const DEFAULT_STORAGE_KEY_RESPONSES = 'SecureAI_captured_responses';
const MAX_STORED_PROMPTS = 1000;

export class StorageManager {
  private storageKeyPrompts: string;
  private storageKeyResponses: string;

  constructor(storageKeyPrompts: string = DEFAULT_STORAGE_KEY_PROMPTS, storageKeyResponses: string = DEFAULT_STORAGE_KEY_RESPONSES) {
    this.storageKeyPrompts = storageKeyPrompts;
    this.storageKeyResponses = storageKeyResponses;
  }

  /**
   * Record a captured prompt to localStorage
   */
  recordPrompt(prompt: CapturedPrompt): void {
    try {
      const existing = this.getAllPrompts();
      existing.push(prompt);
      
      // Keep only the most recent prompts
      const trimmed = existing.slice(-MAX_STORED_PROMPTS);
      
      localStorage.setItem(this.storageKeyPrompts, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SecureAI] Failed to record prompt:', error);
    }
  }


  /**
   * Record a captured response to localStorage
   */
  recordResponse(response: string | null): void {
    try {
      const existing = this.getAllResponses();
      existing.push(response as string);
      
      // Keep only the most recent prompts
      const trimmed = existing.slice(-MAX_STORED_PROMPTS);
      
      localStorage.setItem(this.storageKeyResponses, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SecureAI] Failed to record prompt:', error);
    }
  }  

  /**
   * Get all recorded prompts
   */
  getAllPrompts(): CapturedPrompt[] {
    try {
      const data = localStorage.getItem(this.storageKeyPrompts);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[SecureAI] Failed to read prompts:', error);
      return [];
    }
  }

  /**
   * Get all recorded responses
   */
  getAllResponses(): string[] {
    try {
      const data = localStorage.getItem(this.storageKeyResponses);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[SecureAI] Failed to read responses:', error);
      return [];
    }
  }

  /**
   * Clear all recorded prompts
   */
  clearPrompts(): void {
    try {
      localStorage.removeItem(this.storageKeyPrompts);
    } catch (error) {
      console.error('[SecureAI] Failed to clear prompts:', error);
    }
  }

  /**
   * Get prompts count
   */
  getPromptCount(): number {
    return this.getAllPrompts().length;
  }

  /**
   * Update a prompt
   */
  updatePrompt(key: string, idx: number, newPrompt: any): void {
    const existing = this.getAllPrompts();
    existing[idx] = {...existing[idx], ...newPrompt};
    localStorage.setItem(this.storageKeyPrompts, JSON.stringify(existing));
  }
}

