# Groundwork — data center site diligence, productized

*A venture seed built from things you already have: a decade of CRE legal training,
a daily data center intelligence engine (this repo's `scripts/daily_brief.py`),
and the ability to build software with AI. This is the connected version of three
ideas already sitting in your playbook: `cre-lawyer-self-employment-transition`
(Path 3: productized services), `cre-title-finance-300k-income-path`, and
`data-center-colocation-lease-review-workflow`.*

## The thesis in four sentences

Data centers are the most capital-hungry, legally tangled asset class in American
real estate, and the constraint on every deal is the same six questions: power,
zoning, water, title, tax, politics. Buyers currently answer those questions with
either $1,200/hr big-law teams or a broker's assurance — there is no fast,
fixed-fee, expert product in the middle. You are one of very few people alive who
is simultaneously a trained CRE transactions lawyer, fluent in this asset class's
daily news flow, and able to build the software that makes a one-person practice
deliver like a team. The product is a **fixed-fee site screen** that ladders into
**flat-fee full diligence** and a **monitoring retainer** — productized services,
which is exactly the path your own notes already chose.

## What's in this folder

| File | What it is |
|---|---|
| `checklist.json` | The IP: a 40-point data center site diligence checklist across 8 workstreams, each item with *why it matters* and *red flags*. This encodes legal judgment into a reusable asset. Refine it on every deal — it compounds. |
| `data/markets.json` | Seeded intelligence on 8 major US markets (scored on power / entitlement / water / incentives / political). Screening-grade; every fact flagged for verification — the verification is the billable product. |
| `groundwork.py` | Dependency-free report engine. `--list`, `--compare`, or `python3 groundwork.py loudoun` → client-ready Markdown + styled HTML (print to PDF). |
| `site/index.html` | A deployable landing page with the offer and pricing. Drop it on Netlify/Vercel/GitHub Pages under a domain and it's live today. |
| `reports/` | Generated samples (Loudoun, Quincy, Iowa). |

```
python3 groundwork.py --list        # ranked markets
python3 groundwork.py quincy        # generate a report
python3 groundwork.py --checklist   # blank checklist for any site
```

## The product ladder

1. **Site Screen — $2,500, 5 days.** One parcel, 40-point screen, scored memo.
   This is the wedge: cheap enough to buy without a committee, valuable enough
   to forward to one. Each screen takes you 4–6 hours with the tooling here.
   Effective rate: $400–600/hr, at fixed-fee predictability the buyer prefers.
2. **Full Diligence Package — $25,000 flat.** When a screen turns into an
   acquisition, you're already the expert in the room. PSA diligence strategy,
   title/survey, entitlement counsel, incentive negotiation. One per month is
   a $300K/yr practice by itself.
3. **Market Watch Retainer — $3,500/mo.** Your `daily_brief.py` already reads
   the industry's news every morning. Pointed at a client's target markets and
   filtered through legal judgment, it becomes a standing service with ~zero
   marginal cost. Five retainers = $210K/yr of recurring revenue.

## The honest math to $1M

Not a SaaS fantasy — a leveraged practice:

| Stream | Volume | Revenue |
|---|---|---|
| Site screens | 3/month avg | $90K/yr |
| Full diligence | 1/month avg | $300K/yr |
| Retainers | 5 standing | $210K/yr |
| **Year-one shape** | | **~$600K gross** |

Year two, the screens compound (every screen is a relationship with a developer
who buys land for a living), you raise prices, and you hire a contract associate
for diligence delivery — that's the step from $600K to seven figures, and it's
Path 3 from your own notes executed in the asset class where you already have an
information edge. The exit-sized version, if you ever want it: the checklist +
market data + monitoring engine is a data product ("the Middletons of data center
land"), and data products in niches this rich get acquired.

## Why you, specifically

- **You already built the intelligence engine.** This repo publishes a curated
  data center brief every day. Nobody else marketing legal services in this niche
  wakes up with that.
- **Big-law CRE training** in dispositions, financing, equity, title — the exact
  workstreams in the checklist.
- **You build tools.** The playbook repo proves a one-person practice can run
  like a five-person one: capture, precedent search, redline diff, scrub,
  jurisdiction sheets. Groundwork is the client-facing edge of that system.
- **The market is screaming for it.** Read your own briefs: tariff fights,
  moratoria, incentive repeals, water politics — every headline is a buyer who
  needed a screen before they signed.

## 30-day validation plan (before quitting anything)

1. **Week 1:** Buy a domain, deploy `site/index.html`, set up a clean email.
   Verify bar rules on advertising and entity form (see risks below).
2. **Week 2:** Write one public sample — run `groundwork.py` on a market, verify
   every fact against primary sources, polish it, post it on LinkedIn as
   "what a real data center site screen looks like." This is the ad.
3. **Week 3:** Direct outreach: 20 land brokers and 10 developers active in
   data center listings. Offer the pilot-priced screen. The ask is one yes.
4. **Week 4:** Deliver the first paid screen. Capture every hour spent and every
   checklist gap into the playbook (`roi-ledger`, `lessons.md`). Decide with data.

## Risks, stated plainly

- **UPL / ethics:** Decide per engagement whether a screen is legal services
  (engagement letter, your jurisdiction's rules) or non-legal site intelligence
  (clear disclaimer, no advice). The landing page footer starts that separation;
  get it right with your bar before the first sale. Check moonlighting/conflict
  obligations with your current firm first.
- **Stale data:** `markets.json` is screening-grade seed knowledge, not current
  research. The workflow must force primary-source verification — that's also
  where the fee is earned.
- **Pipeline gap:** Your own note flagged it — independents fail on lead time.
  That's what the 30-day plan and the LinkedIn sample are for: build demand
  before you need it.

---

*Generated as a creative-freedom build, June 2026. The composite scores, the
checklist, the prose — all of it is a draft for your judgment to improve. That's
the point: the tool is the leverage; the lawyer is the product.*
