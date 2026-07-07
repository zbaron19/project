"""Optional Claude assist for the conversation engine.

Millie's core flow is a deterministic state machine (brain.py) so the product
works with no API key at all. When ANTHROPIC_API_KEY (or an `ant auth login`
profile) is available, Claude handles the two things templates can't:
  - classifying ambiguous caller intent
  - answering free-form questions from the business profile

Defaults to claude-haiku-4-5: this is a live phone call, and time-to-first-word
is the product. Override with MILLIE_MODEL if you want a bigger model.
"""

import json
import os

MODEL = os.environ.get("MILLIE_MODEL", "claude-haiku-4-5")

_client = None
_unavailable = False


def _get_client():
    global _client, _unavailable
    if _client is not None or _unavailable:
        return _client
    try:
        import anthropic
        _client = anthropic.Anthropic()
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            # A profile from `ant auth login` may still work; probe cheaply on first real call.
            pass
    except Exception:
        _unavailable = True
        _client = None
    return _client


def available() -> bool:
    if _unavailable or _get_client() is None:
        return False
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def _ask(system: str, user: str, max_tokens: int = 300) -> str | None:
    global _unavailable
    client = _get_client()
    if client is None:
        return None
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        if response.stop_reason == "refusal":
            return None
        return next((b.text for b in response.content if b.type == "text"), None)
    except Exception:
        # Auth failures, network errors, rate limits: fall back to the
        # deterministic engine rather than stalling a live phone call.
        _unavailable = True
        return None


def classify_intent(text: str, options: list[str]) -> str | None:
    """Return one of `options`, or None if Claude is unavailable/unsure."""
    system = (
        "You classify one utterance from a caller phoning a local service business. "
        "Reply with exactly one word: one of the allowed labels, nothing else."
    )
    user = f"Allowed labels: {', '.join(options)}\nCaller said: {text!r}\nLabel:"
    answer = _ask(system, user, max_tokens=10)
    if answer:
        answer = answer.strip().lower().split()[0].strip(".,")
        if answer in options:
            return answer
    return None


def answer_question(question: str, business: dict) -> str | None:
    """Answer a caller's free-form question strictly from the business profile."""
    profile = {
        "name": business.get("name"),
        "trade": business.get("trade"),
        "service_area": business.get("service_area"),
        "address": business.get("address"),
        "hours": business.get("hours"),
        "services": [
            {"name": s.get("name"), "price_low": s.get("price_low"), "price_high": s.get("price_high")}
            for s in (business.get("services") or [])
        ],
        "faqs": business.get("faqs"),
    }
    system = (
        "You are Millie, the phone receptionist for a local service business. "
        "Answer the caller's question in one or two short spoken sentences using ONLY "
        "the business profile provided. Plain text only - no markdown, no lists. "
        "If the profile does not contain the answer, say exactly: UNKNOWN"
    )
    user = f"Business profile:\n{json.dumps(profile)}\n\nCaller asked: {question!r}"
    answer = _ask(system, user, max_tokens=150)
    if answer and "UNKNOWN" not in answer:
        return answer.strip()
    return None
