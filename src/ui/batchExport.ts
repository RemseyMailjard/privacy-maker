// Batch export: zips every successfully processed file's redacted output
// together with its own verifiable certificate (same generator as the
// single-file flow, so the hash-verification story stays identical).
import JSZip from 'jszip';
import type { ReplacementMode } from '@doccloak/core';
import type { BatchEntry } from './hooks/useBatchAnonymizer.ts';
import { generateCertificateText } from './certificate.ts';
import type { Translations } from '../i18n/types.ts';

export interface BatchExportParams {
  entries: BatchEntry[];
  t: Translations;
  replacementMode: ReplacementMode;
  providerLabel: string;
  threshold: number;
  regexEnabled: boolean;
  regexRegionLabel: string;
  customLabels: string[];
  dictionaryCount: number;
  appVersion: string;
  coreVersion: string;
}

export async function exportBatchZip(params: BatchExportParams): Promise<Blob> {
  const { entries, ...certParams } = params;
  const zip = new JSZip();
  let included = 0;

  for (const entry of entries) {
    if (entry.status !== 'done') continue;
    const core = entry.core;
    if (core.entities.length === 0) continue;

    const baseName = entry.file.name.replace(/\.[^.]+$/, '');
    let blob: Blob;
    let ext: string;
    if (core.hasDocxExtraction) {
      blob = await core.exportDocx();
      ext = entry.file.name.match(/\.(docx?)$/i)?.[1] ?? 'docx';
    } else if (core.hasImage) {
      blob = await core.exportRedactedImage();
      ext = 'png';
    } else if (core.hasPdf) {
      blob = await core.exportRedactedPdf();
      ext = 'pdf';
    } else {
      continue;
    }
    zip.file(`${baseName}_redacted.${ext}`, blob);

    const certText = await generateCertificateText({
      ...certParams,
      entities: core.entities,
      excludedIndices: core.excludedIndices,
      anonymizedText: core.anonymizedText,
    });
    zip.file(`${baseName}_certificate.txt`, certText);
    included++;
  }

  if (included === 0) {
    throw new Error('No processed files to export');
  }

  return zip.generateAsync({ type: 'blob' });
}
