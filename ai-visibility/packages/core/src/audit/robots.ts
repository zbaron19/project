// robots.txt audit — does the site block the AI crawlers? (§5)
// Runtime-agnostic (§0): fetch only, pure-function parser for testability.

import type { EngineRequestOptions } from '../engines/http';

/** The AI crawlers we care about. A site that blocks these is invisible to AI answers. */
export const AI_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot'] as const;
export type AiBot = (typeof AI_BOTS)[number];

export interface CrawlerAudit {
  checkedBots: string[]; // the bots we evaluated
  blockedBots: string[]; // subset that the site fully disallows
  robotsFound: boolean; // false if robots.txt was missing/unreachable (= nothing blocked)
}

interface RobotsGroup {
  agents: string[]; // lowercased user-agent tokens
  rules: Array<{ allow: boolean; path: string }>;
}

/** Parse robots.txt text and report which of `bots` are fully blocked (Disallow: /). */
export function parseRobots(text: string, bots: readonly string[] = AI_BOTS): CrawlerAudit {
  const groups = parseGroups(text);
  const blockedBots = bots.filter((bot) => isFullyBlocked(groups, bot));
  return { checkedBots: [...bots], blockedBots, robotsFound: true };
}

/** Fetch and audit `${origin}/robots.txt`. Never throws; a missing file = nothing blocked. */
export async function fetchRobots(
  origin: string,
  opts: EngineRequestOptions = {},
): Promise<CrawlerAudit> {
  const doFetch = opts.fetch ?? fetch;
  const url = `${origin.replace(/\/+$/, '')}/robots.txt`;
  try {
    const res = await doFetch(url, { signal: opts.signal });
    if (!res.ok) return { checkedBots: [...AI_BOTS], blockedBots: [], robotsFound: false };
    return parseRobots(await res.text());
  } catch {
    return { checkedBots: [...AI_BOTS], blockedBots: [], robotsFound: false };
  }
}

function parseGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasRule = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (current && lastWasRule) {
        groups.push(current);
        current = null;
      }
      if (!current) current = { agents: [], rules: [] };
      current.agents.push(value.toLowerCase());
      lastWasRule = false;
    } else if (key === 'disallow' || key === 'allow') {
      if (!current) current = { agents: ['*'], rules: [] };
      current.rules.push({ allow: key === 'allow', path: value });
      lastWasRule = true;
    }
    // sitemap/crawl-delay/host etc. are ignored
  }
  if (current) groups.push(current);
  return groups;
}

function isFullyBlocked(groups: RobotsGroup[], bot: string): boolean {
  const botLc = bot.toLowerCase();
  // Most specific applicable group: an exact UA match wins over the wildcard.
  const exact = groups.find((g) => g.agents.includes(botLc));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const group = exact ?? wildcard;
  if (!group) return false; // no rules apply -> crawlable

  const disallowAll = group.rules.some((r) => !r.allow && r.path === '/');
  const allowRoot = group.rules.some((r) => r.allow && r.path === '/');
  return disallowAll && !allowRoot;
}
