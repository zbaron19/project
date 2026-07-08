#!/usr/bin/env python3
"""
Jurisdiction Watch — the early-warning layer for The Interconnect.

Polls public feeds (county planning/board agendas, legislative calendars,
regulatory dockets) for a curated list of hot data center jurisdictions, flags
items matching data-center-relevant keywords, and writes a dated signals file:
  - interconnect/LATEST_SIGNALS.md
  - interconnect/signals/YYYY-MM-DD.md

Same design language as scripts/daily_brief.py: stdlib only, dedupes against a
rolling state file, per-feed failures are non-fatal and reported in the output.
Designed to run on the same GitHub Actions cron.

NOTE ON FEED URLS: county CMSes (Legistar/Granicus, CivicPlus, custom) change
without notice. Every URL in WATCHLIST below is a seed — verify each one fires
before relying on it, and expect ~15 min/week of feed gardening. A jurisdiction
with no working feed still earns its place on the list: it appears in the
"manual check" footer with its agenda page URL so the weekly edition prompts a
human look.
"""

from __future__ import annotations

import datetime as dt
import json
import re
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent  # interconnect/
STATE_PATH = ROOT / "pipeline" / "state" / "signals_seen.json"
LATEST_PATH = ROOT / "LATEST_SIGNALS.md"
SIGNALS_DIR = ROOT / "signals"

# Keywords that make an agenda item or docket entry data-center-relevant.
# Tuned for recall over precision — a human skims the hits weekly.
KEYWORDS = [
    "data center", "datacenter", "data centre", "digital infrastructure",
    "hyperscale", "computer center", "server farm", "colocation",
    "technology overlay", "moratorium", "large load", "high energy use",
    "megawatt", " mw ", "substation", "transmission line",
    "special use permit", "rezoning", "comprehensive plan amendment",
    "by-right", "by right", "noise ordinance", "water reuse",
]

