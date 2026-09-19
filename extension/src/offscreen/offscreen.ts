/**
 * Offscreen document bootstrap - the extension's twin of the web app's
 * src/detection.worker.ts, except the engine runs directly on this page's
 * own thread instead of inside a nested Worker: an offscreen document has
 * no UI to keep responsive, so there is nothing to protect from blocking,
 * and skipping the extra postMessage hop keeps this file simple.
 *
 * Owns the one long-lived DocCloakEngine instance for the whole extension.
 * Created on demand by the background service worker and torn down by it
 * once idle (see background/service-worker.ts).
 */

import { createEngine, AnonymizationSession } from '@doccloak/core';
import { createExtensionCoreEnv } from './engine-env.extension.ts';
import type {
  OffscreenRelay,
  ModelDownloadProgress,
  ModelStatus,
  RedactResult,
  ErrorResult,
} from '../shared/messaging.ts';

const engine = createEngine(createExtensionCoreEnv());

let modelLoaded = false;
let modelLoading = false;

engine.onDownloadProgress(({ loaded, total }) => {
  const progress: ModelDownloadProgress = { type: 'MODEL_DOWNLOAD_PROGRESS', downloaded: loaded, total };
  // Best-effort: nobody may be listening (popup closed) - that's fine, the
  // next MODEL_STATUS_REQUEST poll will report the eventual loaded state.
  chrome.runtime.sendMessage(progress).catch(() => { /* no listener open */ });
});

async function handleRedact(text: string): Promise<RedactResult> {
  await engine.ready;
  if (!modelLoaded) {
    modelLoading = true;
    await engine.preload();
    modelLoaded = true;
    modelLoading = false;
  }
  const entities = await engine.detect(text);
  // MVP scope: a fresh session per request, so the redacted text is
  // reversible only within this one call. Restoring the AI's reply (mapping
  // persisted per compose box / conversation) is a follow-up, not needed
  // for "redact before you send" to be useful on its own.
  const session = new AnonymizationSession();
  const redactedText = session.anonymizeText(text, entities);
  return { redactedText, entityCount: entities.length };
}

async function handleModelStatus(): Promise<ModelStatus> {
  return { loaded: modelLoaded, loading: modelLoading };
}

async function handleModelDownload(): Promise<ModelStatus> {
  if (!modelLoaded && !modelLoading) {
    modelLoading = true;
    await engine.ready;
    await engine.preload();
    modelLoaded = true;
    modelLoading = false;
  }
  return { loaded: modelLoaded, loading: modelLoading };
}

chrome.runtime.onMessage.addListener((message: OffscreenRelay, _sender, sendResponse) => {
  if (message.type !== 'OFFSCREEN_RELAY') return false;

  const respond = (result: RedactResult | ModelStatus | ErrorResult) => sendResponse(result);
  const fail = (err: unknown) => respond({ error: err instanceof Error ? err.message : String(err) });

  switch (message.payload.type) {
    case 'REDACT_REQUEST':
      handleRedact(message.payload.text).then(respond, fail);
      return true; // keep the message channel open for the async response
    case 'MODEL_STATUS_REQUEST':
      handleModelStatus().then(respond, fail);
      return true;
    case 'MODEL_DOWNLOAD_REQUEST':
      handleModelDownload().then(respond, fail);
      return true;
    default:
      return false;
  }
});
