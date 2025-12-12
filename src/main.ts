/**
 * Main entry point for the SecureAI framework
 * This script can be injected into web pages or run as a browser extension
 */

import { SecureAIFramework } from '../packages/adapters/src';
import { loadConfig, findMatchingConfig } from '../packages/adapters/src';
import type { AppConfig } from '../packages/core/src';

// Default configuration paths
const CONFIG_PATHS = [
  '/configs/meta.json',
  '/configs/openrouter.json',
  '/configs/grok.json',
];

/**
 * Initialize the framework with a specific config
 */
export function initializeFramework(config: AppConfig, enableLogging: boolean = false): SecureAIFramework {
  (window as any).__SecureAI_installed = true;
  const framework = new SecureAIFramework({
    config,
    enableLogging,
  });
  
  framework.activate();

  return framework;
}

/**
 * Auto-initialize framework by loading configs
 */
export async function autoInitialize(enableLogging: boolean = false): Promise<SecureAIFramework | null> {
  try {
    // Try to load configs from multiple paths
    //for (const configPath of CONFIG_PATHS) {
      try {
        let matchingConfig;
        const el = document.getElementById("SecureAI-config");
        if (el && el.textContent) {
          matchingConfig = JSON.parse(el.textContent).apps[0];
        }
        
        
        if (matchingConfig) {
          if (enableLogging) {
            console.log('[SecureAI] Found matching config:', matchingConfig.name);
          }
          if (!(window as any).__SecureAI_installed) return initializeFramework(matchingConfig, enableLogging);
        }
      } catch (error) {
        // Continue to next config path
        if (enableLogging) {
          console.debug('[SecureAI] Failed to load config from:', error);
        }
      }
    //}
    
    return null;
  } catch (error) {
    console.error('[SecureAI] Failed to auto-initialize:', error);
    return null;
  }
}


// Auto-initialize when script loads (if in browser context)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoInitialize(true);
    });
  } else {
    autoInitialize(true);
  }
}

