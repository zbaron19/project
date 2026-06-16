import { describe, it, expect } from 'vitest';
import { generateReport } from './index';
import { parseRobots } from './audit/robots';
import { detectSchema } from './audit/schema';
import type { Business } from './detection/types';
import type { EngineResult } from './engines/types';

const business: Business = {
  name: "Joe's Plumbing LLC",
  website: 'joesplumbing.com',
  city: 'Tacoma',
};

const engineResults: EngineResult[] = [
  {
    engine: 'perplexity',
    prompt: 'best emergency plumber in Tacoma WA',
    rawText: "Joe's Plumbing is a great 24/7 option.",
    citations: [{ url: 'https://joesplumbing.com' }],
  },
  {
    engine: 'openai',
    prompt: 'best emergency plumber in Tacoma WA',
    rawText: "Joe's Plumbing is reliable for emergencies.",
    citations: [],
  },
];

describe('generateReport (end-to-end, fixture data)', () => {
  const report = generateReport({
    business,
    engineResults,
    crawler: parseRobots('User-agent: GPTBot\nDisallow: /'), // GPTBot blocked
    schema: detectSchema('<html><body>no structured data</body></html>'), // none
    now: () => '2026-06-16T00:00:00.000Z',
  });

  it('scores: perplexity cited (+40) + openai named (+15), crawler dirty, no schema = 55', () => {
    expect(report.score).toBe(55);
  });

  it('produces one finding per engine result', () => {
    expect(report.findings).toHaveLength(2);
    expect(report.findings.find((f) => f.engine === 'perplexity')?.cited).toBe(true);
    expect(report.findings.find((f) => f.engine === 'openai')?.named).toBe(true);
  });

  it('ranks the blocked-crawler fix first (critical), then the missing-schema fix', () => {
    expect(report.fixes[0]?.id).toBe('crawler-blocked-gptbot');
    expect(report.fixes[0]?.severity).toBe('critical');
    expect(report.fixes.map((f) => f.id)).toContain('schema-missing');
    // it IS cited and named, so those two fixes should be absent
    expect(report.fixes.map((f) => f.id)).not.toContain('not-cited');
    expect(report.fixes.map((f) => f.id)).not.toContain('not-named');
  });

  it('stamps the injected timestamp', () => {
    expect(report.generatedAt).toBe('2026-06-16T00:00:00.000Z');
  });
});
