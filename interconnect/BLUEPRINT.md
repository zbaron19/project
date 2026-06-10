# The Interconnect — Business Blueprint

*Drafted 2026-06-10. A subscription intelligence product covering U.S. data center
site selection, zoning, power, and incentives — at the county-docket level, before
it's news.*

---

## 1. The product

Three layers, one funnel:

| Layer | What it is | Price | Purpose |
|---|---|---|---|
| **Daily Wire** (free) | The existing automated daily links brief (`scripts/daily_brief.py`), published publicly | $0 | Audience + SEO + credibility. Already built, already running. |
| **The Weekly Interconnect** (paid) | Weekly edition: jurisdiction signals (agenda items, docket filings, moratorium chatter caught early) + 3–5 short "what it means" analyses + a running scorecard of hot jurisdictions | $1,950–$9,500/yr | The revenue. |
| **Desk tier** (paid, top) | Everything above + quarterly jurisdiction deep-dive report + 2 "ask the analyst" questions/quarter (analyst questions, never legal advice) | $9,500/yr | Whale revenue, relationship moat. |

The signature recurring features that make it sticky:

- **The Docket Radar** — every agenda item, rezoning application, special-use
  permit, and moratorium discussion touching data centers across the watch list,
  with hearing dates. This is the thing nobody else ships weekly.
- **The Tariff Tracker** — large-load tariff and interconnection cost-allocation
  proceedings (FERC + state PUCs), each with a one-line "if this passes" note.
- **The Heat Index** — a simple 0–10 friction score per watched jurisdiction
  (political resistance, power availability, incentive posture), updated when
  signals move it. Becomes the industry's shorthand; people screenshot it.
- **Where the Load Goes Next** — the editorial crown jewel: when a market tightens,
  name the three jurisdictions that benefit, and why.

## 2. The buyer

People whose job performance depends on knowing this first:

1. **Data center developers' site selection & entitlement teams** (the core buyer)
2. **Brokers** — data center practice groups at the big shops and boutiques
3. **Hyperscaler real estate/energy teams**
4. **Infrastructure PE / credit funds** underwriting platforms and powered land
5. **Utilities' key-account and load-forecasting teams**
6. **Economic development agencies** competing for projects
7. **Vendors selling into the buildout** (modular power, switchgear, EPCs) who
   need to know where the next cluster forms
8. **Law firms and lenders** active in the space (they expense anything)

All B2B. All expensing it. All currently assembling this picture by hand from
Google Alerts, LinkedIn, and luck.

## 3. The moat (be honest about it)

- **The collection is not the moat** — anyone can poll RSS. The moat is
  (a) the **curated watch list** of which county feeds and dockets actually matter,
  built from practitioner knowledge; (b) the **judgment layer** — a practitioner's
  read on what an agenda item means, which non-practitioners can't fake and
  practitioners are too busy/conflicted to publish; (c) **compounding archive** —
  after a year, the Heat Index time series is itself a dataset people will pay for.
- **Speed of trust:** in a niche this small, being *the* byline for 18 months ≈
  permanent. First-mover in "county-level data center early warning" is open today.
- **What competitors do instead:** DC Byte / datacenterHawk sell supply/absorption
  market data ($10k–$50k/yr). Trade press (DCD, DCF, Bisnow) covers what already
  happened, for free, ad-supported. Politico Pro / Heatmap cover energy policy
  broadly. Nobody owns the county docket layer. That's the wedge.

## 4. Pricing & the path to $400k

Anchor high — the comparison set is market-data subscriptions, not newsletters.

| Tier | Price | Year-1 target | Year-2 target | Year-2 revenue |
|---|---|---|---|---|
| Pro | $1,950/yr ($195/mo) | 40 | 120 | $234,000 |
| Team (5 seats) | $4,900/yr | 8 | 25 | $122,500 |
| Desk | $9,500/yr | 2 | 8 | $76,000 |
| **Total** | | **~$117k (yr 1)** | **~153 accounts** | **$432,500** |

Founding-member launch: first 25 subscribers get Pro at $1,450/yr locked for life.
Urgency, testimonials, and the first $36k of validation in month one or two.

