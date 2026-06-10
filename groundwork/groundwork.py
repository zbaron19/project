#!/usr/bin/env python3
"""Groundwork — data center site diligence reports from a curated knowledge base.

Usage:
  python3 groundwork.py --list                 List seeded markets with scores
  python3 groundwork.py loudoun                Generate a screening report (md + html)
  python3 groundwork.py --compare              Cross-market comparison table
  python3 groundwork.py --checklist            Blank client-ready diligence checklist

Dependency-free by design: runs anywhere Python 3 runs.
Everything generated is a SCREENING aid — verify against primary sources before reliance.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPORTS = HERE / "reports"

WEIGHTS = {"power": 0.35, "entitlement": 0.20, "water": 0.15, "incentives": 0.15, "political": 0.15}
FACTOR_LABELS = {
    "power": "Power & Utility",
    "entitlement": "Entitlement Climate",
    "water": "Water & Cooling",
    "incentives": "Tax & Incentives",
    "political": "Political / Community",
}

DISCLAIMER = (
    "This report is a screening framework generated from a curated knowledge base, "
    "compiled from general industry knowledge as of early 2026. It is not legal advice, "
    "and no statement in it should be relied on without verification against primary "
    "sources (utility tariffs and filings, county code, session law, title records). "
    "Verification and deal-specific counsel are the engagement."
)


def load(name):
    with open(HERE / name, encoding="utf-8") as f:
        return json.load(f)


def composite(scores):
    return round(sum(scores[k] * w for k, w in WEIGHTS.items()), 1)


def bar(score, width=10):
    filled = round(score)
    return "█" * filled + "░" * (width - filled)


def find_market(markets, query):
    q = query.lower()
    for m in markets:
        if q == m["id"] or q in m["name"].lower():
            return m
    return None


def cmd_list(markets):
    print(f"\n  GROUNDWORK — seeded markets ({len(markets)})\n")
    ranked = sorted(markets, key=lambda m: composite(m["scores"]), reverse=True)
    for m in ranked:
        c = composite(m["scores"])
        print(f"  {c:>4}  {bar(c)}  {m['id']:<10} {m['name']}")
    print("\n  Composite = power 35% · entitlement 20% · water 15% · incentives 15% · political 15%")
    print("  Generate a report:  python3 groundwork.py <id>\n")


def cmd_compare(markets):
    cols = list(WEIGHTS)
    header = f"{'Market':<34}" + "".join(f"{FACTOR_LABELS[c].split()[0]:>12}" for c in cols) + f"{'Composite':>12}"
    print("\n" + header)
    print("-" * len(header))
    for m in sorted(markets, key=lambda m: composite(m["scores"]), reverse=True):
        row = f"{m['name'][:32]:<34}" + "".join(f"{m['scores'][c]:>12}" for c in cols)
        print(row + f"{composite(m['scores']):>12}")
    print()


def checklist_md(checklist, market=None):
    lines = []
    for ws in checklist["workstreams"]:
        lines.append(f"\n## {ws['title']}  *(weight: {int(ws['weight'] * 100)}%)*\n")
        if ws.get("intro"):
            lines.append(f"> {ws['intro']}\n")
        for it in ws["items"]:
            lines.append(f"- [ ] **{it['item']}**")
            lines.append(f"  - *Why it matters:* {it['why']}")
            lines.append(f"  - *Red flags:* {it['red_flags']}")
        lines.append("")
    return "\n".join(lines)


def report_md(m, checklist):
    today = datetime.date.today().isoformat()
    s = m["scores"]
    c = composite(s)
    lines = [
        f"# Groundwork Screening Report — {m['name']}",
        f"\n*Generated {today} · Composite score: **{c} / 10***\n",
        f"> {DISCLAIMER}\n",
        "## Market Profile\n",
        m["profile"],
        "\n## Scorecard\n",
        "| Factor | Score | |",
        "|---|---|---|",
    ]
    for k in WEIGHTS:
        lines.append(f"| {FACTOR_LABELS[k]} | {s[k]}/10 | `{bar(s[k])}` |")
    lines += [
        f"| **Composite** | **{c}/10** | `{bar(c)}` |",
        "\n## Power & Utility\n",
        f"**Serving utility:** {m['utility']} · **Grid:** {m['grid']}\n",
        m["power_outlook"],
        "\n## Entitlement Climate\n",
        m["zoning_posture"],
        "\n## Water & Cooling\n",
        m["water"],
        "\n## Tax & Incentives\n",
        m["incentives"],
        "\n## Watch Items (verify current status)\n",
    ]
    lines += [f"- {w}" for w in m["watch_items"]]
    lines += [
        "\n## Fit\n",
        f"**Best for:** {m['best_for']}\n",
        f"**Think twice if:** {m['avoid_if']}\n",
        "\n---\n",
        "# Site Diligence Checklist\n",
        "The framework below applies to any specific parcel in this market. "
        "Items are ordered by typical go/no-go significance.",
        checklist_md(checklist),
        "---",
        f"*Groundwork v{checklist['version']} · screening framework only · verify before reliance*",
    ]
    return "\n".join(lines)


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ --ink:#1a2332; --accent:#0e7c66; --muted:#5b6573; --line:#e3e7ee; }}
  body {{ font: 16px/1.65 Georgia, 'Times New Roman', serif; color: var(--ink);
         max-width: 860px; margin: 0 auto; padding: 48px 28px; }}
  h1 {{ font-size: 1.9rem; line-height: 1.25; margin-bottom: .2em; }}
  h1, h2 {{ font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: -.01em; }}
  h2 {{ margin-top: 2.2em; color: var(--accent); font-size: 1.15rem;
        text-transform: uppercase; letter-spacing: .06em; border-bottom: 2px solid var(--line);
        padding-bottom: .35em; }}
  .meta {{ color: var(--muted); font-style: italic; }}
  .disclaimer {{ background: #f6f7f9; border-left: 4px solid var(--accent);
                 padding: 14px 18px; font-size: .88rem; color: var(--muted); margin: 1.4em 0; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1em 0;
           font-family: 'Helvetica Neue', Arial, sans-serif; font-size: .92rem; }}
  th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); }}
  th {{ text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; color: var(--muted); }}
  .bar {{ font-family: monospace; color: var(--accent); letter-spacing: 1px; }}
  .check {{ margin: .9em 0; padding: 12px 16px; border: 1px solid var(--line); border-radius: 8px; }}
  .check b {{ font-family: 'Helvetica Neue', Arial, sans-serif; }}
  .check .why, .check .flags {{ font-size: .9rem; color: var(--muted); margin-top: .35em; }}
  .check .flags {{ color: #9c4221; }}
  .ws-intro {{ font-style: italic; color: var(--muted); }}
  footer {{ margin-top: 3em; padding-top: 1em; border-top: 1px solid var(--line);
            font-size: .8rem; color: var(--muted); }}
  @media print {{ body {{ padding: 0; font-size: 13px; }} .check {{ break-inside: avoid; }} }}
</style></head><body>
{body}
<footer>Groundwork · screening framework only · verify against primary sources before reliance</footer>
</body></html>"""


