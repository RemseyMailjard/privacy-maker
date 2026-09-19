/**
 * Extension CoreEnv for @doccloak/core - the offscreen-document twin of the
 * web app's src/engine-env.web.ts.
 *
 * Only two things differ from the web version:
 *  - KV is backed by chrome.storage.local instead of localStorage (MV3 has
 *    no synchronous storage, and localStorage inside an offscreen document
 *    is a separate, easy-to-lose partition anyway).
 *  - Everything else (Cache Storage for model blobs, fetch, WASM path,
 *    @huggingface/transformers tokenizer loading, hardware hints) works
 *    identically because the offscreen document is a real DOM page with
 *    the same web platform APIs as the main app - that's the whole reason
 *    to run the engine there instead of in the background service worker.
 */

import type { BlobCache, CoreEnv, HardwareHints, KVStore } from '@doccloak/core';
import { AutoTokenizer, env as hfEnv } from '@huggingface/transformers';

// Keep in sync with src/engine-env.web.ts and documentation/model-provenance.md.
const TOKENIZER_REVISIONS: Record<string, string> = {
  'knowledgator/gliner-pii-edge-v1.0': '9b7f39b0a2da971a5beea78d35f1539d4009c891',
  'bardsai/eu-pii-anonimization-multilang': '0e72e19f030ed4e661b1673e549af8e0dd176386',
};

const MODEL_CACHE_NAME = 'doccloak-models';

function chromeStorageKV(): KVStore {
  return {
    async get(key: string): Promise<string | null> {
      const result = await chrome.storage.local.get(key);
      return (result[key] as string | undefined) ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      await chrome.storage.local.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await chrome.storage.local.remove(key);
    },
  };
}

async function openModelCache(): Promise<Cache | null> {
  try {
    return await caches.open(MODEL_CACHE_NAME);
  } catch {
    return null;
  }
}

function cacheStorageBlobCache(): BlobCache {
  return {
    async match(url: string): Promise<Blob | undefined> {
      const cache = await openModelCache();
      if (!cache) return undefined;
      const cached = await cache.match(url);
      return cached ? await cached.blob() : undefined;
    },
    async put(url: string, blob: Blob): Promise<boolean> {
      const cache = await openModelCache();
      if (!cache) return false;
      await cache.put(url, new Response(blob));
      return true;
    },
    async delete(url: string): Promise<void> {
      const cache = await openModelCache();
      await cache?.delete(url);
    },
  };
}

function extensionHardwareHints(): HardwareHints {
  const hints: HardwareHints = {};
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    // No mobile Chrome extensions today, so unlike the web app there's no
    // userAgent-based mobile branch here - desktop always gets the
    // high-accuracy default provider.
    if (typeof nav.deviceMemory === 'number') hints.deviceMemoryGB = nav.deviceMemory;
  } catch { /* ignore - assume unconstrained */ }
  return hints;
}

export function createExtensionCoreEnv(): CoreEnv {
  return {
    kv: chromeStorageKV(),
    modelCache: cacheStorageBlobCache(),
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
    // chrome.runtime.getURL('') gives the extension's own origin root,
    // the offscreen-document equivalent of the web app's BASE_URL.
    wasm: { paths: chrome.runtime.getURL(''), numThreads: 1 },
    async loadTokenizer(hfModelId: string): Promise<unknown> {
      hfEnv.allowLocalModels = false;
      hfEnv.allowRemoteModels = true;
      const revision = TOKENIZER_REVISIONS[hfModelId];
      if (!revision) {
        throw new Error(`No pinned tokenizer revision for ${hfModelId} - add it to TOKENIZER_REVISIONS`);
      }
      return AutoTokenizer.from_pretrained(hfModelId, { revision });
    },
    hardware: extensionHardwareHints(),
    persistStorage: async () => (await navigator.storage?.persist?.()) ?? false,
  };
}
