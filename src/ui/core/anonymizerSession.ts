// Per-document anonymization state and logic, extracted from the
// useAnonymizer hook so it can be instantiated N times for batch processing
// (React hooks cannot be called in a loop/array, plain classes can).
import type { DetectedEntity, EntityType, ReplacementEntry, ReplacementMode } from '@doccloak/core';
import { AnonymizationSession } from '@doccloak/core';
import { readDocx, writeAnonymizedDocx, isLegacyDoc, isSupportedFile } from '@doccloak/core/dom';
import { readDocText, writeAnonymizedDoc } from '@doccloak/core';
import { isImageFile, renderRedactedImage } from '@doccloak/core/dom';
import { loadImageToCanvas, recognizeCanvas } from '../../ocr.web.ts';
import type { OcrWord } from '@doccloak/core/dom';
import { isPdfFile, extractPdfText, renderRedactedPdf } from '../../pdf.web.ts';
import { detectEntities } from '../../engine.ts';
import { mergeDictionaryEntities } from '../dictionary.ts';
import type { DictionaryEntry } from '../dictionary.ts';
import { mergeKvkEntities } from '../nlRules.ts';
import { mergeRelationalEntities } from '../relationalRules.ts';

type PdfWord = OcrWord & { pageIndex: number };

export interface AnonymizerSessionOptions {
  /** Called after any field changes, so a React wrapper can force a re-render. */
  onChange?: () => void;
  /**
   * true (default): this instance owns its AnonymizationSession exclusively,
   * so it clears and rebuilds the map from scratch on every document load and
   * every entity edit (current single-file behavior, unchanged).
   * false: the AnonymizationSession is shared across a batch of documents —
   * clear() must never run, since anonymize() is idempotent per value and
   * relies on the shared forward map to keep the same original value mapped
   * to the same placeholder across files. The one accepted trade-off: an
   * entity excluded after being included stays in the shared session's
   * entries (harmless - it only affects the certificate listing, since it's
   * no longer written into any document's output).
   */
  standalone?: boolean;
}

export class AnonymizerSessionCore {
  session: AnonymizationSession;

  inputText = '';
  anonymizedText = '';
  entities: DetectedEntity[] = [];
  entries: ReplacementEntry[] = [];
  excludedIndices: Set<number> = new Set();
  anonymizing = false;
  detectionProgress: number | null = null;
  detectionError: string | null = null;
  docxFile: File | null = null;
  docxFileName: string | null = null;
  imageFileName: string | null = null;
  ocrProgress: number | null = null;
  pdfFile: File | null = null;
  pdfFileName: string | null = null;
  pdfLoading = false;

  private imageCanvas: HTMLCanvasElement | null = null;
  private ocrWords: OcrWord[] = [];
  private pdfWords: PdfWord[] = [];
  private latestRequestId = 0;
  private readonly onChangeCb: () => void;
  private readonly standalone: boolean;

  constructor(session: AnonymizationSession, options: AnonymizerSessionOptions = {}) {
    this.session = session;
    this.onChangeCb = options.onChange ?? (() => {});
    this.standalone = options.standalone ?? true;
  }

  get fileName(): string | null {
    return this.docxFileName ?? this.imageFileName ?? this.pdfFileName;
  }
  get hasDocxExtraction(): boolean {
    return this.docxFile !== null;
  }
  get hasImage(): boolean {
    return this.imageFileName !== null;
  }
  get hasPdf(): boolean {
    return this.pdfFile !== null;
  }

  private notify() {
    this.onChangeCb();
  }

  private clearSession() {
    if (this.standalone) this.session.clear();
  }

  private rebuildAnonymization(text: string, allEntities: DetectedEntity[], excluded: Set<number>) {
    this.clearSession();
    const activeEntities = allEntities.filter((_, i) => !excluded.has(i));
    this.anonymizedText = this.session.anonymizeText(text, activeEntities);
    this.entries = this.session.getEntries();
    this.notify();
  }

  handleInputChange(text: string) {
    this.inputText = text;
    this.anonymizedText = '';
    this.entities = [];
    this.entries = [];
    this.excludedIndices = new Set();
    this.notify();
  }

