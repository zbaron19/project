# scripts/daily_brief.py

Automated daily U.S. data center news brief.

> **Two layers.** With no flags this is the deterministic aggregator described
> below — the cron path, unchanged. The `--cluster` and `--editorial` flags add
> the editorial layer in `scripts/editorial.py`, which turns "what got
> published" into "what matters to you". See **The editorial layer** at the
> bottom.

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

---

# The editorial layer (`scripts/editorial.py`)

The aggregator answers "what got published in the last day?" — every item, in
feed order, at equal weight. This layer answers "which of it matters to me, and
why?", which is the difference between a wire feed and a brief.

## Three stages

| Stage | Needs a key | What it does |
| --- | --- | --- |
| Clean | no | Strips the outlet name Google News staples onto headlines, drops summaries that just restate the headline, and links a publisher's real URL instead of a Google redirect when both are available for the same story. |
| Cluster | no | Groups items covering the same story. Eight paraphrased headlines about one financing deal become one entry with eight sources. |
| Editorial | yes | One small-model call per story: a plain-English "what happened", a "why this matters to you" line tied to a beat or matter, a tag, and a relevance score. Plus one call for the **Learn this** slot. |

Stories are ranked against `profile.md`, the top ~10 get the full treatment, and
everything below the cut collapses into a plain **Also happened** link list.
Nothing is silently dropped.

## Run it

```bash
# local only — no API key needed
python3 scripts/daily_brief.py --cluster --dry-run

# full editorial pass
export ANTHROPIC_API_KEY=...
python3 scripts/daily_brief.py --editorial --dry-run

# replay a past day for a side-by-side comparison. Never touches briefs/
# or scripts/state/seen.json, so it is safe to run any number of times.
python3 scripts/daily_brief.py --from-brief briefs/2026-07-27.md --editorial \
  --out /tmp/edited.md
```

Other flags: `--model` (default `claude-haiku-4-5`), `--max-api-items` (default
12 — the cost ceiling), `--no-learn`, `--out`, `--dry-run`.

## profile.md is the editorial standard

`profile.md` at the repo root defines the beats, the active matters, what the
reader is learning, and phrases to **Boost** or **Mute**. It is the whole
personalization mechanism, and it is meant to be edited by hand as deals start
and finish. Format is `label — keyword, keyword` bullets under `##` headings.

Two things learned from tuning it against real output:

- **Keep `Matters` keywords narrow.** They carry the heaviest weight, so a bare
  place name ("Ohio") matches every hyperscaler press release and drowns out
  real matches. Use terms that only appear when the story is genuinely about
  the matter ("annexation", "powered shell", "by-right").
- **Multi-word keywords must match verbatim.** "moratorium risk" will not match
  a headline that says "moratorium". Prefer single terms.

**Confidentiality:** `profile.md` is committed to GitHub and its text is sent to
the Anthropic API on every editorial run. Describe matters generically — deal
type, geography, the issue being watched. No client names, no party names.

## Cost

One Haiku call per story (capped at `--max-api-items`, default 12) plus one for
the Learn this slot — order of a cent per morning at current Haiku pricing.
Ranking happens locally first, so the cap spends the budget on the stories that
already scored highest rather than on whatever came back first.

## Failure behaviour

The editorial pass degrades instead of failing. No `ANTHROPIC_API_KEY` means the
clean and cluster stages still run and the brief notes that the editorial pass
was skipped. A failed or refused call on one story leaves that story rendered
from its local data, with the reason listed under **Editorial pass notes**.
Retries are 2s/4s/8s/16s on 429 and 5xx.

## Ranking signals (local)

Matters (weight 6 each, capped 12) · Boost phrases (4 each, capped 12) · Beats
(2 each, capped 8) · Learning terms (1.5 each) · source tier (0–3) · freshness
(0–3) · breadth of coverage (0.4 per extra outlet, capped 1.6, and not paid at
all when every outlet is a syndicator) · Mute phrases (−25, which buries the
story). When the editorial pass runs, the model's own 0–100 relevance read adds
up to 10 more, and a `skip` tag subtracts 30.

Breadth is deliberately the weakest signal: a wire story syndicated eight times
is newsworthy in general, which is a different question from whether it matters
to this reader.
