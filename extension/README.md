# Privacy Maker - Chrome Extension (MVP)

Redacts personal data from the ChatGPT/Claude/Copilot compose box before you
send it - detection runs locally via `@doccloak/core` (the same engine as
the [main web app](../src)), nothing is uploaded. This is a fully separate
npm project from the repo root; building or running it never touches the
root app's `dist/`, `vite.config.ts` or tests.

## Architecture

```
content script (chatgpt.com / claude.ai / copilot.microsoft.com)
   -> background service worker (relay + offscreen-document lifecycle)
   -> offscreen document (holds the ONNX/WASM engine; MV3 service workers
      are ephemeral and can't keep a model session alive themselves)
```

See `manifest.config.ts` for the permission set and CSP, and
`src/shared/messaging.ts` for the request/response protocol between the
three contexts.

## Develop

```bash
cd extension
npm install
npm run dev
```

Then in `chrome://extensions`: enable Developer mode -> "Load unpacked" ->
select `extension/dist` (created by `npm run dev` or `npm run build`).

## Before it's store-ready

1. **Real icons.** Replace the placeholders noted in
   `public/icons/README.md` with actual 16/48/128px PNGs.
2. **Test on all three sites.** `src/content/sites.ts` selectors
   (`#prompt-textarea`, `.ProseMirror`, `#userInput`) are current as of
   writing this scaffold but these sites change their DOM without notice -
   verify against the live sites before shipping, and expect to maintain
   this list over time (this is the one part of the extension without a
   server-side fallback, by design - see the open question in
   `../NORTH_STAR.md`).
3. **De-anonymize the AI's reply** is out of scope for this MVP (each
   redact call uses a fresh `AnonymizationSession`, see the comment in
   `src/offscreen/offscreen.ts`). Needed before shipping the full
   round-trip promise ("paste the reply back to restore names"); until
   then, ship this as "redact my prompt" only, not full round-trip privacy.

## Chrome Web Store submission checklist

Privacy Maker's extension has no separate infra needs beyond what's already
true for the web app: it's free, AGPL-3.0, and processes everything
locally, so most of the "paid extension" plumbing (Polar checkout,
entitlement worker, physical-address requirement) does **not** apply unless
the extension/integration layer becomes a paid add-on later (see
`../NORTH_STAR.md`'s "Extensie/integratielaag" funding idea - not decided,
not built here).

What's actually needed to publish:

- [ ] Chrome Web Store developer account ($5 one-time fee), 2-step
      verification enabled on the Google account.
- [ ] Manifest V3 - already the case here (`manifest_version: 3`).
- [ ] `extension/dist` zipped with `manifest.json` at the zip root
      (`npm run build` then zip the `dist/` folder's contents, not the
      folder itself).
- [ ] Store listing: name, short + full description, category (Productivity
      or Privacy & Security), **at least one screenshot** (1280x800 or
      640x400 recommended, max 5), 128x128 icon.
- [ ] Single-purpose description + per-permission justification, e.g.:
      - **Purpose:** Detect and redact personal data (names, emails, etc.)
        in the user's own prompt before it is sent to an AI chat site.
      - **storage:** Required to save the user's detection settings
        (provider, threshold) and cache the local model between sessions.
      - **offscreen:** Required to run the local ONNX/WASM detection model
        in a persistent context, since the background service worker is
        terminated after short idle periods.
      - **host_permissions (chatgpt.com / claude.ai / copilot.microsoft.com
        content script matches):** Required to add the redact button to
        the compose box on these specific sites only - no other site is
        accessed, and no `<all_urls>` permission is requested.
- [ ] Privacy policy page (can be short, and honestly strong here): *"Text
      you redact is processed entirely on your device. Nothing is
      uploaded to Privacy Maker's servers or any third party - there are
      no servers involved in detection."* Must match what the code
      actually does (it does, by construction: no `fetch` calls in this
      extension send document text anywhere - the only network calls are
      the one-time ONNX model/tokenizer downloads on first use).
- [ ] Support/website URL (the existing Privacy Maker site/README works).
- [ ] No "contains paid functionality" declaration needed for this MVP
      (nothing is gated). Revisit this checklist if/when a Pro tier ships.
- [ ] Submit as Public/Unlisted/Private - all three go through the same
      policy review; broad permissions trigger manual review, which this
      extension avoids by design (no `<all_urls>`, no `tabs`, no `scripting`).
