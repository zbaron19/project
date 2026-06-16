// Mention/citation detection — the hard part (§3).
// Two INDEPENDENT signals, kept separate:
//   • cited  (high confidence): business domain appears in EngineResult.citations
//   • named  (fuzzy):           business name appears in EngineResult.rawText
//
// This is the v1 substring approach ONLY. The v2 LLM verification pass (§3) is
// deliberately NOT built here (and §8 keeps it out of scope until v1 proves bad
// in testing). Known v1 limitation: it cannot tell two same-named businesses
// apart (see the wrong-business-same-name fixture) — that is exactly what v2 is for.

import type { EngineResult } from '../engines/types';
import type { Business, MentionFinding } from './types';
import {
  containsPhrase,
  coreName,
  normalizeDomain,
  normalizeName,
  normalizeText,
} from './normalize';

// Confidence heuristics (§3): exact normalized name hit vs. core-name-only hit.
const CONFIDENCE_EXACT = 0.9;
const CONFIDENCE_CORE = 0.6;
const CONFIDENCE_NONE = 0;

/** Run v1 detection for one business against one engine result. */
export function analyzeMention(business: Business, result: EngineResult): MentionFinding {
  const businessDomain = normalizeDomain(business.website);

  // --- cited: robust domain match against citations -------------------------
  const citedDomains = result.citations
    .map((c) => normalizeDomain(c.url))
    .filter((d) => d.length > 0);
  const cited = businessDomain !== '' && citedDomains.includes(businessDomain);

  // every cited domain that is not the business itself = competitor intel
  const competitorsCited = [...new Set(citedDomains.filter((d) => d !== businessDomain))];

  // --- named: fuzzy substring match against the answer text -----------------
  const { named, confidence } = detectNamed(business, result.rawText);

  return {
    engine: result.engine,
    prompt: result.prompt,
    named,
    cited,
    competitorsCited,
    confidence,
  };
}

function detectNamed(
  business: Business,
  rawText: string,
): { named: boolean; confidence: number } {
  const text = normalizeText(rawText);
  if (!text) return { named: false, confidence: CONFIDENCE_NONE };

  const fullName = normalizeName(business.name);
  if (fullName && containsPhrase(text, fullName)) {
    return { named: true, confidence: CONFIDENCE_EXACT };
  }

  // weaker signal: the distinctive core (name minus generic trade word)
  const core = coreName(business.name);
  if (core && core !== fullName && containsPhrase(text, core)) {
    return { named: true, confidence: CONFIDENCE_CORE };
  }

  return { named: false, confidence: CONFIDENCE_NONE };
}

/** Convenience: detect across many engine results for one business. */
export function analyzeMentions(
  business: Business,
  results: EngineResult[],
): MentionFinding[] {
  return results.map((r) => analyzeMention(business, r));
}
