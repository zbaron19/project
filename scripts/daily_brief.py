#!/usr/bin/env python3
"""
Daily U.S. data center news brief — deterministic RSS aggregator.

Pulls items from a curated list of trade-press and regulatory feeds, filters
to roughly the last 24 hours, dedupes against a rolling state file, categorizes
by keyword, and writes a markdown brief to:
  - LATEST_BRIEF.md (project root, mobile-app shortcut)
  - briefs/YYYY-MM-DD.md (dated archive)

Run with no arguments and that is exactly what happens — the cron path is
unchanged. Two optional flags add the editorial layer in scripts/editorial.py:

  --cluster      group items covering the same story, rank them against
                 profile.md, and bury the rest. Entirely local.
  --editorial    the above, plus one small-model call per story for a
                 "why this matters to you" line and a term worth learning.
                 Needs ANTHROPIC_API_KEY; falls back to --cluster without one.

  --from-brief briefs/YYYY-MM-DD.md   rebuild from a brief already in the
                 archive instead of fetching feeds, for side-by-side
                 comparison. Never writes to the archive or the state file.

Zero external deps — stdlib only. Designed to run in GitHub Actions on a daily cron.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / "scripts" / "state" / "seen.json"
LATEST_PATH = ROOT / "LATEST_BRIEF.md"
BRIEFS_DIR = ROOT / "briefs"

# Curated RSS feeds. Add/remove freely; failures on any one feed are non-fatal.
#
# Two kinds of feed:
#   1. Direct trade-press RSS/Atom feeds (source name is fixed per feed).
#   2. Google News topic searches — a broad catch-all that surfaces local and
#      regional reporting the trade press misses. For these the real outlet
#      (e.g. "Richmond Times-Dispatch") is read from each item's <source> tag
#      in parse_feed, so the brief still attributes by outlet, not "Google News".
FEEDS = [
    # --- Direct trade-press feeds ---
    # (Data Center Frontier and The Register reorganized their feeds and now
    # 404; their articles still come through via the Google News searches below.)
    ("Data Center Dynamics", "https://www.datacenterdynamics.com/rss/"),
    ("Data Center Knowledge", "https://www.datacenterknowledge.com/rss.xml"),
    ("Utility Dive", "https://www.utilitydive.com/feeds/news/"),
    ("Facilities Dive", "https://www.facilitiesdive.com/feeds/news/"),
    ("Canary Media", "https://www.canarymedia.com/feed"),
    ("Stateline", "https://stateline.org/feed/"),

    # --- Google News topic searches (recent, U.S.-biased; per-outlet attribution) ---
    ("Google News", "https://news.google.com/rss/search?q=%22data+center%22+%28zoning+OR+moratorium+OR+rezoning+OR+%22land+use%22+OR+ordinance%29+when:3d&hl=en-US&gl=US&ceid=US:en"),
    ("Google News", "https://news.google.com/rss/search?q=%22data+center%22+%28power+OR+grid+OR+substation+OR+interconnection+OR+utility+OR+nuclear%29+when:3d&hl=en-US&gl=US&ceid=US:en"),
    ("Google News", "https://news.google.com/rss/search?q=%22data+center%22+%28lease+OR+acquisition+OR+REIT+OR+financing+OR+%22joint+venture%22%29+when:3d&hl=en-US&gl=US&ceid=US:en"),
    ("Google News", "https://news.google.com/rss/search?q=%22data+center%22+%28tax+OR+incentive+OR+abatement+OR+%22economic+development%22%29+when:3d&hl=en-US&gl=US&ceid=US:en"),
]

# Section keyword routing. Order matters — first match wins.
SECTIONS: list[tuple[str, list[str]]] = [
    (
        "Site selection, zoning & land use",
        [
            "zoning", "rezoning", "moratorium", "ordinance", "special exception",
            "conditional use", "comprehensive plan", "comp plan", "land use",
            "permit", "setback", "by-right", "by right", "siting", "nimby",
            "battlefield", "supervisors", "planning commission",
        ],
    ),
    (
        "Power, utility & grid",
        [
            "interconnection", "ppa", "power purchase", "utility", "grid",
            "ferc", "puc", "tariff", "rate case", "transmission", "substation",
            "behind-the-meter", "behind the meter", "smr", "nuclear", "solar",
            "wind", "battery", "bess", "pjm", "ercot", "miso", "caiso",
        ],
    ),
    (
        "Leasing, M&A & capital markets",
        [
            "acquir", "acquisition", "merger", "ipo", "reit", "joint venture",
            " jv ", "lease", "pre-lease", "build-to-suit", "btv", "btvs",
            "financing", "loan", "debt", "bond", "fund", "raise", "stake",
            "blackstone", "kkr", "brookfield", "digitalbridge", "equinix",
            "digital realty", "qts", "compass", "vantage", "stack",
        ],
    ),
    (
        "Tax incentives & economic development",
        [
            "tax exemption", "tax incentive", "tax break", "abatement",
            "sales tax", "use tax", "property tax", "pilot", "clawback",
            "incentive program", "economic development", "department of revenue",
        ],
    ),
    (
        "Regulation & litigation",
        [
            "lawsuit", "litigation", "court of appeals", "supreme court",
            "complaint", "petition", "injunction", "ruling", "verdict",
            "settlement", "ag ", "attorney general", "epa", "nepa",
            "environmental review", "noise complaint", "nuisance",
        ],
    ),
]

# Items must contain at least one of these to be data-center-relevant.
RELEVANCE_KEYWORDS = [
    "data center", "data centre", "hyperscale", "colocation", "co-location",
    "ai infrastructure", "cloud campus", "server farm", "compute cluster",
    "aws", "amazon web services", "microsoft azure", "google cloud",
    "meta platforms", "oracle cloud", "openai", "anthropic data",
    "loudoun", "prince william", "ashburn", "northern virginia",
]

# U.S. geographic filter — must mention something U.S. or be plausibly U.S.
US_HINTS = [
    "united states", " u.s.", " us ", "us-", "american", "america",
    "virginia", "texas", "arizona", "ohio", "georgia", "illinois", "indiana",
    "iowa", "nebraska", "north carolina", "south carolina", "tennessee",
    "florida", "california", "oregon", "washington state", "nevada",
    "new york", "new jersey", "maryland", "pennsylvania", "michigan",
    "wisconsin", "minnesota", "louisiana", "mississippi", "alabama",
    "kentucky", "missouri", "kansas", "oklahoma", "colorado", "utah",
    "ferc", "puc", "epa", "department of energy", "senate", "house bill",
    "ashburn", "loudoun", "prince william", "fairfax", "phoenix", "atlanta",
    "dallas", "fort worth", "columbus", "chicago", "santa clara",
    "reno", "abilene", "richmond", "manassas",
]

# Skip these — non-U.S. or non-relevant noise.
NEGATIVE_KEYWORDS = [
    "asean", "indonesia", "malaysia", "vietnam", "philippines",
    "africa", "kenya", "nigeria", "south africa",
    "china", "beijing", "shanghai", "hong kong", "shenzhen",
    "india data centre", "mumbai", "chennai", "bengaluru",
    "japan data", "tokyo data", "korea data", "seoul data",
    "europe data", "dublin data", "frankfurt data", "london data",
    "amsterdam data", "paris data", "madrid data",
    "australia data", "sydney data", "melbourne data",
    "brazil", "mexico data", "saudi", "uae", "dubai",
]

WINDOW_HOURS = 36  # generous: covers weekends and feeds that batch

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def fetch(url: str, timeout: int = 20) -> bytes:
    headers = {
        "User-Agent": UA,
        "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_date(s: str | None) -> dt.datetime | None:
    if not s:
        return None
    try:
        d = parsedate_to_datetime(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=dt.timezone.utc)
        return d.astimezone(dt.timezone.utc)
    except Exception:
        pass
    # ISO 8601 fallback (Atom)
    try:
        s2 = s.replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(s2)
        if d.tzinfo is None:
            d = d.replace(tzinfo=dt.timezone.utc)
        return d.astimezone(dt.timezone.utc)
    except Exception:
        return None


def parse_feed(source: str, raw: bytes) -> list[dict]:
    items: list[dict] = []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return items
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    # RSS 2.0
    for it in root.findall(".//item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        desc = strip_html(it.findtext("description") or "")
        pub = parse_date(it.findtext("pubDate"))
        # Per-item source (Google News and some aggregators set <source>). When
        # present, prefer the real outlet over the configured feed name, and
        # strip Google's " - Outlet" headline suffix for readability.
        item_source = source
        src_el = it.find("source")
        if src_el is not None and (src_el.text or "").strip():
            item_source = src_el.text.strip()
            suffix = f" - {item_source}"
            if title.endswith(suffix):
                title = title[: -len(suffix)].strip()
        if title and link:
            items.append({"source": item_source, "title": title, "link": link, "summary": desc, "published": pub})
    # Atom
    for it in root.findall("atom:entry", ns):
        title = (it.findtext("atom:title", default="", namespaces=ns) or "").strip()
        link_el = it.find("atom:link", ns)
        link = link_el.get("href") if link_el is not None else ""
        summary = strip_html(it.findtext("atom:summary", default="", namespaces=ns) or "")
        if not summary:
            summary = strip_html(it.findtext("atom:content", default="", namespaces=ns) or "")
        pub = parse_date(it.findtext("atom:updated", default=None, namespaces=ns) or it.findtext("atom:published", default=None, namespaces=ns))
        if title and link:
            items.append({"source": source, "title": title, "link": link, "summary": summary, "published": pub})
    return items


def is_relevant(item: dict) -> bool:
    blob = f"{item['title']} {item['summary']}".lower()
    if not any(k in blob for k in RELEVANCE_KEYWORDS):
        return False
    if any(k in blob for k in NEGATIVE_KEYWORDS):
        return False
    if not any(k in blob for k in US_HINTS):
        # If it doesn't obviously read as U.S., still keep it if 'data center' is present and no foreign signal — RSS metadata is often thin
        if "data center" not in blob and "data centre" not in blob:
            return False
    return True


def categorize(item: dict) -> str:
    blob = f"{item['title']} {item['summary']}".lower()
    for section, keywords in SECTIONS:
        if any(k in blob for k in keywords):
            return section
    return "General industry activity"


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text())
        except Exception:
            pass
    return {"seen": {}}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True))


def prune_seen(seen: dict, days: int = 14) -> dict:
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).isoformat()
    return {url: ts for url, ts in seen.items() if ts >= cutoff}


def build_brief(date_str: str, by_section: dict[str, list[dict]], errors: list[str]) -> str:
    lines: list[str] = []
    lines.append(f"# Data Center News Brief — {date_str}")
    lines.append("")
    lines.append("*Automated brief from curated U.S. data center RSS feeds. Last 24–36 hours; deduped against the prior two weeks. Click any source link to read the full article before relying on a fact.*")
    lines.append("")

    # TL;DR — top item from each non-empty section
    tldr: list[str] = []
    for section, _ in SECTIONS + [("General industry activity", [])]:
        items = by_section.get(section, [])
        if items:
            it = items[0]
            tldr.append(f"- **{section}:** {it['title']} ([{it['source']}]({it['link']}))")
    if tldr:
        lines.append("## TL;DR")
        lines.extend(tldr)
        lines.append("")

    # Sections
    for section, _ in SECTIONS + [("General industry activity", [])]:
        items = by_section.get(section, [])
        lines.append(f"## {section}")
        if not items:
            lines.append("- Nothing notable in the last 24–36 hours.")
        else:
            for it in items[:8]:
                snippet = it["summary"][:220].rstrip()
                if len(it["summary"]) > 220:
                    snippet += "…"
                pub = it["published"].strftime("%Y-%m-%d") if it.get("published") else ""
                meta = f"{it['source']}" + (f", {pub}" if pub else "")
                lines.append(f"- **[{it['title']}]({it['link']})** — {snippet} _({meta})_")
        lines.append("")

    if errors:
        lines.append("## Feeds that failed this run")
        for e in errors:
            lines.append(f"- {e}")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"Generated by `scripts/daily_brief.py` at {dt.datetime.now(dt.timezone.utc).isoformat()}.")
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Build the daily U.S. data center news brief.",
    )
    p.add_argument(
        "--cluster",
        action="store_true",
        help="group items covering the same story and rank against profile.md (local, no API key)",
    )
    p.add_argument(
        "--editorial",
        action="store_true",
        help="--cluster plus a per-story model call for why-it-matters (needs ANTHROPIC_API_KEY)",
    )
    p.add_argument(
        "--from-brief",
        metavar="PATH",
        help="rebuild from an existing brief file instead of fetching feeds; never writes the archive or state",
    )
    p.add_argument("--out", metavar="PATH", help="write the brief here instead of the usual locations")
    p.add_argument("--model", default=None, help="model for the editorial pass (default: Haiku 4.5)")
    p.add_argument(
        "--max-api-items",
        type=int,
        default=None,
        metavar="N",
        help="cap how many stories get an API call (default: 12)",
    )
    p.add_argument("--no-learn", action="store_true", help="skip the 'Learn this' call")
    p.add_argument("--dry-run", action="store_true", help="print the brief, write nothing")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    replaying = bool(args.from_brief)
    use_editorial = args.editorial or args.cluster

    if replaying:
        import editorial as editorial_mod

        src = Path(args.from_brief)
        if not src.exists():
            print(f"[err] no such brief: {src}", file=sys.stderr)
            return 1
        fresh = editorial_mod.parse_brief(src)
        date_str = src.stem
        if not fresh:
            print(f"[err] no items parsed out of {src}", file=sys.stderr)
            return 1
        print(f"[replay] {len(fresh)} items from {src}", file=sys.stderr)
        if not use_editorial:
            print(
                "[warn] --from-brief without --cluster/--editorial just reformats; "
                "add --cluster to see the difference",
                file=sys.stderr,
            )
        return finish(
            date_str,
            fresh,
            errors=[],
            args=args,
            use_editorial=use_editorial,
            write_archive=False,
            state=None,
            seen={},
            now=dt.datetime.now(dt.timezone.utc),
        )

    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(hours=WINDOW_HOURS)
    date_str = now.strftime("%Y-%m-%d")

    state = load_state()
    seen: dict[str, str] = state.get("seen", {})

    errors: list[str] = []
    all_items: list[dict] = []

    for source, url in FEEDS:
        try:
            raw = fetch(url)
            items = parse_feed(source, raw)
            all_items.extend(items)
            print(f"[ok] {source}: {len(items)} items", file=sys.stderr)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            errors.append(f"{source}: {type(e).__name__}: {e}")
            print(f"[err] {source}: {e}", file=sys.stderr)
        except Exception as e:
            errors.append(f"{source}: {type(e).__name__}: {e}")
            print(f"[err] {source}: {e}", file=sys.stderr)

    # Filter: date window + relevance + dedup (against history and within this run)
    fresh: list[dict] = []
    run_links: set[str] = set()
    run_titles: set[str] = set()
    for it in all_items:
        norm_title = re.sub(r"[^a-z0-9]+", " ", it["title"].lower()).strip()
        title_key = f"t:{norm_title}" if norm_title else ""
        # Dedup against history. Google News rotates its article-link tokens
        # between fetches, so the headline is the stable key, not the URL.
        if it["link"] in seen or (title_key and title_key in seen):
            continue
        # Dedup within this run (same story across multiple feeds/queries).
        if it["link"] in run_links or (norm_title and norm_title in run_titles):
            continue
        pub = it.get("published")
        if pub and pub < cutoff:
            continue
        if not is_relevant(it):
            continue
        it["_title_key"] = title_key
        run_links.add(it["link"])
        if norm_title:
            run_titles.add(norm_title)
        fresh.append(it)

    # Sort newest first
    fresh.sort(key=lambda x: x.get("published") or dt.datetime.min.replace(tzinfo=dt.timezone.utc), reverse=True)

    return finish(
        date_str,
        fresh,
        errors=errors,
        args=args,
        use_editorial=use_editorial,
        write_archive=True,
        state=state,
        seen=seen,
        now=now,
    )


def finish(
    date_str: str,
    fresh: list[dict],
    *,
    errors: list[str],
    args: argparse.Namespace,
    use_editorial: bool,
    write_archive: bool,
    state: dict | None,
    seen: dict[str, str],
    now: dt.datetime,
) -> int:
    """Render the collected items and write them where they belong."""
    # Categorize. The section is also stamped onto each item so the editorial
    # layer can show what the aggregator thought a story was about.
    by_section: dict[str, list[dict]] = {}
    for it in fresh:
        section = it.get("section") or categorize(it)
        it["section"] = section
        by_section.setdefault(section, []).append(it)

    if use_editorial:
        import editorial as editorial_mod

        kwargs: dict = {
            "errors": errors,
            "use_api": args.editorial,
            "learn_slot": not args.no_learn,
            "now": now,
        }
        if args.model:
            kwargs["model"] = args.model
        if args.max_api_items is not None:
            kwargs["max_api_items"] = args.max_api_items
        brief = editorial_mod.build(date_str, fresh, **kwargs)
    else:
        brief = build_brief(date_str, by_section, errors)

    if args.dry_run:
        print(brief)
        print(f"[dry-run] {len(fresh)} items, {len(errors)} feed errors", file=sys.stderr)
        return 0

    written: list[str] = []
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(brief)
        written.append(str(out_path))
    elif write_archive:
        BRIEFS_DIR.mkdir(parents=True, exist_ok=True)
        dated_path = BRIEFS_DIR / f"{date_str}.md"
        dated_path.write_text(brief)
        LATEST_PATH.write_text(brief)
        written.extend([str(dated_path), "LATEST_BRIEF.md"])
    else:
        # Replay with no destination: stdout, so it can be piped or diffed.
        print(brief)

    # Update seen state — record both the link and the title key so the next
    # run can dedup even when Google News hands back a fresh link token. Only
    # the real archive-writing run touches state; a replay or a --out render
    # must not consume today's items.
    if state is not None and write_archive and not args.out:
        for it in fresh:
            seen[it["link"]] = now.isoformat()
            if it.get("_title_key"):
                seen[it["_title_key"]] = now.isoformat()
        state["seen"] = prune_seen(seen)
        save_state(state)

    target = " and ".join(written) if written else "stdout"
    print(
        f"[done] wrote {target} — {len(fresh)} fresh items, {len(errors)} feed errors",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
