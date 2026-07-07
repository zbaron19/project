"""SQLite persistence layer for Millie. Stdlib only — no ORM."""

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "MILLIE_DB",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "millie.db"),
)

_local = threading.local()

SCHEMA = """
CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trade TEXT NOT NULL DEFAULT 'home services',
    phone TEXT NOT NULL DEFAULT '',            -- the Twilio number callers dial
    owner_phone TEXT NOT NULL DEFAULT '',      -- where owner alerts go
    address TEXT NOT NULL DEFAULT '',
    service_area TEXT NOT NULL DEFAULT '',
    greeting TEXT NOT NULL DEFAULT '',
    hours TEXT NOT NULL DEFAULT '{}',          -- {"mon": [8,17], ... } 24h floats, absent = closed
    services TEXT NOT NULL DEFAULT '[]',       -- [{"name","keywords":[],"duration_min","price_low","price_high"}]
    faqs TEXT NOT NULL DEFAULT '[]',           -- [{"q","a","keywords":[]}]
    emergency_promise_min INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    channel TEXT NOT NULL DEFAULT 'voice',     -- voice | sms | sim
    caller TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',     -- active | completed
    intent TEXT NOT NULL DEFAULT '',
    outcome TEXT NOT NULL DEFAULT '',          -- booked | message | answered | urgent | abandoned
    summary TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '{}',
    after_hours INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    ended_at TEXT
);

CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id INTEGER NOT NULL,
    role TEXT NOT NULL,                        -- caller | millie
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    call_id INTEGER,
    customer_name TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    service TEXT NOT NULL DEFAULT '',
    slot_start TEXT NOT NULL,
    slot_end TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'confirmed',
    est_value REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    call_id INTEGER,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    urgent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    to_number TEXT NOT NULL,
    body TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'sms',          -- sms | owner_alert
    sent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.executescript(SCHEMA)
        _local.conn = conn
    return conn


def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for key in ("hours", "services", "faqs", "state"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (ValueError, TypeError):
                pass
    return d


# ---------- businesses ----------

def create_business(**fields) -> int:
    conn = get_conn()
    for key in ("hours", "services", "faqs"):
        if key in fields and not isinstance(fields[key], str):
            fields[key] = json.dumps(fields[key])
    fields.setdefault("created_at", now_iso())
    cols = ", ".join(fields)
    marks = ", ".join("?" for _ in fields)
    cur = conn.execute(f"INSERT INTO businesses ({cols}) VALUES ({marks})", list(fields.values()))
    conn.commit()
    return cur.lastrowid


def get_business(business_id: int) -> dict | None:
    row = get_conn().execute("SELECT * FROM businesses WHERE id=?", (business_id,)).fetchone()
    return row_to_dict(row) if row else None


def get_business_by_phone(phone: str) -> dict | None:
    row = get_conn().execute("SELECT * FROM businesses WHERE phone=?", (phone,)).fetchone()
    return row_to_dict(row) if row else None


def list_businesses() -> list[dict]:
    rows = get_conn().execute("SELECT * FROM businesses ORDER BY id").fetchall()
    return [row_to_dict(r) for r in rows]


def update_business(business_id: int, **fields):
    conn = get_conn()
    for key in ("hours", "services", "faqs"):
        if key in fields and not isinstance(fields[key], str):
            fields[key] = json.dumps(fields[key])
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE businesses SET {sets} WHERE id=?", list(fields.values()) + [business_id])
    conn.commit()


# ---------- calls & turns ----------

def create_call(business_id: int, channel: str, caller: str, after_hours: bool = False) -> int:
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO calls (business_id, channel, caller, after_hours, started_at, state) VALUES (?,?,?,?,?,?)",
        (business_id, channel, caller, int(after_hours), now_iso(), "{}"),
    )
    conn.commit()
    return cur.lastrowid


def get_call(call_id: int) -> dict | None:
    row = get_conn().execute("SELECT * FROM calls WHERE id=?", (call_id,)).fetchone()
    return row_to_dict(row) if row else None


def update_call(call_id: int, **fields):
    conn = get_conn()
    if "state" in fields and not isinstance(fields["state"], str):
        fields["state"] = json.dumps(fields["state"])
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE calls SET {sets} WHERE id=?", list(fields.values()) + [call_id])
    conn.commit()


def add_turn(call_id: int, role: str, text: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO turns (call_id, role, text, created_at) VALUES (?,?,?,?)",
        (call_id, role, text, now_iso()),
    )
    conn.commit()


def get_turns(call_id: int) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM turns WHERE call_id=? ORDER BY id", (call_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def list_calls(business_id: int, limit: int = 50) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM calls WHERE business_id=? ORDER BY id DESC LIMIT ?", (business_id, limit)
    ).fetchall()
    return [row_to_dict(r) for r in rows]


# ---------- bookings / leads / outbox ----------

def create_booking(**fields) -> int:
    conn = get_conn()
    fields.setdefault("created_at", now_iso())
    cols = ", ".join(fields)
    marks = ", ".join("?" for _ in fields)
    cur = conn.execute(f"INSERT INTO bookings ({cols}) VALUES ({marks})", list(fields.values()))
    conn.commit()
    return cur.lastrowid


def list_bookings(business_id: int, limit: int = 100) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM bookings WHERE business_id=? ORDER BY slot_start DESC LIMIT ?",
        (business_id, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def bookings_between(business_id: int, start_iso: str, end_iso: str) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM bookings WHERE business_id=? AND status='confirmed' "
        "AND slot_start < ? AND slot_end > ?",
        (business_id, end_iso, start_iso),
    ).fetchall()
    return [dict(r) for r in rows]


def create_lead(**fields) -> int:
    conn = get_conn()
    fields.setdefault("created_at", now_iso())
    cols = ", ".join(fields)
    marks = ", ".join("?" for _ in fields)
    cur = conn.execute(f"INSERT INTO leads ({cols}) VALUES ({marks})", list(fields.values()))
    conn.commit()
    return cur.lastrowid


def list_leads(business_id: int, limit: int = 100) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM leads WHERE business_id=? ORDER BY id DESC LIMIT ?", (business_id, limit)
    ).fetchall()
    return [dict(r) for r in rows]


def queue_message(business_id: int, to_number: str, body: str, kind: str = "sms") -> int:
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO outbox (business_id, to_number, body, kind, created_at) VALUES (?,?,?,?,?)",
        (business_id, to_number, body, kind, now_iso()),
    )
    conn.commit()
    return cur.lastrowid


def mark_sent(outbox_id: int):
    conn = get_conn()
    conn.execute("UPDATE outbox SET sent=1 WHERE id=?", (outbox_id,))
    conn.commit()


def list_outbox(business_id: int, limit: int = 50) -> list[dict]:
    rows = get_conn().execute(
        "SELECT * FROM outbox WHERE business_id=? ORDER BY id DESC LIMIT ?", (business_id, limit)
    ).fetchall()
    return [dict(r) for r in rows]
