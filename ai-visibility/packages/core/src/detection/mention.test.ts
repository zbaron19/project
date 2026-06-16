import { describe, it, expect } from 'vitest';
import type { EngineResult } from '../engines/types';
import type { Business } from './types';
import { analyzeMention } from './mention';

import cleanNamedCited from './__fixtures__/clean-named-cited.json';
import namedNotCited from './__fixtures__/named-not-cited.json';
import citedNotNamed from './__fixtures__/cited-not-named.json';
import wrongBusinessSameName from './__fixtures__/wrong-business-same-name.json';
import competitorOnly from './__fixtures__/competitor-only.json';
import emptyCitations from './__fixtures__/empty-citations.json';
import coreNameOnly from './__fixtures__/core-name-only.json';
import domainWwwVariants from './__fixtures__/domain-www-variants.json';
import openaiNamedNoCitations from './__fixtures__/openai-named-no-citations.json';
import engineError from './__fixtures__/engine-error.json';

const BUSINESS: Business = {
  name: "Joe's Plumbing LLC",
  website: 'joesplumbing.com',
  city: 'Tacoma',
};

const fx = (j: unknown): EngineResult => j as EngineResult;

describe('analyzeMention — v1 substring detection', () => {
  it('clean named + cited: both signals fire, exact-name confidence', () => {
    const f = analyzeMention(BUSINESS, fx(cleanNamedCited));
    expect(f.named).toBe(true);
    expect(f.cited).toBe(true);
    expect(f.confidence).toBe(0.9);
    expect(f.competitorsCited).toEqual(['tacomaplumbingpros.com']);
  });

  it('named but not cited: name in text, own domain absent from citations', () => {
    const f = analyzeMention(BUSINESS, fx(namedNotCited));
    expect(f.named).toBe(true);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0.9);
    expect(f.competitorsCited).toEqual(['rapidrooter.com', 'tacomaplumbingpros.com']);
  });

  it('cited but not named: domain in citations, name absent from text', () => {
    const f = analyzeMention(BUSINESS, fx(citedNotNamed));
    expect(f.cited).toBe(true);
    expect(f.named).toBe(false);
    expect(f.confidence).toBe(0);
    expect(f.competitorsCited).toEqual([]);
  });

  it('wrong business, same name: v1 cannot disambiguate -> named true (known v1 limitation; v2 LLM pass would catch)', () => {
    const f = analyzeMention(BUSINESS, fx(wrongBusinessSameName));
    expect(f.named).toBe(true);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0.9);
    expect(f.competitorsCited).toEqual(['miamijoesplumbing.example']);
  });

  it('competitor only: neither signal fires, competitors collected', () => {
    const f = analyzeMention(BUSINESS, fx(competitorOnly));
    expect(f.named).toBe(false);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0);
    expect(f.competitorsCited).toEqual(['rapidrooter.com', 'tacomaplumbingpros.com']);
  });

  it('empty citations: named from text, cited false, no competitors', () => {
    const f = analyzeMention(BUSINESS, fx(emptyCitations));
    expect(f.named).toBe(true);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0.9);
    expect(f.competitorsCited).toEqual([]);
  });

  it('core-name only ("Joe’s" without "Plumbing"): weaker 0.6 confidence', () => {
    const f = analyzeMention(BUSINESS, fx(coreNameOnly));
    expect(f.named).toBe(true);
    expect(f.confidence).toBe(0.6);
    expect(f.cited).toBe(false);
  });

  it('domain normalization: scheme/WWW/case/path/query/fragment all collapse to a citation match', () => {
    const f = analyzeMention(BUSINESS, fx(domainWwwVariants));
    expect(f.cited).toBe(true);
    expect(f.named).toBe(false);
    expect(f.competitorsCited).toEqual([]);
  });

  it('openai with no citations: named only (OpenAI returns no citations)', () => {
    const f = analyzeMention(BUSINESS, fx(openaiNamedNoCitations));
    expect(f.engine).toBe('openai');
    expect(f.named).toBe(true);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0.9);
  });

  it('errored engine result: detection degrades to no signal, never throws', () => {
    const f = analyzeMention(BUSINESS, fx(engineError));
    expect(f.named).toBe(false);
    expect(f.cited).toBe(false);
    expect(f.confidence).toBe(0);
    expect(f.competitorsCited).toEqual([]);
  });

  it('business without a website: cited is always false, but competitors still collected', () => {
    const noSite: Business = { name: "Joe's Plumbing LLC", city: 'Tacoma' };
    const f = analyzeMention(noSite, fx(cleanNamedCited));
    expect(f.cited).toBe(false);
    expect(f.competitorsCited).toEqual(['joesplumbing.com', 'tacomaplumbingpros.com']);
  });
});
