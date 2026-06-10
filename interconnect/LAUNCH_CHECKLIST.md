# Launch Checklist — first dollar in 30 days

Sequenced so nothing blocks anything else. Total hands-on time to launch:
roughly 12–15 hours spread over a month.

## Week 0 — clearance (do this before anything public)

- [ ] **Read your firm's outside-activities / moonlighting policy and get
      written clearance.** This is the only true gating item. Framing that
      usually works: public-source industry media, analyst voice, no legal
      advice, no client matters, standing disclaimer. If the answer is
      "structure it differently," consider a pseudonymous masthead or an LLC.
- [ ] Form a single-member LLC (or confirm you'll start as sole prop and
      convert at revenue). ~1 hr online in most states.
- [ ] Pick the name. "The Interconnect" is the working title — check domain +
      trademark conflicts for 30 minutes, then stop bikeshedding and commit.

## Week 1 — plumbing (one evening)

- [ ] beehiiv (or Ghost) account; import the landing copy from `site/index.html`.
- [ ] Stripe: three payment links (Pro $1,950 / Team $4,900 / Desk $9,500) +
      a founding-member coupon (Pro at $1,450, cap 25 redemptions).
- [ ] Point the existing daily brief at the public list: the GitHub Actions
      cron already writes `LATEST_BRIEF.md` — add a step that posts it to
      beehiiv via their API (or paste manually for the first two weeks; do not
      let automation block launch).
- [ ] Verify the `jurisdiction_watch.py` seed feeds: run it once, fix or
      delete dead URLs, add the working Legistar feed IDs (each county's
      Legistar calendar page links its own RSS — grab the real `Feed.ashx`
      URLs there).
- [ ] Add `jurisdiction_watch.py` to the same daily GitHub Actions cron as
      `daily_brief.py`.

## Week 2 — product proof (the real work)

- [ ] Produce **two complete weekly editions** end-to-end before telling
      anyone (`weekly_edition.py` → edit → done). This calibrates your true
      hours/week and gives you a sample issue to sell with.
- [ ] Pick the better of the two; scrub it into the public **sample edition**
      (replace `samples/sample-edition.md` with the real one).
- [ ] Write the lead magnet: **"The Moratorium Map"** — every U.S. jurisdiction
      currently restricting data centers, one page. The pipeline + a research
      session gets you 80% of the way. Gate it behind email signup.

## Week 3 — soft launch

- [ ] LinkedIn post #1: the Moratorium Map (free, gated). This is the list
      builder.
- [ ] Personal note + sample edition to 50 industry contacts. Ask for nothing
      except "would you pay for this — and if not, what's missing?"
      The founding-member offer goes only to people who answer.
- [ ] Publish the Daily Wire publicly on a fixed schedule from here forward.
      Consistency is the entire brand at this stage.

## Week 4 — paid launch

- [ ] Founding-member announcement (LinkedIn + the email list): 25 seats,
      $1,450/yr for life, doors close when full.
- [ ] First paid edition ships Monday. Every Monday after, forever.
- [ ] Start the teaser rhythm: each week, one LinkedIn post quoting a single
      Docket Radar item with "paid subscribers got the full analysis Monday."

## Standing metrics (check monthly, 10 minutes)

| Metric | 90-day healthy | Kill signal |
|---|---|---|
| Free list | 300+ | < 300 with consistent publishing |
| Paid accounts | 10+ | < 10 |
| Weekly production time | ≤ 6 hrs | > 10 hrs sustained |
| Churned founding members | 0–1 | > 3 |

If you hit a kill signal at day 90: stop, write the post-mortem in the
playbook (`projects/`), keep the pipeline as a personal edge. The downside
case of this venture is "you read the industry better than anyone and own a
private intelligence tool." That's an acceptable failure.
