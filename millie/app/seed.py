"""Seed a demo business with two weeks of realistic history so the dashboard
tells the revenue story on first launch."""

import random
from datetime import datetime, timedelta, timezone

from . import db

DEMO_NAME = "Baron Plumbing & Drain"

SERVICES = [
    {"name": "Drain clearing", "keywords": ["drain", "clog", "clogged", "backed up", "backup", "slow drain"],
     "duration_min": 60, "price_low": 180, "price_high": 320},
    {"name": "Leak repair", "keywords": ["leak", "leaking", "drip", "dripping", "pipe"],
     "duration_min": 90, "price_low": 250, "price_high": 600},
    {"name": "Water heater service", "keywords": ["water heater", "hot water", "no hot water", "tankless"],
     "duration_min": 180, "price_low": 1400, "price_high": 2200},
    {"name": "Toilet repair", "keywords": ["toilet", "running", "won't flush", "wont flush", "flapper"],
     "duration_min": 60, "price_low": 150, "price_high": 350},
    {"name": "Sewer camera inspection", "keywords": ["sewer", "camera", "inspection", "scope", "main line"],
     "duration_min": 90, "price_low": 300, "price_high": 450},
]

FAQS = [
    {"q": "What areas do you serve?", "keywords": ["area", "serve", "come to", "zip"],
     "a": "We serve all of Snohomish and north King County, including Everett, Lynnwood, Bothell, and Mill Creek."},
    {"q": "Are you licensed and insured?", "keywords": ["licensed", "insured", "bonded", "license"],
     "a": "Yes - fully licensed, bonded, and insured in Washington State."},
    {"q": "What do you charge?", "keywords": ["charge", "cost", "price", "how much", "rate", "fee"],
     "a": "Most drain jobs run one eighty to three twenty, and we always quote a firm price on site before any work starts. The visit is free if you approve the work."},
    {"q": "What are your hours?", "keywords": ["hours", "open", "closed", "close"],
     "a": "We're open eight to five Monday through Friday, and nine to one on Saturdays, with 24/7 emergency service."},
    {"q": "Do you take cards?", "keywords": ["card", "payment", "pay", "credit", "financing"],
     "a": "We take all major cards, checks, and offer financing on jobs over a thousand dollars."},
]

HOURS = {"mon": [8, 17], "tue": [8, 17], "wed": [8, 17], "thu": [8, 17], "fri": [8, 17], "sat": [9, 13]}

FIRST = ["Mike", "Sarah", "Dave", "Jen", "Carlos", "Amy", "Tom", "Linda", "Raj", "Katie",
         "Bill", "Maria", "Steve", "Dana", "Chris", "Pat"]
LAST = ["Reynolds", "Chen", "Okafor", "Miller", "Garcia", "Thompson", "Nguyen", "Brooks",
        "Larsen", "Patel", "Kim", "Alvarez"]


def seed_if_empty() -> int:
    businesses = db.list_businesses()
    if businesses:
        return businesses[0]["id"]

    business_id = db.create_business(
        name=DEMO_NAME,
        trade="plumbing",
        phone="+14255550100",
        owner_phone="+14255550199",
        address="1420 Hewitt Ave, Everett, WA",
        service_area="Snohomish & north King County",
        greeting=f"Thanks for calling {DEMO_NAME}, this is Millie. How can I help you today?",
        hours=HOURS,
        services=SERVICES,
        faqs=FAQS,
    )

    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    conn = db.get_conn()

    for days_ago in range(14, 0, -1):
        day = now - timedelta(days=days_ago)
        if day.weekday() == 6:
            continue
        for _ in range(rng.randint(2, 5)):
            hour = rng.choice([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
            started = day.replace(hour=hour, minute=rng.randint(0, 59), second=0, microsecond=0)
            after_hours = hour < 8 or hour >= 17 or day.weekday() == 5 and hour >= 13
            name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
            phone = f"(425) 555-{rng.randint(1000, 9999)}"
            outcome = rng.choices(["booked", "answered", "message", "urgent"], weights=[52, 28, 14, 6])[0]
            service = rng.choice(SERVICES)

            cur = conn.execute(
                "INSERT INTO calls (business_id, channel, caller, status, intent, outcome, summary, "
                "after_hours, started_at, ended_at, state) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (business_id, "voice", phone, "completed",
                 {"booked": "book", "answered": "question", "message": "message", "urgent": "emergency"}[outcome],
                 outcome,
                 {"booked": f"book - {service['name']} - for {name}",
                  "answered": "question - answered",
                  "message": f"message - for {name}",
                  "urgent": f"emergency - {name}"}[outcome],
                 int(after_hours), started.isoformat(),
                 (started + timedelta(minutes=rng.randint(2, 5))).isoformat(), "{}"),
            )
            call_id = cur.lastrowid

            if outcome == "booked":
                offset = rng.randint(1, 4)
                slot = (started + timedelta(days=offset)).replace(hour=rng.choice([8, 9, 10, 13, 14, 15]), minute=0)
                est = (service["price_low"] + service["price_high"]) / 2
                conn.execute(
                    "INSERT INTO bookings (business_id, call_id, customer_name, customer_phone, service, "
                    "slot_start, slot_end, address, status, est_value, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (business_id, call_id, name, phone, service["name"], slot.isoformat(),
                     (slot + timedelta(minutes=service["duration_min"])).isoformat(),
                     f"{rng.randint(100, 9900)} {rng.choice(['Pine', 'Alder', 'Maple', 'Cedar', 'Birch'])} St, Everett WA",
                     "confirmed", est, started.isoformat()),
                )
            elif outcome in ("message", "urgent"):
                conn.execute(
                    "INSERT INTO leads (business_id, call_id, name, phone, note, urgent, created_at) "
                    "VALUES (?,?,?,?,?,?,?)",
                    (business_id, call_id, name, phone,
                     "EMERGENCY - water everywhere" if outcome == "urgent" else "Wants a quote on a remodel rough-in",
                     int(outcome == "urgent"), started.isoformat()),
                )
    conn.commit()
    return business_id
