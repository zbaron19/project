// Public API surface for @ai-visibility/core.
// Deliberately narrow (§2) — the apps depend only on what is exported here.

import type { Business, MentionFinding } from './detection/types';
import type { Fix } from './audit/fixlist';
import type { EngineResult } from './engines/types';
import type { CrawlerAudit } from './audit/robots';
import type { SchemaAudit } from './audit/schema';
import { analyzeMentions } from './detection/mention';
import { buildFixList } from './audit/fixlist';
import { scoreVisibility } from './scoring';

// --- types -------------------------------------------------------------------
export type { EngineQuery, Citation, EngineResult } from './engines/types';
export type { Business, MentionFinding } from './detection/types';
export type { Fix } from './audit/fixlist';
export type { CrawlerAudit } from './audit/robots';
export type { SchemaAudit } from './audit/schema';

// --- functions apps call -----------------------------------------------------
export { queryPerplexity } from './engines/perplexity';
export { queryOpenAI } from './engines/openai';
export { analyzeMention, analyzeMentions } from './detection/mention';
export { fetchRobots, parseRobots, AI_BOTS } from './audit/robots';
export { detectSchema, generateLocalBusinessSchema } from './audit/schema';
export { buildFixList } from './audit/fixlist';
export { scoreVisibility } from './scoring';

export interface VisibilityReport {
  business: Business;
  score: number; // 0–100
  findings: MentionFinding[];
  fixes: Fix[];
  generatedAt: string; // ISO
}

export interface GenerateReportInput {
  business: Business;
  engineResults: EngineResult[];
  crawler: CrawlerAudit;
  schema: SchemaAudit;
  /** Injectable clock (keeps core deterministic/testable; §0 no hidden globals). */
  now?: () => string;
}

/**
 * Assemble the full VisibilityReport from a business, the engine results, and
 * the two audits. This is the single entry point both apps build their UI on.
 */
export function generateReport(input: GenerateReportInput): VisibilityReport {
  const findings = analyzeMentions(input.business, input.engineResults);
  const crawlerClean = input.crawler.blockedBots.length === 0;
  const hasSchema = input.schema.hasProduct || input.schema.hasLocalBusiness;

  const score = scoreVisibility({ findings, crawlerClean, hasSchema });
  const fixes = buildFixList({ crawler: input.crawler, schema: input.schema, findings });
  const generatedAt = (input.now ?? (() => new Date().toISOString()))();

  return { business: input.business, score, findings, fixes, generatedAt };
}
