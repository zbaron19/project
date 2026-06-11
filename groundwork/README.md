# Groundwork — data center land intelligence & diligence

*A productized practice built from things you already have: a decade of CRE legal
training, a daily data center intelligence engine (this repo's `scripts/daily_brief.py`),
and the ability to build software with AI. v1 — rebuilt after an eight-lens council
review; the verdict and the resulting plan live in `GO-TO-MARKET.md`.*

## The thesis

Data centers are the most capital-hungry, legally tangled asset class in American real
estate, and every site lives or dies on six questions: power, zoning, water, title, tax,
politics. Groundwork answers them three ways — a free weekly **Brief** that builds the
audience, a fixed-fee **parcel screen** ($7,500) that builds the proprietary
parcel-outcome dataset, and **acquisition diligence** (from $35,000) plus a **Market
Watch retainer** ($3,500/mo) that earn the income. The services fund the build; the
audience, the dataset, and the brand are the assets that compound.

## What's in this folder

| File | What it is |
|---|---|
| `GO-TO-MARKET.md` | The plan: council verdict, launch gates (firm → ethics → E&O → copy), validation homework, sequencing, de-fantasized economics. **Read this first.** |
| `checklist.json` | The IP: 40 diligence items across 8 workstreams, each with a stable ID, *why it matters*, and *red flags*. Refine it on every deal — it compounds. |
| `groundwork.py` | Dependency-free engine. Market briefings AND parcel screens (see below). |
| `parcels/` | Parcel workbooks — one JSON per engagement, every checklist item tracked with finding / sources / verification date / risk call. |
| `parcels/demo-columbia-basin.json` | A fully-worked **fictional** sample parcel. |
| `data/markets.json` | Seeded context on 8 US markets (screening-grade; every fact needs primary-source verification before reliance). |
| `reports/` | Generated output. `parcel-demo-columbia-basin.html` is the sales sample. |
| `site/index.html` | Deployable landing page — Brief-first, engagements by referral. Deploy only after Gate 0 (see GO-TO-MARKET). |

## The engine

```
# Parcel screens (the paid deliverable)
python3 groundwork.py new-parcel quincy-section12   # scaffold a 40-item workbook
python3 groundwork.py screen quincy-section12       # render md + html report

# Market context
python3 groundwork.py --list                        # ranked seeded markets
python3 groundwork.py --compare                     # comparison table
python3 groundwork.py quincy                        # market briefing
python3 groundwork.py --checklist                   # blank checklist
```

**Provenance is enforced structurally.** A parcel report renders CLIENT-READY only when
every item is verified (finding + source + date + risk call) or N/A with a reason;
anything less renders with a `DRAFT — NOT FOR DELIVERY` banner and a verification-gaps
list. There is no numeric go/no-go score by design — verified findings, risk calls
(clear / watch / fatal), and a written counsel's recommendation. The verification
discipline is the product, the differentiation, and the malpractice posture.

## Status

- [x] Engine, checklist v0.2 (stable IDs), parcel data model, demo deliverable, landing page, GTM plan
- [ ] **Gate 0:** firm consent / exit decision — blocks all public marketing
- [ ] Gates 1–3: engagement-letter form, E&O written confirmation, copy review
- [ ] Validation homework (GO-TO-MARKET §"Validation before scale")
- [ ] Rebrand the public artifact as The Groundwork Brief (weekly, Northwest) once Gate 0 clears
