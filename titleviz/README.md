# TitleViz — AI Title Commitment Review

Upload a title commitment PDF, pick your perspective (**Buyer** or **Lender**), and get a
plain-English review of the whole document:

- **Every Schedule B-II exception**, in order — translated into plain English, risk-rated
  (High / Medium / Low), with perspective-specific concerns, a concrete recommended action,
  and a removal outlook (can the title company plausibly delete or insure over it?).
- **Every Schedule B-I requirement** — what has to happen before the policy issues, who
  handles it, and a flag when a "routine" requirement hides a real problem.
- **Priority items** — the 3–6 things to act on first.
- **Endorsement engine** — per-exception ALTA endorsement suggestions, consolidated into
  a ready-to-send endorsement request list.
- **Linked underlying documents** — if the commitment hyperlinks its exceptions (most
  e-delivered commitments do), TitleViz extracts every link with PDF.js and maps it to
  its exception number, so each exception card links straight to the recorded instrument.
- **Per-exception deep dive** — download an underlying document (REA, CC&Rs, easement
  deed), upload it on the exception card, and get a focused review of the actual
  instrument: key provisions, document-level risks, a recommended position, and whether
  reading it raises, confirms, or lowers the initial risk rating.
- **Ready-to-send questions** for the title officer.
- **One-click export** — copy as a Markdown memo (deep dives included), download, or
  print to PDF.

Built from the spec in `claude-playbook/ideas/title-commitment-reviewer-app.md`.

## Why this is private by design

There is **no backend**. The PDF goes directly from the browser to the Anthropic API
(`api.anthropic.com`) using the `anthropic-dangerous-direct-browser-access` header, under
*your* API key, governed by Anthropic's commercial data terms (API inputs/outputs are not
used for training). Nothing is uploaded to any other server because there is no other
server. The API key is stored only in the browser's localStorage.

## Running it

It's a static site — three files, no build step.

```bash
cd titleviz
python3 -m http.server 8080
# open http://localhost:8080
```

Then click **Settings**, paste an Anthropic API key (console.anthropic.com), and review a
commitment. Click **See a sample review** to explore the output format with no key at all
(the sample is an entirely fictional commitment).

### Deploying

Any static host works: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or an S3 bucket.
Drag the `titleviz/` folder into Netlify and you have a URL to share.

## Technical notes

- **Model:** `claude-opus-4-8` with adaptive thinking — exception-by-exception legal
  analysis is exactly the workload where the top model earns its price. A typical
  60–80 page commitment costs roughly **$1 in API usage per review**.
- **PDFs are sent natively** as a `document` content block (base64) — no client-side text
  extraction, so scanned and hyperlinked commitments both work. Limits: 100 pages / ~30 MB.
  For longer documents, use the **Paste text** tab with Schedules A and B.
- **Structured outputs** (`output_config.format` with a JSON schema) guarantee the response
  parses — no brittle "find the JSON in the prose" logic.
- Response handling reads the raw body first, then parses, and surfaces the exact API error
  with a retry button (per the original spec's lessons).
- **Link extraction is local and best-effort.** PDF.js (CDN) reads the PDF's link
  annotations in the browser and associates each with the nearest exception number printed
  above it. County-records links open in a new tab rather than being auto-fetched — most
  of those systems block cross-origin downloads (CORS), per the lesson in
  `ideas/title-exception-extractor-html-tool.md`. Download the document, then upload it to
  the exception's deep-dive button.

## Honest limitations

- The model reads the commitment, not the recorded underlying documents. Exceptions that
  require reading the instrument (REAs, CC&Rs, easement deeds) are flagged as such rather
  than guessed at.
- This is a first-pass organizer and accelerant, **not legal advice** and not a substitute
  for attorney review. The report says so on its face.
- Browser-direct API calls are right for personal/firm use. A commercial multi-tenant
  version should move the API call behind a thin proxy so customers never handle API keys
  (see BUSINESS.md).
