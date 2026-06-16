// Visibility score, 0–100 (§4). Kept deliberately simple and explainable to a
// non-technical owner. The number's job is to create "huh, I'm at 23" anxiety
// and a reason to come back after fixes — do NOT overfit. Every weight here is
// tunable; they are named constants so tuning is a one-line change.

import type { MentionFinding } from './detection/types';

// --- tunable weights ---------------------------------------------------------
const POINTS_CITED_PER_ENGINE = 40; // an engine cited the business's own domain
const POINTS_NAMED_PER_ENGINE = 15; // an engine named it but did not cite it
const POINTS_CLEAN_CRAWLER = 15; // not blocking AI bots in robots.txt
const POINTS_HAS_SCHEMA = 15; // Product or LocalBusiness schema present
const SCORE_FLOOR = 0;
const SCORE_CAP = 100;

export interface ScoreInput {
  findings: MentionFinding[];
  crawlerClean: boolean; // true if no AI bots are blocked
  hasSchema: boolean; // true if Product or LocalBusiness schema present
}

/**
 * Findings arrive per (engine, prompt) and the app fans out many prompts per
 * engine, so we first collapse to ONE verdict per engine ("+40 per engine,
 * capped" — §4): an engine counts as cited if any of its prompts cited, else
 * named if any named. This keeps the citation points capped at one award per
 * engine instead of scaling with the prompt count.
 */
export function scoreVisibility(input: ScoreInput): number {
  let score = 0;

  const byEngine = new Map<string, { cited: boolean; named: boolean }>();
  for (const f of input.findings) {
    const agg = byEngine.get(f.engine) ?? { cited: false, named: false };
    agg.cited ||= f.cited;
    agg.named ||= f.named;
    byEngine.set(f.engine, agg);
  }

  for (const { cited, named } of byEngine.values()) {
    if (cited) score += POINTS_CITED_PER_ENGINE;
    else if (named) score += POINTS_NAMED_PER_ENGINE;
  }

  if (input.crawlerClean) score += POINTS_CLEAN_CRAWLER;
  if (input.hasSchema) score += POINTS_HAS_SCHEMA;

  return Math.max(SCORE_FLOOR, Math.min(SCORE_CAP, score));
}
