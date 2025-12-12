// loader.ts - runs as content script
declare const chrome: any;

(async () => {
  // 1. Derive config name from host
  const host = window.location.host; // e.g. "www.meta.ai" or "openrouter.ai"

  const normalizedHost = host.replace(/^www\./, "");

  const configUrl = chrome.runtime.getURL(`configs/${normalizedHost}.json`);

  let config = null;

  try {
    const res = await fetch(configUrl);
    if (!res.ok) {
      return; // No config → no injection
    }
    config = await res.json();
  } catch (err) {
    console.warn("[SecureAI] Failed to load config:", err);
    return;
  }

  // 2. Expose config to page world
  // --- Inject config as NON-executable JSON script (CSP-safe) ---
  const jsonScript = document.createElement("script");
  jsonScript.type = "application/json";
  jsonScript.id = "SecureAI-config";

  // Overwrite if it already exists (avoid duplicates if content script runs twice)
  const existing = document.getElementById("SecureAI-config");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  jsonScript.textContent = JSON.stringify(config);
  (document.head || document.documentElement).appendChild(jsonScript);

  // 3. Inject bundle.js into page world
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/bundle.js");
  script.async = false;
  (document.documentElement || document.head || document.body).appendChild(script);

})();






/*
// Declare the Chrome extension API global so TypeScript recognizes it.
declare const chrome: any;
const metaConfig = chrome.runtime.getURL("configs/meta.json");
const openrouterConfig = chrome.runtime.getURL("configs/openrouter.json");
const grokConfig = chrome.runtime.getURL("configs/grok.json");

(function injectBundle() {
  const FLAG = "__SecureAI_installed";

  if ((window as any)[FLAG]) return;


  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/bundle.js"); // page-world script
  script.onload = () => script.remove();
  (document.documentElement || document.head).appendChild(script);
  (window as any)[FLAG] = true;
})();

*/