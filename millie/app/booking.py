"""Availability engine: business hours, slot search, and natural-language time parsing."""

import re
from datetime import datetime, timedelta

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_ALIASES = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}
PART_WINDOWS = {"morning": (7, 12), "afternoon": (12, 17), "evening": (17, 21)}


def is_open(hours: dict, dt: datetime) -> bool:
    window = hours.get(WEEKDAYS[dt.weekday()])
    if not window:
        return False
    hour = dt.hour + dt.minute / 60
    return window[0] <= hour < window[1]


def parse_time_pref(text: str, now: datetime) -> dict:
    """Extract a scheduling preference from caller speech.

    Returns {"date": date|None, "window": (start_h, end_h)|None, "asap": bool}.
    """
    t = text.lower()
    pref = {"date": None, "window": None, "asap": False}

    if re.search(r"\b(asap|as soon as|right away|today|earliest|first available|soonest|whenever)\b", t):
        pref["asap"] = True
    if re.search(r"\btoday\b", t):
        pref["date"] = now.date()
    elif re.search(r"\btomorrow\b", t):
        pref["date"] = (now + timedelta(days=1)).date()
    else:
        for name, idx in DAY_ALIASES.items():
            if re.search(rf"\b{name}\b", t):
                days_ahead = (idx - now.weekday()) % 7
                if days_ahead == 0 and not re.search(r"\bthis\b", t):
                    days_ahead = 7
                pref["date"] = (now + timedelta(days=days_ahead)).date()
                break
    if re.search(r"\bweekend\b", t):
        days_ahead = (5 - now.weekday()) % 7  # next Saturday
        pref["date"] = (now + timedelta(days=days_ahead)).date()

    for part, window in PART_WINDOWS.items():
        if part in t:
            pref["window"] = window
            break

    m = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b", t)
    if m and pref["window"] is None:
        hour = int(m.group(1))
        ampm = (m.group(3) or "").replace(".", "")
        if ampm == "pm" and hour < 12:
            hour += 12
        elif not ampm and 1 <= hour <= 6:
            hour += 12  # bare "at 2" almost always means afternoon for service calls
        if 0 <= hour <= 23:
            pref["window"] = (hour, hour + 1)

    return pref


def find_slots(business: dict, duration_min: int, pref: dict, existing: list[dict],
               now: datetime, count: int = 3) -> list[dict]:
    """Return up to `count` open slots matching the caller's preference."""
    hours = business.get("hours") or {}
    slots = []
    lead_time = now + timedelta(hours=1)  # never offer a slot less than an hour out

    for day_offset in range(0, 14):
        day = (now + timedelta(days=day_offset)).date()
        if pref.get("date") and day != pref["date"]:
            continue
        window = hours.get(WEEKDAYS[day.weekday()])
        if not window:
            continue
        open_h, close_h = window
        if pref.get("window"):
            open_h = max(open_h, pref["window"][0])
            close_h = min(close_h, pref["window"][1] + duration_min / 60)

        start_minute = int(open_h * 60)
        end_minute = int(close_h * 60)
        cursor = start_minute - start_minute % 30
        if cursor < start_minute:
            cursor += 30
        while cursor + duration_min <= end_minute:
            slot_start = datetime(day.year, day.month, day.day, tzinfo=now.tzinfo) + timedelta(minutes=cursor)
            slot_end = slot_start + timedelta(minutes=duration_min)
            cursor += 30
            if slot_start < lead_time:
                continue
            if _conflicts(slot_start, slot_end, existing):
                continue
            slots.append({"start": slot_start, "end": slot_end})
            if len(slots) >= count:
                return slots
        if pref.get("date"):
            break  # they asked for a specific day; don't wander to other days

    if not slots and pref.get("date"):
        # Requested day is full or closed — relax to the next open days.
        relaxed = dict(pref, date=None)
        return find_slots(business, duration_min, relaxed, existing, now, count)
    return slots


def _conflicts(start: datetime, end: datetime, existing: list[dict]) -> bool:
    for b in existing:
        b_start = datetime.fromisoformat(b["slot_start"])
        b_end = datetime.fromisoformat(b["slot_end"])
        if b_start.tzinfo is None:
            b_start = b_start.replace(tzinfo=start.tzinfo)
            b_end = b_end.replace(tzinfo=start.tzinfo)
        if start < b_end and end > b_start:
            return True
    return False


def speak_slot(dt: datetime, now: datetime) -> str:
    """Render a slot the way a person would say it on the phone."""
    if dt.date() == now.date():
        day = "today"
    elif dt.date() == (now + timedelta(days=1)).date():
        day = "tomorrow"
    else:
        day = dt.strftime("%A")
        if (dt.date() - now.date()).days >= 7:
            day = dt.strftime("%A the %d").replace(" 0", " ")
    hour = dt.strftime("%I:%M %p").lstrip("0").replace(":00", "")
    return f"{day} at {hour}"


def pick_slot(text: str, offered: list[dict], now: datetime) -> dict | None:
    """Match the caller's choice against the offered slots."""
    t = text.lower()
    ordinals = [
        (r"\b(first|1st|one|earliest|soonest)\b", 0),
        (r"\b(second|2nd|two|middle)\b", 1),
        (r"\b(third|3rd|three|last|latest)\b", 2),
    ]
    for pattern, idx in ordinals:
        if re.search(pattern, t) and idx < len(offered):
            return offered[idx]
    if re.search(r"\b(yes|yeah|yep|sure|sounds good|that works|okay|ok|perfect|fine|great)\b", t) and len(offered) >= 1:
        return offered[0]
    # try to match a spoken day/time against the offered slots
    pref = parse_time_pref(t, now)
    for slot in offered:
        start = datetime.fromisoformat(slot["start"]) if isinstance(slot["start"], str) else slot["start"]
        if pref.get("date") and start.date() != pref["date"]:
            continue
        if pref.get("window") and not (pref["window"][0] <= start.hour < pref["window"][1] + 1):
            continue
        if pref.get("date") or pref.get("window"):
            return slot
    return None
