/**
 * Content script: finds the host site's compose box and adds a "Redigeer"
 * button next to it. All it does is read the box's text, hand it to the
 * background/offscreen pipeline for local detection, and write the
 * redacted text back - no page data is read or sent anywhere else, and
 * nothing here touches the ONNX/WASM engine directly (that stays inside
 * the offscreen document; see ../offscreen/offscreen.ts).
 */

import type { RedactResult, ErrorResult } from '../shared/messaging.ts';
import { getSiteConfig, readComposeText, writeComposeText } from './sites.ts';
import { isErrorResult } from '../shared/messaging.ts';

const BUTTON_ID = 'privacy-maker-redact-button';

function createButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Redigeer met Privacy Maker';
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    zIndex: '2147483647',
    padding: '8px 14px',
    borderRadius: '9999px',
    border: 'none',
    background: '#111111',
    color: '#F9F9F7',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  } satisfies Partial<CSSStyleDeclaration>);
  return button;
}

async function redact(text: string): Promise<RedactResult> {
  const response = (await chrome.runtime.sendMessage({ type: 'REDACT_REQUEST', text })) as
    | RedactResult
    | ErrorResult;
  if (isErrorResult(response)) throw new Error(response.error);
  return response;
}

function mount(composeEl: Element): void {
  if (document.getElementById(BUTTON_ID)) return;

  const button = createButton();
  button.addEventListener('click', () => {
    void (async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Bezig...';
      try {
        const text = readComposeText(composeEl);
        const { redactedText, entityCount } = await redact(text);
        writeComposeText(composeEl, redactedText);
        button.textContent = entityCount > 0 ? `${entityCount} verwijderd` : 'Niets gevonden';
      } catch (err) {
        console.error('[Privacy Maker]', err);
        button.textContent = 'Mislukt';
      } finally {
        setTimeout(() => {
          button.disabled = false;
          button.textContent = original;
        }, 1500);
      }
    })();
  });

  document.body.appendChild(button);
}

function tryMount(): void {
  const site = getSiteConfig(location.hostname);
  if (!site) return;
  const composeEl = document.querySelector(site.composeSelector);
  if (composeEl) mount(composeEl);
}

// Compose boxes on these sites are client-side-rendered and can appear/
// disappear (route changes, first paint) well after document_idle, so poll
// via a MutationObserver instead of a single query on load.
tryMount();
new MutationObserver(tryMount).observe(document.body, { childList: true, subtree: true });
