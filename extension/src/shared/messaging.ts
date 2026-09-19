/**
 * Message protocol between the three extension contexts:
 *
 *   content script --chrome.runtime.sendMessage--> background --chrome.runtime.sendMessage--> offscreen document
 *
 * Each hop is a plain request/response pair: chrome.runtime.sendMessage()
 * returns a promise that resolves with whatever the receiving end's
 * onMessage listener passes to sendResponse(), so no manual request-id
 * bookkeeping is needed - one sendMessage call is already one RPC call.
 * The background service worker is a dumb relay: it owns the offscreen
 * document's lifecycle (create-on-demand, since MV3 service workers are
 * ephemeral and can't hold a long-lived WASM session themselves) and
 * forwards each request from a tab to the offscreen document, which is
 * where @doccloak/core actually runs.
 */

export interface RedactRequest {
  type: 'REDACT_REQUEST';
  text: string;
}

export interface RedactResult {
  redactedText: string;
  entityCount: number;
}

export interface ModelStatusRequest {
  type: 'MODEL_STATUS_REQUEST';
}

export interface ModelStatus {
  loaded: boolean;
  loading: boolean;
}

export interface ModelDownloadRequest {
  type: 'MODEL_DOWNLOAD_REQUEST';
}

/** Fire-and-forget progress ticks, sent from offscreen to background to popup. */
export interface ModelDownloadProgress {
  type: 'MODEL_DOWNLOAD_PROGRESS';
  downloaded: number;
  total: number;
}

export type ExtensionRequest = RedactRequest | ModelStatusRequest | ModelDownloadRequest;

/**
 * Background wraps every content/popup request in this before forwarding it
 * to the offscreen document. Only the offscreen document's listener matches
 * on this type, so the background's own relay call never gets picked back
 * up by its own onMessage listener (which matches on the bare
 * ExtensionRequest types coming from tabs/popup) - that self-receipt would
 * otherwise double-create the offscreen document and double-relay.
 */
export interface OffscreenRelay {
  type: 'OFFSCREEN_RELAY';
  payload: ExtensionRequest;
}

export interface ErrorResult {
  error: string;
}

export function isErrorResult(value: unknown): value is ErrorResult {
  return typeof value === 'object' && value !== null && 'error' in value;
}
