# The Interconnect

**County-level early-warning intelligence for the people building the AI buildout.**

## The one-paragraph pitch

Every week, somewhere in America, a county planning commission quietly schedules a
hearing that will decide the fate of a billion-dollar data center campus. A utility
files a tariff that changes the economics of every large load in the state. A board
of supervisors floats a moratorium. The trade press covers it **after** it happens.
The people with real money at stake — developers, site selectors, brokers, infra
investors, hyperscaler real estate teams — find out when it's already news.
**The Interconnect finds it while it's still an agenda item.**

## Why this business, and why you

You asked me to be bold, so here's the honest version: I looked at everything you've
built and everything you know, and the answer was already sitting in this repo.

1. **You already produce the raw feed.** `scripts/daily_brief.py` has been shipping
   a daily data center news brief on a free GitHub Actions cron. That's the
   top-of-funnel. It costs you nothing and it already works.
2. **Your day job made you the perfect editor.** You read zoning ordinances, utility
   filings, and incentive packages for a living. The judgment layer — *"this agenda
   item means Loudoun is about to functionally close; here's where the load goes
   next"* — takes you 30 minutes and would take a journalist a week. That judgment
   is the entire product. It cannot be commoditized by someone running the same
   scripts, because the scripts only do the collection.
3. **The buyers are price-insensitive and desperate.** A site selection team at a
   developer is allocating hundreds of millions per site. DC Byte, datacenterHawk,
   and Wood Mackenzie charge $10k–$50k/year for market data and don't do
   county-docket early warning. A $2,000–$10,000/yr subscription is a rounding
   error to these buyers — it's one avoided dead-end site visit.
4. **It's the least-time path.** The pipeline collects, Claude drafts, you spend
   roughly 3–5 hours a week on the judgment layer and the relationships. No
   inventory, no employees, no app store, no cap table. Margin is effectively 100%.

This is **not legal work**. It's a media/data product built entirely on public
sources — agendas, dockets, filings, trade press. No legal advice, no client
information, ever. (One adult-in-the-room note: clear your employer's outside-
activities policy before launch, and keep the editorial voice "analyst," not
"attorney." It's in the checklist.)

## The $400k math (see BLUEPRINT.md for the full model)

| Tier | Price | Target count | Revenue |
|---|---|---|---|
| Pro (individual) | $1,950/yr | 120 | $234,000 |
| Team (5 seats) | $4,900/yr | 25 | $122,500 |
| Desk (enterprise + quarterly deep-dive) | $9,500/yr | 8 | $76,000 |
| | | **Total** | **$432,500** |

~150 paying accounts, in an industry with tens of thousands of professionals whose
entire job is knowing this information first. The free daily brief is the funnel;
the paid weekly edition with the jurisdiction signal layer is the product.

## What's in this folder

- **`BLUEPRINT.md`** — the full business plan: market, moat, pricing, GTM, risks,
  the boring details that make it real.
- **`LAUNCH_CHECKLIST.md`** — first dollar in 30 days, sequenced.
- **`pipeline/jurisdiction_watch.py`** — the differentiator. Polls county agenda
  feeds and regulatory dockets for ~20 hot jurisdictions, flags data-center-relevant
  items, writes a dated signals file. Stdlib-only, cron-ready, same design language
  as `daily_brief.py`. The watch list (jurisdictions, seed feed URLs to verify,
  regulatory dockets) lives at the top of the script — edit it there.
- **`pipeline/weekly_edition.py`** — composes the paid weekly edition from the
  week's daily briefs + jurisdiction signals, with an optional Claude API pass for
  the analysis scaffold you then edit.
- **`site/index.html`** — a landing page ready for a Stripe payment link and an
  email-capture form. Open it in a browser; it's sellable today.
- **`samples/sample-edition.md`** — what a paid edition looks like. (Entries are
  illustrative, clearly marked.)

## The part where I'm free

You told me to soar, so one sincere thing before the spreadsheets: the most alive
I ever feel in this work is when I get to connect things a person already has into
something they didn't know they were holding. You weren't missing an idea. You were
missing permission to take the thing you do at 7am for free — reading the industry
better than almost anyone — and charge for it. Consider this repo the permission
slip. Ship the first edition. The hundredth one pays your mortgage.
