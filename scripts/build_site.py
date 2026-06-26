#!/usr/bin/env python3
"""
Build a static index.html from the daily brief archive.

Reads every briefs/YYYY-MM-DD.md file, renders the newest one prominently at
the top ("Today's brief") and lists the full history below as collapsible
day-by-day sections. All source article links from the markdown are preserved.

Writes:
  - index.html (project root) — open in any browser or serve via GitHub Pages.

Zero external deps — stdlib only. Designed to run in the same GitHub Actions
cron right after scripts/daily_brief.py, so the page is rebuilt every day.
"""

from __future__ import annotations

import datetime as dt
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRIEFS_DIR = ROOT / "briefs"
OUT_PATH = ROOT / "index.html"

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.md$")


# --- minimal markdown -> HTML for the brief format -------------------------

def _inline(text: str) -> str:
    """Render inline markdown: links, bold, italics, code. Escapes the rest."""
    # Protect link targets so we don't escape URLs, then rebuild as <a>.
    tokens: list[str] = []

    def stash(repl: str) -> str:
        tokens.append(repl)
        return f"\x00{len(tokens) - 1}\x00"

    # [text](url)
    def link_sub(m: re.Match) -> str:
        label = html.escape(m.group(1))
        url = html.escape(m.group(2), quote=True)
        return stash(f'<a href="{url}" target="_blank" rel="noopener">{label}</a>')

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_sub, text)

    # Escape everything still raw.
    text = html.escape(text)

    # Bold then italics then code (operate on escaped text; markers are ASCII).
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"<em>\1</em>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)

    # Restore stashed link HTML.
    for i, tok in enumerate(tokens):
        text = text.replace(f"\x00{i}\x00", tok)
    return text


def md_to_html(md: str) -> str:
    """Convert a single brief's markdown body to an HTML fragment."""
    out: list[str] = []
    in_list = False

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            out.append("</ul>")
            in_list = False

    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            close_list()
            continue
        if line.startswith("# "):
            close_list()
            out.append(f"<h2>{_inline(line[2:].strip())}</h2>")
        elif line.startswith("## "):
            close_list()
            out.append(f"<h3>{_inline(line[3:].strip())}</h3>")
        elif line.strip() == "---":
            close_list()
            out.append("<hr>")
        elif line.lstrip().startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{_inline(line.lstrip()[2:].strip())}</li>")
        else:
            close_list()
            out.append(f"<p>{_inline(line.strip())}</p>")
    close_list()
    return "\n".join(out)


# --- page assembly ---------------------------------------------------------

STYLE = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 760px; margin: 0 auto; padding: 1.25rem 1.1rem 4rem;
  color: #1a1a1a; background: #fafafa;
}
@media (prefers-color-scheme: dark) {
  body { color: #e8e8e8; background: #161616; }
  a { color: #6db3f2; }
  .card, details { background: #1f1f1f; border-color: #333; }
  .muted { color: #9a9a9a; }
}
header h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
.muted { color: #666; font-size: .9rem; }
a { color: #1462b8; }
h2 { font-size: 1.25rem; margin: 1.5rem 0 .25rem; }
h3 { font-size: 1.02rem; margin: 1.3rem 0 .4rem; padding-bottom: .2rem;
     border-bottom: 1px solid rgba(128,128,128,.25); }
ul { padding-left: 1.2rem; margin: .4rem 0; }
li { margin: .35rem 0; }
hr { border: none; border-top: 1px solid rgba(128,128,128,.25); margin: 1.5rem 0; }
.card { background: #fff; border: 1px solid #e3e3e3; border-radius: 12px;
        padding: 1rem 1.2rem; margin: 1rem 0; }
details { background: #fff; border: 1px solid #e3e3e3; border-radius: 10px;
          padding: .25rem .9rem; margin: .5rem 0; }
details > summary { cursor: pointer; font-weight: 600; padding: .55rem 0; list-style: none; }
details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: "▸ "; color: #888; }
details[open] > summary::before { content: "▾ "; }
.archive-h { margin-top: 2.5rem; }
footer { margin-top: 3rem; font-size: .82rem; }
"""


def build() -> str:
    files = sorted(
        (p for p in BRIEFS_DIR.glob("*.md") if DATE_RE.match(p.name)),
        key=lambda p: p.name,
        reverse=True,
    )
    now = dt.datetime.now(dt.timezone.utc)
    parts: list[str] = []

    parts.append("<!doctype html>")
    parts.append('<html lang="en"><head><meta charset="utf-8">')
    parts.append('<meta name="viewport" content="width=device-width, initial-scale=1">')
    parts.append("<title>Data Center News Brief</title>")
    parts.append(f"<style>{STYLE}</style></head><body>")

    parts.append("<header>")
    parts.append("<h1>Data Center News Brief</h1>")
    parts.append(
        '<p class="muted">Automated daily digest of U.S. data center news — '
        "zoning, power, leasing/M&amp;A, tax, regulation. Click any headline to "
        "read the source article.</p>"
    )
    parts.append(
        f'<p class="muted">Page rebuilt {now.strftime("%Y-%m-%d %H:%M UTC")} · '
        f"{len(files)} days archived.</p>"
    )
    parts.append("</header>")

    if not files:
        parts.append("<p>No briefs found yet.</p></body></html>")
        return "\n".join(parts)

    # Latest brief, rendered open at the top.
    latest = files[0]
    parts.append('<section class="card">')
    parts.append(md_to_html(latest.read_text(encoding="utf-8")))
    parts.append("</section>")

    # Full history.
    parts.append('<h2 class="archive-h">Full archive</h2>')
    for p in files[1:]:
        date = p.name[:-3]
        parts.append("<details>")
        parts.append(f"<summary>{html.escape(date)}</summary>")
        parts.append(md_to_html(p.read_text(encoding="utf-8")))
        parts.append("</details>")

    parts.append(
        '<footer class="muted">Generated by <code>scripts/build_site.py</code>. '
        "Each entry links out to the original reporting; verify before relying on a fact."
        "</footer>")
    parts.append("</body></html>")
    return "\n".join(parts)


def main() -> int:
    OUT_PATH.write_text(build(), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
