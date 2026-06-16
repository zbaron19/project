import { describe, it, expect } from 'vitest';
import type { FetchLike } from './http';
import {
  queryPerplexity,
  mapPerplexityResponse,
} from './perplexity';
import { queryOpenAI, mapOpenAIResponse } from './openai';

// Build a fetch that returns a fixed JSON body + status, without touching the network.
function mockFetch(body: unknown, status = 200): FetchLike {
  return (async () => new Response(JSON.stringify(body), { status })) as FetchLike;
}
// A fetch that simulates a network-layer failure.
const throwingFetch: FetchLike = (async () => {
  throw new TypeError('fetch failed');
}) as FetchLike;

describe('perplexity response mapping', () => {
  it('maps search_results (with titles) to citations', () => {
    const out = mapPerplexityResponse({
      choices: [{ message: { content: 'Joe’s Plumbing is great.' } }],
      search_results: [
        { url: 'https://joesplumbing.com', title: 'Joe’s Plumbing' },
        { url: 'https://rival.com' },
      ],
    });
    expect(out.rawText).toContain('Plumbing');
    expect(out.citations).toEqual([
      { url: 'https://joesplumbing.com', title: 'Joe’s Plumbing' },
      { url: 'https://rival.com' },
    ]);
  });

  it('falls back to legacy citations[] of bare URLs', () => {
    const out = mapPerplexityResponse({
      choices: [{ message: { content: 'answer' } }],
      citations: ['https://joesplumbing.com', 'https://rival.com'],
    });
    expect(out.citations).toEqual([
      { url: 'https://joesplumbing.com' },
      { url: 'https://rival.com' },
    ]);
  });

  it('tolerates an empty/garbage body', () => {
    expect(mapPerplexityResponse(undefined)).toEqual({ rawText: '', citations: [] });
    expect(mapPerplexityResponse({})).toEqual({ rawText: '', citations: [] });
  });
});

describe('openai response mapping', () => {
  it('extracts the message content', () => {
    expect(mapOpenAIResponse({ choices: [{ message: { content: 'hello' } }] })).toBe('hello');
  });
  it('returns empty string on a missing body', () => {
    expect(mapOpenAIResponse(undefined)).toBe('');
  });
});

describe('queryPerplexity (mocked fetch)', () => {
  it('returns a populated EngineResult on success', async () => {
    const r = await queryPerplexity(
      { prompt: 'best plumber in Tacoma', apiKey: 'test' },
      {
        fetch: mockFetch({
          choices: [{ message: { content: 'Joe’s Plumbing.' } }],
          search_results: [{ url: 'https://joesplumbing.com', title: 'Joe' }],
        }),
      },
    );
    expect(r.engine).toBe('perplexity');
    expect(r.error).toBeUndefined();
    expect(r.citations).toHaveLength(1);
  });

  it('sets error (never throws) on non-2xx', async () => {
    const r = await queryPerplexity(
      { prompt: 'x', apiKey: 'bad' },
      { fetch: mockFetch({ error: 'unauthorized' }, 401) },
    );
    expect(r.error).toMatch(/HTTP 401/);
    expect(r.rawText).toBe('');
    expect(r.citations).toEqual([]);
  });

  it('sets error (never throws) on a network failure', async () => {
    const r = await queryPerplexity({ prompt: 'x', apiKey: 'k' }, { fetch: throwingFetch });
    expect(r.error).toMatch(/network error/);
  });
});

describe('queryOpenAI (mocked fetch)', () => {
  it('returns rawText with an always-empty citations[]', async () => {
    const r = await queryOpenAI(
      { prompt: 'best plumber in Tacoma', apiKey: 'test' },
      { fetch: mockFetch({ choices: [{ message: { content: 'Joe’s Plumbing.' } }] }) },
    );
    expect(r.engine).toBe('openai');
    expect(r.rawText).toContain('Plumbing');
    expect(r.citations).toEqual([]);
    expect(r.error).toBeUndefined();
  });

  it('sets error (never throws) on non-2xx', async () => {
    const r = await queryOpenAI(
      { prompt: 'x', apiKey: 'bad' },
      { fetch: mockFetch({ error: { message: 'no' } }, 429) },
    );
    expect(r.error).toMatch(/HTTP 429/);
  });
});
