"""Dashboard + simulator JSON API."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import db, brain, claude, telephony

router = APIRouter(prefix="/api")

# Industry stat used for the "revenue saved" framing: roughly 40% of calls to
# home-service businesses go unanswered, and most of those callers move on.
MISSED_CALL_RATE = 0.40
LOST_IF_MISSED = 0.80


def _dt(iso: str) -> datetime:
    d = datetime.fromisoformat(iso)
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


@router.get("/businesses")
def businesses():
    return db.list_businesses()


class BusinessUpdate(BaseModel):
    name: str | None = None
    trade: str | None = None
    phone: str | None = None
    owner_phone: str | None = None
    address: str | None = None
    service_area: str | None = None
    greeting: str | None = None
    hours: dict | None = None
    services: list | None = None
    faqs: list | None = None


@router.put("/business/{business_id}")
def update_business(business_id: int, patch: BusinessUpdate):
    if db.get_business(business_id) is None:
        raise HTTPException(404)
    fields = {k: v for k, v in patch.model_dump().items() if v is not None}
    if fields:
        db.update_business(business_id, **fields)
    return db.get_business(business_id)


@router.get("/overview/{business_id}")
def overview(business_id: int):
    business = db.get_business(business_id)
    if business is None:
        raise HTTPException(404)
    calls = db.list_calls(business_id, limit=500)
    bookings = db.list_bookings(business_id, limit=500)
    leads = db.list_leads(business_id, limit=200)

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=14)
    recent_calls = [c for c in calls if _dt(c["started_at"]) >= cutoff]
    recent_bookings = [b for b in bookings if _dt(b["created_at"]) >= cutoff]

    booked_value = sum(b["est_value"] for b in recent_bookings)
    after_hours = sum(1 for c in recent_calls if c["after_hours"])
    # Revenue Millie saved = calls that would statistically have been missed,
    # valued at what actually got booked from them.
    saved = booked_value * MISSED_CALL_RATE * LOST_IF_MISSED + after_hours * 0  # after-hours already in booked_value

    per_day = {}
    for c in recent_calls:
        key = _dt(c["started_at"]).date().isoformat()
        per_day[key] = per_day.get(key, 0) + 1
    days = [(now - timedelta(days=i)).date().isoformat() for i in range(13, -1, -1)]

    return {
        "business": business,
        "stats": {
            "calls_14d": len(recent_calls),
            "after_hours_calls": after_hours,
            "bookings_14d": len(recent_bookings),
            "booked_value": round(booked_value),
            "revenue_saved": round(saved),
            "urgent_leads": sum(1 for l in leads if l["urgent"] and _dt(l["created_at"]) >= cutoff),
        },
        "calls_per_day": [{"date": d, "count": per_day.get(d, 0)} for d in days],
        "recent_calls": calls[:12],
        "recent_bookings": bookings[:8],
        "recent_leads": leads[:8],
        "claude_connected": claude.available(),
        "twilio_connected": telephony.twilio_configured(),
    }


@router.get("/calls/{business_id}")
def calls(business_id: int):
    return db.list_calls(business_id, limit=100)


@router.get("/call/{call_id}")
def call_detail(call_id: int):
    call = db.get_call(call_id)
    if call is None:
        raise HTTPException(404)
    return {"call": call, "turns": db.get_turns(call_id)}


@router.get("/bookings/{business_id}")
def bookings(business_id: int):
    return db.list_bookings(business_id)


@router.get("/leads/{business_id}")
def leads(business_id: int):
    return db.list_leads(business_id)


@router.get("/outbox/{business_id}")
def outbox(business_id: int):
    return db.list_outbox(business_id)


# ---------- simulator ----------

class SimStart(BaseModel):
    business_id: int
    caller: str = ""


class SimTurn(BaseModel):
    call_id: int
    text: str


@router.post("/sim/start")
def sim_start(payload: SimStart):
    business = db.get_business(payload.business_id)
    if business is None:
        raise HTTPException(404)
    call_id, text = brain.start_call(business, "sim", payload.caller)
    return {"call_id": call_id, "reply": text}


@router.post("/sim/turn")
def sim_turn(payload: SimTurn):
    call = db.get_call(payload.call_id)
    if call is None:
        raise HTTPException(404)
    business = db.get_business(call["business_id"])
    reply, done = brain.handle_turn(business, call, payload.text)
    return {"reply": reply, "done": done}
