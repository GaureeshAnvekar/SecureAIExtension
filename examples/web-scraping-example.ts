/**
 * Example: Using the framework with a web scraping tool (Puppeteer/Playwright)
 * This demonstrates the bonus feature requirement
 */

import { SecureAIFramework } from '../packages/adapters/src';
import type { AppConfig } from '../packages/core/src';

/**
 * Example configuration for Meta AI
 */
const metaConfig: AppConfig = {
  name: 'Meta AI',
  urlPattern: /meta\.ai/i,
  selectors: {
    promptInput: 'textarea[placeholder*="Message"], textarea',
    submitButton: 'button[type="submit"], button[aria-label*="Send"]',
    attachmentButton: [
      'button[aria-label*="attach"]',
      'button[aria-label*="Attach"]',
    ],
    conversationId: '[data-conversation-id], [data-id]',
    responseContainer: '[data-testid*="message"], .message',
    responseText: '[data-testid*="message"] p, .message p',
  },
  interceptors: {
    prompt: true,
    attachment: true,
    analytics: false,
    response: true,
  },
};

/**
 * Example: Puppeteer usage
 * 
 * const puppeteer = require('puppeteer');
 * 
 * async function scrapeWithFramework() {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   
 *   // Inject the framework script
 *   await page.addScriptTag({
 *     path: './dist/inject.js'
 *   });
 *   
 *   // Navigate to the target page
 *   await page.goto('https://www.meta.ai/');
 *   
 *   // Wait for framework to initialize
 *   await page.waitForTimeout(2000);
 *   
 *   // Type a prompt
 *   await page.type('textarea', 'This is a test modify me prompt');
 *   
 *   // Submit
 *   await page.click('button[type="submit"]');
 *   
 *   // The framework will automatically:
 *   // 1. Intercept and modify "modify me" to "modified"
 *   // 2. Record the prompt in localStorage
 *   // 3. Hide attachment buttons
 *   // 4. Modify responses to show GUIDs
 *   
 *   // Read captured prompts from localStorage
 *   const prompts = await page.evaluate(() => {
 *     return JSON.parse(localStorage.getItem('SecureAI_captured_prompts') || '[]');
 *   });
 *   
 *   console.log('Captured prompts:', prompts);
 *   
 *   await browser.close();
 * }
 */

/**
 * Example: Playwright usage
 * 
 * const { chromium } = require('playwright');
 * 
 * async function scrapeWithFramework() {
 *   const browser = await chromium.launch();
 *   const page = await browser.newPage();
 *   
 *   // Inject the framework script
 *   await page.addInitScript({
 *     path: './dist/inject.js'
 *   });
 *   
 *   // Navigate to the target page
 *   await page.goto('https://www.meta.ai/');
 *   
 *   // Wait for framework to initialize
 *   await page.waitForTimeout(2000);
 *   
 *   // Type a prompt
 *   await page.fill('textarea', 'This is a test modify me prompt');
 *   
 *   // Submit
 *   await page.click('button[type="submit"]');
 *   
 *   // Read captured prompts
 *   const prompts = await page.evaluate(() => {
 *     return JSON.parse(localStorage.getItem('SecureAI_captured_prompts') || '[]');
 *   });
 *   
 *   console.log('Captured prompts:', prompts);
 *   
 *   await browser.close();
 * }
 */

/**
 * Manual initialization example
 */
export function initializeFrameworkManually() {
  const framework = new SecureAIFramework({
    config: metaConfig,
    enableLogging: true,
  });
  
  framework.activate();
  
  return framework;
}

