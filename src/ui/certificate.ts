// Redaction certificate: a downloadable proof of what was anonymized,
// without ever including the original values. Lists only counts, detector
// categories, the settings used, and a SHA-256 hash of the redacted output
// so the recipient can confirm the certificate matches the shared text.
// Generated entirely client-side - nothing here is computed on a server.
import type { DetectedEntity, EntityType, ReplacementMode } from '@doccloak/core';
import type { Translations } from '../i18n/types.ts';

export interface CertificateParams {
  t: Translations;
  entities: DetectedEntity[];
  excludedIndices: Set<number>;
  replacementMode: ReplacementMode;
  providerLabel: string;
  threshold: number;
  regexEnabled: boolean;
  regexRegionLabel: string;
  customLabels: string[];
  dictionaryCount: number;
  anonymizedText: string;
  appVersion: string;
  coreVersion: string;
  /** Injectable for tests; defaults to the browser's SubtleCrypto. */
  digest?: (text: string) => Promise<string>;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function replacementStyleLabel(mode: ReplacementMode, t: Translations): string {
  if (mode === 'labeled') return t.settings.labeledPlaceholders;
  if (mode === 'blanked') return t.settings.blankedOut;
  return mode;
}

/** Count entities per type, excluding ones the user unchecked. */
export function countByType(
  entities: DetectedEntity[],
  excludedIndices: Set<number>,
): Partial<Record<EntityType, number>> {
  const counts: Partial<Record<EntityType, number>> = {};
  entities.forEach((entity, index) => {
    if (excludedIndices.has(index)) return;
    counts[entity.type] = (counts[entity.type] ?? 0) + 1;
  });
  return counts;
}

export async function generateCertificateText(params: CertificateParams): Promise<string> {
  const {
    t, entities, excludedIndices, replacementMode, providerLabel, threshold,
    regexEnabled, regexRegionLabel, customLabels, dictionaryCount,
    anonymizedText, appVersion, coreVersion,
  } = params;
  const digest = params.digest ?? sha256Hex;
  const c = t.certificate;

  const redactedCount = entities.length - excludedIndices.size;
  const byType = countByType(entities, excludedIndices);
  const hash = await digest(anonymizedText);

  const lines: string[] = [];
  const rule = '-'.repeat(60);

  lines.push(c.title.toUpperCase());
  lines.push(rule);
  lines.push(`${c.generatedAt}: ${new Date().toISOString()}`);
  lines.push(c.versions(appVersion, coreVersion));
  lines.push('');

  lines.push(c.configTitle.toUpperCase());
  lines.push(`  ${c.model}: ${providerLabel}`);
  lines.push(`  ${c.sensitivity}: ${threshold.toFixed(2)}`);
  lines.push(`  ${c.replacementStyleLabel}: ${replacementStyleLabel(replacementMode, t)}`);
  lines.push(`  ${c.regexRules}: ${regexEnabled ? regexRegionLabel : c.disabled}`);
  lines.push(`  ${c.customLabelsLabel}: ${customLabels.length > 0 ? customLabels.join(', ') : c.none}`);
  lines.push(`  ${c.customDictionaryLabel}: ${dictionaryCount > 0 ? dictionaryCount : c.none}`);
  lines.push('');

  lines.push(c.summaryTitle.toUpperCase());
  lines.push(`  ${c.totalDetected(entities.length)}`);
  lines.push(`  ${c.redacted(redactedCount)}`);
  lines.push(`  ${c.keptVisible(excludedIndices.size)}`);
  lines.push('');
  lines.push(`  ${c.byType}:`);
  for (const [type, count] of Object.entries(byType).sort(([, a], [, b]) => b - a)) {
    lines.push(`    ${t.entityLabels[type as EntityType]}: ${count}`);
  }
  lines.push('');

  lines.push(c.integrityTitle.toUpperCase());
  lines.push(`  ${c.integrityHash}:`);
  lines.push(`  ${hash}`);
  lines.push(`  ${c.integrityNote}`);
  lines.push('');

  lines.push(c.verificationTitle.toUpperCase());
  lines.push(`  ${c.verificationBody}`);

  return lines.join('\n');
}
