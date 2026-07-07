"""Millie's conversation engine.

A deterministic slot-filling state machine drives every call, so the product
works with zero external dependencies. Claude (app/claude.py) is layered on
top for ambiguous-intent classification and free-form Q&A when a key exists.

State lives in calls.state (JSON): {"phase", "intent", "slots": {...},
"offered": [...], "wrap": bool}
"""

import re
from datetime import datetime, timezone, timedelta

from . import db, booking, claude

INTENTS = ["book", "emergency", "question", "message"]

EMERGENCY_WORDS = re.compile(
    r"\b(emergenc\w*|burst|flood\w*|gushing|sewage|gas leak|smell gas|sparking|smoke|"
    r"no heat|no hot water tonight|overflow\w*|can't turn off|cant turn off)\b"
)
BOOK_WORDS = re.compile(
    r"\b(book|appointment|schedule|come out|come by|send someone|technician|estimate|"
    r"quote|install\w*|repair|replace|fix|look at|service call|tune.?up|inspection)\b"
)
MESSAGE_WORDS = re.compile(
    r"\b(message|call me back|callback|call back|talk to|speak (to|with)|reach (him|her|the owner)|owner)\b"
)
QUESTION_WORDS = re.compile(
    r"\b(hours|open|closed|cost|price|charge|how much|rate|licensed|insured|warranty|"
    r"area|zip|located|address|payment|card|financ\w*|do you (do|handle|work|service|take))\b"
)
PRICE_WORDS = re.compile(r"\b(how much|cost|price|charge|rate|quote me|ballpark)\b")
YES_RE = re.compile(r"\b(yes|yeah|yep|sure|correct|right|that's right|thats right|sounds good|ok|okay|perfect)\b")
NO_RE = re.compile(r"\b(no|nope|nothing|that's (all|it)|thats (all|it)|all set|i'm good|im good|goodbye|bye)\b")

PHONE_RE = re.compile(r"(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")


def now_local() -> datetime:
    # Container clocks are UTC; a real deployment sets MILLIE_TZ offset hours.
    import os
    offset = int(os.environ.get("MILLIE_TZ_OFFSET", "0"))
    return datetime.now(timezone(timedelta(hours=offset)))


def greeting(business: dict) -> str:
    if business.get("greeting"):
        return business["greeting"]
    return (f"Thanks for calling {business['name']}, this is Millie. "
            "How can I help you today?")


def start_call(business: dict, channel: str, caller: str) -> tuple[int, str]:
    now = now_local()
    after_hours = not booking.is_open(business.get("hours") or {}, now)
    call_id = db.create_call(business["id"], channel, caller, after_hours=after_hours)
    text = greeting(business)
    db.add_turn(call_id, "millie", text)
    return call_id, text


def handle_turn(business: dict, call: dict, text: str) -> tuple[str, bool]:
    """Process one caller utterance. Returns (reply, call_finished)."""
    db.add_turn(call["id"], "caller", text)
    state = call.get("state") or {}
    state.setdefault("phase", "intent")
    state.setdefault("slots", {})

    reply, done = _step(business, call, state, text)

    db.update_call(call["id"], state=state, intent=state.get("intent", ""))
    db.add_turn(call["id"], "millie", reply)
    if done:
        _finish(business, call, state)
    return reply, done


# ---------- core state machine ----------

