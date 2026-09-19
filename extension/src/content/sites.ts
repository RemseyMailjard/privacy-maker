/**
 * Per-site compose-box selectors. This is the one part of the extension
 * that inherently needs maintenance as ChatGPT/Claude/Copilot change their
 * DOM - by design there is no server-side coordination for this (see
 * NORTH_STAR.md's open question on this exact tradeoff): it's a static,
 * client-side list, so the zero-server promise holds, at the cost of
 * needing an extension update whenever a site's markup changes.
 */

export interface SiteConfig {
  hostname: string;
  /** CSS selector for the compose element (textarea or contenteditable div). */
  composeSelector: string;
}

export const SITE_CONFIGS: SiteConfig[] = [
  { hostname: 'chatgpt.com', composeSelector: '#prompt-textarea' },
  { hostname: 'claude.ai', composeSelector: 'div[contenteditable="true"].ProseMirror' },
  { hostname: 'copilot.microsoft.com', composeSelector: 'textarea#userInput' },
];

export function getSiteConfig(hostname: string): SiteConfig | undefined {
  return SITE_CONFIGS.find((s) => hostname === s.hostname || hostname.endsWith(`.${s.hostname}`));
}

export function readComposeText(el: Element): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  return el.textContent ?? '';
}

export function writeComposeText(el: Element, text: string): void {
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // contenteditable (ChatGPT/Claude): replace content and fire an input
  // event so the site's own React/ProseMirror state picks up the change -
  // just setting textContent leaves their internal editor state stale.
  el.textContent = text;
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
