import { useEffect, useState } from 'react';
import type { ModelStatus, RedactResult, ErrorResult } from '../shared/messaging.ts';
import { isErrorResult } from '../shared/messaging.ts';

/**
 * Minimal popup: model download/status and a manual paste-box fallback for
 * sites without a content-script integration yet. Deliberately not a port
 * of the full web app's settings UI (src/ui/components/*) - those are
 * wired to the web app's own AnonymizerSessionCore/hooks; the popup talks
 * to the engine only through the background/offscreen message protocol.
 */
export function Popup() {
  const [status, setStatus] = useState<ModelStatus>({ loaded: false, loading: false });
  const [progress, setProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'MODEL_STATUS_REQUEST' }).then((s: ModelStatus) => setStatus(s));

    const listener = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        (message as { type: unknown }).type === 'MODEL_DOWNLOAD_PROGRESS'
      ) {
        const { downloaded, total } = message as unknown as { downloaded: number; total: number };
        setProgress({ downloaded, total });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const downloadModel = async () => {
    setStatus((s) => ({ ...s, loading: true }));
    const result = (await chrome.runtime.sendMessage({ type: 'MODEL_DOWNLOAD_REQUEST' })) as ModelStatus;
    setStatus(result);
    setProgress(null);
  };

  const runRedact = async () => {
    setBusy(true);
    try {
      const result = (await chrome.runtime.sendMessage({ type: 'REDACT_REQUEST', text: input })) as
        | RedactResult
        | ErrorResult;
      setOutput(isErrorResult(result) ? `Fout: ${result.error}` : result.redactedText);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 15, margin: '0 0 8px' }}>Privacy Maker</h1>
      <p style={{ fontSize: 12, color: '#555', margin: '0 0 12px' }}>
        Detectie draait volledig lokaal in deze browser. Er wordt niets geupload.
      </p>

      {!status.loaded && (
        <button onClick={downloadModel} disabled={status.loading} style={{ width: '100%', marginBottom: 12 }}>
          {status.loading
            ? progress
              ? `Downloaden... ${Math.round((progress.downloaded / progress.total) * 100)}%`
              : 'Model laden...'
            : 'Detectiemodel downloaden'}
        </button>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Plak hier tekst om te testen..."
        rows={4}
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
      />
      <button onClick={runRedact} disabled={busy || !status.loaded || !input.trim()} style={{ width: '100%' }}>
        {busy ? 'Bezig...' : 'Redigeer'}
      </button>

      {output && (
        <textarea
          value={output}
          readOnly
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 8 }}
        />
      )}
    </div>
  );
}
