/**
 * Copies the ONNX Runtime WASM backend from node_modules into public/ so it
 * is served from the extension's own origin - the offscreen document's CSP
 * only allows 'self' (see manifest.config.ts), and the detection engine
 * needs these files to instantiate the WASM session. Twin of the root
 * app's scripts/copy-assets.mjs, trimmed to what the extension actually
 * uses (no Tesseract/PDF.js here - image/PDF redaction isn't in the MVP).
 *
 * Runs on postinstall. All copied files are gitignored.
 */
import { copyFileSync } from 'fs';

const ORT_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
];
for (const f of ORT_FILES) {
  copyFileSync(`node_modules/onnxruntime-web/dist/${f}`, `public/${f}`);
}

console.log('[copy-assets] ONNX Runtime WASM assets copied to public/');