# The watch list. Each entry:
#   name, state, why (one line of context for the edition),
#   feeds: [(label, url)]      — RSS/Atom feeds to poll automatically (VERIFY)
#   manual: [(label, url)]     — pages to check by hand when feeds don't exist
# Seeded with the jurisdictions where U.S. data center siting fights and booms
# are concentrated. Add/remove freely; failures on any one feed are non-fatal.
WATCHLIST: list[dict] = [
    {
        "name": "Loudoun County", "state": "VA",
        "why": "Data Center Alley; densest concentration on earth, tightening fast",
        "feeds": [("Legistar calendar", "https://loudoun.legistar.com/Feed.ashx?M=Calendar&ID=14878251&GUID=LATEST")],
        "manual": [("Planning Commission", "https://www.loudoun.gov/PlanningCommission")],
    },
    {
        "name": "Prince William County", "state": "VA",
        "why": "Digital Gateway fallout; every hearing is a flashpoint",
        "feeds": [],
        "manual": [("BOCS agendas", "https://eservice.pwcgov.org/documents/bocs/agendas/")],
    },
    {
        "name": "Fauquier County", "state": "VA",
        "why": "Next ring out from NoVA; zoning posture still forming",
        "feeds": [],
        "manual": [("Agenda center", "https://www.fauquiercounty.gov/government/board-of-supervisors/agendas-minutes")],
    },
    {
        "name": "Culpeper County", "state": "VA",
        "why": "Active approvals corridor; CloudHQ/Copper Ridge wave",
        "feeds": [],
        "manual": [("Agendas", "https://web.culpepercounty.gov/meetings")],
    },
    {
        "name": "Frederick County", "state": "MD",
        "why": "Quantum Loophole / critical digital infrastructure zoning rewrite",
        "feeds": [],
        "manual": [("Council agendas", "https://www.frederickcountymd.gov/8248/County-Council-Meeting-Agendas")],
    },
    {
        "name": "Douglas County", "state": "GA",
        "why": "Atlanta west-side cluster; moratorium history",
        "feeds": [],
        "manual": [("BOC agendas", "https://www.celebratedouglascounty.com/AgendaCenter")],
    },
    {
        "name": "Fayette / Coweta Counties", "state": "GA",
        "why": "Atlanta south metro; QTS/hyperscaler land rush",
        "feeds": [],
        "manual": [("Fayette agendas", "https://fayettecountyga.gov/agendas-minutes")],
    },
    {
        "name": "City of Mesa / Maricopa County", "state": "AZ",
        "why": "Phoenix metro cluster; water politics meet land use",
        "feeds": [("Mesa Legistar", "https://mesa.legistar.com/Feed.ashx?M=Calendar&ID=LATEST")],
        "manual": [("Mesa agendas", "https://www.mesaaz.gov/government/city-council-meetings")],
    },
    {
        "name": "City of San Antonio / Bexar County", "state": "TX",
        "why": "ERCOT large-load epicenter; CPS Energy posture shifting",
        "feeds": [("SA Legistar", "https://sanantonio.legistar.com/Feed.ashx?M=Calendar&ID=LATEST")],
        "manual": [],
    },
    {
        "name": "Tarrant County / Fort Worth", "state": "TX",
        "why": "DFW expansion ring; aggressive incentive posture",
        "feeds": [("FW Legistar", "https://fortworthgov.legistar.com/Feed.ashx?M=Calendar&ID=LATEST")],
        "manual": [],
    },
    {
        "name": "New Albany / Licking County", "state": "OH",
        "why": "Intel-anchored corridor; AEP large-load tariff ground zero",
        "feeds": [],
        "manual": [("New Albany agendas", "https://www.newalbanyohio.org/agendas-minutes/")],
    },
    {
        "name": "Council Bluffs / Pottawattamie County", "state": "IA",
        "why": "Google cluster; MidAmerican capacity story",
        "feeds": [],
        "manual": [("CB agendas", "https://www.councilbluffs-ia.gov/agendacenter")],
    },
    {
        "name": "Sarpy County", "state": "NE",
        "why": "Omaha metro cluster; OPPD load growth fights",
        "feeds": [],
        "manual": [("Board agendas", "https://www.sarpy.gov/agendas")],
    },
    {
        "name": "Grant County", "state": "WA",
        "why": "Quincy legacy cluster; Grant PUD rate design for large loads",
        "feeds": [],
        "manual": [("Grant PUD commission", "https://www.grantpud.org/commission-meetings")],
    },
    {
        "name": "Douglas County", "state": "WA",
        "why": "East Wenatchee hydro corridor; PUD posture",
        "feeds": [],
        "manual": [("Douglas PUD", "https://douglaspud.org/commission-meetings/")],
    },
    {
        "name": "Umatilla / Morrow Counties", "state": "OR",
        "why": "AWS cluster; enterprise-zone incentive renegotiations",
        "feeds": [],
        "manual": [("Morrow Co agendas", "https://www.co.morrow.or.us/boc/page/board-commissioners-meetings")],
    },
    {
        "name": "Laramie County / Cheyenne", "state": "WY",
        "why": "Microsoft/Meta cluster; Crusoe pause watch",
        "feeds": [],
        "manual": [("Cheyenne agendas", "https://www.cheyennecity.org/Your-Government/Agendas-Minutes")],
    },
    {
        "name": "Memphis / Shelby County", "state": "TN",
        "why": "xAI Colossus; MLGW + TVA large-load decisions, air permits",
        "feeds": [],
        "manual": [("Shelby agendas", "https://www.shelbycountytn.gov/AgendaCenter")],
    },
    {
        "name": "DeKalb / Kane Counties", "state": "IL",
        "why": "Chicago west exurb cluster; ComEd interconnection queue",
        "feeds": [],
        "manual": [("DeKalb agendas", "https://dekalbcounty.org/government/agendas-minutes/")],
    },
]

# Statewide / federal regulatory dockets — checked manually each week; listed
# in every signals file so the weekly edition never forgets them.
REGULATORY_WATCH = [
    ("FERC — large load co-location & interconnection cost allocation",
     "https://www.ferc.gov/news-events/news"),
    ("Virginia SCC — Dominion large-load tariff proceedings",
     "https://scc.virginia.gov/pages/Case-Information"),
    ("Ohio PUCO — AEP Ohio data center tariff & successors",
     "https://puco.ohio.gov/utilities/electricity"),
    ("Georgia PSC — Georgia Power IRP / large load",
     "https://psc.ga.gov/proceedings/"),
    ("Texas PUC — ERCOT large flexible load (SB 6 implementation)",
     "https://interchange.puc.texas.gov/"),
    ("Washington UTC — large load service rules",
     "https://www.utc.wa.gov/casedocket"),
]