def _step(business: dict, call: dict, state: dict, text: str) -> tuple[str, bool]:
    phase = state["phase"]
    slots = state["slots"]
    t = text.lower().strip()
    now = now_local()

    # Emergencies pre-empt every phase.
    if EMERGENCY_WORDS.search(t) and state.get("intent") != "emergency":
        state["intent"] = "emergency"
        state["phase"] = "emergency_phone"
        if call.get("caller"):
            slots["phone"] = call["caller"]
            state["phase"] = "emergency_address"
            return ("Okay - I'm treating this as an emergency. "
                    "What's the address where you need us?", False)
        return ("Okay - I'm treating this as an emergency. "
                "What's the best phone number to reach you at right now?", False)

    if phase == "intent":
        return _route_intent(business, call, state, text, t)

    if phase == "emergency_phone":
        phone = _extract_phone(text)
        if phone:
            slots["phone"] = phone
            state["phase"] = "emergency_address"
            return "Got it. And what's the address where you need us?", False
        return "Sorry, I didn't catch that. Could you say the phone number again, digit by digit?", False

    if phase == "emergency_address":
        slots["address"] = text.strip()
        state["phase"] = "wrapup"
        state["urgent_saved"] = True
        _save_urgent_lead(business, call, slots)
        minutes = business.get("emergency_promise_min", 30)
        return (f"Help is on the way. I've marked this urgent and alerted the team - "
                f"someone will call you back within {minutes} minutes. "
                "Is there anything else I can do while you wait?", False)

    if phase == "book_service":
        service = _match_service(business, t) or _match_service(business, t, loose=True)
        if service:
            slots["service"] = service["name"]
            state["phase"] = "book_name"
            return f"{service['name']} - I can definitely get that scheduled. Can I get your name?", False
        names = ", ".join(s["name"] for s in business.get("services", [])[:4])
        return f"We handle things like {names}. Which is closest to what you need?", False

    if phase == "book_name":
        name = _extract_name(text)
        slots["name"] = name
        if call.get("caller") and call["channel"] in ("voice", "sms"):
            slots["phone"] = slots.get("phone") or call["caller"]
            state["phase"] = "book_address"
            return f"Thanks, {name.split()[0]}. What's the service address?", False
        state["phase"] = "book_phone"
        return f"Thanks, {name.split()[0]}. What's the best phone number for you?", False

    if phase == "book_phone":
        phone = _extract_phone(text)
        if phone:
            slots["phone"] = phone
            state["phase"] = "book_address"
            return "Perfect. What's the service address?", False
        return "Sorry, I didn't quite get that. What's the best phone number, with area code?", False

    if phase == "book_address":
        slots["address"] = text.strip()
        state["phase"] = "book_time"
        return "Great. When works best for you - any particular day, or morning versus afternoon?", False

    if phase == "book_time":
        return _offer_slots(business, state, slots, text, now)

    if phase == "book_pick":
        offered = [
            {"start": datetime.fromisoformat(s["start"]), "end": datetime.fromisoformat(s["end"])}
            for s in state.get("offered", [])
        ]
        choice = booking.pick_slot(t, offered, now)
        if choice is None:
            if NO_RE.search(t) or booking.parse_time_pref(t, now)["date"] or booking.parse_time_pref(t, now)["window"]:
                # they want something different — re-run the search with the new preference
                state["phase"] = "book_time"
                return _offer_slots(business, state, slots, text, now)
            spoken = " or ".join(booking.speak_slot(s["start"], now) for s in offered[:2])
            return f"Sorry - would {spoken} work for you?", False
        slots["slot_start"] = choice["start"].isoformat()
        slots["slot_end"] = choice["end"].isoformat()
        state["phase"] = "book_confirm"
        return (f"To confirm: {slots.get('service', 'a service visit')} at {slots.get('address', 'your address')}, "
                f"{booking.speak_slot(choice['start'], now)}. Does that all sound right?", False)

    if phase == "book_confirm":
        if YES_RE.search(t):
            _save_booking(business, call, slots)
            state["booked"] = True
            state["phase"] = "wrapup"
            confirm = "You're all set"
            if slots.get("phone"):
                confirm += " - I'll text you a confirmation"
            return f"{confirm}. Anything else I can help with?", False
        state["phase"] = "book_time"
        return "No problem - what would work better?", False

    if phase == "message_name":
        slots["name"] = _extract_name(text)
        if call.get("caller"):
            slots["phone"] = call["caller"]
            state["phase"] = "message_body"
            return "And what would you like the message to say?", False
        state["phase"] = "message_phone"
        return "What's the best number for a call back?", False

    if phase == "message_phone":
        phone = _extract_phone(text)
        if phone:
            slots["phone"] = phone
            state["phase"] = "message_body"
            return "And what would you like the message to say?", False
        return "Sorry, could you repeat that number for me?", False

    if phase == "message_body":
        slots["message"] = text.strip()
        _save_lead(business, call, slots)
        state["message_saved"] = True
        state["phase"] = "wrapup"
        return "Got it - I've passed that along and someone will get back to you. Anything else?", False

    if phase == "wrapup":
        if NO_RE.search(t) or not t:
            return _goodbye(business, state), True
        # New request mid-wrapup: route it fresh.
        state["phase"] = "intent"
        return _route_intent(business, call, state, text, t)

    # Unknown phase — reset safely.
    state["phase"] = "intent"
    return _route_intent(business, call, state, text, t)


