// Dutch KvK-nummer (Chamber of Commerce number) detection.
// KvK numbers are 8 bare digits with no public check-digit algorithm, so a
// standalone number is too ambiguous to redact on its own (order numbers,
// zip+house-number runs, etc. collide). We only flag a number when it is
// introduced by a recognizable KvK/handelsregister label, mirroring how the
// custom dictionary feature adds targeted, high-precision matches on top of
// ML/regex detection. Matching runs locally after ML/regex detection and
// merges into the same entity list, so KvK hits behave exactly like
// detected entities (labels, toggling, export).
import type { DetectedEntity } from '@doccloak/core';

const KVK_PATTERN =
  /\b(?:kvk[-\s]?(?:nummer|nr\.?|no\.?)?|kamer\s+van\s+koophandel(?:[-\s]?(?:nummer|nr\.?))?|handelsregister(?:[-\s]?(?:nummer|nr\.?))?)\s*[:\-]?\s*(\d{8})\b/giu;

/** Find every KvK-nummer occurrence in the text, keyed off a nearby label. */
export function findKvkMatches(text: string): DetectedEntity[] {
  const matches: DetectedEntity[] = [];
  for (const m of text.matchAll(KVK_PATTERN)) {
    const digits = m[1];
    const start = m.index + m[0].length - digits.length;
    const end = start + digits.length;
    matches.push({
      type: 'COMPANY',
      value: digits,
      start,
      end,
      confidence: 0.9,
      detector: 'nl-kvk',
    });
  }
  return matches;
}

/**
 * Merge KvK-nummer matches into already-detected entities. Detected entities
 * (ML, regex, dictionary) win any overlap.
 */
export function mergeKvkEntities(text: string, detected: DetectedEntity[]): DetectedEntity[] {
  const kvkMatches = findKvkMatches(text);
  if (kvkMatches.length === 0) return detected;
  const taken: Array<[number, number]> = detected.map((e) => [e.start, e.end]);
  const merged = [...detected];
  for (const m of kvkMatches) {
    if (taken.some(([s, e]) => m.start < e && m.end > s)) continue;
    taken.push([m.start, m.end]);
    merged.push(m);
  }
  return merged.sort((a, b) => a.start - b.start);
}
