/**
 * Configuration loader for app-specific configs
 */

import type { AppConfig } from '../../core/src';

export interface ConfigFile {
  apps: AppConfig[];
}

/**
 * Load configuration from JSON
 */
export async function loadConfig(configPath: string): Promise<AppConfig[]> {
  try {
    // Try fetch first (works in browser and some Node.js environments)
    if (typeof fetch !== 'undefined') {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      const config: ConfigFile = await response.json();
      return config.apps;
    }
    
    // Fallback for Node.js environments (would require fs module)
    throw new Error('fetch is not available and no fallback implemented');
  } catch (error) {
    console.error('[SecureAI] Failed to load config:', error);
    throw error;
  }
}

/**
 * Find matching config for current URL
 */
export function findMatchingConfig(configs: AppConfig[]): AppConfig | null {
  const currentUrl = window.location.href;

  for (const config of configs) {
    const pattern = config.urlPattern;
    let matches = false;

    if (typeof pattern === 'string') {
      matches = currentUrl.includes(pattern);
    } else if (pattern instanceof RegExp) {
      matches = pattern.test(currentUrl);
    }

    if (matches) {
      return config;
    }
  }

  return null;
}