def _route_intent(business: dict, call: dict, state: dict, text: str, t: str) -> tuple[str, bool]:
    slots = state["slots"]
    intent = None

    if EMERGENCY_WORDS.search(t):
        intent = "emergency"
    elif PRICE_WORDS.search(t):
        # "how much is a sewer inspection" is a price question even though it
        # names a bookable service — price words always win.
        intent = "question"
    elif QUESTION_WORDS.search(t) and not BOOK_WORDS.search(t):
        intent = "question"
    elif BOOK_WORDS.search(t) or _match_service(business, t):
        intent = "book"
    elif MESSAGE_WORDS.search(t):
        intent = "message"
    elif t.endswith("?"):
        intent = "question"
    else:
        intent = claude.classify_intent(text, INTENTS) or "question"

    state["intent"] = state.get("intent") or intent

    if intent == "emergency":
        state["phase"] = "emergency_phone"
        if call.get("caller"):
            slots["phone"] = call["caller"]
            state["phase"] = "emergency_address"
            return ("Okay - I'm treating this as an emergency. "
                    "What's the address where you need us?", False)
        return ("Okay - I'm treating this as an emergency. "
                "What's the best phone number to reach you at right now?", False)

    if intent == "book":
        service = _match_service(business, t)
        if service:
            slots["service"] = service["name"]
            state["phase"] = "book_name"
            return f"I can help with that. Can I get your name?", False
        state["phase"] = "book_service"
        names = ", ".join(s["name"] for s in business.get("services", [])[:4])
        return f"Happy to get you on the schedule. Is this for {names}, or something else?", False

    if intent == "message":
        state["phase"] = "message_name"
        return "Of course - I'll take a message. Can I get your name?", False

    # question
    answer = _answer_faq(business, t) or claude.answer_question(text, business)
    if answer:
        state["phase"] = "wrapup"
        return f"{answer} Is there anything else I can help with?", False
    state["phase"] = "message_name"
    return ("That's a good question - I don't want to guess, so let me have someone call you "
            "back with the answer. Can I get your name?", False)


def _offer_slots(business: dict, state: dict, slots: dict, text: str, now: datetime) -> tuple[str, bool]:
    pref = booking.parse_time_pref(text, now)
    service = _service_by_name(business, slots.get("service"))
    duration = (service or {}).get("duration_min", 60)
    horizon_start = now.isoformat()
    horizon_end = (now + timedelta(days=14)).isoformat()
    existing = db.bookings_between(business["id"], horizon_start, horizon_end)
    found = booking.find_slots(business, duration, pref, existing, now)
    if not found:
        return ("I'm not seeing anything open in that window. "
                "Would another day work, or should I have someone call you to squeeze you in?", False)
    state["offered"] = [{"start": s["start"].isoformat(), "end": s["end"].isoformat()} for s in found]
    state["phase"] = "book_pick"
    spoken = [booking.speak_slot(s["start"], now) for s in found]
    if len(spoken) == 1:
        return f"I have {spoken[0]} open. Would that work?", False
    return f"I have {', '.join(spoken[:-1])}, or {spoken[-1]}. Which works best?", False


def _goodbye(business: dict, state: dict) -> str:
    if state.get("booked"):
        return f"Perfect - you're on the schedule. Thanks for calling {business['name']}, have a great day!"
    if state.get("urgent_saved"):
        return "Hang tight - the team has been alerted and you'll get a call shortly."
    return f"Thanks for calling {business['name']} - have a great day!"


# ---------- persistence side-effects ----------

def _save_booking(business: dict, call: dict, slots: dict):
    service = _service_by_name(business, slots.get("service")) or {}
    est = (service.get("price_low", 0) + service.get("price_high", 0)) / 2
    db.create_booking(
        business_id=business["id"], call_id=call["id"],
        customer_name=slots.get("name", ""), customer_phone=slots.get("phone", ""),
        service=slots.get("service", ""), slot_start=slots["slot_start"],
        slot_end=slots["slot_end"], address=slots.get("address", ""),
        est_value=est,
    )
    start = datetime.fromisoformat(slots["slot_start"])
    when = start.strftime("%A %b %d at %I:%M %p").replace(" 0", " ")
    if slots.get("phone"):
        db.queue_message(
            business["id"], slots["phone"],
            f"{business['name']}: you're booked for {slots.get('service')} on {when} "
            f"at {slots.get('address')}. Reply here to reschedule.",
            kind="sms",
        )
    if business.get("owner_phone"):
        db.queue_message(
            business["id"], business["owner_phone"],
            f"Millie booked a job: {slots.get('service')} for {slots.get('name')} "
            f"({slots.get('phone')}), {when}, {slots.get('address')}. Est ${est:,.0f}.",
            kind="owner_alert",
        )


