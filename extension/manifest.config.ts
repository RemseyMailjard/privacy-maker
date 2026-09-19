import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

// MV3 manifest. Kept intentionally narrow on permissions: no <all_urls>, no
// "tabs" - only the three compose surfaces this MVP targets, plus the
// storage/offscreen permissions the local detection engine needs. Every
// permission here must have a one-line justification ready for the Chrome
// Web Store review form (see extension/STORE_LISTING.md).
export default defineManifest({
  manifest_version: 3,
  name: 'Privacy Maker',
  short_name: 'Privacy Maker',
  version: pkg.version,
  description: 'Redact personal data from your prompt before it reaches ChatGPT, Claude or Copilot - detection runs locally, nothing is uploaded.',
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'public/icons/icon16.png',
      48: 'public/icons/icon48.png',
      128: 'public/icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://chatgpt.com/*',
        'https://claude.ai/*',
        'https://copilot.microsoft.com/*',
      ],
      js: ['src/content/inject.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'offscreen'],
  // No host_permissions beyond the content_scripts matches above - the
  // content script only ever reads the textarea the user is typing in, and
  // the extension never fetches those pages' data itself.
  content_security_policy: {
    // wasm-unsafe-eval is required by onnxruntime-web to instantiate the
    // detection model's WASM module inside the offscreen document. This
    // CSP applies only to extension_pages (offscreen.html, popup), never to
    // the content script, which runs under the host page's own CSP.
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
});
