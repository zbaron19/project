# Groundwork — Go-to-Market

*Written after an eight-lens council review (June 2026). Verdict tally: 5 proceed-with-changes,
3 reconsider, 0 kill. This plan is the "with changes" — it is materially different from the
original seed, and the differences are where the council earned its keep.*

## The honest frame

A solo diligence practice is not, by itself, generational wealth — it is a high-income
practice capped by your hours. What *can* compound into a durable asset is built alongside it:

1. **The audience** — a named, free, weekly brief that makes you "the data center land
   lawyer for the Northwest." Audiences compound; hours don't.
2. **The parcel-outcome dataset** — every screen produces proprietary, dated, sourced
   findings about why specific sites pass or fail in specific counties. Nobody can scrape
   that. By year three it is the moat; in an exit scenario it is the thing that gets bought.
3. **The brand/standard** — if the 40-point checklist becomes the rubric others reference,
   you own the Schelling point of the niche.

The services revenue funds the build; the three assets above are the wealth strategy.

## Launch gates — in order, no skipping

**Gate 0 — The firm.** Nothing public happens before this. Review your partnership/employment
agreement on outside practice, get written consent or make the exit decision. The council's
adversary lens was blunt: a moonlighting practice in the firm's own asset class, discovered on
LinkedIn mid-engagement, is termination-for-cause at the worst possible moment plus a possible
client-poaching claim. The mandatory question stands: **will you resign before the first public
marketing post — yes or no?** Either answer is workable; not answering is not.

**Gate 1 — Ethics structure.** Drop the "non-legal site intelligence" framing entirely. A scored
risk memo authored by a licensed attorney is legal services regardless of the disclaimer, and
the disclaimer itself invites an RPC 7.1 problem. Structure everything as legal services under a
short written engagement agreement: conflicts check, scope, fixed fee, limitation to verified
items. For parcels outside Washington, associate licensed local counsel (budget ~15-20% of the
fee) — do not rely on disclaimers to cross state lines (RPC 5.5).

**Gate 2 — E&O in writing.** Get a malpractice carrier's written confirmation that fixed-fee
parcel screens are covered before the first engagement. Expect questions about the scoring
language — which is why the engine no longer emits a numeric "go/no-go score" and instead
reports verified findings with risk calls and a counsel's recommendation.

**Gate 3 — Marketing copy review.** No outcome promises. "Know whether the site will kill your
deal" is warranty-shaped language a plaintiff's lawyer will read aloud to a jury; the rebuilt
landing page describes the process and the sourcing discipline instead. Keep it that way.

## Validation before scale — the council's homework

Do these before spending another dollar or hour on tooling. Each is a mandatory question a
council member refused to waive:

1. **Name three real people with budget authority** who would pay for a parcel screen — and
   find out why they haven't bought it from anyone yet. If the answer is "nobody pays at
   pre-LOI stage," the entry product is the retainer/brief, not the screen.
2. **Count the actual deals.** How many data-center land transactions closed in WA/OR/ID in
   the last 24 months, and what did buyers pay outside counsel? Do not proceed on assumed
   volume. (Sources: county recorder REET records, DJC, your own brief archive.)
3. **Time one real parcel end-to-end.** Run a full workbook on a real (or realistic) parcel,
   off the seeded markets. Record actual hours and the longest external wait (utility callback,
   county records). The 5-day desktop / confirmations-as-they-land structure in the offer
   exists because the council's engineer showed pure 5-day delivery is hostage to third parties.
4. **Get the firm answer (Gate 0).** It gates everything, including publishing the Brief
   under your own name.

## Sequencing — audience first, region first

The original plan (cold outreach to 30 brokers/developers with a $2,500 offer) burned
credibility on strangers. Inverted:

**Phase 1 (now → month 3): The Brief, in public.**
You already run the engine — `scripts/daily_brief.py` publishes daily. Rebrand the public
artifact as **The Groundwork Brief**, weekly, Northwest-focused (the daily stays your private
input). Free, no gating, relentlessly useful. Target list is small and known: the ~2,000
people who matter in Northwest data center land — developers' land leads, brokers, utility
and county economic-development staff, lenders' counsel. LinkedIn + email list. This is
compatible with firm employment in most cases (it's commentary, not solicitation) — but it is
still subject to Gate 0.

**Phase 2 (month 2 → 6): Private pilot screens.**
Two or three screens at a pilot price for people who already know you — referrals, former
colleagues, brief subscribers who reply. Purpose is not revenue; it is (a) timing data,
(b) testimonials, (c) the first entries in the parcel-outcome dataset, (d) a redacted sample
report. The demo report in `reports/parcel-demo-columbia-basin.html` is the placeholder until
a real redacted one exists.

**Phase 3 (month 6+): Open the ladder.**
Screen at $7,500 (not $2,500 — the council's economist and user advocate both flagged that
$2,500 is too cheap to be credible for a bet-the-deal question and anchors the whole ladder
as "budget"); acquisition diligence from $35,000 scoped; Market Watch at $3,500/month sold
primarily to Brief repliers. Geographic claim: **the data center land practice for the
Pacific Northwest and Columbia Basin** — hydro, irrigation districts, PUDs, REET, the
rural-county exemption. National generalist is not winnable solo; this is.

## Economics, de-fantasized

The seed's year-one math ($600K) assumed solved distribution. Council-adjusted:

| Phase | Realistic shape |
|---|---|
| Months 1–6 (employed, Gate-0 permitting) | Brief + 2–3 pilot screens ≈ $10–20K. Signal, not income. |
| Months 6–18 | If validation holds: 1–2 screens/mo + first diligence engagements ≈ $150–250K run-rate. Decision gate: this is where you choose firm vs. full-time. |
| Years 2–3 | 8–12 diligence engagements, 30–40 screens, 10+ Market Watch ≈ $700K–1M with one contract associate. |
| Year 5 best case (champion's scenario) | $1.5–2.5M/yr practice + 5K-subscriber Brief + the dataset. The dataset and audience are the sellable/generational layer. |

Cycle risk is real and unhedged: this is levered to data-center capex continuing. The hedge is
the audience — if the cycle turns, "the lawyer who tracks distressed data center land" is the
same brand pointed at workouts.

## First 10 customers — what v1 must contain (it now does)

- **A sample deliverable** that looks like what they'll get: `reports/parcel-demo-columbia-basin.html`
  (clearly marked fictional) — findings, sources, verification dates, risk calls, counsel's
  recommendation, and open items disclosed rather than papered over.
- **A provenance-enforced engine**: `groundwork.py new-parcel` / `screen` refuses to render a
  client-ready report with unverified items. The verification discipline *is* the product and
  the malpractice defense.
- **A credible page** (`site/index.html`) whose primary ask is the free Brief, with engagements
  positioned as private-pilot/by-referral — honest about stage, compliant in tone.
- **A clear answer to "why you"**: the only person in the niche who is simultaneously the
  lawyer, the analyst, and the toolmaker. Say it; prove it with the Brief.

What it deliberately does NOT contain: numeric go/no-go scores (liability-shaped), the
"non-legal intelligence" framing (ethics-shaped), and any promise about outcomes.
