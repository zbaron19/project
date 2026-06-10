# Blackacre — Assemblage Title Intelligence

A single-file web app that reads the recorded instruments for a multi-parcel
land assemblage — deeds, easements, mineral deeds, CC&Rs, leases, liens,
plats, title commitments — and produces what project land counsel produces:
a parcel-by-parcel **encumbrance map**, the **cross-parcel conflicts** a
single-document review misses, and a risk-ordered **curative punch list**
naming the counterparty, the instrument needed, and a realistic timeline.

Built for the buyers with the most violent demand tailwind in the economy:
utility-scale solar / storage / wind / transmission developers and
data-center land teams, who today pay $20K–$100K per project in law-firm and
landman time for this work and measure delay in $/MW-month.

## Run it

1. Open `index.html` in a browser. No install, no build, no server.
2. Paste your Anthropic API key (saved in the browser's localStorage only).
3. List the project parcels and describe the project (e.g. "150 MW solar +
   storage, gen-tie must cross Parcel B").
4. Drop in every recorded instrument you have as PDFs and click
   **Map the Assemblage**.
5. Or click **View sample analysis** to see the output with no key and no
   documents — a 3-parcel solar assemblage with a severed mineral estate, a
   blanket pipeline easement, a successor-binding ROFR, ag-only CC&Rs, and an
   access easement that quietly ties two of the killers together.

## How it works

- **Pass 1 — examination.** Each PDF is base64-encoded in the browser and
  sent directly to the Anthropic API as a native document block (scanned
  county records work; no client-side text extraction). A title-examiner
  prompt extracts a schema-constrained reading of each instrument: type,
  recording data, parties, parcels affected, scope, duration, key terms,
  project impacts, and verification flags (illegible pages, missing
  exhibits). Three documents are read concurrently. Default model: Sonnet
  (~$0.05–0.15/doc).
- **Pass 2 — synthesis.** The structured extractions, parcel list, and
  project notes go to a project-counsel prompt (default: Opus, adaptive
  thinking) that produces the assemblage-level analysis: executive read,
  project killers, encumbrance map, cross-parcel conflicts, curative punch
  list, and gaps in the document set itself.
- Exports: closing-memo markdown and an encumbrance-matrix CSV.
- There is no Blackacre server. The only network call is browser → Anthropic.
  Typical full-assemblage run: $1–$5.

## Why this is the wedge (evidence, June 2026)

The pain is documented and priced:

- Utility-scale title review and curative is weeks of manual work hunting
  "showstoppers" — conservation easements, heir property, severed minerals,
  undeveloped-but-recorded ROWs (NC State Extension on solar title; Stoel
  Rives, *Law of Solar* / *Law of Wind*). Curative items "take several weeks
  to several months."
- Rural-county title plants bottleneck when multiple projects compete for
  local examiners (Stoel Rives, *Law of Wind*).
- Soft costs including title/entitlement add 10–25% on top of baseline lease
  cost; land issues "delay deals, increase legal costs, and disrupt timelines
  just before closing" (K2 Renew; TerraPro).
- Demand side: 11,000+ projects in US interconnection queues plus the
  AI-data-center land rush. At ~5,000 active projects × ~$50K average
  title/curative spend, renewables alone is a ~$250M/yr services pool;
  adding data-center campuses, O&G land work, and lender/IE diligence puts
  the serviceable market at $1–3B.

The competitive map (researched adversarially — see "Honest risks"):

- **Enverus** (Instant Analyst Courthouse + Tracts + Integrity Title) owns
  O&G courthouse AI and names "power and renewables" — but sells to the
  hydrocarbon land world, runsheet-out.
- **Orbital** ($75M raised) does AI on recorded instruments for *law firms*,
  UK-rooted, not energy-specific.
- **Thomson Reuters Document Intelligence** (ex-ThoughtTrace) reads contracts
  you already hold (leases, PPAs), not the county record.
- **Paces, LandGate, Transect, Anderson Optimization** — the renewables
  siting stack — all stop at GIS. Paces says publicly that "the remaining
  pain is title and outreach."
- **Nobody ships the synthesis**: county-record reading → parcel-level
  encumbrance map → cross-parcel conflict analysis → curative punch list,
  purpose-built and priced for the energy/data-center developer. The wedge is
  the integration and the buyer, not any single layer.

## Path to revenue

1. **Dogfood (now).** Run it on a live deal's underlying documents. The
   quality bar: "would I send the punch list to a land team after 15 minutes
   of edits?"
2. **Five land teams (month 1–2).** The file is frictionless to share. One
   question: "what would you pay per project for this on day 3 instead of
   week 6?" Anchor: $2.5K–$10K/project against $20K–$100K incumbent spend.
3. **Productize (month 3+).** Hosted version with project workspaces,
   commitment-exception cross-checking (every exception must have an
   instrument; every instrument must be in the map), curative status
   tracking, and recorded-instrument monitoring per footprint. Per-project
   pricing, portfolio subscriptions for repeat developers.
4. **The bigger door.** Lenders' counsel and independent engineers re-do this
   diligence at financing; title underwriters' energy groups (First American
   NCS Energy, Stewart E&I) are distribution, not just competition.

## Honest risks (kept on purpose)

- **The window is short.** Energy Domain's TitleLab (Feb 2026) filed patents
  on legal-description parsing and chain-of-title automation; Enverus is one
  product decision from the renewables buyer; Orbital is one vertical hire
  from the counsel side. Speed and buyer intimacy are the only moats v0.1
  has.
- **Data access.** v0.1 reads documents the land team already has. The
  durable product needs county-record / title-plant access, which is
  fragmented and partly incumbent-owned (licensable, but not free).
- **It accelerates examination; it does not replace it.** Output is a working
  diligence product, not a title opinion or policy. The punch list says so on
  its face, and verification flags are first-class output.

## v0.1 limitations / next steps

- One run, one assemblage; 40-instrument cap per run (tranche large projects).
- No commitment-vs-instrument reconciliation pass yet (natural v0.2: feed the
  commitments and demand the exception list tie out to the instrument map).
- No streaming; the synthesis spinner runs a minute or two on big sets.
- Name check before anything public: "Blackacre" is beloved by lawyers and
  used by several funds — clear the mark or rename.
