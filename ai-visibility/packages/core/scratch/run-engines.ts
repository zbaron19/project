// Live smoke test for the engine adapters (Prompt 4 verification).
//
// This lives OUTSIDE packages/core/src on purpose: it reads process.env, which
// core must never do (§0). Run it with real keys to see one real EngineResult
// from each engine. It is NOT run in CI / the container (no keys here).
//
// Usage (from packages/core):
//   PERPLEXITY_API_KEY=... OPENAI_API_KEY=... npx tsx scratch/run-engines.ts "best emergency plumber in Tacoma WA"

import { queryPerplexity } from '../src/engines/perplexity';
import { queryOpenAI } from '../src/engines/openai';

async function main() {
  const prompt = process.argv[2] ?? 'best emergency plumber in Tacoma WA';
  const pplxKey = process.env.PERPLEXITY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (pplxKey) {
    const r = await queryPerplexity({ prompt, apiKey: pplxKey });
    console.log('\n=== Perplexity ===');
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log('\n(skipping Perplexity — set PERPLEXITY_API_KEY)');
  }

  if (openaiKey) {
    const r = await queryOpenAI({ prompt, apiKey: openaiKey });
    console.log('\n=== OpenAI ===');
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log('\n(skipping OpenAI — set OPENAI_API_KEY)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
