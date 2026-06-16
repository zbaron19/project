// The Fix contract (§2) + buildFixList(): turn audit/detection findings into a
// ranked, plain-English to-do list a non-technical owner can act on (§5).

import type { MentionFinding } from '../detection/types';
import type { CrawlerAudit } from './robots';
import type { SchemaAudit } from './schema';

export interface Fix {
  id: string;
  severity: 'critical' | 'important' | 'nice-to-have';
  title: string; // "You're blocking GPTBot in robots.txt"
  detail: string; // plain-English explanation for a non-technical owner
  remedy: string; // what to change
}

export interface FixListInput {
  crawler: CrawlerAudit;
  schema: SchemaAudit;
  findings: MentionFinding[];
}

const SEVERITY_ORDER: Record<Fix['severity'], number> = {
  critical: 0,
  important: 1,
  'nice-to-have': 2,
};

/** Build a ranked fix list (critical first). Plain English, no jargon. */
export function buildFixList(input: FixListInput): Fix[] {
  const fixes: Fix[] = [];

  // 1. Blocked AI crawlers — the most severe: the site is invisible to AI by choice.
  for (const bot of input.crawler.blockedBots) {
    fixes.push({
      id: `crawler-blocked-${bot.toLowerCase()}`,
      severity: 'critical',
      title: `You're blocking ${bot} in robots.txt`,
      detail:
        `${bot} is the crawler that lets an AI assistant read your website. Your ` +
        `robots.txt currently tells it to stay out, so you can't be recommended ` +
        `even if you're the best option in town.`,
      remedy:
        `Edit your robots.txt and remove the rule that disallows ${bot} (or change ` +
        `its "Disallow: /" to "Allow: /"). Then you'll start being seen.`,
    });
  }

  // 2. No structured data — AI can read the page but can't reliably understand it.
  if (!input.schema.hasProduct && !input.schema.hasLocalBusiness) {
    fixes.push({
      id: 'schema-missing',
      severity: 'important',
      title: 'Your site has no structured data (schema.org)',
      detail:
        `Structured data is a small, hidden snippet that tells AI exactly who you ` +
        `are, where you are, and what you sell. Without it, the AI has to guess — ` +
        `and it often guesses your competitors instead.`,
      remedy:
        `Add a LocalBusiness (or Product) schema block to your homepage. We can ` +
        `generate the exact snippet for you to paste in.`,
    });
  }

  // 3. Detection-driven gaps: not cited and not named anywhere.
  const anyCited = input.findings.some((f) => f.cited);
  const anyNamed = input.findings.some((f) => f.named);

  if (!anyCited) {
    fixes.push({
      id: 'not-cited',
      severity: 'important',
      title: "AI engines aren't linking to your website",
      detail:
        `When people ask AI for a recommendation, the answer can include source ` +
        `links. Right now none of them point to your site, so even interested ` +
        `customers can't click through to you.`,
      remedy:
        `Publish clear, question-shaped pages (e.g. "emergency plumber in <your ` +
        `city>") and make sure AI crawlers can reach them. Citations follow content ` +
        `that directly answers the question.`,
    });
  }

  if (!anyNamed) {
    fixes.push({
      id: 'not-named',
      severity: 'nice-to-have',
      title: "AI engines don't mention you by name",
      detail:
        `Your business name isn't coming up in the answers at all. This is the ` +
        `top of the funnel — being named is the first step toward being chosen.`,
      remedy:
        `Strengthen your presence on the pages AI reads (your own site, reviews, ` +
        `local listings) so your name appears alongside the service you offer.`,
    });
  }

  return fixes.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
