// Shared fetch helpers for engine adapters. Runtime-agnostic (§0): global
// `fetch` only — no axios/node-fetch, no Node built-ins.

/** Injectable fetch so adapters can be unit-tested offline without network/keys. */
export type FetchLike = typeof fetch;

export interface EngineRequestOptions {
  /** Override the default model for this engine. */
  model?: string;
  /** Abort/timeout signal passed straight to fetch. */
  signal?: AbortSignal;
  /** Inject a fetch implementation (defaults to global fetch). */
  fetch?: FetchLike;
}

export interface JsonResponse {
  ok: boolean;
  status: number;
  /** Parsed JSON body, or undefined if the body was not valid JSON. */
  data?: unknown;
  /** Human-readable failure reason; set only when ok is false. */
  error?: string;
}

/**
 * POST a JSON body and parse a JSON response. Never throws — network errors,
 * non-2xx status, and malformed JSON are all returned as { ok:false, error }.
 */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  opts: EngineRequestOptions = {},
): Promise<JsonResponse> {
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    return { ok: false, status: 0, error: `network error: ${messageOf(err)}` };
  }

  const text = await safeText(res);
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, data, error: `HTTP ${res.status}: ${truncate(text)}` };
  }
  return { ok: true, status: res.status, data };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function truncate(s: string, max = 300): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
