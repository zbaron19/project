# Millie — the AI front desk for local service businesses

Millie answers every call to a plumber, HVAC company, electrician, or property
manager — 24/7. She books jobs into a real schedule, handles emergencies, answers
pricing and hours questions, takes messages, texts confirmations to the customer,
alerts the owner, and shows the owner a dashboard with one headline number:
**how much revenue she saved them this month.**

This repo is the entire product: conversation engine, booking engine, Twilio
phone/SMS integration, owner dashboard, and a built-in call simulator for
demoing without a phone line.

## Why this business

- Home-service businesses miss roughly **40% of inbound calls** (on a roof, under
  a sink, driving). A missed call is a $200–$2,000 job that goes to the next
  Google result.
- They already pay $250–$500/month for human answering services that just take
  messages. Millie *books the job* and costs a few dollars a month to run.
- One founder can sell and support this locally. The pitch is a 5-minute demo
  (see `PLAYBOOK.md`).

## Run it in 2 minutes

```bash
cd millie
pip install -r requirements.txt
python3 run.py
```

Open **http://localhost:8035**. It self-seeds a demo business
(Baron Plumbing & Drain) with two weeks of call history, and the right-hand
panel is a live call simulator — you play the caller, Millie answers with the
exact same engine that answers the real phone line.

Things to try in the simulator:

- "My kitchen sink is clogged" → full booking flow, ends with a confirmation
  text in the outbox and the job on the schedule
- "My water heater burst and it's flooding!" → emergency escalation, urgent
  owner alert
- "How much do you charge for drain clearing?" → priced answer from the
  business profile
- "Can I leave a message for the owner?" → message taking

## How it works

```
Caller ── Twilio number ── /twilio/voice (TwiML <Gather> speech)
                              │
                        app/brain.py  ← deterministic slot-filling state machine
                              │           (intent → book/emergency/question/message)
              ┌───────────────┼────────────────┐
        app/booking.py   app/claude.py    app/db.py (SQLite)
        real availability  optional Claude   calls, bookings, leads,
        + NL time parsing  assist (intent    outbox, transcripts
                           + free-form Q&A)
                              │
              confirmation SMS to caller + alert SMS to owner
                              │
                    dashboard (static/index.html)
```

- **Works with zero API keys.** The state machine handles the whole call. With
  `ANTHROPIC_API_KEY` set, Claude (`claude-haiku-4-5` — chosen for phone-call
  latency; override with `MILLIE_MODEL`) additionally classifies ambiguous
  intents and answers free-form questions from the business profile. If the API
  errors mid-call, Millie silently falls back to the rule engine — a live call
  never stalls.
- **Works without Twilio.** Outbound texts queue in an outbox shown on the
  dashboard; with `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`
  set they actually send. Inbound is standard TwiML webhooks — see `DEPLOY.md`.
- **Multi-tenant by design.** Each business row has its own Twilio number,
  hours, services (with real price ranges and durations), FAQs, and greeting.
  The webhook routes by the dialed number.

## Configuration (all optional)

| Env var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables Claude assist for intent + Q&A |
| `MILLIE_MODEL` | Claude model (default `claude-haiku-4-5`) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Real SMS sending |
| `MILLIE_TZ_OFFSET` | Business timezone as UTC offset hours (e.g. `-7`) |
| `MILLIE_DB` | SQLite path (default `data/millie.db`) |

## The business documents

- **`PLAYBOOK.md`** — pricing, pitch script, demo script, objection handling,
  and a 30-day plan to first revenue. Start here.
- **`DEPLOY.md`** — putting Millie on a real phone number (Render + Twilio),
  ~20 minutes.
