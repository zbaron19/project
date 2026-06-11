#!/usr/bin/env python3
"""Groundwork — data center site diligence engine.

Market intelligence (screening-grade context):
  python3 groundwork.py --list                 List seeded markets with scores
  python3 groundwork.py --compare              Cross-market comparison table
  python3 groundwork.py loudoun                Market briefing report (md + html)
  python3 groundwork.py --checklist            Blank diligence checklist (markdown)

Parcel screens (the paid deliverable):
  python3 groundwork.py new-parcel <slug>      Scaffold a parcel workbook (parcels/<slug>.json)
  python3 groundwork.py screen <slug>          Render a parcel screening report

A parcel report renders CLIENT-READY only when every checklist item is
verified (finding + primary source + date) or marked N/A with a reason.
Anything less renders with a DRAFT watermark. The provenance requirement is
structural on purpose: the verification IS the product.

Dependency-free by design: runs anywhere Python 3 runs.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPORTS = HERE / "reports"
PARCELS = HERE / "parcels"

WEIGHTS = {"power": 0.35, "entitlement": 0.20, "water": 0.15, "incentives": 0.15, "political": 0.15}
FACTOR_LABELS = {
    "power": "Power & Utility",
    "entitlement": "Entitlement Climate",
    "water": "Water & Cooling",
    "incentives": "Tax & Incentives",
    "political": "Political / Community",
}

STATUSES = ("open", "verified", "na")
RISKS = ("tbd", "clear", "watch", "fatal")
RISK_LABEL = {"clear": "Clear", "watch": "Watch", "fatal": "Fatal", "tbd": "TBD"}

DISCLAIMER = (
    "This report is a screening framework generated from a curated knowledge base, "
    "compiled from general industry knowledge as of early 2026. It is not legal advice, "
    "and no statement in it should be relied on without verification against primary "
    "sources (utility tariffs and filings, county code, session law, title records). "
    "Verification and deal-specific counsel are the engagement."
)

PARCEL_DISCLAIMER = (
    "Prepared under a written engagement agreement. Findings reflect the cited sources "
    "as of the verification dates shown for each item; conditions change, and items "
    "marked open or N/A are outside the scope of what was verified. This report does "
    "not predict regulatory or political outcomes."
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


def all_items(checklist):
    for ws in checklist["workstreams"]:
        for it in ws["items"]:
            yield ws, it


# ---------------------------------------------------------------- parcels

def parcel_path(slug):
    return PARCELS / f"{Path(slug).stem}.json"


def cmd_new_parcel(slug, checklist):
    PARCELS.mkdir(exist_ok=True)
    path = parcel_path(slug)
    if path.exists():
        sys.exit(f"{path} already exists — refusing to overwrite a workbook.")
    workbook = {
        "schema": "groundwork-parcel/1",
        "demo": False,
        "checklist_version": checklist["version"],
        "parcel": {
            "name": "", "county": "", "state": "", "apn": "",
            "acres": None, "target_mw": None, "market_id": "",
            "client": "", "engagement": "",
        },
        "recommendation": "",
        "items": {
            it["id"]: {
                "status": "open", "risk": "tbd", "finding": "",
                "sources": [], "verified_on": None,
            }
            for _, it in all_items(checklist)
        },
    }
    path.write_text(json.dumps(workbook, indent=2, ensure_ascii=False), encoding="utf-8")
    n = len(workbook["items"])
    print(f"Wrote {path.relative_to(HERE)} — {n} items, all open.")
    print("Fill each item with finding / sources / verified_on / risk as you verify it,")
    print(f"then render with: python3 groundwork.py screen {Path(slug).stem}")


def validate_parcel(wb, checklist):
    """Returns (problems, gaps). problems block rendering; gaps force DRAFT."""
    problems, gaps = [], []
    known = {it["id"] for _, it in all_items(checklist)}
    for iid in wb["items"]:
        if iid not in known:
            problems.append(f"unknown checklist item id: {iid}")
    for iid in sorted(known - set(wb["items"])):
        problems.append(f"missing checklist item: {iid}")
    for iid, rec in wb["items"].items():
        if rec.get("status") not in STATUSES:
            problems.append(f"{iid}: status must be one of {STATUSES}")
            continue
        if rec.get("risk") not in RISKS:
            problems.append(f"{iid}: risk must be one of {RISKS}")
        if rec["status"] == "verified":
            missing = []
            if not rec.get("finding", "").strip():
                missing.append("finding")
            if not rec.get("sources"):
                missing.append("sources")
            if not rec.get("verified_on"):
                missing.append("verified_on")
            if rec.get("risk") == "tbd":
                missing.append("risk call")
            if missing:
                problems.append(f"{iid}: verified but missing {', '.join(missing)}")
        elif rec["status"] == "na":
            if not rec.get("finding", "").strip():
                problems.append(f"{iid}: N/A requires a reason in 'finding'")
        else:
            gaps.append(iid)
    return problems, gaps


def parcel_status_line(wb):
    counts = {"verified": 0, "na": 0, "open": 0}
    risks = {"fatal": 0, "watch": 0, "clear": 0}
    for rec in wb["items"].values():
        counts[rec["status"]] = counts.get(rec["status"], 0) + 1
        if rec["status"] == "verified":
            risks[rec["risk"]] = risks.get(rec["risk"], 0) + 1
    return counts, risks


def cmd_screen(slug, checklist):
    path = parcel_path(slug)
    if not path.exists():
        sys.exit(f"No workbook at {path}. Create one: python3 groundwork.py new-parcel {slug}")
    wb = json.loads(path.read_text(encoding="utf-8"))
    problems, gaps = validate_parcel(wb, checklist)
    if problems:
        print("Workbook has structural problems — fix these before rendering:\n")
        for p in problems:
            print(f"  ✗ {p}")
        sys.exit(1)

    draft = bool(gaps)
    counts, risks = parcel_status_line(wb)
    today = datetime.date.today().isoformat()
    p = wb["parcel"]
    title = p.get("name") or Path(slug).stem
    where = ", ".join(x for x in (p.get("county"), p.get("state")) if x)

    banners = []
    if wb.get("demo"):
        banners.append("SAMPLE — FICTIONAL PARCEL, FOR DEMONSTRATION ONLY")
    if draft:
        banners.append(f"DRAFT — {counts['open']} OF {len(wb['items'])} ITEMS UNVERIFIED — NOT FOR DELIVERY")

    md = [f"# Groundwork Parcel Screen — {title}"]
    for b in banners:
        md.append(f"\n> **{b}**")
    md += [
        f"\n*{where} · APN {p.get('apn') or '—'} · {p.get('acres') or '—'} acres · "
        f"target {p.get('target_mw') or '—'} MW · rendered {today}*\n",
        f"> {PARCEL_DISCLAIMER}\n",
        "## Verification status\n",
        f"- **{counts['verified']} verified** · {counts['na']} not applicable · "
        f"{counts['open']} open",
        f"- Risk calls among verified items: **{risks['fatal']} fatal**, "
        f"{risks['watch']} watch, {risks['clear']} clear\n",
    ]

    fatals = [(ws, it, wb["items"][it["id"]]) for ws, it in all_items(checklist)
              if wb["items"][it["id"]]["status"] == "verified"
              and wb["items"][it["id"]]["risk"] == "fatal"]
    watches = [(ws, it, wb["items"][it["id"]]) for ws, it in all_items(checklist)
               if wb["items"][it["id"]]["status"] == "verified"
               and wb["items"][it["id"]]["risk"] == "watch"]
    if fatals:
        md.append("## Go / no-go findings (fatal)\n")
        for ws, it, rec in fatals:
            md.append(f"- **[{it['id']}] {it['item']}** — {rec['finding']}")
    if watches:
        md.append("\n## Watch items\n")
        for ws, it, rec in watches:
            md.append(f"- **[{it['id']}] {it['item']}** — {rec['finding']}")

    if wb.get("recommendation", "").strip():
        md += ["\n## Counsel's recommendation\n", wb["recommendation"].strip()]

    md.append("\n## Findings by workstream\n")
    icon = {"verified": "✔", "na": "–", "open": "☐"}
    for ws in checklist["workstreams"]:
        md.append(f"### {ws['title']}\n")
        for it in ws["items"]:
            rec = wb["items"][it["id"]]
            head = f"{icon[rec['status']]} **[{it['id']}] {it['item']}**"
            if rec["status"] == "verified":
                head += f" — *{RISK_LABEL[rec['risk']]}*"
            md.append(head)
            if rec.get("finding", "").strip():
                md.append(f"  - {rec['finding']}")
            for s in rec.get("sources", []):
                md.append(f"  - Source: {s}")
            if rec.get("verified_on"):
                md.append(f"  - Verified {rec['verified_on']}")
            if rec["status"] == "open":
                md.append("  - *Not yet verified.*")
        md.append("")

    if gaps:
        md += ["## Verification gaps\n",
               "The following items remain open and must be verified or scoped out "
               "before this report is delivered:\n"]
        md += [f"- {iid}" for iid in gaps]

    md += ["\n---", f"*Groundwork checklist v{checklist['version']} · "
           "every finding cites its source and verification date*"]
    md_text = "\n".join(md)

    html = parcel_html(wb, checklist, banners, counts, risks, fatals, watches, gaps, today)

    REPORTS.mkdir(exist_ok=True)
    stem = f"parcel-{Path(slug).stem}"
    (REPORTS / f"{stem}.md").write_text(md_text, encoding="utf-8")
    (REPORTS / f"{stem}.html").write_text(html, encoding="utf-8")
    state = "DRAFT (not for delivery)" if draft else "CLIENT-READY"
    print(f"Wrote reports/{stem}.md and reports/{stem}.html — {state}")
    print(f"  {counts['verified']}/{len(wb['items'])} verified · "
          f"fatal {risks['fatal']} · watch {risks['watch']} · clear {risks['clear']}")
    if draft:
        print("  Verify or N/A the open items to produce a deliverable.")


# ----------------------------------------------------------------- markets

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
            lines.append(f"- [ ] **[{it['id']}] {it['item']}**")
            lines.append(f"  - *Why it matters:* {it['why']}")
            lines.append(f"  - *Red flags:* {it['red_flags']}")
        lines.append("")
    return "\n".join(lines)


def report_md(m, checklist):
    today = datetime.date.today().isoformat()
    s = m["scores"]
    c = composite(s)
    lines = [
        f"# Groundwork Market Briefing — {m['name']}",
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
  h1, h2, h3 {{ font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: -.01em; }}
  h2 {{ margin-top: 2.2em; color: var(--accent); font-size: 1.15rem;
        text-transform: uppercase; letter-spacing: .06em; border-bottom: 2px solid var(--line);
        padding-bottom: .35em; }}
  h3 {{ margin-top: 1.6em; font-size: 1.02rem; }}
  .meta {{ color: var(--muted); font-style: italic; }}
  .banner {{ background: #7c1d1d; color: #fff; font-family: 'Helvetica Neue', Arial, sans-serif;
             font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
             padding: 12px 18px; border-radius: 8px; margin: 14px 0; font-size: .85rem; }}
  .banner.sample {{ background: #8a6d1a; }}
  .disclaimer {{ background: #f6f7f9; border-left: 4px solid var(--accent);
                 padding: 14px 18px; font-size: .88rem; color: var(--muted); margin: 1.4em 0; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1em 0;
           font-family: 'Helvetica Neue', Arial, sans-serif; font-size: .92rem; }}
  th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); }}
  th {{ text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; color: var(--muted); }}
  .bar {{ font-family: monospace; color: var(--accent); letter-spacing: 1px; }}
  .check {{ margin: .9em 0; padding: 12px 16px; border: 1px solid var(--line); border-radius: 8px; }}
  .check b {{ font-family: 'Helvetica Neue', Arial, sans-serif; }}
  .check .why, .check .flags, .check .src {{ font-size: .9rem; color: var(--muted); margin-top: .35em; }}
  .check .flags {{ color: #9c4221; }}
  .check.fatal {{ border-color: #c53030; background: #fff5f5; }}
  .check.watch {{ border-color: #b7791f; background: #fffaf0; }}
  .check.open {{ border-style: dashed; }}
  .pill {{ font: 700 .7rem 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase;
           letter-spacing: .07em; padding: 2px 8px; border-radius: 99px; margin-left: 8px; }}
  .pill.fatal {{ background:#c53030; color:#fff; }} .pill.watch {{ background:#b7791f; color:#fff; }}
  .pill.clear {{ background:#0e7c66; color:#fff; }} .pill.na {{ background:#cbd5e0; }}
  .pill.open {{ background:#e2e8f0; color:#4a5568; }}
  .ws-intro {{ font-style: italic; color: var(--muted); }}
  footer {{ margin-top: 3em; padding-top: 1em; border-top: 1px solid var(--line);
            font-size: .8rem; color: var(--muted); }}
  @media print {{ body {{ padding: 0; font-size: 13px; }} .check {{ break-inside: avoid; }} }}
</style></head><body>
{body}
<footer>Groundwork · every finding cites its source and verification date</footer>
</body></html>"""


