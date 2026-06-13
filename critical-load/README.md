# CRITICAL LOAD

A single-player, episodic learning game that teaches the engineering behind data
centers to a transactional real estate attorney, so colocation, powered shell,
and build-to-suit deals can be negotiated with precision.

You are counsel to **Helios Compute**, signing a 36MW build-to-suit with
**Ironvale Digital**. Ten episodes run from the power chain through a final
redline gauntlet. Dee teaches, Marcus spars, Priya grades.

## How to play it on your phone

The game is a self-contained web app (no server, no API, no account). It saves
progress on the device and works offline once loaded.

**Option A — GitHub Pages (recommended):**
1. In this repo on GitHub: Settings → Pages → Source: "Deploy from a branch",
   pick the branch this folder lives on, folder `/ (root)`, Save.
2. After it builds, open `https://zbaron19.github.io/project/critical-load/`
   on your iPhone in Safari.
3. Tap the Share button → **Add to Home Screen**. It installs with its own
   icon and runs full-screen like a native app.

Note: Pages publishes the whole branch, so anything else in the repo root
becomes public too. If you'd rather not, move this folder to its own repo or
a `/docs` folder first.

**Option B — any static host:** drop this folder on Netlify, Vercel, or any
web server. No build step.

**Option C — desktop test:** `python3 -m http.server` in this folder, then
open `http://localhost:8000`.

## Game structure

- **10 episodes**, each: The Walk (scene) → The Teardown (systems, defined
  precisely, with a war story) → Where It Bites (contract mapping + a trap
  clause to spot + the fixed clause) → The Spar (Marcus argues, you pick a
  response, graded honestly) → The Bank (recall questions + a term card).
- **E10** is a boss fight: five execution-draft clauses, each conceding your
  earlier position and taking it back one sentence later. Priya grades.
- **Quiz** draws recall rounds from episodes you've completed.
- **Glossary** collects your banked term cards.
- Grades persist per episode (best kept). Reset lives on the home screen.

## 3D walkthrough

The Walk and Teardown phases play inside a stylized low-poly 3D model of the
Helios campus (Three.js, vendored locally — still fully offline). As Dee
explains each system the camera flies to the real equipment: substation yard,
MV switchgear, generator yard, UPS gallery, data hall, chiller plant, cooling
towers, meet-me room, and the NOC. The zone under discussion pulses; drag to
look around. A `2D` button in the viewport corner switches back to text-only
mode (remembered per device), and devices without WebGL fall back
automatically.

## Live AI sparring (optional)

Tap **Spar AI** on the home screen and enter your Anthropic API key to make
THE SPAR live: you argue against Marcus in your own words, he argues back in
character (grounded in the episode's engineering), and Claude grades the
exchange honestly — what landed, what a sophisticated operator would exploit,
and the counter a fluent lawyer would have made. Up to three turns per spar.

- The key is stored only in the device's localStorage and sent only to
  api.anthropic.com (direct browser call, no server in between).
- Model is selectable: Opus 4.8 (sharpest Marcus, default) or Haiku 4.5
  (fastest/cheapest). A spar costs a few cents at most.
- No key, or any API failure: the game falls back to the scripted
  multiple-choice spar automatically. Everything else works fully offline.

## Files

- `index.html`, `style.css`, `app.js` — shell and engine (vanilla JS, no deps)
- `data1.js`–`data3.js` — episodes 1–9 content
- `boss.js` — episode 10
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA install + offline
