import { describe, it, expect } from 'vitest';
import type { DetectedEntity } from '@doccloak/core';
import { findRelationalMatches, mergeRelationalEntities } from '../../src/ui/relationalRules.ts';

const spans = (entities: DetectedEntity[]) => entities.map((e) => [e.start, e.end, e.value]);

describe('findRelationalMatches', () => {
  it('finds a possessive-anchored kinship reference', () => {
    const text = 'Hij ging op bezoek bij zijn opa.';
    const result = findRelationalMatches(text);
    expect(spans(result)).toEqual([[28, 31, 'opa']]);
    expect(result[0].type).toBe('OTHER');
    expect(result[0].detector).toBe('nl-relation');
  });

  it('finds a role word introduced by "van <Naam>"', () => {
    const text = 'De buurvrouw van Jansen belde de politie.';
    const result = findRelationalMatches(text);
    expect(spans(result)).toEqual([[3, 12, 'buurvrouw']]);
  });

  it('finds a role word in apposition with a name', () => {
    const text = 'De mentor, Peter Bakker, begeleidde de sessie.';
    const result = findRelationalMatches(text);
    expect(spans(result)).toEqual([[3, 9, 'mentor']]);
  });

  it('prefers the longer compound over the word it contains', () => {
    const text = 'Zijn schoonmoeder kwam ook langs.';
    const result = findRelationalMatches(text);
    expect(spans(result)).toEqual([[5, 17, 'schoonmoeder']]);
  });

  it('ignores a bare role word with no anchor to a specific person', () => {
    expect(findRelationalMatches('Er wonen hier veel opa\'s en oma\'s.')).toHaveLength(0);
    expect(findRelationalMatches('Ze werkt als huisarts.')).toHaveLength(0);
  });

  it('does not double-count overlapping possessive and apposition matches', () => {
    const result = findRelationalMatches('Zijn buurvrouw, Marieke de Vries, deed open.');
    expect(result).toHaveLength(1);
    expect(spans(result)).toEqual([[5, 14, 'buurvrouw']]);
  });
});

describe('mergeRelationalEntities', () => {
  it('adds relational matches alongside detected entities', () => {
    const text = 'Marieke belde haar oom.';
    const detected: DetectedEntity[] = [
      { type: 'PERSON', value: 'Marieke', start: 0, end: 7, confidence: 0.9, detector: 'ml' },
    ];
    const merged = mergeRelationalEntities(text, detected);
    expect(spans(merged)).toEqual([
      [0, 7, 'Marieke'],
      [19, 22, 'oom'],
    ]);
  });

  it('lets already-detected entities win overlaps', () => {
    const text = 'zijn opa';
    const detected: DetectedEntity[] = [
      { type: 'OTHER', value: 'opa', start: 5, end: 8, confidence: 1.0, detector: 'dictionary' },
    ];
    const merged = mergeRelationalEntities(text, detected);
    expect(merged).toHaveLength(1);
    expect(merged[0].detector).toBe('dictionary');
  });

  it('returns detected entities untouched when there is no relational match', () => {
    const detected: DetectedEntity[] = [];
    expect(mergeRelationalEntities('no relations here', detected)).toBe(detected);
  });
});
