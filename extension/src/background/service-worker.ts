/**
 * Background service worker - a thin relay, on purpose.
 *
 * MV3 service workers are killed after ~30s of inactivity, so they cannot
 * hold the ONNX detection session themselves. Its only two jobs:
 *   1. Lazily create/reuse the offscreen document (which CAN hold a
 *      long-lived engine, see offscreen/offscreen.ts) before forwarding a
 *      request to it.
 *   2. Wrap every content-script/popup request in OFFSCREEN_RELAY so the
 *      relayed copy doesn't get picked up by this same switch statement
 *      (see shared/messaging.ts for why that guard exists) and answer the
 *      original sender with whatever the offscreen document returns.
 */

import type { ExtensionRequest, OffscreenRelay, RedactResult, ModelStatus, ErrorResult } from '../shared/messaging.ts';

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (existing.length > 0) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'Runs the local PII-detection model (ONNX/WASM) that needs a persistent DOM context.',
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }
  await creatingOffscreen;
}

async function relay(payload: ExtensionRequest): Promise<RedactResult | ModelStatus | ErrorResult> {
  await ensureOffscreenDocument();
  const relayMessage: OffscreenRelay = { type: 'OFFSCREEN_RELAY', payload };
  return chrome.runtime.sendMessage(relayMessage);
}

chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
  switch (message.type) {
    case 'REDACT_REQUEST':
    case 'MODEL_STATUS_REQUEST':
    case 'MODEL_DOWNLOAD_REQUEST':
      relay(message)
        .then(sendResponse)
        .catch((err: unknown) => sendResponse({ error: err instanceof Error ? err.message : String(err) }));
      return true; // keep the channel open for the async response
    default:
      return false;
  }
});
