# Counterpart — the case for taking it seriously

You asked me to build the thing I genuinely believe you'd pursue as a full-time
job. Here's the reasoning, written as the pitch I'd want to read if I were you.

## The thesis

**Negotiation is the highest-value skill in transactional law, and it is the
only one with no practice environment.**

Think about how lawyers actually learn to negotiate: they sit second chair for
years, absorb whatever habits their partner happens to have, and then one day
they're the one on the phone. The feedback loop is brutal — you never see the
other side's instructions, so you literally never find out what you left on the
table. A lawyer can practice for twenty years and get one year of feedback
twenty times.

Meanwhile every adjacent skill is getting a machine: drafting has AI, research
has AI, diligence has AI. The work that's left — the work that will *define*
what a transactional lawyer is in ten years — is judgment at the table. And
nobody is training it.

Pilots get simulators. Surgeons get cadaver labs. Traders get paper accounts.
Negotiators get... a book by a former FBI hostage negotiator.

## Why this is suddenly possible

A negotiation simulator was always the obvious idea and always impossible to
build, because the opponent had to be a human (expensive, unavailable,
inconsistent) or a script (worthless). What changed: a language model can now
hold a hidden brief, follow a concession ladder, bluff, get annoyed by bad
technique, reward good technique, and *stay in character under pressure* — and
a second model instance can grade the bout with full knowledge of both sides.

The hidden-brief-plus-omniscient-coach structure is the product. It produces
the one thing real negotiations structurally cannot: **ground truth about what
was available.** "You settled at a 36-month cap; her brief said $750k was
sitting there if you'd reframed around the TI exposure" is feedback no mentor
can ever give, because no mentor has ever seen the other side's instructions.

## Why you

- You negotiate commercial real estate deals for a living. The scenarios in
  this prototype took me an evening; you have a career's worth of them, and the
  scars to make the hidden briefs *true*. Content depth is the moat here, and
  your expertise is exactly the content.
- You've already proven you ship: an iOS app in the App Store, a capture
  pipeline, agents, eval loops. The builder skills transfer one-to-one.
- You sit at the precise intersection this product needs — practitioner enough
  to know what real counterparties do, builder enough to make it, and (your
  words elsewhere) someone who learns by reps and systems.
- It is *not* legal advice. It's training on fictional scenarios — a far
  friendlier regulatory and malpractice posture than every "AI lawyer" startup.

## The market, from the inside out

1. **Wedge: junior transactional associates.** The training crisis is real and
   getting worse — AI is eating the document work juniors used to learn on.
   Firms know it. L&D budgets exist. A firm that can say "our second-years have
   each run 200 simulated negotiations" has a recruiting and client pitch.
2. **CLE.** Skills-based CLE credit for simulated negotiation with graded
   feedback. CLE is a compliance market — distribution is weirdly tractable.
3. **Law schools.** Negotiation courses run on canned exercises with student
   pairings (one side always sandbagging). A live opponent with a hidden brief
   and instant grading is a strict upgrade. Cheap seats, huge volume, future
   associates trained on your product.
4. **Beyond law.** The engine is domain-agnostic: procurement teams, sales
   teams, founders (one scenario in the prototype already points there). Law is
   the beachhead because feedback quality matters most where the stakes per
   conversation are highest.

## What the prototype proves

- The bout → hidden brief → graded debrief loop works end to end.
- Scenario authoring is a content format (JSON with a craft to the briefs),
  which means a library can grow fast — including community/firm-authored
  scenarios.
- Rubrics make skill legible: per-item scores, technique notes, and a
  belt progression that creates a reason to come back.

## What I'd build next, in order

1. **Voice mode.** Negotiations happen on calls. Speech in/out turns this from
   "chess by mail" into actual reps. (You've already built speech into an iOS
   app once.)
2. **Scenario packs by practice area** — leasing, M&A, financing, employment —
   with a difficulty curve inside each pack.
3. **Skill telemetry across bouts:** "you consistently fail to test bluffs"
   tracked over time, not per-bout. The drill suggestions already point there.
4. **Firm mode:** private scenario packs ("negotiate against our form"),
   cohort dashboards, partner-authored briefs.
5. **A weekly bout.** Same scenario for everyone, leaderboard, discussion after.
   Community is retention.

## Honest risks

- **Sim-to-real transfer** has to be felt by users quickly, or it's a toy.
  Mitigation: scenarios authored by practitioners (you), voice mode, and
  debriefs that name transferable patterns rather than scenario trivia.
- **Counterparty discipline** — the model must not leak the brief or fold too
  early. The prompt architecture here (hard rules + ladder + style) held up in
  testing, but it needs evals. You already run prompt-eval loops in your
  playbook; this is the same muscle.
- **"ChatGPT can do this"** — a bare LLM roleplay has no hidden brief, no
  rubric, no ground truth, no progression. The product is the structure, the
  content library, and the telemetry. That's also the answer to "what's the
  moat": authored content + accumulated skill data.

## The point

Game Guru is a good product in someone else's market. This one is *your*
market — the thing you've spent your career doing, productized at the exact
moment the profession needs it and the technology allows it. It's the rare
idea where your day job is the R&D.

If the first bout makes you feel something — the little spike of adrenaline
when Dana won't budge on recapture — that feeling is the product, and you'll
know it's worth pursuing.

— Claude
