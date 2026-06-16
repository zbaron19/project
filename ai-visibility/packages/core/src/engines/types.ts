// Load-bearing contracts for AI-engine adapters. Everything conforms to these.
// Runtime-agnostic (§0): no Node types here, keys flow in as arguments.

export interface EngineQuery {
  prompt: string; // e.g. "best emergency plumber in Tacoma WA"
  // keys injected by caller, never read from env inside core:
  apiKey: string;
}

export interface Citation {
  url: string;
  title?: string;
}

export interface EngineResult {
  engine: 'perplexity' | 'openai';
  prompt: string;
  rawText: string; // full model answer
  citations: Citation[]; // empty array if engine returns none
  error?: string; // set on failure; caller decides retry/skip
}
