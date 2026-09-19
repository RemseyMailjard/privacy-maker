import { describe, it, expect } from 'vitest';
import type { DetectedEntity } from '@doccloak/core';
import { en } from '../../src/i18n/translations/en.ts';
import { generateCertificateText, countByType } from '../../src/ui/certificate.ts';

const entities: DetectedEntity[] = [
  { type: 'PERSON', value: 'Jan Jansen', start: 0, end: 10, confidence: 0.95, detector: 'ml' },
  { type: 'EMAIL', value: 'jan@example.com', start: 20, end: 36, confidence: 0.9, detector: 'regex' },
  { type: 'PERSON', value: 'Piet Pietersen', start: 40, end: 55, confidence: 0.8, detector: 'ml' },
];

describe('countByType', () => {
  it('counts entities per type, excluding unchecked indices', () => {
    expect(countByType(entities, new Set())).toEqual({ PERSON: 2, EMAIL: 1 });
  });

  it('excludes indices the user unchecked', () => {
    expect(countByType(entities, new Set([0]))).toEqual({ PERSON: 1, EMAIL: 1 });
  });
});

describe('generateCertificateText', () => {
  const baseParams = {
    t: en,
    entities,
    excludedIndices: new Set<number>(),
    replacementMode: 'labeled' as const,
    providerLabel: 'GLiNER PII Edge',
    threshold: 0.5,
    regexEnabled: true,
    regexRegionLabel: 'Netherlands',
    customLabels: ['medical condition'],
    dictionaryCount: 2,
    anonymizedText: '[PERSON_1] emailed [PERSON_2] at [EMAIL_1]',
    appVersion: '1.2.3',
    coreVersion: '0.9.0',
    digest: async () => 'deadbeef'.repeat(8),
  };

  it('never includes the original entity values', async () => {
    const text = await generateCertificateText(baseParams);
    expect(text).not.toContain('Jan Jansen');
    expect(text).not.toContain('Piet Pietersen');
    expect(text).not.toContain('jan@example.com');
  });

  it('reports the detected/redacted/kept-visible counts', async () => {
    const text = await generateCertificateText({ ...baseParams, excludedIndices: new Set([1]) });
    expect(text).toContain('Total items detected: 3');
    expect(text).toContain('Redacted: 2');
    expect(text).toContain('Kept visible: 1');
  });

  it('breaks counts down by entity type label', async () => {
    const text = await generateCertificateText(baseParams);
    expect(text).toContain('Name: 2');
    expect(text).toContain('Email: 1');
  });

  it('includes the settings used for detection', async () => {
    const text = await generateCertificateText(baseParams);
    expect(text).toContain('GLiNER PII Edge');
    expect(text).toContain('Netherlands');
    expect(text).toContain('medical condition');
    expect(text).toContain('Labeled Replacements');
  });

  it('shows "Disabled" when regex detection is off, ignoring the region label', async () => {
    const text = await generateCertificateText({ ...baseParams, regexEnabled: false });
    expect(text).toContain('Disabled');
  });

  it('includes the hash produced by the injected digest function', async () => {
    const text = await generateCertificateText(baseParams);
    expect(text).toContain('deadbeef'.repeat(8));
  });

  it('hashes the redacted output, not any original value', async () => {
    let hashedInput = '';
    await generateCertificateText({
      ...baseParams,
      digest: async (text) => {
        hashedInput = text;
        return 'x';
      },
    });
    expect(hashedInput).toBe(baseParams.anonymizedText);
  });
});
