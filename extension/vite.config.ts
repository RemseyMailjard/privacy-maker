import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import manifest from './manifest.config';

// Fully separate build from the root app's vite.config.ts: own plugins, own
// output directory (extension/dist), own module graph. Running `npm run
// build` at the repo root never touches this, and running the build in here
// never touches the root dist/.
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // onnxruntime-web ships its own WASM/worker loading that assumes it can
  // be pre-bundled like a normal dep - same exclusion the root app makes
  // for @huggingface/transformers, needed here for the same reason.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        offscreen: path.resolve(__dirname, 'src/offscreen/offscreen.html'),
      },
    },
  },
});
