#!/usr/bin/env python3
"""
Weekly Edition composer for The Interconnect.

Gathers the week's raw material — the last 7 daily briefs (briefs/) and the
last 7 jurisdiction signals files (interconnect/signals/) — and assembles a
draft of the paid weekly edition with the standing sections:

  1. The Lead            (you write this — the week's one big judgment call)
  2. Docket Radar        (pre-filled from jurisdiction signals; you curate)
  3. Tariff Tracker      (pre-filled from briefs' power/regulatory items)
  4. Heat Index          (from pipeline/state/heat_index.json; you adjust)
  5. Where the Load Goes Next  (you write this)

If ANTHROPIC_API_KEY is set, an optional Claude pass drafts "what it means"
analysis bullets for the top items — a scaffold you then edit. Without a key,
the script degrades to a pure assembly job. Either way the human is the byline;
the output file is a DRAFT until you've edited it.

Usage:
  python3 interconnect/pipeline/weekly_edition.py            # assemble draft
  python3 interconnect/pipeline/weekly_edition.py --no-api   # skip Claude pass

Stdlib only.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # interconnect/
REPO = ROOT.parent                                     # project repo root
BRIEFS_DIR = REPO / "briefs"
SIGNALS_DIR = ROOT / "signals"
EDITIONS_DIR = ROOT / "editions"
HEAT_INDEX_PATH = ROOT / "pipeline" / "state" / "heat_index.json"

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = os.environ.get("INTERCONNECT_MODEL", "claude-opus-4-8")

# Seed Heat Index. 0 = wide open, 10 = effectively closed. Edit the JSON state
# file (created on first run) — never this seed — to update scores.
HEAT_SEED = {
    "Loudoun County, VA": {"score": 9, "note": "Functionally built out; politics hardening"},
    "Prince William County, VA": {"score": 8, "note": "Digital Gateway litigation overhang"},
    "Fauquier County, VA": {"score": 6, "note": "Posture forming; watch comp plan"},
    "Culpeper County, VA": {"score": 4, "note": "Approving, with conditions"},
    "Frederick County, MD": {"score": 5, "note": "Zoning rewrite in progress"},
    "Atlanta south metro, GA": {"score": 3, "note": "Open for business; water questions"},
    "Phoenix metro, AZ": {"score": 5, "note": "Power available, water politics rising"},
    "San Antonio, TX": {"score": 3, "note": "ERCOT speed; SB 6 curtailment rules"},
    "DFW north, TX": {"score": 3, "note": "Aggressive incentives"},
    "Central Ohio": {"score": 4, "note": "AEP tariff adds cost certainty, less speed"},
    "Council Bluffs / Omaha": {"score": 4, "note": "Utility capacity is the gate"},
    "Central Washington": {"score": 6, "note": "Hydro spoken for; PUD rate design"},
    "Umatilla / Morrow, OR": {"score": 4, "note": "Incentive renegotiation risk"},
    "Cheyenne, WY": {"score": 3, "note": "Land + gas; watch project pauses"},
    "Memphis, TN": {"score": 5, "note": "Air permits and MLGW capacity"},
}

WEEK_DAYS = 7
POWER_SECTIONS = ("Power, utility & grid", "Regulation & litigation",
                  "Tax incentives & economic development")


def last_n_files(directory: Path, n: int) -> list[Path]:
    if not directory.exists():
        return []
    dated = sorted(p for p in directory.glob("2*.md"))
    return dated[-n:]


def extract_section(md: str, heading: str) -> list[str]:
    """Return the bullet lines under '## <heading>' in a daily brief."""
    pattern = rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)"
    m = re.search(pattern, md, re.M | re.S)
    if not m:
        return []
    bullets = [ln for ln in m.group(1).splitlines()
               if ln.startswith("- ") and "Nothing notable" not in ln]
    return bullets


def load_heat_index() -> dict:
    if HEAT_INDEX_PATH.exists():
        return json.loads(HEAT_INDEX_PATH.read_text())
    HEAT_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    HEAT_INDEX_PATH.write_text(json.dumps(HEAT_SEED, indent=1, sort_keys=True))
    return dict(HEAT_SEED)


def claude_draft(material: str) -> str:
    """Optional Claude pass: draft 'what it means' bullets from the raw items."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return ""
    prompt = (
        "You are the research assistant for The Interconnect, a paid weekly "
        "intelligence brief on U.S. data center site selection, zoning, power, "
        "and incentives, written by a practitioner. From the raw items below, "
        "pick the 3-5 that matter most to a data center developer's site "
        "selection team and for each write: a one-line restatement, then a "
        "2-3 sentence 'What it means' note focused on siting/entitlement/"
        "power-cost consequences. Plain prose, no hype, no markdown headers — "
        "just '- **Item** — what it means...' bullets. These are DRAFTS a "
        "practitioner will edit; flag uncertainty plainly.\n\n=== RAW ITEMS ===\n"
        + material
    )
    body = json.dumps({
        "model": MODEL,
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        API_URL, data=body, method="POST",
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
        return "\n".join(b.get("text", "") for b in data.get("content", [])
                         if b.get("type") == "text").strip()
    except Exception as e:  # API drafting is optional; never block the edition
        print(f"warning: Claude drafting pass skipped ({type(e).__name__}: {e})",
              file=sys.stderr)
        return ""


def main() -> int:
    use_api = "--no-api" not in sys.argv
    today = dt.date.today()
    edition_id = today.isoformat()

    briefs = last_n_files(BRIEFS_DIR, WEEK_DAYS)
    signals = last_n_files(SIGNALS_DIR, WEEK_DAYS)

    tariff_bullets: list[str] = []
    for p in briefs:
        md = p.read_text()
        for sec in POWER_SECTIONS:
            tariff_bullets += extract_section(md, sec)
    # Dedup, preserve order
    seen: set[str] = set()
    tariff_bullets = [b for b in tariff_bullets
                      if not (b in seen or seen.add(b))]

    signal_blocks = []
    for p in signals:
        body = p.read_text().split("## Manual checks")[0]
        bullets = [ln for ln in body.splitlines()
                   if ln.startswith("- **[") ]
        signal_blocks += bullets

    heat = load_heat_index()

    analysis = ""
    if use_api and (tariff_bullets or signal_blocks):
        material = "\n".join(signal_blocks + tariff_bullets[:40])
        analysis = claude_draft(material)

    lines = [
        f"# The Interconnect — Weekly Edition (DRAFT) — {edition_id}",
        "",
        "> DRAFT assembled by `weekly_edition.py`. Edit every section before",
        "> sending. You are the byline; the pipeline is the research assistant.",
        "",
        "## The Lead",
        "",
        "_[Write the week's one big judgment call here — the thing a site",
        "selection VP would forward. If nothing rises to a lead, the best",
        "Docket Radar item becomes the lead.]_",
        "",
        "## Docket Radar",
        "",
        "_County-level items caught before they're news. Curate, verify each",
        "agenda link, add hearing dates._",
        "",
    ]
    lines += signal_blocks or ["- _No automated signals this week — pull from the manual-check list in LATEST_SIGNALS.md._"]
    lines += [
        "",
        "## Tariff Tracker",
        "",
        "_Large-load tariff, interconnection, and incentive proceedings. Keep",
        "only what moved this week; one 'if this passes' line each._",
        "",
    ]
    lines += tariff_bullets[:15] or ["- _Nothing captured from the dailies — check the regulatory watch list._"]

    if analysis:
        lines += ["", "## What It Means (model draft — edit ruthlessly)", "", analysis]

    lines += [
        "",
        "## Heat Index",
        "",
        "_0 = wide open · 10 = effectively closed. Update `pipeline/state/heat_index.json`",
        "when a signal moves a score; note the change here._",
        "",
        "| Jurisdiction | Score | Note |",
        "|---|---|---|",
    ]
    for name, v in sorted(heat.items(), key=lambda kv: -kv[1]["score"]):
        lines.append(f"| {name} | {v['score']} | {v['note']} |")

    lines += [
        "",
        "## Where the Load Goes Next",
        "",
        "_[Your call: when this week's tightening market squeezes, name the",
        "jurisdictions that benefit, and why. This section is the moat.]_",
        "",
        "---",
        "*The Interconnect is market intelligence compiled from public sources.",
        "It is not legal advice and does not create an attorney-client",
        "relationship. Verify primary sources before acting.*",
        "",
    ]

    EDITIONS_DIR.mkdir(parents=True, exist_ok=True)
    out = EDITIONS_DIR / f"{edition_id}-DRAFT.md"
    out.write_text("\n".join(lines))
    print(f"Draft edition written to {out}")
    print("Edit The Lead and Where the Load Goes Next, curate the Radar, then ship it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
