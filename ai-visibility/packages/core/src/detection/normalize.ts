// Name + domain normalization for detection. Runtime-agnostic (§0):
// pure string ops only — no URL()/Node APIs, since citations are often bare
// domains ("joesplumbing.com") that URL() would reject.

// Legal entity suffixes stripped from a business name before matching.
const LEGAL_SUFFIXES = [
  'llc',
  'l.l.c',
  'inc',
  'incorporated',
  'co',
  'corp',
  'corporation',
  'ltd',
  'limited',
  'plc',
  'pllc',
  'lp',
  'llp',
];

// Generic trade words removed to derive a "core name" (e.g. "Joe's Plumbing"
// -> core "joe's"). Kept small and obvious; tune as verticals expand.
const GENERIC_TRADE_WORDS = [
  'plumbing',
  'plumbers',
  'plumber',
  'dental',
  'dentist',
  'dentistry',
  'restaurant',
  'cafe',
  'diner',
  'auto',
  'automotive',
  'repair',
  'services',
  'service',
  'company',
  'shop',
  'clinic',
];

/** Lowercase, fold curly apostrophes, drop most punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’‛]/g, "'") // curly apostrophes -> straight
    .replace(/[^a-z0-9'\s]/g, ' ') // punctuation -> space (keep apostrophes)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize a business name: fold case/apostrophes, strip a trailing legal suffix. */
export function normalizeName(name: string): string {
  const tokens = normalizeText(name).split(' ').filter(Boolean);
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1]!.replace(/'/g, '');
    if (LEGAL_SUFFIXES.includes(last)) tokens.pop();
    else break;
  }
  return tokens.join(' ');
}

/**
 * "Core name" = normalized name minus generic trade words. Used as the weaker
 * (0.6 confidence) signal. Returns '' if nothing distinctive remains.
 */
export function coreName(name: string): string {
  const tokens = normalizeName(name)
    .split(' ')
    .filter(Boolean)
    .filter((t) => !GENERIC_TRADE_WORDS.includes(t.replace(/'/g, '')));
  return tokens.join(' ');
}

/**
 * Reduce any URL or bare host to a comparable registrable host:
 * lowercase, strip scheme, userinfo, "www.", path/query/fragment, port, dots.
 */
export function normalizeDomain(input: string | undefined): string {
  if (!input) return '';
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // scheme://
  s = s.replace(/^.*@/, ''); // userinfo@
  s = s.split(/[/?#]/)[0] ?? ''; // drop path/query/fragment
  s = s.split(':')[0] ?? ''; // drop port
  s = s.replace(/^www\./, '');
  s = s.replace(/\.+$/, ''); // trailing dot(s)
  return s;
}

/** True if `phrase` appears in already-normalized `text` on token boundaries. */
export function containsPhrase(normalizedText: string, phrase: string): boolean {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^a-z0-9'])${escaped}(?:[^a-z0-9']|$)`);
  return re.test(normalizedText);
}
