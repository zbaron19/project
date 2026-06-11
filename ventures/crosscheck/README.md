# CrossCheck — lease diligence workbench for attorneys

CrossCheck loads a commercial lease file set (lease + amendments + estoppel), builds a
per-document clause inventory, assembles a **supersession-aware operative-terms timeline**,
and surfaces **cross-document conflict candidates** side-by-side with citations. The attorney
dispositions every flag; only then can the print-ready report — the attorney's own work
product — be generated.

**The core insight:** an amendment that changes rent is *not* a conflict — that's the
documents working as intended. CrossCheck models document hierarchy and supersession as
lineage ("Lease § 4.1 → superseded by Second Amendment § 3 (operative)") and flags only
genuine contradictions. The highest-value flag class is an **estoppel that omits an
amendment or certifies terms the operative documents don't support** — because an estoppel
certifies facts, the UI always frames those flags as *"the estoppel certifies X; the
operative documents show Y,"* never as the estoppel "changing" the lease.

> CrossCheck is decision-support software for licensed attorneys. Flags are candidates for
> review, not conclusions. Final dispositions and the resulting report are the reviewing
> attorney's own work product. Documents are processed locally in demo mode; no client
> documents are used for model training.

## How to run

Static demo (everything works, no dependencies):

```sh
cd ventures/crosscheck
python3 -m http.server 8000
# open http://localhost:8000/
```

Optional live mode (adds clause extraction from pasted text; Python stdlib only):

```sh
export ANTHROPIC_API_KEY=...   # your key
python3 server.py 8000
# open http://localhost:8000/ — a "Live extraction" panel appears on the overview tab
```

Without the key (or without `server.py` at all) the app silently stays in static demo mode.
Dispositions persist in `localStorage` per matter.

## The 90-second demo script

1. **Open the matter.** The demo matter (a synthetic Washington office lease file —
   2019 lease, commencement memo, two amendments, 2026 tenant estoppel) loads
   automatically. Click any document title to read the full rendered text.
2. **Operative Terms tab.** Point at the Base Rent chain: *Lease § 4.1 → First Amendment
   § 4 → **Second Amendment § 3 (operative)***. Three rent changes, zero flags — supersession
   is lineage, not conflict. The current-period row is highlighted in the operative schedule.
3. **Review Queue tab.** The engine caught what matters:
   - **High** — the estoppel certifies "no amendments except the First Amendment," but the
     file contains a Second Amendment. The killer flag: rent and deposit both changed in the
     instrument the tenant didn't certify.
   - **High** — estoppel certifies $28,955.77/mo rent; the operative schedule says $27,583.40
     (and the engine notes the certified figure exactly matches the superseded First
     Amendment schedule).
   - **High** — estoppel certifies a $48,500 deposit; the Second Amendment reduced it to $40,000.
   - **Medium** — intra-document drafting error: CAM cap is 4% in Lease § 6.3 but 5% in Exhibit C ¶ 3.
   - **Verify (info)** — the renewal option's 9-month notice window must be computed from the
     *extended* expiration (deadline August 31, 2027).
   Each flag shows both passages with citations that deep-link to the highlighted language
   in the rendered documents.
4. **Disposition.** Confirm/dismiss/note each flag and enter the reviewer name. The
   **Generate report** button is disabled until every flag is dispositioned — that gate is
   deliberate (the judgment is the attorney's, not the software's).
5. **Print the report.** Matter summary, operative-terms table with lineage citations,
   each flag with "Reviewed by [name], [date]," the consistent certifications, and a visible
   "What CrossCheck does not check" list. Print / Save as PDF outputs the report only.

## Pricing

Sold as software **to attorneys** — the attorney does the judgment, the tool does the assembly:

- **$149 per matter** (pay as you go), or
- **$249 / month unlimited** for solo and small-firm practices.

No per-seat enterprise tiers in v1. The report is unbranded work product; CrossCheck appears
only in the methodology footer.

## What we don't check (v1 honesty list)

CrossCheck v1 compares a deliberately narrow set of economic terms: base rent, term and
expiration, renewal option mechanics, security deposit, and the operating-expense cap
(including one intra-document consistency check). It inventories but does **not** analyze:

- Assignment and subletting (consent standards, recapture, transfer premiums)
- Co-tenancy and operating covenants
- Insurance requirements and waiver of subrogation
- Casualty and condemnation
- SNDA and lien priority terms
- Exclusive use and restrictive covenants
- Signage rights
- Parking allocations
- Hazardous materials / environmental provisions
- Holdover, surrender, and restoration obligations

The same list appears in the UI and in every generated report.

## Repository layout

```
index.html              app shell (three-section flow + report)
app.js                  supersession engine, flag engine, disposition gate, report builder
styles.css              app + rendered-document + print styles
data/demo-matter.json   structured demo matter (documents, provisions, estoppel certifications)
docs/*.html             the five synthetic documents, rendered with anchor targets
server.py               optional live-mode server (Python stdlib; Anthropic Messages API)
```

All demo documents are synthetic and any resemblance to real parties is coincidental.