UA = {"User-Agent": "Mozilla/5.0 (compatible; InterconnectWatch/1.0)"}


def fetch(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def strip_html(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(s or ""))).strip()


def parse_feed(source: str, raw: bytes) -> list[dict]:
    """Parse RSS 2.0 or Atom into a flat item list. Tolerant of junk."""
    items = []
    root = ET.fromstring(raw)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    for el in root.iter("item"):  # RSS
        items.append({
            "source": source,
            "title": strip_html((el.findtext("title") or "")),
            "link": (el.findtext("link") or "").strip(),
            "summary": strip_html(el.findtext("description") or ""),
        })
    for el in root.iter("{http://www.w3.org/2005/Atom}entry"):  # Atom
        link_el = el.find("atom:link", ns)
        items.append({
            "source": source,
            "title": strip_html(el.findtext("atom:title", default="", namespaces=ns)),
            "link": (link_el.get("href") if link_el is not None else "").strip(),
            "summary": strip_html(el.findtext("atom:summary", default="", namespaces=ns)),
        })
    return items


def matched_keywords(item: dict) -> list[str]:
    hay = f" {item['title']} {item['summary']} ".lower()
    return [k for k in KEYWORDS if k in hay]


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"seen": {}}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=1, sort_keys=True))


def prune_seen(seen: dict, days: int = 60) -> dict:
    cutoff = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    return {k: v for k, v in seen.items() if v >= cutoff}


def build_report(date_str: str, hits: list[dict], errors: list[str]) -> str:
    lines = [
        f"# Jurisdiction Signals — {date_str}",
        "",
        "*Raw hits from the watch-list feeds. Each is a lead, not a story —*",
        "*click through, read the agenda item, and decide if it makes the Docket Radar.*",
        "",
    ]
    if hits:
        for h in hits:
            kw = ", ".join(h["keywords"])
            lines.append(
                f"- **[{h['jurisdiction']}] {h['title']}**"
                + (f" — {h['summary'][:300]}" if h["summary"] else "")
                + (f" ([source]({h['link']}))" if h["link"] else "")
                + f" _(matched: {kw})_"
            )
    else:
        lines.append("- No new keyword hits from automated feeds this run.")

    lines += ["", "## Manual checks (no working feed — eyeball weekly)", ""]
    for j in WATCHLIST:
        for label, url in j.get("manual", []):
            lines.append(f"- {j['name']}, {j['state']} — [{label}]({url}) — _{j['why']}_")

    lines += ["", "## Regulatory dockets (check weekly)", ""]
    for label, url in REGULATORY_WATCH:
        lines.append(f"- [{label}]({url})")

    if errors:
        lines += ["", "## Feeds that failed this run", ""]
        lines += [f"- {e}" for e in errors]

    lines += [
        "",
        "---",
        f"Generated by `interconnect/pipeline/jurisdiction_watch.py` at "
        f"{dt.datetime.now(dt.timezone.utc).isoformat()}.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    date_str = dt.date.today().isoformat()
    state = load_state()
    state["seen"] = prune_seen(state.get("seen", {}))

    hits: list[dict] = []
    errors: list[str] = []
    for j in WATCHLIST:
        for label, url in j.get("feeds", []):
            source = f"{j['name']}, {j['state']} — {label}"
            try:
                for item in parse_feed(source, fetch(url)):
                    kws = matched_keywords(item)
                    key = item["link"] or item["title"]
                    if kws and key and key not in state["seen"]:
                        state["seen"][key] = date_str
                        hits.append({**item, "jurisdiction": f"{j['name']}, {j['state']}",
                                     "keywords": kws})
            except (urllib.error.URLError, ET.ParseError, OSError, ValueError) as e:
                errors.append(f"{source}: {type(e).__name__}: {e}")

    report = build_report(date_str, hits, errors)
    SIGNALS_DIR.mkdir(parents=True, exist_ok=True)
    (SIGNALS_DIR / f"{date_str}.md").write_text(report)
    LATEST_PATH.write_text(report)
    save_state(state)
    print(f"{len(hits)} new signal(s); {len(errors)} feed failure(s). "
          f"Wrote {SIGNALS_DIR / (date_str + '.md')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