Churn assumption: 15–20%/yr (B2B expensed intel churns low if it's read). Even at
25% churn, ~50 new accounts/yr sustains the plateau — about one new account per
week, which one good LinkedIn post can do in this niche.

**Kill criteria** (so this never becomes a zombie): if after 90 days of consistent
weekly publishing the free list is under 300 or paid is under 10, the thesis is
wrong — stop, do the post-mortem, keep the pipeline as a personal tool.

## 5. Time budget (the actual constraint)

| Activity | Hours/week |
|---|---|
| Review pipeline output, pick the 3–5 stories that matter | 1.0 |
| Write/edit the analysis layer (Claude drafts, you judge) | 2.0 |
| Docket Radar verification (click the agendas that fired) | 0.5 |
| Distribution: 2 LinkedIn posts + replies | 1.0 |
| Subscriber ops / sales calls (front-loaded at launch) | 0.5–2.0 |
| **Total steady state** | **~5 hrs/week** |

Quarterly: one deep-dive report (~6 hrs, Claude-assisted) for the Desk tier.
$400k ÷ 260 hrs/yr ≈ **$1,650/hr effective**. That's the whole point.

## 6. Go-to-market (sequenced, no spend)

1. **Publish the free Daily Wire publicly** (beehiiv or Ghost). It already exists;
   it just needs to stop being private. Auto-cross-post the TL;DR to LinkedIn.
2. **LinkedIn is the entire channel.** The data center CRE niche lives there. Two
   posts/week: one Docket Radar teaser ("Fauquier County just docketed X — paid
   subscribers got the analysis Monday"), one Heat Index screenshot. The teaser
   format *is* the ad.
3. **Direct founding-member outreach:** 50 warm-ish contacts in the industry get a
   personal note + a sample edition. Target: 10 founding members from this alone.
4. **One free deep-dive as a lead magnet** (e.g., "The 2026 Moratorium Map:
   every U.S. jurisdiction restricting data centers, on one page"). Gated by email.
   This single artifact can build the whole list — it's screenshot bait and nobody
   has made it.
5. **Podcast/webinar circuit** (months 3–6): the data center pod ecosystem is
   hungry for guests who know land use. Each appearance = subscribers.

## 7. Stack (boring on purpose)

- **Delivery/payments:** beehiiv (or Ghost) + Stripe. Handles paywall, tiers,
  founding-member coupons. ~$100/mo at scale.
- **Collection:** this repo. `daily_brief.py` (exists) + `jurisdiction_watch.py`
  (built, in `pipeline/`) on the same GitHub Actions cron pattern.
- **Drafting:** `weekly_edition.py` assembles the week's material and (optionally,
  with `ANTHROPIC_API_KEY`) produces a first-draft analysis scaffold. You edit in
  30–60 minutes. You are the byline; the model is the research assistant.
- **No website beyond `site/index.html`** until revenue justifies it.

## 8. Risks, named honestly

| Risk | Reality check | Mitigation |
|---|---|---|
| Employer conflict / outside-activities policy | The real gating item | Get written clearance first (checklist item #1). Public sources only; analyst voice; no client matters; consider a pseudonymous masthead if needed. |
| "Trade press starts doing this" | They're ad-funded and national; county dockets don't scale for them | Speed + depth + the Heat Index dataset |
| A competitor copies the format | Likely if it works | Be the byline first; archive + relationships compound |
| Feed rot (counties change CMS) | Constant, low-grade | `jurisdiction_watch.py` reports failures per run, same as `daily_brief.py`; budget 15 min/week |
| Boredom / consistency risk | The #1 newsletter killer | The pipeline does the boring part; 90-day kill criteria keeps it honest |
| AI makes "intelligence" free | The collection, yes; the judgment + trust + dataset, no | Keep moving up: Heat Index → data product → API |

## 9. Year-2 option value (don't build now, just know it's there)

- **Heat Index as a data product/API** — sell the time series to funds.
- **Sponsorships** on the free Daily Wire (vendors will pay $1–3k/issue in this
  niche once the list is 2,000+).
- **Annual "State of the Ground" report** — $495 one-off, also a funnel.
- **Acquisition gravity:** niche B2B intel products with $400k ARR and a dataset
  get bought by the DC Bytes and Informas of the world at 3–5x revenue. This is a
  sellable asset, not just an income stream.

---

*Disclaimer that ships on every edition: The Interconnect is market intelligence
compiled from public sources. It is not legal advice and does not create an
attorney-client relationship. Verify primary sources before acting.*
