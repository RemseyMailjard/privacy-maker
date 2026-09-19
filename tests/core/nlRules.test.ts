import { describe, it, expect } from 'vitest';
import type { DetectedEntity } from '@doccloak/core';
import { findKvkMatches, mergeKvkEntities } from '../../src/ui/nlRules.ts';

const spans = (entities: DetectedEntity[]) => entities.map((e) => [e.start, e.end, e.value]);

describe('findKvkMatches', () => {
  it('finds a KvK-nummer introduced by "KvK-nummer"', () => {
    const text = 'Ingeschreven onder KvK-nummer 12345678 bij de Kamer van Koophandel.';
    const result = findKvkMatches(text);
    expect(spans(result)).toEqual([[30, 38, '12345678']]);
    expect(result[0].type).toBe('COMPANY');
    expect(result[0].detector).toBe('nl-kvk');
  });

  it('matches common label variants', () => {
    expect(findKvkMatches('KvK: 12345678')).toHaveLength(1);
    expect(findKvkMatches('kvk nr. 12345678')).toHaveLength(1);
    expect(findKvkMatches('Kamer van Koophandel nummer 12345678')).toHaveLength(1);
    expect(findKvkMatches('Handelsregister: 12345678')).toHaveLength(1);
  });

  it('ignores a bare 8-digit number with no KvK label', () => {
    expect(findKvkMatches('Order 12345678 shipped today')).toHaveLength(0);
  });

  it('does not match numbers with the wrong digit count', () => {
    expect(findKvkMatches('KvK-nummer 1234567')).toHaveLength(0);
    expect(findKvkMatches('KvK-nummer 123456789')).toHaveLength(0);
  });
});

describe('mergeKvkEntities', () => {
  it('adds KvK matches alongside detected entities', () => {
    const text = 'Acme B.V. (KvK-nummer 12345678) signed the contract.';
    const detected: DetectedEntity[] = [
      { type: 'COMPANY', value: 'Acme B.V.', start: 0, end: 9, confidence: 0.9, detector: 'ml' },
    ];
    const merged = mergeKvkEntities(text, detected);
    expect(spans(merged)).toEqual([
      [0, 9, 'Acme B.V.'],
      [22, 30, '12345678'],
    ]);
  });

  it('lets already-detected entities win overlaps', () => {
    const text = 'KvK-nummer 12345678';
    const detected: DetectedEntity[] = [
      { type: 'OTHER', value: '12345678', start: 11, end: 19, confidence: 1.0, detector: 'dictionary' },
    ];
    const merged = mergeKvkEntities(text, detected);
    expect(merged).toHaveLength(1);
    expect(merged[0].detector).toBe('dictionary');
  });

  it('returns detected entities untouched when there is no KvK match', () => {
    const detected: DetectedEntity[] = [];
    expect(mergeKvkEntities('no ids here', detected)).toBe(detected);
  });
});
