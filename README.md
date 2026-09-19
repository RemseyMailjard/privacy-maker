<p align="center">
  <img src="docs/logo.png" alt="Privacy Maker Logo" width="150">
</p>

<h1 align="center">Privacy Maker</h1>

<p align="center"><strong>Make documents safe before using AI.</strong></p>

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Privacy Maker detects and replaces sensitive information locally before documents are shared with AI services such as ChatGPT, Claude, Copilot or Gemini - and restores the original values in the AI's response.

Document content stays on the user's device during anonymization. Everything runs in your browser. No server, no API calls, no data leaves your machine.

## Who Is This For?

- **Lawyers & legal teams** - redact client names from contracts before asking AI to review clauses
- **Consultants** - anonymize company data in reports before generating AI summaries
- **Healthcare professionals** - strip patient identifiers from notes before using AI for research
- **HR departments** - remove employee PII from documents before AI-assisted policy drafting
- **Anyone** who uses AI tools but handles sensitive data they can't afford to leak

## How It Works

1. **Paste** your document or **upload** a `.doc`/`.docx` file or an image (`.png`, `.jpg`) - image text is extracted locally with OCR
2. **Make AI-safe** - Privacy Maker detects names, emails, phone numbers, addresses, and other PII using a local ML model + regex patterns
3. **Copy** the anonymized text and paste it into any AI service (ChatGPT, Claude, Gemini, etc.) - or **download** the redacted document
4. **Restore** - paste the AI's response back into Privacy Maker to replace placeholders with the original names

The AI never sees the real data. You get the full power of AI assistance without the privacy risk.

## Features

- **Runs locally** - ML models run in-browser via ONNX Runtime WebAssembly. Verify: open DevTools → Network tab → zero requests during anonymization
- **Typed placeholders** - replacements like `[PERSON_1]`, `[EMAIL_1]`, `[DATE_2]` tell the AI what kind of thing was redacted, so its answers stay coherent (pronouns, date reasoning, formatting) and the protected text stays readable
- **14 entity types** - persons, emails, phones, SSNs, credit cards, dates, currencies, IP addresses, IBANs, addresses, companies, secrets, API keys, and custom labels
- **Secrets and credential detection** - API keys (AWS, GitHub, Slack, OpenAI, Anthropic, Google), private key blocks, JWTs, connection strings, and high-entropy tokens are caught before they reach the AI
- **Document support** - upload `.doc` and `.docx` files, redact PII, and download the protected file with all formatting preserved
- **Image support (OCR)** - upload or paste an image or screenshot (`.png`, `.jpg`, `.webp`, `.bmp`, `.gif`); text is extracted locally with Tesseract WebAssembly, run through the same PII detection, and you can download a redacted copy of the image with the sensitive words blacked out
- **Multiple detection models** - choose between GLiNER PII Edge (~65 MB, multi-language, custom labels) and BardS.ai EU PII (~279 MB, 24 EU languages, 35 entity types). Switch models from settings without reloading. Phones and other low-memory devices default to the lightweight GLiNER model
- **Consent-first setup** - nothing downloads until you accept the one-time setup; the model recommended for your device is preselected, and later visits load straight from the browser cache
- **Resilient model downloads** - interrupted downloads resume where they left off (HTTP Range), transient network errors are retried with backoff, and a Try again button appears if the download ultimately fails
- **Verified model downloads** - model files are checked against pinned SHA-256 hashes and tokenizers are pinned to exact upstream revisions, so a tampered or corrupted download is rejected instead of loaded
- **Hybrid detection** - ML model + 175+ regex rules for structured patterns across 19 regions (AT, BE, CH, CN, DE, DK, ES, FI, FR, GB, IE, IT, JP, NL, NO, PL, PT, SE, US)
- **Entity propagation** - when a name or company is detected once, Privacy Maker automatically finds all other occurrences throughout the document, and different mentions of the same person ("John Smith", "John", "Smith") share one placeholder
- **Round-trip de-anonymization (restore)** - paste the AI's response back in and Privacy Maker restores the original names automatically
- **Forgiving restore** - if the AI reformats a placeholder (`**[PERSON_1]**`, `[person_1]`, `PERSON_1`), restore still recognizes it; anything ambiguous is left untouched rather than guessed at
- **Editable labels** - rename any placeholder (e.g., `[PERSON_3]` → `[CLIENT_NAME]`) for clearer AI prompts
- **Custom detection labels** - add your own entity types (e.g., `medical condition`, `job title`) to detect domain-specific information
- **Manual tagging** - select any text and assign an entity type for things the model missed
- **Custom dictionary** - add words or phrases that must always be redacted (project codenames, company names); every occurrence in the text is caught, with optional case-sensitive matching, and the list persists in your browser
- **Configurable sensitivity** - adjust the confidence threshold to control the precision/recall trade-off
- **8 European languages** - English, Polish, German, French, Spanish, Portuguese, Swedish, Norwegian
- **Replacement styles** - labeled placeholders (`[PERSON_1]`, reversible) or blanked out (`________`, permanent)

