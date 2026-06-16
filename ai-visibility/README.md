# ai-visibility

Monorepo for the AI-Visibility product: does a business show up when people ask
AI engines (Perplexity, OpenAI) for a recommendation, and is its site ready for
AI crawlers? One runtime-agnostic engine (`packages/core`) feeds two apps.

## Status

| Part | Handoff prompts | State |
| --- | --- | --- |
| `packages/core` — the engine | 1–5 | ✅ built + tested offline |
| `apps/web` — Cloudflare Workers tool | 6–7 | ⬜ scaffold placeholder |
| `apps/shopify` — Remix app | 8–10 | ⬜ scaffold placeholder |

Apps 6–10 need Cloudflare/Shopify accounts and live Perplexity/OpenAI keys, so
they are deferred to a session where those exist. The core they import is proven.

## Hard constraints (do not relitigate)

- **§0 — `packages/core` is runtime-agnostic.** No Node built-ins (`fs`, `path`,
  `crypto`, `Buffer`, `process`). HTTP via global `fetch` only. **No env reads in
  core** — API keys are passed in as function arguments; the apps read env and
  inject. (`tsconfig.base.json` uses the `DOM` lib purely to type `fetch`/`URL`;
  no Node types are included.)
- **§8 — out of scope:** dashboards, historical charts, white-label, the v2 LLM
  detection pass, bulk copy rewriting, auth/accounts, payments for app #1.

## Layout

```
packages/core/src/
  engines/    perplexity.ts, openai.ts  — fetch-only adapters, never throw (error field)
  detection/  normalize.ts, mention.ts   — v1 substring mention/citation detection (+ __fixtures__)
  audit/      robots.ts, schema.ts, fixlist.ts — crawler + schema audits, ranked fix list
  scoring.ts  0–100 score (tunable weights, §4)
  index.ts    public surface: generateReport() + types
apps/web, apps/shopify  — near-empty workspace members
```

## Develop

```bash
pnpm install
pnpm -r build        # strict TS, must be clean
pnpm test            # 33 tests: detection fixtures, adapter mapping, audits, end-to-end report

# print a full VisibilityReport from fixture data:
pnpm --filter @ai-visibility/core exec tsx scratch/print-report.ts

# live engine smoke test (needs real keys — never run in CI):
PERPLEXITY_API_KEY=... OPENAI_API_KEY=... \
  pnpm --filter @ai-visibility/core exec tsx scratch/run-engines.ts "best emergency plumber in Tacoma WA"
```

## The public surface

Apps depend only on `@ai-visibility/core`'s exports: `generateReport()`, the
engine adapters (`queryPerplexity`, `queryOpenAI`), the audits (`fetchRobots`,
`detectSchema`, `generateLocalBusinessSchema`), and the data contracts
(`VisibilityReport`, `EngineResult`, `Business`, `MentionFinding`, `Fix`, …).
