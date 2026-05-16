# scripts/daily_brief.py

Automated daily U.S. data center news brief.

## What it does

Fetches a curated list of trade-press and regulatory RSS feeds, filters to the
last 24–36 hours, dedupes against `scripts/state/seen.json` (rolling 14-day
window), categorizes by keyword into the same sections as the Claude-based
brief, and writes two files:

- `LATEST_BRIEF.md` at the project root (mobile-app shortcut).
- `briefs/YYYY-MM-DD.md` (dated archive).

It runs on the GitHub Actions cron defined in `.github/workflows/daily-brief.yml`.
Zero external Python deps — stdlib only.

## Run locally

```bash
python3 scripts/daily_brief.py
```

## Add or remove sources

Edit the `FEEDS` list at the top of `daily_brief.py`. Each entry is
`(display_name, rss_url)`. Failures on any one feed are non-fatal and
appear in the "Feeds that failed this run" section of the brief.

## Tune categorization

Edit the `SECTIONS` list — order matters, first keyword match wins.
`RELEVANCE_KEYWORDS` filters for data-center-related stories;
`NEGATIVE_KEYWORDS` drops obvious foreign or off-topic items;
`US_HINTS` boosts U.S.-relevant items.

## State file

`scripts/state/seen.json` tracks URLs seen in the last 14 days so the same
story doesn't get re-surfaced day after day. Safe to delete if you want a
clean slate; the script will recreate it.

## Failure handling

GitHub Actions will email the repo owner if a scheduled run fails (the workflow
exits non-zero). Otherwise the brief commits and pushes silently. If the brief
file for a given day is missing in `briefs/`, that day's run did not complete.
