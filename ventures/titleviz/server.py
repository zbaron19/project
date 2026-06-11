#!/usr/bin/env python3
"""TitleViz live extraction server — optional.

Python stdlib only. Serves the static app AND two endpoints:

    GET  /api/health   -> {"service": "titleviz", "key_present": bool}
    POST /api/extract  -> {"commitment": {...}}   (body: {"text": "..."})

Extraction calls the Anthropic Messages API via urllib using the
ANTHROPIC_API_KEY environment variable. Without the key, /api/health still
answers (so the UI can say "server found, no key") and /api/extract returns
a clear error.

Run:
    ANTHROPIC_API_KEY=sk-... python3 server.py [port]

The static app works without this server at all:
    python3 -m http.server          # demo-only mode; the app detects the
                                    # missing /api/health and degrades cleanly.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"
MAX_INPUT_CHARS = 120_000

SYSTEM_PROMPT = """You extract structure from U.S. title insurance commitments \
(ALTA 2021 form or similar). Return ONLY a JSON object, no prose, no code fences, \
with exactly this shape:

{
  "form": "<commitment form name, if stated>",
  "file_no": "<commitment/file number, if stated>",
  "effective_date": "<effective date string, if stated>",
  "schedule_a": {
    "policy_type": "...", "policy_amount": <number or null>,
    "proposed_insured": "...", "vesting": "...",
    "estate": "...", "legal_description": "...",
    "parcel_no": "...", "county": "...", "state": "..."
  },
  "requirements": [ {"number": 1, "text": "<full requirement text>", "afns": ["<recording numbers cited, digits only>"]} ],
  "exceptions": [ {"number": 1, "exception_class": "standard" | "special",
                   "heading": "<short caption you write, e.g. 'Easement — utilities (1998)'>",
                   "text": "<full exception text>",
                   "afns": ["<recording numbers cited>"]} ]
}

Rules:
- exception_class is "special" ONLY if the exception cites a recorded instrument
  (recording number / auditor's file number / book-page / volume-page of plats).
  General taxes not yet due, rights of parties in possession, survey matters,
  and unrecorded lien exceptions are "standard" and get "afns": [].
- Copy text verbatim; do not paraphrase, summarize, or omit.
- Put every recording number the item cites into "afns" as a string of digits
  (strip punctuation). Plat volume/page references: include the recording number
  if one is given, otherwise leave afns empty.
- If a field is absent from the text, use null or "".
- Output must be valid JSON and nothing else."""


def extract_with_api(text: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set on the server")

    payload = {
        "model": MODEL,
        "max_tokens": 8000,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": "Extract the commitment structure from the following text:\n\n"
                + text[:MAX_INPUT_CHARS],
            }
        ],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"API error {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Could not reach the API: {e.reason}") from e

    parts = [b.get("text", "") for b in body.get("content", []) if b.get("type") == "text"]
    raw = "".join(parts).strip()
    # Tolerate accidental code fences despite instructions.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        commitment = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Extraction did not return valid JSON: {e}") from e

    # Minimal shape validation so the front end never gets garbage.
    if not isinstance(commitment, dict):
        raise RuntimeError("Extraction returned a non-object")
    commitment.setdefault("schedule_a", {})
    commitment.setdefault("requirements", [])
    commitment.setdefault("exceptions", [])
    for i, exc in enumerate(commitment["exceptions"], 1):
        exc.setdefault("number", i)
        exc.setdefault("afns", [])
        if exc.get("exception_class") not in ("standard", "special"):
            exc["exception_class"] = "special" if exc["afns"] else "standard"
        exc["afns"] = [str(a) for a in exc["afns"]]
    for i, req in enumerate(commitment["requirements"], 1):
        req.setdefault("number", i)
        req.setdefault("afns", [])
        req["afns"] = [str(a) for a in req["afns"]]
    return commitment


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_json(self, obj: dict, status: int = 200) -> None:
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802 (stdlib naming)
        if self.path.split("?")[0] == "/api/health":
            self._send_json(
                {
                    "service": "titleviz",
                    "key_present": bool(os.environ.get("ANTHROPIC_API_KEY", "").strip()),
                }
            )
            return
        super().do_GET()

    def do_POST(self):  # noqa: N802
        if self.path.split("?")[0] != "/api/extract":
            self._send_json({"error": "Unknown endpoint"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            text = str(body.get("text", "")).strip()
            if len(text) < 40:
                self._send_json({"error": "Paste the full commitment text (too short)."}, 400)
                return
            commitment = extract_with_api(text)
            self._send_json({"commitment": commitment})
        except RuntimeError as e:
            self._send_json({"error": str(e)}, 503)
        except Exception as e:  # last-resort guard; never crash the demo
            self._send_json({"error": f"Server error: {e}"}, 500)

    def log_message(self, fmt, *args):
        sys.stderr.write("[titleviz] %s\n" % (fmt % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    key = "set" if os.environ.get("ANTHROPIC_API_KEY") else "NOT set (extract disabled)"
    print(f"TitleViz live server on http://localhost:{port}  (ANTHROPIC_API_KEY {key})")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
