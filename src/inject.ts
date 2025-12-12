/**
 * Injection script for browser extension or content script
 * This file is meant to be bundled and injected into web pages
 */

import { autoInitialize } from './main';

// Initialize framework when script loads
autoInitialize(true).catch((error) => {
  console.error('[SecureAI] Failed to initialize framework:', error);
});

