#!/usr/bin/env python3
"""CrossCheck optional live-mode server.

Serves the static app and adds two endpoints:

    GET  /api/health   -> {"live": true|false}   (true when ANTHROPIC_API_KEY is set)
    POST /api/extract  -> {"provisions": [...]}  (clause extraction from pasted text)

Python standard library only. The app degrades gracefully without this server —
`python3 -m http.server` serves the full demo experience; this adds extraction of
pasted document text via the Anthropic Messages API.

Usage:
    export ANTHROPIC_API_KEY=...   # optional; without it, /api/health reports live: false
    python3 server.py [port]       # default port 8000
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"
MAX_INPUT_CHARS = 120_000

SYSTEM_PROMPT = """You are a clause-extraction engine inside CrossCheck, a lease
diligence tool used by licensed attorneys. You produce a provision inventory from
the text of a single commercial lease document. You do not give legal advice and
you do not draw conclusions; you locate and quote provisions for attorney review.

Return ONLY a JSON object, no prose and no code fences, with this shape:

{
  "provisions": [
    {
      "section": "string — the section or paragraph cite as it appears (e.g. \\"Section 4.1\\", \\"Paragraph 6\\")",
      "label": "string — short neutral description (e.g. \\"Base Rent schedule\\")",
      "category": "one of: rent, term, renewal, deposit, opex, assignment, other",
      "quote": "string — the key operative language, quoted verbatim, <= 60 words"
    }
  ]
}

Rules:
- Quote verbatim; never paraphrase inside "quote".
- Prefer economic and term provisions (rent, term/expiration, renewal options,
  security deposit, operating-expense caps) plus assignment.
- If the document is an estoppel certificate, treat each certification paragraph
  as a provision and label it as a certification.
- If nothing is extractable, return {"provisions": []}.
"""


def extract_provisions(text: str, doc_type: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set on the server")

    body = {
        "model": MODEL,
        "max_tokens": 4096,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Document type (user-selected): {doc_type}\n\n"
                    f"Document text:\n\n{text[:MAX_INPUT_CHARS]}"
                ),
            }
        ],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"API error {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error reaching the API: {e.reason}") from e

    if payload.get("stop_reason") == "refusal":
        raise RuntimeError("The model declined this request.")

    text_out = "".join(
        block.get("text", "")
        for block in payload.get("content", [])
        if block.get("type") == "text"
    ).strip()

    # Tolerate accidental code fences despite instructions.
    if text_out.startswith("```"):
        text_out = text_out.strip("`")
        if text_out.lower().startswith("json"):
            text_out = text_out[4:]
        text_out = text_out.strip()

    parsed = json.loads(text_out)
    provisions = parsed.get("provisions", [])
    if not isinstance(provisions, list):
        raise RuntimeError("Unexpected extraction shape from the model")
    return {"provisions": provisions}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_json(self, code: int, obj: dict) -> None:
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/health":
            live = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
            self._send_json(200, {"live": live, "mode": "live" if live else "static"})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/extract":
            self._send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            req = json.loads(raw.decode("utf-8"))
            text = (req.get("text") or "").strip()
            doc_type = (req.get("docType") or "other").strip()
            if not text:
                self._send_json(400, {"error": "no document text provided"})
                return
            result = extract_provisions(text, doc_type)
            self._send_json(200, result)
        except RuntimeError as e:
            self._send_json(502, {"error": str(e)})
        except json.JSONDecodeError:
            self._send_json(502, {"error": "could not parse the extraction result"})
        except Exception as e:  # last-resort guard; keep the server up
            self._send_json(500, {"error": f"server error: {e}"})

    def log_message(self, fmt, *args):
        sys.stderr.write("[crosscheck] %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    live = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
    print(f"CrossCheck serving {ROOT}")
    print(f"  http://localhost:{port}/  (live extraction: {'ON' if live else 'off — set ANTHROPIC_API_KEY to enable'})")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
