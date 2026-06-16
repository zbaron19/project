// Perplexity adapter. Perplexity returns citations natively, so we map them.
// Contract (§7): a single engine failure returns an EngineResult with `error`
// set — it never throws. Key comes in via EngineQuery.apiKey (§0).

import type { EngineQuery, EngineResult, Citation } from './types';
import { postJson, type EngineRequestOptions } from './http';

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const DEFAULT_MODEL = 'sonar';

export async function queryPerplexity(
  query: EngineQuery,
  opts: EngineRequestOptions = {},
): Promise<EngineResult> {
  const base: EngineResult = {
    engine: 'perplexity',
    prompt: query.prompt,
    rawText: '',
    citations: [],
  };

  const res = await postJson(
    PERPLEXITY_URL,
    {
      model: opts.model ?? DEFAULT_MODEL,
      messages: [{ role: 'user', content: query.prompt }],
    },
    { authorization: `Bearer ${query.apiKey}` },
    opts,
  );

  if (!res.ok) return { ...base, error: res.error ?? 'request failed' };

  return { ...base, ...mapPerplexityResponse(res.data) };
}

/** Pure mapping from a Perplexity response body to EngineResult fields. */
export function mapPerplexityResponse(data: unknown): Pick<EngineResult, 'rawText' | 'citations'> {
  const d = data as PerplexityBody | undefined;
  const rawText = d?.choices?.[0]?.message?.content ?? '';

  // Prefer search_results (carries titles); fall back to the legacy citations[] of bare URLs.
  let citations: Citation[] = [];
  if (Array.isArray(d?.search_results)) {
    citations = d!.search_results
      .map((r) => r as { url?: unknown; title?: unknown })
      .filter((r): r is { url: string; title?: unknown } => typeof r.url === 'string')
      .map((r) => (typeof r.title === 'string' ? { url: r.url, title: r.title } : { url: r.url }));
  } else if (Array.isArray(d?.citations)) {
    citations = d!.citations.filter((u): u is string => typeof u === 'string').map((url) => ({ url }));
  }

  return { rawText, citations };
}

interface PerplexityBody {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: unknown[];
  search_results?: unknown[];
}