  async anonymize(dictionary: DictionaryEntry[]): Promise<void> {
    const text = this.inputText;
    if (!text.trim()) return;

    this.anonymizing = true;
    this.detectionError = null;
    this.detectionProgress = 0;
    const requestId = ++this.latestRequestId;
    const excluded = new Set<number>();
    this.excludedIndices = excluded;
    this.notify();

    try {
      // Detection runs in a Web Worker - no need to yield to the browser
      const results = await detectEntities(text, (progress) => {
        if (requestId === this.latestRequestId) {
          this.detectionProgress = progress;
          this.notify();
        }
      });
      if (requestId !== this.latestRequestId) return;

      // Dictionary words are always redacted; detected entities win overlaps
      const withDictionary = mergeDictionaryEntities(text, results, dictionary);
      // KvK-nummers (Dutch Chamber of Commerce numbers) are flagged when
      // introduced by a recognizable label; detected entities still win overlaps
      const withKvk = mergeKvkEntities(text, withDictionary);
      // Dutch relational/role references ("zijn buurvrouw", "de opa van
      // Marieke") indirectly identify a person; detected entities and
      // KvK hits still win overlaps.
      const withRelational = mergeRelationalEntities(text, withKvk);
      this.entities = withRelational;
      this.rebuildAnonymization(text, withRelational, excluded);
      this.anonymizing = false;
      this.detectionProgress = null;
      this.notify();
      // Scroll the tool back into view in case the page has drifted.
      // We target <main> which wraps the tool; falls back to no-op if not found.
      const toolEl = document.querySelector('main');
      if (toolEl) {
        toolEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('[Privacy Maker] Detection failed:', err);
      if (requestId === this.latestRequestId) {
        this.anonymizing = false;
        this.detectionProgress = null;
        this.detectionError = err instanceof Error ? err.message : String(err);
        this.notify();
      }
    }
  }

  addManualEntity(start: number, end: number, type: EntityType) {
    const value = this.inputText.slice(start, end);
    const newEntity: DetectedEntity = {
      type,
      value,
      start,
      end,
      confidence: 1.0,
      detector: 'manual',
    };
    const next = [...this.entities, newEntity].sort((a, b) => a.start - b.start);
    this.entities = next;
    this.rebuildAnonymization(this.inputText, next, this.excludedIndices);
  }

  removeEntity(index: number) {
    const next = this.entities.filter((_, i) => i !== index);
    // Rebuild excluded indices: shift down indices above the removed one
    const newExcl = new Set<number>();
    for (const i of this.excludedIndices) {
      if (i < index) newExcl.add(i);
      else if (i > index) newExcl.add(i - 1);
    }
    this.entities = next;
    this.excludedIndices = newExcl;
    this.rebuildAnonymization(this.inputText, next, newExcl);
  }

  toggleEntity(index: number) {
    const next = new Set(this.excludedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    this.excludedIndices = next;
    this.rebuildAnonymization(this.inputText, this.entities, next);
  }

  deanonymize(aiResponse: string): string {
    return this.session.deanonymize(aiResponse);
  }

  renameLabel(original: string, newLabel: string) {
    const oldLabel = this.session.getForward(original);
    if (!oldLabel) return;
    this.session.renameLabel(original, newLabel);
    this.anonymizedText = this.anonymizedText.replaceAll(oldLabel, () => newLabel);
    this.entries = this.session.getEntries();
    this.notify();
  }

  setReplacementMode(mode: ReplacementMode) {
    this.session.setMode(mode);
    if (this.entities.length > 0) {
      this.rebuildAnonymization(this.inputText, this.entities, this.excludedIndices);
    } else {
      this.notify();
    }
  }

  private resetImageState() {
    this.imageFileName = null;
    this.imageCanvas = null;
    this.ocrWords = [];
  }

  private resetPdfState() {
    this.pdfFile = null;
    this.pdfFileName = null;
    this.pdfWords = [];
  }

  async loadDocxFile(file: File): Promise<{ success: boolean; error?: string }> {
    if (!isSupportedFile(file.name)) {
      return { success: false, error: 'unsupported' };
    }
    try {
      let plainText: string;

      if (isLegacyDoc(file.name)) {
        // Legacy .doc: try as .docx first (some .doc files are renamed .docx)
        try {
          const extraction = await readDocx(file);
          plainText = extraction.plainText;
        } catch {
          // Not a .docx in disguise - parse as real .doc binary
          const buffer = await file.arrayBuffer();
          plainText = readDocText(buffer);
        }
      } else {
        // Standard .docx
        const extraction = await readDocx(file);
        plainText = extraction.plainText;
      }

      this.resetImageState();
      this.resetPdfState();
      this.docxFile = file;
      this.docxFileName = file.name;
      this.inputText = plainText;
      this.anonymizedText = '';
      this.entities = [];
      this.entries = [];
      this.excludedIndices = new Set();
      this.clearSession();
      this.notify();
      return { success: true };
    } catch (err) {
      console.error('[Privacy Maker] Failed to read file:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async loadImageFile(file: File, language: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ocrProgress = 0;
      this.notify();
      const canvas = await loadImageToCanvas(file);
      const { text, words } = await recognizeCanvas(canvas, language, (p) => {
        this.ocrProgress = p;
        this.notify();
      });
      if (!text.trim()) {
        return { success: false, error: 'no-text' };
      }

      this.imageCanvas = canvas;
      this.ocrWords = words;
      this.resetPdfState();
      this.imageFileName = file.name;
      this.docxFile = null;
      this.docxFileName = null;
      this.inputText = text;
      this.anonymizedText = '';
      this.entities = [];
      this.entries = [];
      this.excludedIndices = new Set();
      this.clearSession();
      return { success: true };
    } catch (err) {
      console.error('[Privacy Maker] OCR failed:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      this.ocrProgress = null;
      this.notify();
    }
  }

  async loadPdfFile(file: File): Promise<{ success: boolean; error?: string }> {
    try {
      this.pdfLoading = true;
      this.notify();
      const { text, words } = await extractPdfText(file);
      if (!text.trim()) {
        return { success: false, error: 'no-text' };
      }

      this.pdfWords = words;
      this.resetImageState();
      this.pdfFile = file;
      this.pdfFileName = file.name;
      this.docxFile = null;
      this.docxFileName = null;
      this.inputText = text;
      this.anonymizedText = '';
      this.entities = [];
      this.entries = [];
      this.excludedIndices = new Set();
      this.clearSession();
      return { success: true };
    } catch (err) {
      console.error('[Privacy Maker] PDF extraction failed:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      this.pdfLoading = false;
      this.notify();
    }
  }

  // Route uploads by type: images go through OCR, PDFs through pdf.js, other documents through the docx reader
  async loadFile(file: File, language: string): Promise<{ success: boolean; error?: string }> {
    if (isImageFile(file.name)) return this.loadImageFile(file, language);
    if (isPdfFile(file.name)) return this.loadPdfFile(file);
    return this.loadDocxFile(file);
  }

  async exportRedactedImage(): Promise<Blob> {
    const canvas = this.imageCanvas;
    if (!canvas || this.entities.length === 0) {
      throw new Error('No image or entities to export');
    }
    const activeEntities = this.entities.filter((_, i) => !this.excludedIndices.has(i));
    return renderRedactedImage(canvas, this.ocrWords, activeEntities);
  }

  async exportRedactedPdf(): Promise<Blob> {
    if (!this.pdfFile || this.entities.length === 0) {
      throw new Error('No PDF or entities to export');
    }
    const activeEntities = this.entities.filter((_, i) => !this.excludedIndices.has(i));
    return renderRedactedPdf(this.pdfFile, this.pdfWords, activeEntities);
  }

  async exportDocx(): Promise<Blob> {
    if (!this.docxFile || this.entities.length === 0) {
      throw new Error('No document or entities to export');
    }

    const activeEntities = this.entities.filter((_, i) => !this.excludedIndices.has(i));
    const replacements = activeEntities.map((entity) => {
      const replacement = this.session.getForward(entity.value);
      if (replacement === undefined) {
        // Fail closed: never write an original value into a redacted export
        throw new Error('Missing replacement mapping for a detected entity');
      }
      return { start: entity.start, end: entity.end, replacement };
    });
    // Value-level pairs let the writer scrub places offsets cannot reach
    // (hyperlink targets, field instructions)
    const valueReplacements = activeEntities.map((entity) => ({
      value: entity.value,
      replacement: this.session.getForward(entity.value) ?? '',
    }));

    if (isLegacyDoc(this.docxFile.name)) {
      // Legacy .doc: try .docx first (renamed files), fall back to .doc binary export
      try {
        const extraction = await readDocx(this.docxFile);
        return await writeAnonymizedDocx(extraction, replacements, valueReplacements);
      } catch {
        const buffer = await this.docxFile.arrayBuffer();
        return await writeAnonymizedDoc(buffer, replacements);
      }
    } else {
      // Standard .docx
      const extraction = await readDocx(this.docxFile);
      return await writeAnonymizedDocx(extraction, replacements, valueReplacements);
    }
  }

  removeFile() {
    this.docxFile = null;
    this.docxFileName = null;
    this.resetImageState();
    this.resetPdfState();
    this.inputText = '';
    this.anonymizedText = '';
    this.entities = [];
    this.entries = [];
    this.excludedIndices = new Set();
    this.clearSession();
    this.notify();
  }

  clear() {
    this.inputText = '';
    this.anonymizedText = '';
    this.entities = [];
    this.entries = [];
    this.excludedIndices = new Set();
    this.docxFile = null;
    this.docxFileName = null;
    this.resetImageState();
    this.resetPdfState();
    this.clearSession();
    this.notify();
  }
}
