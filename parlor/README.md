# 🕯️ Parlor

**A tiny daily murder mystery.** Every day at midnight, a new drawing-room
whodunit: four guests, four items, four rooms, one body. Read the testimony,
fill in the deduction grids, and make your accusation — you get three.

Open `index.html` in any browser and play. That's the entire stack.

## Why this exists

This is a bet on the same physics that made Wordle and Murdle work:

- **Wordle** was a static page with a date-seeded daily puzzle and an emoji
  share grid. It sold to the New York Times for a seven-figure sum.
- **Murdle** is *exactly this genre* — bite-size logic-grid whodunits — and
  became a #1 international bestselling book series with millions of copies
  sold. The appetite for five-minute deduction is proven and enormous.
- The daily-puzzle format has a built-in growth loop (the share text), a
  built-in retention loop (streaks), and **zero marginal cost**: every puzzle
  is generated client-side from the date. No server, no database, no API
  bill, ever.

## How it works

- `puzzle.js` — the engine. A seeded RNG (date → hash → mulberry32) casts the
  mystery from pools of suspects/items/rooms, picks a hidden solution, then
  greedily assembles clues and **brute-force verifies over all 576 possible
  worlds that exactly one solution satisfies them**. It then strips every
  redundant clue. Same date = same puzzle on every device on Earth.
- `index.html` — the game. Three tap-to-cycle logic grids (with Murdle-style
  auto-cross on confirm), strike-through testimony, a three-attempt
  accusation, streaks in localStorage, and a spoiler-free emoji share.
- `test.js` — regression proof. `node test.js` generates **two years of daily
  puzzles** and asserts each is uniquely solvable, deterministic, and that
  the solver's answer matches the hidden solution. Currently 730/730.

## Ship it (10 minutes)

1. Push this folder to a repo (or keep it here) and enable **GitHub Pages**
   (Settings → Pages → deploy from branch). Done — it's live and free.
2. Buy a domain (`playparlor.com` or similar, ~$10/yr) and point it at Pages.
3. Day 1 is **2026-06-10** (`EPOCH` in `puzzle.js`). Test any date with
   `?d=YYYY-MM-DD`.

## Where it could go

- **Archive paywall** — yesterday's mysteries free, the full back-catalog for
  $1/mo (Wordle-clone playbooks do exactly this).
- **App Store wrapper** — you already ship iOS apps; this is a WKWebView and
  an afternoon. Daily puzzle games chart consistently.
- **The book** — Murdle's real money was print. A generator that emits
  uniquely-solvable puzzles is 90% of a puzzle-book manuscript pipeline.
- **Harder weekend editions** — 5×5 grids and new clue types (the solver
  approach scales: 5! × 5! = 14,400 worlds, still instant).

## Verify before trusting

```
node test.js
```
