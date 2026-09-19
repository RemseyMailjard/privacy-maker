/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

// Versions baked in at build time so the footer can never drift from what
// was actually bundled. Core's version matters independently: it determines
// detection behavior, which is what bug reports need.
const appVersion = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version as string
const coreVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, 'node_modules/@doccloak/core/package.json'), 'utf8'),
).version as string
// The AGPL-3.0 license requires that anyone using this app over the network
// can get the exact source it's running. package.json's version isn't bumped
// on every commit, so the footer links to this commit hash instead - it can
// never point at source that doesn't match what's deployed.
const commitHash = (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Privacy Maker',
        short_name: 'Privacy Maker',
        description: 'Make documents safe before using AI. Open-source, browser-only PII redactor.',
        theme_color: '#111111',
        background_color: '#F9F9F7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell (JS/CSS/HTML) is precached on install. The ONNX
        // runtime WASM and Tesseract OCR assets are large (11-22 MB) and
        // only ever needed after the user opts into the model download or
        // uploads an image, so they're cached at runtime instead (below) -
        // precaching them would make first install far heavier than the
        // model consent flow already asks the user to accept.
        globPatterns: ['**/*.{js,css,html}'],
        globIgnores: ['ort-wasm-simd-threaded*', 'tesseract/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.(?:wasm|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'privacy-maker-ort-runtime',
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: /\/tesseract\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'privacy-maker-ocr-runtime',
              expiration: { maxEntries: 30 },
            },
          },
          {
            urlPattern: /\/fonts\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'privacy-maker-fonts',
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __CORE_VERSION__: JSON.stringify(coreVersion),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
