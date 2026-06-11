# TitleViz

**The exam workbench for attorneys who sign their name to title.**

TitleViz is a commitment cross-check workbench for real estate attorneys and
title examiners. Load a title commitment and the recorded documents in the
file; TitleViz cross-references every Schedule B exception against its source
instrument, flags orphans in both directions, and puts the operative language
one click away.

What it does — and pointedly does not do:

- It **does**: match every cited recording number to a document in the file,
  surface cited instruments that are *missing* (the classic "1998 easement
  nobody ever pulled"), surface recorded documents that *no exception
  references* (possible un-excepted encumbrances), and produce a printable
  item-by-item exam worksheet with the reviewing attorney's per-item
  attestations.
- It **does not**: examine title, determine insurability or marketability, or
  render an opinion of title. The persistent framing line in the header and
  footer says exactly that. The "Reviewed" toggle is the attorney's act, not
  the tool's. Default posture of the UI: *check me*, never *trust me* — the
  unmatched/needs-review bucket renders first, before anything the tool claims
  it matched.

Standard/general exceptions (general taxes not yet due, parties in possession,
survey matters, unrecorded liens) cite no instrument and are **never** flagged
as orphans. A tool that asks for the recorded document behind "general taxes"
has not met a title examiner.

## Running it

### Demo mode (no dependencies, no network)

```sh
cd ventures/titleviz
python3 -m http.server 8000
# open http://localhost:8000
```

The app detects that no extraction server is present and runs against the
bundled synthetic Washington file (`data/demo-file.json` + `docs/`). Note:
open it over HTTP, not `file://` — browsers block `fetch()` of the JSON
otherwise.

### Live mode (optional)

```sh
cd ventures/titleviz
ANTHROPIC_API_KEY=sk-... python3 server.py 8000
# open http://localhost:8000
```

`server.py` is Python stdlib only. It serves the same static app plus
`/api/health` and `/api/extract`. With the server up, a "Paste a commitment"
button appears: paste raw commitment text and the server returns extracted
Schedule A / B-I / B-II structure into the same workbench — with **every item
starting at "needs review,"** because no source documents were provided and
nothing has been verified. Extraction is a starting point for the exam, not a
result.

## Demo script (design-partner meeting, under 3 minutes)

1. **Open the file** (`http://localhost:8000`). The header states what the
   tool is not. The left pane's first group is *"Requires your attention"* —
   the tool leads with what it could **not** account for. *(0:20)*
2. **The money moment.** First attention item: Schedule B-II No. 8, a 1998
   ingress/egress easement cited at Recording No. 19980417000892 — **UNMATCHED.
   No such document exists in the file.** The commitment excepts for an
   instrument nobody ever pulled. This is the gap that bites after closing,
   found in one glance. *(0:50)*
3. **The reverse orphan.** Second attention item: a recorded 2024 Boundary
   Line Agreement that **no exception references** — flagged "needs review" as
   a possible un-excepted encumbrance. Both directions, checked. *(1:20)*
4. **One-click verifiability.** Click B-II No. 7 (the 2005 power easement) →
   center pane shows the match and the operative excerpt → "Verify source" →
   the recorded instrument opens in the right pane with the strip language
   ("the East 30 feet of said Lot 4") highlighted. Note the standard
   exceptions group at the bottom: general taxes is *not* flagged as a missing
   document. The tool knows the difference. *(2:00)*
5. **The attorney's act.** Type your name in the header, toggle "Reviewed —
   [your] own attestation" on the item. Name and date stamp on. The tool
   recorded it; you made it. Glance at the chain strip: vesting deed → deed of
   trust → assignment → reconveyance, each node a clickable source. *(2:30)*
6. **Print exam report.** One button: commitment summary, unresolved items in
   a red box up top, item-by-item disposition table with reviewer name/date
   and full citations, signature line. The artifact that goes in the file.
   *(3:00)*

## Pricing (initial posture)

- **Per-file:** $49 residential · $199 commercial.
- **10-packs:** $399 residential · $1,690 commercial (~15% off, buys
  commitment without a treadmill).
- **No subscription** until demand proves one. Examiners distrust seat
  licenses for tools they use in bursts; per-file pricing matches how they
  bill.

## Target buyers

- **WA real estate attorneys** who personally sign opinions/closings and want
  a defensible, printable exam record. The per-item attestation + report is
  built for their malpractice posture.
- **Independent examiner contractors** working per-file for multiple agents;
  per-file pricing maps 1:1 to their revenue.
- **Small title agents NOT on Qualia** (or priced out of it) who need
  cross-check rigor without a platform migration. TitleViz is a workbench,
  not a platform: no data migration, no seats, one HTML page.

## Repository layout

```
index.html            three-pane workbench (list / detail / source document)
app.js                cross-reference engine + UI (no frameworks, no CDNs)
styles.css            screen styles + print stylesheet (exam report)
data/demo-file.json   synthetic WA demo file (ALTA 2021-form structure)
docs/                 synthetic recorded documents (HTML), AFN-stamped,
                      operative language anchored for highlighting
server.py             optional live-extraction server (stdlib only)
```

All demo data is synthetic. Names, instruments, recording numbers, and legal
descriptions are fictional; no real persons, property, or county records are
referenced.