def report_html(m, checklist):
    today = datetime.date.today().isoformat()
    s = m["scores"]
    c = composite(s)
    rows = "".join(
        f"<tr><td>{FACTOR_LABELS[k]}</td><td>{s[k]}/10</td>"
        f"<td class='bar'>{bar(s[k])}</td></tr>"
        for k in WEIGHTS
    )
    rows += f"<tr><th>Composite</th><th>{c}/10</th><td class='bar'>{bar(c)}</td></tr>"

    watch = "".join(f"<li>{w}</li>" for w in m["watch_items"])

    cl = []
    for ws in checklist["workstreams"]:
        cl.append(f"<h2>{ws['title']} <span style='font-weight:normal'>({int(ws['weight']*100)}%)</span></h2>")
        if ws.get("intro"):
            cl.append(f"<p class='ws-intro'>{ws['intro']}</p>")
        for it in ws["items"]:
            cl.append(
                "<div class='check'><b>☐ {item}</b>"
                "<div class='why'><b>Why:</b> {why}</div>"
                "<div class='flags'><b>Red flags:</b> {flags}</div></div>".format(
                    item=it["item"], why=it["why"], flags=it["red_flags"]
                )
            )
    body = f"""
<h1>Groundwork Screening Report<br>{m['name']}</h1>
<p class="meta">Generated {today} &middot; Composite score {c} / 10</p>
<div class="disclaimer">{DISCLAIMER}</div>
<h2>Market Profile</h2><p>{m['profile']}</p>
<h2>Scorecard</h2><table><tr><th>Factor</th><th>Score</th><th></th></tr>{rows}</table>
<h2>Power &amp; Utility</h2>
<p><b>Serving utility:</b> {m['utility']} &middot; <b>Grid:</b> {m['grid']}</p>
<p>{m['power_outlook']}</p>
<h2>Entitlement Climate</h2><p>{m['zoning_posture']}</p>
<h2>Water &amp; Cooling</h2><p>{m['water']}</p>
<h2>Tax &amp; Incentives</h2><p>{m['incentives']}</p>
<h2>Watch Items (verify current status)</h2><ul>{watch}</ul>
<h2>Fit</h2>
<p><b>Best for:</b> {m['best_for']}<br><b>Think twice if:</b> {m['avoid_if']}</p>
<h1 style="margin-top:1.6em">Site Diligence Checklist</h1>
<p class="meta">Applies to any specific parcel in this market; ordered by typical go/no-go significance.</p>
{''.join(cl)}
"""
    return HTML_TEMPLATE.format(title=f"Groundwork — {m['name']}", body=body)


def main():
    p = argparse.ArgumentParser(description="Groundwork — data center site diligence reports")
    p.add_argument("market", nargs="?", help="market id or name fragment (e.g. loudoun, phoenix)")
    p.add_argument("--list", action="store_true", help="list seeded markets ranked by composite score")
    p.add_argument("--compare", action="store_true", help="cross-market comparison table")
    p.add_argument("--checklist", action="store_true", help="emit a blank diligence checklist (markdown)")
    args = p.parse_args()

    data = load("data/markets.json")
    checklist = load("checklist.json")
    markets = data["markets"]

    if args.list:
        cmd_list(markets)
        return
    if args.compare:
        cmd_compare(markets)
        return
    if args.checklist:
        print("# Data Center Site Diligence Checklist\n")
        print(f"> {DISCLAIMER}")
        print(checklist_md(checklist))
        return
    if not args.market:
        p.print_help()
        sys.exit(1)

    m = find_market(markets, args.market)
    if not m:
        print(f"No market matching '{args.market}'. Try: " + ", ".join(x["id"] for x in markets))
        sys.exit(1)

    REPORTS.mkdir(exist_ok=True)
    stem = m["id"]
    (REPORTS / f"{stem}.md").write_text(report_md(m, checklist), encoding="utf-8")
    (REPORTS / f"{stem}.html").write_text(report_html(m, checklist), encoding="utf-8")
    print(f"Wrote reports/{stem}.md and reports/{stem}.html  (composite {composite(m['scores'])}/10)")
    print("Open the .html in a browser and print to PDF for a client-ready deliverable.")


if __name__ == "__main__":
    main()
