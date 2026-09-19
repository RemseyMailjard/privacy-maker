// Dutch relational/indirect-identification detection.
//
// A named-entity model flags "Jansen" but not "zijn buurvrouw" or "de opa van
// Marieke" — phrases that describe a person only through their relationship
// to someone else. In a small-world context (a case file, a village, a
// clientdossier) that relational description can re-identify someone just as
// reliably as a name, which is exactly the gap raised for foundations/umbrella
// orgs processing sensitive records. This module flags Dutch kinship and
// social-role nouns when they appear in a construction that ties them to a
// specific person — a possessive pronoun ("zijn buurvrouw") or an explicit
// "van <Naam>" / apposition ("de buurvrouw, Marieke de Vries,"). A bare role
// noun with no such anchor ("er wonen hier veel opa's") is left alone, since
// it does not describe anyone identifiable.
//
// Matching runs locally after ML/regex detection and merges into the same
// entity list, mirroring nlRules.ts: only the role/kinship word itself is
// flagged (not the adjoining name), so it composes with the ML PERSON
// detector rather than fighting it over the same span.
import type { DetectedEntity } from '@doccloak/core';

/**
 * Dutch kinship and social-role nouns that name a person only in relation to
 * someone else. Ordered longest-first so more specific compounds (e.g.
 * "schoonmoeder") are listed ahead of the shorter word they contain
 * ("moeder") for readability; \b boundaries already stop the shorter word
 * from matching inside the compound regardless of order.
 */
const RELATION_WORDS = [
  // Kinship - direct
  'vader', 'moeder', 'papa', 'mama', 'pa', 'ma',
  'zoon', 'dochter', 'zonen', 'dochters',
  'broer', 'zus', 'broertje', 'zusje', 'broers', 'zussen',
  'opa', "opa's", 'oma', "oma's", 'grootvader', 'grootmoeder',
  'kleinzoon', 'kleindochter', 'kleinkind', 'kleinkinderen',
  'oom', 'ooms', 'tante', 'tantes', 'neef', 'neven', 'nicht', 'nichten',
  // Kinship - by marriage / step / foster
  'schoonvader', 'schoonmoeder', 'schoonzoon', 'schoondochter',
  'schoonbroer', 'schoonzus', 'zwager',
  'stiefvader', 'stiefmoeder', 'stiefzoon', 'stiefdochter', 'stiefbroer', 'stiefzus',
  'pleegvader', 'pleegmoeder', 'pleegkind', 'pleegzoon', 'pleegdochter', 'pleeggezin',
  'peetvader', 'peetmoeder', 'peetoom', 'peettante', 'peetkind', 'meter', 'peter',
  'echtgenoot', 'echtgenote', 'verloofde', 'partner',
  'ex-vrouw', 'ex-man', 'ex-partner', 'weduwe', 'weduwnaar',
  // Social roles that are identifying combined with context/location
  'buurman', 'buurvrouw', 'buurjongen', 'buurmeisje', 'buurtgenoot',
  'huisgenoot', 'kamergenoot',
  'huisarts', 'tandarts', 'therapeut', 'hulpverlener', 'begeleider', 'mentor',
  'mantelzorger', 'verzorger', 'verzorgster', 'oppas', 'schoonmaakster',
  'leerkracht', 'docent', 'leraar', 'lerares', 'juf', 'meester',
  'collega', 'werkgever', 'leidinggevende',
  'cliënt', 'cliente', 'patiënt', 'patiënte',
  'wijkagent', 'pastoor', 'dominee', 'imam',
].sort((a, b) => b.length - a.length);

const POSSESSIVE = '(?:zijn|haar|hun|mijn|onze|je|jouw|uw)';
// Capitalized name phrase: "Jansen", "Marieke de Vries", "Van der Berg" — up
// to 4 tokens, allowing lowercase Dutch tussenvoegsels (de, van, der, ...).
const NAME_PHRASE =
  "[A-ZÀ-ÖØ-Þ][\\p{L}'’-]+(?:\\s+(?:de|van|der|den|het|ter|ten|dhr\\.|mevr\\.)?\\s*[A-ZÀ-ÖØ-Þ][\\p{L}'’-]+){0,3}";

function roleAlternation(): string {
  return RELATION_WORDS.map((w) => w.replace(/'/g, "['’]")).join('|');
}

const POSSESSIVE_PATTERN = new RegExp(
  `\\b${POSSESSIVE}\\s+(${roleAlternation()})\\b`,
  'giu',
);
const VAN_NAME_PATTERN = new RegExp(
  `\\b(${roleAlternation()})\\s+van\\s+(?=${NAME_PHRASE})`,
  'giu',
);
const APPOSITION_PATTERN = new RegExp(
  `\\b(?:de|het)\\s+(${roleAlternation()})\\s*,\\s*(?=${NAME_PHRASE}\\s*,)`,
  'giu',
);

/**
 * Find Dutch relational/role references anchored to a specific person: a
 * possessive pronoun ("zijn opa"), an explicit "van <Naam>" ("de buurvrouw
 * van Jansen"), or an apposition ("de mentor, Peter Bakker,"). Only the
 * role/kinship word is flagged, so it merges cleanly alongside a separately
 * detected PERSON entity for the adjoining name.
 */
export function findRelationalMatches(text: string): DetectedEntity[] {
  const matches: DetectedEntity[] = [];
  const seen = new Set<string>();

  const addFromPattern = (pattern: RegExp, confidence: number) => {
    for (const m of text.matchAll(pattern)) {
      const role = m[1];
      // m[0] always starts at the possessive/article, so locate the role
      // word's own offset within the full match precisely.
      const roleOffset = m[0].toLowerCase().lastIndexOf(role.toLowerCase());
      const roleStart = m.index + roleOffset;
      const roleEnd = roleStart + role.length;
      const key = `${roleStart}:${roleEnd}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        type: 'OTHER',
        value: text.slice(roleStart, roleEnd),
        start: roleStart,
        end: roleEnd,
        confidence,
        detector: 'nl-relation',
      });
    }
  };

  addFromPattern(POSSESSIVE_PATTERN, 0.75);
  addFromPattern(VAN_NAME_PATTERN, 0.85);
  addFromPattern(APPOSITION_PATTERN, 0.8);

  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Merge relational-reference matches into already-detected entities.
 * Detected entities (ML, regex, dictionary, KvK) win any overlap.
 */
export function mergeRelationalEntities(text: string, detected: DetectedEntity[]): DetectedEntity[] {
  const relMatches = findRelationalMatches(text);
  if (relMatches.length === 0) return detected;
  const taken: Array<[number, number]> = detected.map((e) => [e.start, e.end]);
  const merged = [...detected];
  for (const m of relMatches) {
    if (taken.some(([s, e]) => m.start < e && m.end > s)) continue;
    taken.push([m.start, m.end]);
    merged.push(m);
  }
  return merged.sort((a, b) => a.start - b.start);
}
