# TitleViz — the business case

*Written as a founder memo: why this specific product, of everything that could have been
built, is the one with a credible path to $1M+ for a practicing CRE attorney.*

## Why you win this market

Title commitment review is (1) universal — every financed CRE deal in America produces a
commitment that someone must review; (2) tedious — 60+ pages, mostly boilerplate, with two
or three items that actually matter buried in the middle; (3) expensive — associates bill
$300–600/hr to do it, and small buyers/brokers/lenders often skip real review entirely; and
(4) **trust-gated** — generic AI startups can't credibly sell into it, but *"built by a
practicing commercial real estate attorney"* can. Your license, your network of escrow
officers, lenders, and brokers, and your ability to sanity-check the output are the moat.
The tech is the easy part — this repo is the proof.

## Who pays, and what they pay

| Segment | Pain | Offer | Price point |
|---|---|---|---|
| Solo / small-firm CRE attorneys & paralegals | First-pass review eats unbillable or write-down time | Unlimited reviews, memo export | $99–199/mo per seat |
| Community banks & credit union CRE lenders | No in-house title review; outside counsel is slow | Lender-perspective reviews + exception log per loan file | $500–1,500/mo per branch/team |
| 1031 / small-balance buyers and brokers | Can't afford counsel for review, sign blind | Pay-per-review | $49–99 per commitment |
| Title agencies (later) | Differentiation; faster clearing | White-label "plain-English commitment summary" for their customers | License |

Napkin math to $1M ARR: ~85 firm seats at $150/mo ≈ $153K… so seats alone don't get there.
The realistic path is **lender teams** (40 teams × $1,000/mo = $480K) plus **firm seats**
(150 × $150 = $270K) plus **per-review volume** (5,000 reviews/yr × $60 = $300K) ≈ $1.05M.
Lenders are the anchor: they have recurring volume, budgets, and a compliance story
("every loan file gets a documented title review").

## Sequencing (deliberately boring)

1. **Now (this repo):** Use it on your own deals for a month. Every review you run is QA.
   Keep a hit/miss log — that log becomes your accuracy claim and your demo material
   (scrubbed). Your playbook already has `roi-ledger` for exactly this.
2. **Month 1–2:** Hand the URL to five people you know — two paralegals, a title officer,
   an escrow manager, a small-balance broker. Watch them use it. The feature requests will
   be unanimous and small (e.g., "export to Word," "endorsement checklist").
3. **Month 2–4:** Put it behind a $49/review Stripe paywall with a thin proxy (Cloudflare
   Worker holding the API key, ~50 lines). First dollar of revenue validates more than any
   amount of building.
4. **Month 4+:** Pitch one community bank you already work with. A lender pilot — even
   free — produces the case study that sells the next ten.

## What the moat becomes over time

- **A jurisdiction layer.** Washington practice differs from Texas practice (your
  `jurisdiction-sheet` skill is literally this knowledge). Encoding per-state deletion
  practice, endorsement availability, and customary allocations into the prompt is work
  only a practitioner can do, and it compounds.
- **An exception-document pipeline.** v2 ingests the hyperlinked underlying documents
  (your `title-exception-extractor-html-tool` idea is the missing piece — it's the same
  product) and reviews the actual REAs/CC&Rs, not just the exception list.
- **The endorsement engine.** "Given these exceptions, here are the endorsements to
  request and the ones this underwriter customarily gives" — that's the feature lenders
  will pay the most for.

## Risks, stated plainly

- **UPL / liability:** Keep the framing as "organizer + accelerant" with the disclaimer it
  already carries; sell to professionals first (attorneys, lenders) where the user is the
  professional of record. Get a tech E&O quote before selling to consumers.
- **Accuracy:** A missed unreleased deed of trust is the nightmare case. Mitigations: the
  schema forces item-by-item coverage (nothing skipped), the prompt forbids bluffing, and
  the product positions as first-pass. Your month of personal QA is the real mitigation.
- **Incumbents:** Title companies could build this. They won't ship plain-English risk
  ratings *against their own exceptions* — their incentive is to keep exceptions on the
  policy. The conflict of interest is your positioning.

## Why this beat the other candidates

Considered and passed on, for the record: a lease abstractor (crowded — Ocrolus, Prophia,
LeaseLens et al.), a deal-checklist generator (useful, not a wedge — it's a feature of
this product later), and consumer-facing legal tools (UPL exposure without the
professional buyer). Title commitment review had no credible AI-native incumbent in the
small-balance/community-lender segment, and it was already twice in your own ideas folder
— you had validated the pain personally before I ever read it.