## Getting Started

```bash
# Clone the repository
git clone <this-repository-url>
cd privacy-maker

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

The output in `dist/` is a static SPA that can be deployed to any static hosting provider (Vercel, Cloudflare Pages, Netlify, etc.) or served locally.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| PII Engine | [@doccloak/core](https://www.npmjs.com/package/@doccloak/core) (Apache-2.0, [source](https://github.com/WLojek/DocCloak.Core)) |
| ML Runtime | ONNX Runtime WebAssembly |
| NER Models | [GLiNER PII Edge v1.0](https://huggingface.co/knowledgator/gliner-pii-edge-v1.0) (~65 MB) / [BardS.ai EU PII](https://huggingface.co/bardsai/eu-pii-anonimization-multilang) (~279 MB) |
| Tokenizers | [@huggingface/transformers](https://huggingface.co/docs/transformers.js) v3 (loaded from HuggingFace Hub) |
| Testing | Vitest |

## Why It's Safe

Privacy Maker doesn't ask you to trust a server, a company, or a privacy policy. It's built so you don't have to trust anyone.

- **Your data never leaves the browser.** There is no backend. No API. No server to get hacked. The ML model and all regex rules run entirely in your browser using WebAssembly. You can verify this yourself: open DevTools → Network tab → paste a document → zero requests.
- **Your documents are never stored.** Document text, detected entities and placeholder mappings live in memory only. Close the tab and they are gone. localStorage keeps only your settings: model choice and download consent, interface language, regex options, plus any custom detection labels and dictionary words you add. Everything stays on your device and is never sent anywhere; clear your browser's site data to remove it.
- **No tracking, no analytics, no telemetry.** Privacy Maker doesn't know who you are, what you paste, or how often you use it.
- **Minimal external requests.** The only external network activity is loading the ML model and tokenizer from HuggingFace on first use - and only after you accept the one-time setup; nothing downloads without asking. The OCR engine and its language data are served from the app's own origin (no third-party CDN), fetched only when you first use image OCR. No Google Fonts, no third-party scripts, no telemetry. No data you paste or upload ever leaves your browser - OCR runs entirely locally.
- **Verified downloads.** Model files are verified against SHA-256 hashes pinned in the engine, and tokenizers are pinned to exact upstream revisions. If a download does not match, it is discarded and never loaded.
- **Open source and auditable.** Every line of code is public and licensed under AGPL-3.0 - even if someone else hosts it, they must publish their source code too.
- **Works offline after first load.** Once the model is cached, you can disconnect from the internet and Privacy Maker keeps working - anonymization runs entirely in WebAssembly.

### Model caching and offline use

After a model is downloaded for the first time, Privacy Maker stores it in the browser's [Cache Storage](https://developer.mozilla.org/en-US/docs/Web/API/Cache). On subsequent visits the model loads from local storage instead of re-downloading from HuggingFace, so you can use Privacy Maker fully offline.

Caching is **best-effort**. If your browser refuses to cache the model - for example because the per-origin storage quota is exceeded, you're using an Incognito/Private window with restricted quota, or the model file is larger than the browser allows for a single Cache entry - Privacy Maker still loads the model into memory and works normally for the current session. The next visit will simply re-download it instead of using the cache.

The BardS.ai EU PII model (~279 MB) is most likely to hit quota limits, especially in Incognito mode. GLiNER PII Edge (~65 MB) caches reliably almost everywhere. To force a re-download (e.g. after a model update), open DevTools → Application → Cache Storage and delete the model cache entry.

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Type-check + production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

## Development

Privacy Maker is a fork of the open-source [DocCloak](https://github.com/WLojek/DocCloak) project, rebranded as the first step toward its own product identity. The current release intentionally keeps DocCloak's architecture, UI structure and detection engine unchanged - only user-facing branding (name, copy, favicon/logo) has been updated. No new features, backend, or platform migrations have been introduced at this stage.

Contributions are welcome for UI, translations, and app-level fixes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and ensure tests pass (`npm test`)
4. Submit a pull request

## Attribution & License

Privacy Maker is built on top of **[DocCloak](https://github.com/WLojek/DocCloak)** by Witold Łojek, licensed under [AGPL-3.0](LICENSE). This repository is a fork/rebrand of that project and remains licensed under AGPL-3.0 - the full license text and copyright notices are preserved in [LICENSE](LICENSE).

The PII detection engine that Privacy Maker depends on, [@doccloak/core](https://github.com/WLojek/DocCloak.Core) (published to npm as `@doccloak/core`), is a separate project licensed under Apache-2.0 and has not been modified or renamed.

Because Privacy Maker is a derivative of an AGPL-3.0 licensed application, anyone who hosts a modified version of it (including over a network) must also make their source code available under AGPL-3.0.
