// OpenAI adapter. OpenAI chat completions do not return citations, so we always
// return an empty citations[] (§4 — the `named` signal is what matters here).
// Contract (§7): a single failure returns an EngineResult with `error` set,
// never throws. Key comes in via EngineQuery.apiKey (§0).

import type { EngineQuery, EngineResult } from './types';
import { postJson, type EngineRequestOptions } from './http';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export async function queryOpenAI(
  query: EngineQuery,
  opts: EngineRequestOptions = {},
): Promise<EngineResult> {
  const base: EngineResult = {
    engine: 'openai',
    prompt: query.prompt,
    rawText: '',
    citations: [], // OpenAI returns none
  };

  const res = await postJson(
    OPENAI_URL,
    {
      model: opts.model ?? DEFAULT_MODEL,
      messages: [{ role: 'user', content: query.prompt }],
    },
    { authorization: `Bearer ${query.apiKey}` },
    opts,
  );

  if (!res.ok) return { ...base, error: res.error ?? 'request failed' };

  return { ...base, rawText: mapOpenAIResponse(res.data) };
}

/** Pure mapping from an OpenAI chat-completions body to the answer text. */
export function mapOpenAIResponse(data: unknown): string {
  const d = data as OpenAIBody | undefined;
  return d?.choices?.[0]?.message?.content ?? '';
}

interface OpenAIBody {
  choices?: Array<{ message?: { content?: string } }>;
}