def parcel_html(wb, checklist, banners, counts, risks, fatals, watches, gaps, today):
    p = wb["parcel"]
    title = p.get("name") or "Parcel Screen"
    where = ", ".join(x for x in (p.get("county"), p.get("state")) if x)
    body = [f"<h1>Groundwork Parcel Screen<br>{title}</h1>"]
    for b in banners:
        cls = "banner sample" if b.startswith("SAMPLE") else "banner"
        body.append(f"<div class='{cls}'>{b}</div>")
    body.append(
        f"<p class='meta'>{where} &middot; APN {p.get('apn') or '—'} &middot; "
        f"{p.get('acres') or '—'} acres &middot; target {p.get('target_mw') or '—'} MW "
        f"&middot; rendered {today}</p>"
    )
    body.append(f"<div class='disclaimer'>{PARCEL_DISCLAIMER}</div>")
    body.append("<h2>Verification status</h2>")
    body.append(
        f"<p><b>{counts['verified']} verified</b> &middot; {counts['na']} not applicable "
        f"&middot; {counts['open']} open &mdash; risk calls among verified items: "
        f"<b>{risks['fatal']} fatal</b>, {risks['watch']} watch, {risks['clear']} clear.</p>"
    )
    if fatals:
        body.append("<h2>Go / no-go findings (fatal)</h2>")
        for ws, it, rec in fatals:
            body.append(f"<div class='check fatal'><b>[{it['id']}] {it['item']}</b>"
                        f"<span class='pill fatal'>Fatal</span>"
                        f"<div class='src'>{rec['finding']}</div></div>")
    if watches:
        body.append("<h2>Watch items</h2>")
        for ws, it, rec in watches:
            body.append(f"<div class='check watch'><b>[{it['id']}] {it['item']}</b>"
                        f"<span class='pill watch'>Watch</span>"
                        f"<div class='src'>{rec['finding']}</div></div>")
    if wb.get("recommendation", "").strip():
        body.append("<h2>Counsel's recommendation</h2>")
        body.append(f"<p>{wb['recommendation'].strip()}</p>")
    body.append("<h2>Findings by workstream</h2>")
    for ws in checklist["workstreams"]:
        body.append(f"<h3>{ws['title']}</h3>")
        for it in ws["items"]:
            rec = wb["items"][it["id"]]
            if rec["status"] == "verified":
                pill, cls = rec["risk"], ("fatal" if rec["risk"] == "fatal"
                                          else "watch" if rec["risk"] == "watch" else "")
                label = RISK_LABEL[rec["risk"]]
            elif rec["status"] == "na":
                pill, cls, label = "na", "", "N/A"
            else:
                pill, cls, label = "open", "open", "Open"
            chunk = [f"<div class='check {cls}'><b>[{it['id']}] {it['item']}</b>"
                     f"<span class='pill {pill}'>{label}</span>"]
            if rec.get("finding", "").strip():
                chunk.append(f"<div class='src'>{rec['finding']}</div>")
            for s in rec.get("sources", []):
                chunk.append(f"<div class='src'><b>Source:</b> {s}</div>")
            if rec.get("verified_on"):
                chunk.append(f"<div class='src'>Verified {rec['verified_on']}</div>")
            if rec["status"] == "open":
                chunk.append("<div class='src'><i>Not yet verified.</i></div>")
            chunk.append("</div>")
            body.append("".join(chunk))
    if gaps:
        body.append("<h2>Verification gaps</h2><ul>")
        body += [f"<li>{iid}</li>" for iid in gaps]
        body.append("</ul>")
    return HTML_TEMPLATE.format(title=f"Groundwork — {title}", body="\n".join(body))


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
                "<div class='check'><b>☐ [{id}] {item}</b>"
                "<div class='why'><b>Why:</b> {why}</div>"
                "<div class='flags'><b>Red flags:</b> {flags}</div></div>".format(
                    id=it["id"], item=it["item"], why=it["why"], flags=it["red_flags"]
                )
            )
    body = f"""
<h1>Groundwork Market Briefing<br>{m['name']}</h1>
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
    p = argparse.ArgumentParser(description="Groundwork — data center site diligence engine")
    p.add_argument("command", nargs="?",
                   help="market id/name for a briefing, or: new-parcel <slug> | screen <slug>")
    p.add_argument("slug", nargs="?", help="parcel slug for new-parcel / screen")
    p.add_argument("--list", action="store_true", help="list seeded markets ranked by composite score")
    p.add_argument("--compare", action="store_true", help="cross-market comparison table")
    p.add_argument("--checklist", action="store_true", help="emit a blank diligence checklist (markdown)")
    args = p.parse_args()

    checklist = load("checklist.json")

    if args.command == "new-parcel":
        if not args.slug:
            sys.exit("usage: groundwork.py new-parcel <slug>")
        cmd_new_parcel(args.slug, checklist)
        return
    if args.command == "screen":
        if not args.slug:
            sys.exit("usage: groundwork.py screen <slug>")
        cmd_screen(args.slug, checklist)
        return

    data = load("data/markets.json")
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
    if not args.command:
        p.print_help()
        sys.exit(1)

    m = find_market(markets, args.command)
    if not m:
        print(f"No market matching '{args.command}'. Try: " + ", ".join(x["id"] for x in markets))
        sys.exit(1)

    REPORTS.mkdir(exist_ok=True)
    stem = m["id"]
    (REPORTS / f"{stem}.md").write_text(report_md(m, checklist), encoding="utf-8")
    (REPORTS / f"{stem}.html").write_text(report_html(m, checklist), encoding="utf-8")
    print(f"Wrote reports/{stem}.md and reports/{stem}.html  (composite {composite(m['scores'])}/10)")
    print("Open the .html in a browser and print to PDF for a client-ready deliverable.")


if __name__ == "__main__":
    main()
