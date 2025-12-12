# SecureAI Framework - Security + Interception

A TypeScript framework for overriding and intercepting features in popular browser-based web applications - "meta.ai", "openrouter.ai", "grok.com". This framework provides a modular, configurable system for intercepting prompts, blocking analytics, hiding UI elements, and modifying responses. It can be used as an extension or directly as a console script.

### As a Browser Extension

1. Build the project: `npm run build` - after installing modules with `npm install`
2. Load the extension in Chrome/Edge:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory
3. Check on sites - meta.ai, openrouter.ai, grok.com (analytics blocking)
