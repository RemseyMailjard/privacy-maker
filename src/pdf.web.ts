/**
 * PDF support: extract text (with per-item bounding boxes) so it flows
 * through the regular PII detection pipeline, and render a redacted copy
 * of the PDF with detected entities blacked out.
 *
 * Uses pdf.js for parsing/rendering (runs in its own worker; the PDF never
 * leaves the browser) and pdf-lib to assemble the redacted output from
 * per-page raster images - the simplest reliable way to guarantee redacted
 * text cannot be recovered by selecting "invisible" text underneath a box,
 * which a vector-based approach would risk.
 *
 * Bounding boxes are computed per pdf.js text item (usually a run of
 * several words, not a single word) rather than per word: pdf.js does not
 * expose per-character glyph widths from getTextContent(), so splitting an
 * item into words would require guessing sub-widths. Redacting the whole
 * item when any part of it overlaps a detected entity is coarser but never
 * under-redacts, consistent with the "over-redaction is safer" approach
 * already used for OCR image redaction in @doccloak/core/dom.
 *
 * Only axis-aligned (non-rotated) text is positioned precisely; rotated
 * text (rare in typical office/legal documents) still gets a bounding box,
 * but it may be imprecise since skew is ignored.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { renderRedactedImage } from '@doccloak/core/dom';
import type { OcrWord } from '@doccloak/core/dom';
import type { DetectedEntity } from '@doccloak/core';

/** Render scale for both text-position math and the redacted page raster. */
const RENDER_SCALE = 2;
/** Safety margin (px) added around each computed box so a slightly
 *  under-measured item still gets fully covered. */
const BOX_MARGIN = 2;

function configureWorker() {
  // Idempotent on pdf.js's own option (not a local flag) so a host/test
  // that has already pointed the worker elsewhere is left alone.
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) return;
  const base = import.meta.env.BASE_URL;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
}

export function isPdfFile(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

interface PdfWord extends OcrWord {
  pageIndex: number;
}

export interface PdfExtraction {
  text: string;
  words: PdfWord[];
  pageSizes: { width: number; height: number }[];
}

/**
 * Extract text from every page (as one document with pages joined by a
 * blank line) plus a bounding box for every pdf.js text item, in the pixel
 * space of a page rendered at RENDER_SCALE.
 */
export async function extractPdfText(file: Blob): Promise<PdfExtraction> {
  configureWorker();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = '';
  const words: PdfWord[] = [];
  const pageSizes: { width: number; height: number }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    pageSizes.push({ width: viewport.width, height: viewport.height });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      const str = item.str;
      const start = text.length;
      text += str;
      const end = text.length;

      // Combine the item's text-space transform with the viewport transform
      // to get its position/size in the rendered canvas's pixel space
      // (standard pdf.js technique, see pdf.js's own text_layer.js).
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]);
      const scaleX = Math.hypot(tx[0], tx[1]) || RENDER_SCALE;
      const widthPx = item.width * (scaleX / 1);
      const x0 = tx[4] - BOX_MARGIN;
      const y1 = tx[5] + BOX_MARGIN;
      const y0 = y1 - fontHeight - BOX_MARGIN * 2;
      const x1 = x0 + widthPx + BOX_MARGIN * 2;

      if (str.trim().length > 0) {
        words.push({
          text: str,
          start,
          end,
          bbox: { x0, y0, x1, y1 },
          pageIndex: pageNum - 1,
        });
      }

      if (item.hasEOL) text += '\n';
    }
    text += '\n\n';
  }

  return { text, words, pageSizes };
}

/**
 * Render every page to a canvas at RENDER_SCALE, black out the boxes of any
 * word overlapping an active entity's character range, and assemble the
 * redacted pages into a new PDF.
 */
export async function renderRedactedPdf(
  file: Blob,
  words: PdfWord[],
  entities: DetectedEntity[],
): Promise<Blob> {
  configureWorker();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const outDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const pageWords = words.filter((w) => w.pageIndex === pageNum - 1);
    const redactedBlob = await renderRedactedImage(canvas, pageWords, entities);
    const pngBytes = new Uint8Array(await redactedBlob.arrayBuffer());
    const embeddedPng = await outDoc.embedPng(pngBytes);
    const outPage = outDoc.addPage([canvas.width, canvas.height]);
    outPage.drawImage(embeddedPng, { x: 0, y: 0, width: canvas.width, height: canvas.height });
  }

  const bytes = await outDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}
