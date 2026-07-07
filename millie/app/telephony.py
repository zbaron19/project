"""Twilio webhooks (inbound voice + SMS) and outbound SMS delivery.

No Twilio SDK required: inbound webhooks answer with TwiML XML, and outbound
SMS uses Twilio's REST API via urllib when TWILIO_ACCOUNT_SID /
TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are set. Without credentials, outbound
messages stay in the outbox table and are visible on the dashboard - which is
exactly what you want for demos.
"""

import base64
import os
import urllib.parse
import urllib.request
from xml.sax.saxutils import escape

from fastapi import APIRouter, Request
from fastapi.responses import Response

from . import db, brain

router = APIRouter()

VOICE = 'Polly.Joanna-Neural'  # natural Twilio TTS voice


def _twiml(inner: str) -> Response:
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response>{inner}</Response>'
    return Response(content=xml, media_type="application/xml")


def _gather(call_id: int, say_text: str) -> str:
    say = f'<Say voice="{VOICE}">{escape(say_text)}</Say>'
    return (
        f'<Gather input="speech" speechTimeout="auto" language="en-US" '
        f'action="/twilio/turn?call_id={call_id}" method="POST">{say}</Gather>'
        f'<Redirect method="POST">/twilio/turn?call_id={call_id}&amp;silence=1</Redirect>'
    )


@router.post("/twilio/voice")
async def voice_inbound(request: Request):
    form = await request.form()
    to_number = form.get("To", "")
    from_number = form.get("From", "")
    business = db.get_business_by_phone(to_number) or _default_business()
    if business is None:
        return _twiml(f'<Say voice="{VOICE}">Sorry, this number is not configured yet.</Say><Hangup/>')
    call_id, text = brain.start_call(business, "voice", from_number)
    return _twiml(_gather(call_id, text))


@router.post("/twilio/turn")
async def voice_turn(request: Request, call_id: int, silence: int = 0):
    form = await request.form()
    speech = (form.get("SpeechResult") or "").strip()
    call = db.get_call(call_id)
    if call is None:
        return _twiml(f'<Say voice="{VOICE}">Sorry, something went wrong. Please call back.</Say><Hangup/>')
    business = db.get_business(call["business_id"])

    if not speech:
        if silence:
            state = call.get("state") or {}
            if state.get("phase") == "wrapup":
                reply, _ = brain.handle_turn(business, call, "no")
                deliver_outbox(business["id"])
                return _twiml(f'<Say voice="{VOICE}">{escape(reply)}</Say><Hangup/>')
            return _twiml(_gather(call_id, "Sorry, I didn't catch that. Could you say it again?"))
        return _twiml(_gather(call_id, "Are you still there?"))

    reply, done = brain.handle_turn(business, call, speech)
    if done:
        deliver_outbox(business["id"])
        return _twiml(f'<Say voice="{VOICE}">{escape(reply)}</Say><Hangup/>')
    return _twiml(_gather(call_id, reply))


@router.post("/twilio/sms")
async def sms_inbound(request: Request):
    form = await request.form()
    to_number = form.get("To", "")
    from_number = form.get("From", "")
    body = (form.get("Body") or "").strip()
    business = db.get_business_by_phone(to_number) or _default_business()
    if business is None:
        return _twiml("")

    # Reuse an active SMS thread with this number, else start one.
    call = _active_sms_call(business["id"], from_number)
    if call is None:
        call_id, greeting_text = brain.start_call(business, "sms", from_number)
        call = db.get_call(call_id)
        reply, done = brain.handle_turn(business, call, body)
        reply = f"{greeting_text} {reply}" if len(greeting_text) + len(reply) < 300 else reply
    else:
        reply, done = brain.handle_turn(business, call, body)
    deliver_outbox(business["id"])
    return _twiml(f"<Message>{escape(reply)}</Message>")


def _active_sms_call(business_id: int, caller: str):
    for call in db.list_calls(business_id, limit=20):
        if call["channel"] == "sms" and call["caller"] == caller and call["status"] == "active":
            return call
    return None


def _default_business():
    businesses = db.list_businesses()
    return businesses[0] if businesses else None


# ---------- outbound SMS ----------

def twilio_configured() -> bool:
    return bool(os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN")
                and os.environ.get("TWILIO_FROM_NUMBER"))


def deliver_outbox(business_id: int):
    """Send queued messages through Twilio if configured; otherwise leave them
    in the outbox where the dashboard shows them."""
    if not twilio_configured():
        return
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    from_number = os.environ["TWILIO_FROM_NUMBER"]
    for msg in db.list_outbox(business_id, limit=20):
        if msg["sent"]:
            continue
        try:
            data = urllib.parse.urlencode({
                "To": msg["to_number"], "From": from_number, "Body": msg["body"],
            }).encode()
            req = urllib.request.Request(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data=data, method="POST",
            )
            auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
            req.add_header("Authorization", f"Basic {auth}")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if 200 <= resp.status < 300:
                    db.mark_sent(msg["id"])
        except Exception:
            pass  # leave unsent; visible in dashboard outbox
