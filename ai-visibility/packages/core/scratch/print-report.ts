// Demo: print a full VisibilityReport from fixture data (Prompt 5 verification).
//   npx tsx scratch/print-report.ts
import { generateReport, parseRobots, detectSchema, generateLocalBusinessSchema } from '../src/index';
import type { EngineResult, Business } from '../src/index';

const business: Business = { name: "Joe's Plumbing LLC", website: 'joesplumbing.com', city: 'Tacoma' };
const engineResults: EngineResult[] = [
  { engine: 'perplexity', prompt: 'best emergency plumber in Tacoma WA',
    rawText: "For emergencies in Tacoma, Joe's Plumbing is a top pick with 24/7 service.",
    citations: [{ url: 'https://joesplumbing.com', title: "Joe's Plumbing" }, { url: 'https://tacomaplumbingpros.com' }] },
  { engine: 'openai', prompt: 'best emergency plumber in Tacoma WA',
    rawText: 'Reliable Tacoma plumbers include several licensed local shops.', citations: [] },
];
const report = generateReport({
  business, engineResults,
  crawler: parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:'),
  schema: detectSchema('<html><body>no structured data here</body></html>'),
  now: () => '2026-06-16T12:00:00.000Z',
});
console.log(JSON.stringify(report, null, 2));
console.log('\n--- suggested LocalBusiness schema fix ---');
console.log(generateLocalBusinessSchema(business));
