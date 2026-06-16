import { describe, it, expect } from 'vitest';
import { parseRobots, AI_BOTS } from './robots';
import { detectSchema, generateLocalBusinessSchema } from './schema';

describe('parseRobots', () => {
  it('flags a specifically-blocked bot only', () => {
    const a = parseRobots('User-agent: GPTBot\nDisallow: /');
    expect(a.blockedBots).toEqual(['GPTBot']);
    expect(a.checkedBots).toEqual([...AI_BOTS]);
  });

  it('a wildcard Disallow: / blocks all AI bots', () => {
    const a = parseRobots('User-agent: *\nDisallow: /');
    expect(a.blockedBots).toEqual([...AI_BOTS]);
  });

  it('an explicit Allow: / on a bot overrides a wildcard block', () => {
    const a = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /',
    );
    expect(a.blockedBots).not.toContain('ClaudeBot');
    expect(a.blockedBots).toContain('GPTBot');
  });

  it('empty / permissive robots blocks nothing', () => {
    expect(parseRobots('').blockedBots).toEqual([]);
    expect(parseRobots('User-agent: *\nDisallow:').blockedBots).toEqual([]);
  });
});

describe('detectSchema', () => {
  it('detects Product', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Widget',
    })}</script>`;
    const s = detectSchema(html);
    expect(s.hasProduct).toBe(true);
    expect(s.hasLocalBusiness).toBe(false);
  });

  it('detects LocalBusiness subtypes (e.g. Dentist) inside @graph', () => {
    const html = `<script type='application/ld+json'>${JSON.stringify({
      '@graph': [{ '@type': 'WebSite' }, { '@type': 'Dentist', name: 'Smile Co' }],
    })}</script>`;
    const s = detectSchema(html);
    expect(s.hasLocalBusiness).toBe(true);
    expect(s.types).toContain('Dentist');
  });

  it('reports nothing for a plain page and skips malformed JSON-LD', () => {
    expect(detectSchema('<html><body>hi</body></html>').types).toEqual([]);
    const bad = '<script type="application/ld+json">{ not json }</script>';
    expect(detectSchema(bad).types).toEqual([]);
  });

  it('generates a LocalBusiness block carrying the business details', () => {
    const block = generateLocalBusinessSchema({
      name: "Joe's Plumbing LLC",
      website: 'joesplumbing.com',
      city: 'Tacoma',
    });
    expect(block).toContain('"@type": "LocalBusiness"');
    expect(block).toContain("Joe's Plumbing LLC");
    expect(block).toContain('https://joesplumbing.com');
    expect(block).toContain('Tacoma');
  });
});