def _save_lead(business: dict, call: dict, slots: dict, urgent: bool = False):
    db.create_lead(
        business_id=business["id"], call_id=call["id"],
        name=slots.get("name", ""), phone=slots.get("phone", ""),
        note=slots.get("message", slots.get("address", "")), urgent=int(urgent),
    )
    if business.get("owner_phone"):
        prefix = "URGENT - call now" if urgent else "New message"
        db.queue_message(
            business["id"], business["owner_phone"],
            f"{prefix}: {slots.get('name', 'caller')} ({slots.get('phone', 'no number')}) - "
            f"{slots.get('message', slots.get('address', ''))}",
            kind="owner_alert",
        )


def _save_urgent_lead(business: dict, call: dict, slots: dict):
    slots.setdefault("name", "Emergency caller")
    slots["message"] = f"EMERGENCY at {slots.get('address', 'unknown address')}"
    _save_lead(business, call, slots, urgent=True)
    db.update_call(call["id"], outcome="urgent")


def _finish(business: dict, call: dict, state: dict):
    outcome = ("booked" if state.get("booked")
               else "urgent" if state.get("urgent_saved")
               else "message" if state.get("message_saved")
               else "answered")
    slots = state.get("slots", {})
    parts = [state.get("intent", "call")]
    if slots.get("service"):
        parts.append(slots["service"])
    if slots.get("name"):
        parts.append(f"for {slots['name']}")
    db.update_call(call["id"], status="completed", outcome=outcome,
                   summary=" - ".join(parts), ended_at=db.now_iso())


def _answer_faq(business: dict, t: str) -> str | None:
    # A price question that names a service gets the service's real range,
    # not the generic pricing FAQ.
    if re.search(r"\b(cost|price|charge|how much|rate)\b", t):
        service = _match_service(business, t, loose=True)
        if service and service.get("price_low"):
            return (f"{service['name']} typically runs {service['price_low']:.0f} to "
                    f"{service['price_high']:.0f} dollars, and we confirm the exact price "
                    "on site before any work starts.")
    best, best_hits = None, 0
    for faq in business.get("faqs", []):
        hits = sum(1 for kw in faq.get("keywords", []) if kw.lower() in t)
        if hits > best_hits:
            best, best_hits = faq, hits
    if best:
        return best["a"]
    return None


# ---------- extraction helpers ----------

def _match_service(business: dict, t: str, loose: bool = False) -> dict | None:
    for service in business.get("services", []):
        keywords = [service["name"].lower()] + [k.lower() for k in service.get("keywords", [])]
        for kw in keywords:
            if kw in t:
                return service
            if loose:
                words = [w for w in kw.split() if len(w) > 3]
                if words and all(w in t for w in words):
                    return service
    return None


def _service_by_name(business: dict, name: str | None) -> dict | None:
    if not name:
        return None
    for service in business.get("services", []):
        if service["name"].lower() == name.lower():
            return service
    return None


def _extract_phone(text: str) -> str | None:
    m = PHONE_RE.search(text)
    if m:
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"
    # spoken digits: "five five five ..."
    words = {"zero": "0", "oh": "0", "one": "1", "two": "2", "three": "3", "four": "4",
             "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9"}
    digits = "".join(words.get(w, w if w.isdigit() else "") for w in text.lower().split())
    if len(digits) >= 10:
        digits = digits[-10:]
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"
    return None


def _extract_name(text: str) -> str:
    t = text.strip()
    t = re.sub(r"^(hi|hey|hello)[, ]+", "", t, flags=re.I)
    t = re.sub(r"^(yeah|yes|sure)[, ]+", "", t, flags=re.I)
    t = re.sub(r"^(this is|it's|its|my name is|i am|i'm|name's)\s+", "", t, flags=re.I)
    t = re.sub(r"[.!?]+$", "", t)
    words = t.split()
    return " ".join(w.capitalize() for w in words[:3]) if words else "Caller"
