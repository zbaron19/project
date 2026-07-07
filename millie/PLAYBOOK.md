# The Millie Playbook — from repo to paycheck

This is the business plan for turning the software in this folder into income
you could eventually live on. It's written for you specifically: a deal lawyer
with a real-estate-heavy network, an eye for contracts, and no time to waste.

## The one-liner

> "Your business misses about 4 out of 10 calls. Every one is a job that went
> to a competitor. Millie answers every call, books the job, and texts you.
> $299 a month, cancel anytime. Want to hear her answer your phone right now?"

## Why you can win this

1. **Your network is the distribution.** You know contractors, property
   managers, brokers, title people, building engineers. Every one of them
   either runs a service business or refers to a dozen.
2. **The economics are absurd.** A client pays $249–$399/month. Your cost per
   client is roughly: Twilio number ~$1.15/mo, voice minutes ~$0.02/min
   (~$8–15/mo for a busy shop), Claude Haiku pennies per call, hosting ~$7/mo
   shared across all clients. **~93% gross margin.** Ten clients ≈ $3,000/mo.
   Forty clients ≈ $12,000/mo — that's leave-your-job territory, and forty
   local businesses is one per week for ten months.
3. **The competition is weak at this price.** Human answering services
   ($250–$500/mo) only take messages. VC-funded AI receptionists exist but
   sell over the internet; you sell over coffee, with the owner's own phone
   ringing in the demo. Local trust beats a landing page.

## Pricing

| Tier | Price | What they get |
|---|---|---|
| Setup | $199 one-time | Number provisioning, profile build, greeting recording, call-forwarding setup (often waive to close) |
| Standard | $299/mo | 24/7 answering, booking, SMS confirmations, owner alerts, dashboard |
| Pro | $449/mo | + multiple numbers/techs, priority tweaks, monthly "revenue saved" report |

Anchor against what they know: "It's like your answering service, except she
books the job, never sleeps, and costs less."

## The 5-minute demo (the whole sales motion)

1. Open the dashboard on your laptop or phone. Point at the headline tile:
   *"This is a plumber's last two weeks. That number is the revenue from calls
   that would have been missed."*
2. Hand them your phone (or the simulator): *"You're a customer. Your sink's
   clogged. Call your own company — except Millie answers."*
3. Let them book a job. Show the confirmation text and the owner alert arrive.
4. Say the price. Stop talking.

Before any pitch, edit the demo business to *their* company name, services,
and prices (Setup takes 10 minutes). Hearing "Thanks for calling *their name*"
is the close.

## First 10 customers — the 30-day plan

**Week 1 — build the demo muscle.**
- Deploy to a real number (DEPLOY.md). Call it yourself 50 times. Break it,
  note the weird phrasings, tune the services/FAQs.
- Set up a business entity, simple 1-page service agreement (you're a lawyer —
  this is an afternoon), Stripe payment link for $299/mo.

**Week 2 — warm network.**
- List 25 people you actually know who own or refer to service businesses.
  Text each one: *"I built an AI receptionist that answers a contractor's
  phone and books jobs 24/7. Want a 5-minute demo? First month free if it's
  not obviously worth it."*
- Goal: 8 demos, 3 closes. Founding-customer price $199/mo locked for life in
  exchange for a testimonial and a referral.

**Week 3 — the missed-call test.**
- For prospects who hesitate: call their business at 12:30pm and at 7pm. When
  it goes to voicemail, screenshot it and send: *"This was a customer. Here's
  what Millie would have done"* + a 60-second screen recording of the
  simulator handling that exact call.

**Week 4 — referral engine.**
- Every close: "$100 off next month for every business you send me."
- Ask your property-manager contacts for their vendor lists — one PM relationship
  is 20 warm intros to trades.

**Revenue math:** 3 founding clients (wk 2) + 3 (wk 3) + 4 (wk 4) = 10 clients
≈ $2,500–$3,000 MRR in 30 days. Not quit-your-job money yet — but it proves
the machine works, and the path from 10 to 40 is repetition, not invention.

## Objections you'll hear

- **"My customers hate robots."** — "She's not a phone tree; there are no
  menus. Call her right now and try to tell the difference. And the
  alternative isn't a person — it's your voicemail, which 80% of callers hang
  up on."
- **"What if she gets something wrong?"** — "Anything she's not sure about
  becomes a message with a callback number — same as your answering service,
  except everything is recorded and transcribed on your dashboard."
- **"I already have an answering service."** — "How much of what they take
  down turns into booked jobs? Millie puts it on the schedule while the
  customer is still excited, and texts them a confirmation so they don't keep
  shopping."
- **"Emergencies are sensitive."** — "Emergencies are her best trick: she
  collects the address instantly, promises your callback window, and blasts
  your phone with an URGENT text. Faster than a human service."

## Operating notes

- **You are not selling software; you're selling booked jobs.** The monthly
  "revenue saved" number on the dashboard is your retention engine. Send a
  monthly email: "Millie answered 61 calls, booked $9,400, and caught 2
  emergencies at 2am."
- **Onboarding checklist per client (~30 min):** services + real price ranges,
  hours, service area, FAQs, greeting, owner cell, then conditional
  call-forwarding (no busy/no answer → Millie) so their existing number keeps
  working and Millie only catches what they'd have missed. That "safety net"
  framing closes nervous owners.
- **Legal hygiene (you know this better than anyone):** call-recording consent
  line in the greeting where required (WA is two-party); TCPA-safe SMS (they
  texted/called first = consent to reply, but put it in the service
  agreement); clear disclaimer that scheduling promises are subject to the
  business's confirmation for regulated trades.
- **When to quit the day job:** the honest line is ~$15k MRR with <5% monthly
  churn — 50 clients. At one new client a week plus referrals, that's a
  12–14 month runway, sellable nights-and-weekends until then. The prompt said
  a month; the truth is a month gets you *proof*, a year gets you *out*.

## Where the product goes next (only after 10 paying clients)

1. Real-time voice (Twilio Media Streams + streaming TTS) for lower latency
   and barge-in.
2. Calendar sync (Google Calendar / Jobber / ServiceTitan) instead of the
   internal schedule.
3. Outbound: Millie calls yesterday's unbooked leads back.
4. Vertical packs: dentist, salon, law-office intake (yes — law firm intake is
   the same product, and you know exactly how lawyers miss calls).
