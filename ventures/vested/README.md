# Vested — Data Center Entitlement Intelligence

A county-level structured database of U.S. data center zoning actions — moratoriums,
ordinance amendments, overlay districts, comprehensive plan changes, and entitlement
litigation — with a legally literate decode of each record.

**Positioning:** the heatmap tells you where the fight is. Vested tells you what the
law says, whether your project is caught by it, and what to file next.

**Buyers:** data center developers' land/site-selection teams, and law firm zoning &
land use practices.

## Run it

Pure static site. No frameworks, no build step, no external CDNs.

```bash
cd ventures/vested
python3 -m http.server 8000
# open http://localhost:8000
```

(Serving matters: browsers block `fetch()` of `data/actions.json` on `file://` URLs.)

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Tracker: filterable table, expandable detail panels, Changed-this-week view, CSV export, copy-changes button |
| `methodology.html` | Sourcing, verification method, weekly cadence promise, TX/VA/GA vesting primer, disclaimers |
| `app.js` | All behavior, vanilla JS, no dependencies |
| `styles.css` | Restrained legal-research-tool design |
| `data/actions.json` | The dataset — the core deliverable |

## Data schema (`data/actions.json`)

Top level: `{ "meta": {...}, "actions": [...] }`.

`meta`: `product`, `dataset`, `as_of` (dataset date), `not_yet_covering`
(explicit coverage boundaries — stated limits read as rigor), `schema_version`.

Each record in `actions`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | stable slug, e.g. `va-loudoun-zoam-2024-0001` |
| `state` | string | two-letter code |
| `jurisdiction` | string | county or city name |
| `jurisdiction_type` | `county` \| `municipal` | labeled honestly — municipal and county actions are legally distinct |
| `action_type` | `moratorium` \| `ordinance_amendment` \| `overlay_district` \| `comprehensive_plan` \| `staff_pause` \| `litigation` | |
| `instrument_kind` | `ordinance` \| `resolution` \| `staff_action` | an ordinance amends law; a resolution often only expresses policy or a temporary pause — never conflated |
| `status` | `proposed` \| `adopted` \| `extended` \| `expired` \| `repealed` \| `pending_litigation` | judicial invalidation is shown under `repealed` for filtering with the precise posture in the record |
| `adopted_date` / `expiry_date` | ISO date or `null` | `null` renders as "Not yet verified" |
| `title` | string | human-readable instrument title |
| `scope_decode` | object | `prohibits_new_applications`, `prohibits_pending_applications`, `prohibits_permit_issuance` (bool or `null`) + `summary` |
| `pending_application_carveout` | object | `quote` (operative language or `null`) + `note` (plain English). Most moratoria exempt complete applications already filed — this field is the whole game |
| `vesting_context` | string | per-state vesting trigger note (TX ch. 245; VA § 15.2-2307; GA common law) |
| `numeric_standards` | string or null | free text by design (e.g., setbacks, dBA limits) — deliberately not over-normalized |
| `entitlement_path` | string | by-right vs. special exception / SUP posture |
| `next_hearing` | string or null | |
| `vote_tally` | string or null | never invented |
| `litigation` | string or null | |
| `editorial_analysis` | string | clearly labeled opinion; market/process implications, not advice |
| `sources` | array of `{label, url}` | ≥1 real URL per record, rendered adjacent to substantive claims |
| `last_verified` | ISO date | as-of date shown in the table |
| `verification_method` | string | currently "manual review of cited public sources" |
| `changed_date` / `change_note` | ISO date / string | drives the honest "Changed this week" view |

**Data integrity rule:** unknown fields are `null` and render "Not yet verified."
We never invent ordinance numbers, dates, or vote tallies. Real-but-incomplete
beats complete-but-fake.

## Pricing / tiers

| Tier | Price | What's included |
| --- | --- | --- |
| **Professional** | **$399 / yr** | Weekly newsletter ("Changed this week," human-written), full web access to the tracker, per-record source citations, vesting primer |
| **Enterprise** | **$12,000 / yr** | Everything in Professional, plus: full dataset access (CSV download / JSON API), alert feed (email/webhook on any `changed_date` in watched jurisdictions), custom jurisdiction watchlists, quarterly briefing call with the editorial team |

Rationale: Professional is priced as an individual professional-newsletter decision
(no procurement). Enterprise is priced against one hour of land use partner time per
month and against the cost of a single missed carve-out.

## 90-day data-operations plan

**Days 1–30 — Foundation (20–30 counties).**
- Lock the seed set: Northern Virginia (Loudoun, Prince William, Fairfax, Fauquier,
  Culpeper, Stafford, Spotsylvania, King George), metro Atlanta (Fulton/City of
  Atlanta, DeKalb, Coweta, Douglas, Newton, Cobb, Henry, Twiggs), Texas (Hill,
  Tarrant/Fort Worth, Cameron/Harlingen, Bosque, Ellis), plus the highest-signal
  outliers (Oldham KY, and 3–5 to be selected from PA/OH/IN/AZ/MN).
- Stand up per-county source registers: agenda page, legistar/granicus feed, planning
  department project pages, local paper of record.
- Verify every existing record against primary ordinance text where obtainable;
  upgrade `verification_method` per record as certified texts come in.
- Publish weekly from week 1, even if the change list is short. Honesty is the brand.

**Days 31–60 — Cadence and depth.**
- Weekly human-verified sweep of all covered counties (agendas Thursday, dockets
  Friday, publish Monday). Target: every record's `last_verified` ≤ 14 days old.
- Add the "what to file next" layer for the top 10 counties: application checklists,
  current fee schedules, average SPEX/SUP timelines from recent approvals.
- Begin litigation docket tracking (state circuit courts + PACER) for records with
  active cases; add docket numbers to `litigation` fields.
- First 10 Professional subscribers; collect "what did we miss" corrections — each
  correction is a marketing event.

**Days 61–90 — Scale the moat.**
- Expand to 40–50 counties, prioritized by subscriber watchlist requests.
- Ship the Enterprise alert feed (a static JSON changelog endpoint is sufficient at
  this stage) and the first quarterly briefing deck (state-by-state vesting exposure
  map).
- Hire/contract the first part-time records researcher (local government reporting or
  paralegal background); editor reviews every record before publish — the
  human-verified guarantee stays in the product description.
- Define the record-correction SLA publicly: errors fixed in the next weekly cycle,
  noted in the record's change log.

## Honest limitations (current dataset)

- Several Georgia records (Coweta ordinance/moratorium, Douglas, Newton) and the
  Culpeper, VA record have month-level but not day-level adoption dates, and ordinance
  numbers not yet verified — fields are `null` and shown as "Not yet verified."
- "Changed this week" is computed from `changed_date` against the viewer's clock;
  with the dataset frozen at its `as_of` date, the view will honestly empty out as
  time passes until the data is refreshed.
- Editorial analysis is opinion. Nothing here is legal advice; no attorney-client
  relationship is formed. Verify against official ordinance text.
