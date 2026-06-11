# Ventures — three validated products

Three MVPs built from a full research → competitive comparison → eight-critic
red team → design review → build → verification pipeline (June 11, 2026).
Each runs fully offline: `cd <product> && python3 -m http.server` and open
`http://localhost:8000`.

## The thesis

No product is a "sure thing." What survived two rounds of adversarial market
research is a single defensible pattern: **a practicing CRE attorney selling
software/data into his own profession**, where domain judgment is the moat,
distribution is the existing professional network, and the buyer's job (not
hobby) depends on the tool. Killed along the way, with data: general legal AI
(saturated, consolidating), consumer board-game apps (free-ChatGPT
substitution, episodic use), consumer sobriety apps (CAC graveyard,
radioactive data), sober-living B2B (incumbents own the NARR channel).

## The three products (in launch order)

### 1. `vested/` — data center entitlement intelligence (the lead)
County-level structured database of data-center zoning actions with
attorney-grade decode: what each moratorium actually prohibits, pending-
application carve-outs, per-state vesting doctrine (TX ch. 245 / VA
§ 15.2-2307 / GA common law), hearing pipeline, vote tallies, litigation.
17 real cited records (VA/GA/TX/KY) at launch. Positioning: *"Heatmap tells
you where the fight is. Vested tells you what the law says, whether your
project is caught by it, and what to file next."* Tiers: $399/yr professional;
$12k/yr enterprise (CSV/alerts/quarterly briefing). The existing daily
data-center brief is the audience funnel. Council verdict: 8/8 proceed —
the only product with genuine exit math (acquirers: datacenterHawk, DC Byte,
Heatmap, MultiState).

### 2. `titleviz/` — commitment cross-check workbench (second)
Upload a title commitment + recorded docs → every Schedule B exception tied
to its source instrument, orphans flagged in both directions, one click to
the highlighted operative language, attorney attestation per item, print-
ready exam worksheet. Rescoped by the council from "chain visualization +
defect memos" to the bounded cross-check (chain assembly fails *confidently
wrong*; standard exceptions are never orphan-flagged). Pricing: $49/file
residential, $199 commercial, 10-packs. Buyers: WA RE attorneys, examiner
contractors, small agents not on Qualia.

### 3. `crosscheck/` — lease diligence workbench (opportunistic)
Supersession-aware lease review: operative-terms lineage (an amendment
changing rent is the documents *working*, not a conflict), estoppel-vs-
operative mismatch flags side-by-side with citations, mandatory attorney
disposition before any report exports (the UPL firewall). Restructured by
the council from "signed memos at $1.5–3k/matter" (implied attorney-client
relationships, uninsured moonlighting) to **software the buying attorney
applies judgment through**: $149/matter or $249/mo solo-firm unlimited.

## Hard gates before first dollar (non-negotiable, from the red team)

1. **Written firm consent** to all three lines, and **E&O/cyber carrier
   confirmation in writing** that side-business output is covered or
   separately insured (WA RPC 5.7; *Bohn v. Cody*, 119 Wn.2d 357).
2. **Customer evidence**: five named people who say yes at the stated price
   for whichever product launches first. Research agents validated markets;
   only buyers validate products.
3. **Vested ops ceiling**: stay at 20–30 human-verified counties until the
   pipeline is ~90% automated; at 150 counties it becomes an unmaintainable
   scraping treadmill.

## Honest caveats

- Live AI modes (`server.py` in titleviz/crosscheck) are tested to their
  error paths only — no API key in the build environment.
- Several Vested records carry "Not yet verified" fields by design; thin
  sourcing is flagged in the data rather than papered over.
- None of these is venture-scale on its own. The realistic combined outcome
  is a high-six/low-seven-figure portfolio with one acquisition candidate
  (Vested). "Generational wealth" comes, if at all, from owning 100% of a
  durable asset bought by a strategic — not from any sure thing.
