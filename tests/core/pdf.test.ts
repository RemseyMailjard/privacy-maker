import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { extractPdfText, isPdfFile } from '../../src/pdf.web.ts';

// jsdom has no real Worker/module-loader setup, so point pdf.js at the
// actual file on disk (a real file:// URL - import.meta.url resolves to
// vitest's http:// transform server, which Node's ESM loader rejects)
// instead of the browser-only "/pdf.worker.min.mjs" path src/pdf.web.ts
// derives from import.meta.env.BASE_URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
).href;

// pdf.js's Node "fake worker" fallback (used here since jsdom has no real
// Worker; a real browser always uses an actual Worker thread instead and
// never hits this path) calls Promise.try, which Node < 23 lacks.
if (typeof (Promise as unknown as { try?: unknown }).try !== 'function') {
  (Promise as unknown as { try: (fn: () => unknown) => Promise<unknown> }).try =
    (fn) => Promise.resolve().then(fn);
}

// jsdom's Blob does not implement arrayBuffer() (unlike every real browser,
// where File/Blob.arrayBuffer() is part of the standard API extractPdfText
// relies on) - wrap the raw bytes so the tests exercise the same code path
// a real upload would.
function blobLike(bytes: Uint8Array, type: string): Blob {
  return {
    arrayBuffer: async () => bytes.buffer as ArrayBuffer,
    type,
    size: bytes.byteLength,
  } as unknown as Blob;
}

async function makeTestPdf(lines: string[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 600]);
  let y = 550;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 14, font });
    y -= 30;
  }
  const bytes = await doc.save();
  return blobLike(bytes, 'application/pdf');
}

describe('isPdfFile', () => {
  it('recognizes .pdf case-insensitively', () => {
    expect(isPdfFile('report.pdf')).toBe(true);
    expect(isPdfFile('report.PDF')).toBe(true);
    expect(isPdfFile('report.docx')).toBe(false);
  });
});

describe('extractPdfText', () => {
  it('extracts text from a generated PDF', async () => {
    const pdf = await makeTestPdf(['Jan Jansen signed the contract.', 'Email: jan@example.com']);
    const { text } = await extractPdfText(pdf);
    expect(text).toContain('Jan Jansen signed the contract.');
    expect(text).toContain('jan@example.com');
  });

  it('produces word entries whose start/end offsets match the extracted text', async () => {
    const pdf = await makeTestPdf(['Hello world']);
    const { text, words } = await extractPdfText(pdf);
    expect(words.length).toBeGreaterThan(0);
    for (const word of words) {
      expect(text.slice(word.start, word.end)).toBe(word.text);
    }
  });

  it('tags every word with a valid page index and a sane bounding box', async () => {
    const pdf = await makeTestPdf(['Page one text']);
    const { words, pageSizes } = await extractPdfText(pdf);
    expect(pageSizes).toHaveLength(1);
    for (const word of words) {
      expect(word.pageIndex).toBe(0);
      expect(word.bbox.x1).toBeGreaterThan(word.bbox.x0);
      expect(word.bbox.y1).toBeGreaterThan(word.bbox.y0);
    }
  });

  it('separates pages so text does not run together', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p1 = doc.addPage([400, 600]);
    p1.drawText('FirstPageWord', { x: 50, y: 550, size: 14, font });
    const p2 = doc.addPage([400, 600]);
    p2.drawText('SecondPageWord', { x: 50, y: 550, size: 14, font });
    const bytes = await doc.save();
    const pdf = blobLike(bytes, 'application/pdf');

    const { text, words, pageSizes } = await extractPdfText(pdf);
    expect(pageSizes).toHaveLength(2);
    expect(text).not.toContain('FirstPageWordSecondPageWord');
    const firstWord = words.find((w) => w.text === 'FirstPageWord');
    const secondWord = words.find((w) => w.text === 'SecondPageWord');
    expect(firstWord?.pageIndex).toBe(0);
    expect(secondWord?.pageIndex).toBe(1);
  });
});
