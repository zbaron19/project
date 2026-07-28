#!/usr/bin/env python3
"""
Editorial layer for the daily data center brief — cluster, rank, explain.

The aggregator in daily_brief.py answers "what got published in the last day?".
This module answers "which of it matters to me, and why?" — the difference
between a wire feed and a brief.

Three stages, each usable on its own:

  1. Clean (local)    — strip the outlet name that Google News staples onto
                        headlines, drop summaries that just repeat the headline,
                        and prefer a publisher's real URL over a Google
                        redirect when the same story is available from both.

  2. Cluster (local)  — group items that cover the same story. Eight paraphrased
                        headlines about one financing deal become one entry with
                        eight sources instead of eight entries. No API key.

  3. Editorial (API)  — one small-model call per cluster, which returns a
                        plain-English "what happened", a "why this matters to
                        you" line tied to a beat or matter from profile.md, and
                        a tag (deal-relevant / career-learning / market-context
                        / skip). Ranked against the profile, capped, with
                        everything below the cut collapsed into a link list.

Stage 3 needs ANTHROPIC_API_KEY. Without it, stages 1 and 2 still produce a
materially better brief, so the pipeline degrades instead of failing.

Reader profile lives in profile.md at the repo root. It is the editorial
standard: beats, active matters, what the reader is learning, and phrases to
boost or mute. Its text is sent to the API on each run, which is why it must
never contain client or party names.

Zero external deps — stdlib only, urllib for the API call, same as the rest of
this repo.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE_PATH = ROOT / "profile.md"

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"

# Haiku 4.5: fast and cheap enough to run per-cluster every morning. The
# grounding here is the headline and summary we already have, not the model's
# own knowledge, so a small model is the right tool. Override with --model.
DEFAULT_MODEL = "claude-haiku-4-5"

# Cost ceiling: only the top N clusters by local score get an API call. The
# rest are still listed, just without the editorial treatment.
DEFAULT_MAX_API_ITEMS = 12

# How many clusters appear in the lead section of the rendered brief.
DEFAULT_LEAD_COUNT = 10

TAGS = ("deal-relevant", "career-learning", "market-context", "skip")

# Outlets whose data center reporting is worth reading in full, versus
# syndicators and stock-commentary sites that mostly restate a wire story.
TIER_ONE = {
    "data center dynamics", "data center knowledge", "data center frontier",
    "utility dive", "facilities dive", "canary media", "stateline",
    "rto insider", "virginia mercury", "bloomberg", "reuters", "the wall street journal",
    "the washington post", "axios", "politico", "the register", "wired",
    "associated press", "npr", "law360", "bisnow", "commercial observer",
    "inside climate news", "e&e news", "utility week", "heatmap news",
}
TIER_THREE = {
    "simplywall.st", "etf trends", "tradingview", "investing.com", "benzinga",
    "the motley fool", "zacks", "insider monkey", "seeking alpha", "barchart",
    "pulse 2.0", "crypto briefing", "qz.com", "nepalnews.com", "varindia.com",
    "indiatimes", "et cio", "pluang", "24/7 wall st.", "marketbeat",
}

# Tokens that appear in nearly every headline in this corpus and therefore
# carry no signal about *which* story a headline is about.
CLUSTER_STOPWORDS = {
    "data", "center", "centers", "centre", "centres", "datacenter", "datacenters",
    "the", "and", "for", "with", "from", "that", "this", "will", "would", "could",
    "into", "over", "after", "amid", "says", "said", "new", "more", "than",
    "its", "his", "her", "their", "about", "what", "when", "where", "why", "how",
    "plan", "plans", "planned", "project", "projects", "report", "reports",
    "reportedly", "million", "billion", "ai", "artificial", "intelligence",
    "county", "city", "state", "town", "board", "council", "week", "year",
    "first", "second", "third", "next", "last", "may", "can", "get", "gets",
    "you", "your", "not", "but", "are", "was", "were", "has", "have", "had",
}

# Two headlines cluster when they share this fraction of the smaller headline's
# significant tokens, and share at least MIN_SHARED distinctive tokens.
CLUSTER_OVERLAP = 0.5
CLUSTER_MIN_SHARED = 2


# --------------------------------------------------------------------------
# Reader profile
# --------------------------------------------------------------------------

@dataclass
class Beat:
    label: str
    keywords: list[str]


@dataclass
class Profile:
    beats: list[Beat] = field(default_factory=list)
    matters: list[Beat] = field(default_factory=list)
    learning: list[str] = field(default_factory=list)
    boost: list[str] = field(default_factory=list)
    mute: list[str] = field(default_factory=list)
    text: str = ""

    @property
    def is_empty(self) -> bool:
        return not (self.beats or self.matters or self.boost or self.mute)


def _split_bullet(line: str) -> tuple[str, list[str]]:
    """`label — kw, kw` -> ("label", ["kw", "kw"]). Accepts —, --, and ' - '."""
    body = line.lstrip("-* ").strip()
    for sep in ("—", "–", " -- ", " - "):
        if sep in body:
            label, _, rest = body.partition(sep)
            keywords = [k.strip().lower() for k in rest.split(",") if k.strip()]
            return label.strip(), keywords
    return body, []


def load_profile(path: Path = PROFILE_PATH) -> Profile:
    """Parse profile.md. A missing or malformed file yields an empty profile,
    which downgrades ranking to source quality and freshness rather than
    failing the run."""
    profile = Profile()
    if not path.exists():
        return profile
    profile.text = path.read_text()

    section = ""
    for raw in profile.text.splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            section = line[3:].strip().lower()
            continue
        if not line.lstrip().startswith(("-", "*")):
            continue
        # Skip the blockquoted confidentiality note and any nested bullets.
        if raw.startswith(">") or raw.startswith("  "):
            continue
        label, keywords = _split_bullet(line)
        if not label:
            continue
        if section.startswith("beat"):
            profile.beats.append(Beat(label, keywords or [label.lower()]))
        elif section.startswith("matter"):
            profile.matters.append(Beat(label, keywords or [label.lower()]))
        elif section.startswith("learn"):
            profile.learning.append(label.lower())
        elif section.startswith("boost"):
            profile.boost.append(label.lower())
        elif section.startswith("mute"):
            profile.mute.append(label.lower())
    return profile


def profile_brief_text(profile: Profile, limit: int = 4000) -> str:
    """The profile as sent to the model: prose stripped, structure kept."""
    if not profile.text:
        return "(no reader profile configured)"
    keep: list[str] = []
    section = ""
    for raw in profile.text.splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            section = line[3:].strip().lower()
            keep.append(line)
        elif line.lstrip().startswith(("-", "*")) and not raw.startswith(">") and section:
            keep.append(line)
    return "\n".join(keep)[:limit]


# --------------------------------------------------------------------------
# Cleaning
# --------------------------------------------------------------------------

def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def clean_item(item: dict) -> dict:
    """Undo the two cosmetic problems Google News introduces: the outlet name
    appended to the headline, and a 'summary' that is just the headline again."""
    title = (item.get("title") or "").strip()
    source = (item.get("source") or "").strip()
    summary = (item.get("summary") or "").strip()

    # "... campus KOKH" / "... campus - KOKH" -> "... campus"
    if source and source.lower() not in ("google news", ""):
        for suffix in (f" - {source}", f" — {source}", f" {source}"):
            if title.lower().endswith(suffix.lower()) and len(title) > len(suffix) + 15:
                title = title[: -len(suffix)].rstrip(" -—")
                break

    # A summary that restates the headline adds nothing.
    if summary:
        nt, ns = _norm(title), _norm(summary)
        if ns.startswith(nt[:60]) or nt.startswith(ns[:60]):
            summary = ""
        elif source and _norm(summary) == _norm(f"{title} {source}"):
            summary = ""

    out = dict(item)
    out["title"] = title
    out["summary"] = summary
    return out


def is_redirect(link: str) -> bool:
    return "news.google.com/rss/articles" in (link or "")


def source_tier(source: str) -> int:
    """1 = trade press / major outlet, 2 = local or unknown, 3 = syndicator."""
    key = (source or "").strip().lower()
    if key in TIER_ONE:
        return 1
    if key in TIER_THREE:
        return 3
    return 2


# --------------------------------------------------------------------------
# Clustering
# --------------------------------------------------------------------------

def _tokens(item: dict) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (item.get("title") or "").lower())
    return {w for w in words if len(w) > 2 and w not in CLUSTER_STOPWORDS}


def _same_story(a: set[str], b: set[str]) -> bool:
    if not a or not b:
        return False
    shared = a & b
    if len(shared) < CLUSTER_MIN_SHARED:
        return False
    return len(shared) / min(len(a), len(b)) >= CLUSTER_OVERLAP


@dataclass
class Cluster:
    items: list[dict]
    section: str = ""
    # Filled in by scoring / the editorial pass.
    local_score: float = 0.0
    reasons: list[str] = field(default_factory=list)
    editorial: dict | None = None

    @property
    def primary(self) -> dict:
        """The item to headline and link. Prefer a real publisher URL over a
        Google redirect, then better sources, then the longer headline (Google
        truncates)."""
        return sorted(
            self.items,
            key=lambda it: (
                is_redirect(it.get("link", "")),
                source_tier(it.get("source", "")),
                -len(it.get("title") or ""),
            ),
        )[0]

    @property
    def title(self) -> str:
        return self.primary.get("title") or ""

    @property
    def link(self) -> str:
        return self.primary.get("link") or ""

    @property
    def sources(self) -> list[str]:
        seen, out = set(), []
        for it in sorted(self.items, key=lambda i: source_tier(i.get("source", ""))):
            name = (it.get("source") or "").strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                out.append(name)
        return out

    @property
    def published(self) -> dt.datetime | None:
        stamps = [it["published"] for it in self.items if it.get("published")]
        return max(stamps) if stamps else None

    def blob(self) -> str:
        parts = []
        for it in self.items:
            parts.append(it.get("title") or "")
            parts.append(it.get("summary") or "")
        return " ".join(parts).lower()


def cluster_items(items: list[dict]) -> list[Cluster]:
    """Single-link clustering on headline token overlap."""
    tokens = [_tokens(it) for it in items]
    parent = list(range(len(items)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[rj] = ri

    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if _same_story(tokens[i], tokens[j]):
                union(i, j)

    groups: dict[int, list[dict]] = {}
    for idx, item in enumerate(items):
        groups.setdefault(find(idx), []).append(item)

    clusters = []
    for members in groups.values():
        section = next((m.get("section", "") for m in members if m.get("section")), "")
        clusters.append(Cluster(items=members, section=section))
    return clusters


# --------------------------------------------------------------------------
# Local scoring
# --------------------------------------------------------------------------

def _count_hits(blob: str, needles: list[str]) -> list[str]:
    return [n for n in needles if n and n in blob]


def score_cluster(cluster: Cluster, profile: Profile, now: dt.datetime) -> None:
    """Rank against the profile using only local signals. Runs with or without
    the API pass; when the API pass runs, its relevance blends in on top."""
    blob = cluster.blob()
    score = 0.0
    reasons: list[str] = []

    matter_hits: list[str] = []
    for matter in profile.matters:
        hits = _count_hits(blob, matter.keywords)
        if hits:
            matter_hits.append(matter.label)
    if matter_hits:
        score += min(len(matter_hits) * 6.0, 12.0)
        reasons.append("matter: " + "; ".join(matter_hits[:2]))

    beat_hits: list[str] = []
    for beat in profile.beats:
        hits = _count_hits(blob, beat.keywords)
        if hits:
            beat_hits.append(beat.label)
    if beat_hits:
        score += min(len(beat_hits) * 2.0, 8.0)
        reasons.append("beat: " + "; ".join(beat_hits[:2]))

    boosts = _count_hits(blob, profile.boost)
    if boosts:
        score += min(len(boosts) * 4.0, 12.0)
        reasons.append("watching: " + ", ".join(boosts[:3]))

    learning = _count_hits(blob, profile.learning)
    if learning:
        score += min(len(learning) * 1.5, 4.5)

    mutes = _count_hits(blob, profile.mute)
    if mutes:
        score -= 25.0
        reasons.append("muted: " + ", ".join(mutes[:2]))

    tier = source_tier(cluster.primary.get("source", ""))
    score += {1: 3.0, 2: 1.5, 3: 0.0}[tier]

    published = cluster.published
    if published:
        hours = max((now - published).total_seconds() / 3600.0, 0.0)
        score += 3.0 if hours <= 18 else (1.5 if hours <= 36 else 0.0)

    # Breadth of coverage is weak evidence and easy to overweight: a wire story
    # syndicated eight times is newsworthy in general, which is a different
    # question from whether it matters to this reader. Keep the bonus small
    # enough that it can break a tie but never beat a profile hit, and don't
    # pay it at all when the coverage is all syndicators.
    extra = len(cluster.items) - 1
    if extra and tier < 3:
        score += min(extra * 0.4, 1.6)
    if extra:
        reasons.append(f"covered by {len(cluster.items)} outlets")

    cluster.local_score = score
    cluster.reasons = reasons


def final_score(cluster: Cluster) -> float:
    """Local score plus the model's relevance read, when we have one."""
    score = cluster.local_score
    ed = cluster.editorial or {}
    if ed:
        score += max(0, min(int(ed.get("relevance") or 0), 100)) / 10.0
        if ed.get("tag") == "skip":
            score -= 30.0
    return score


# --------------------------------------------------------------------------
# Editorial pass (Anthropic API)
# --------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are the editor of a one-reader morning brief on U.S. data center news.

The reader is a transactional real estate attorney who negotiates data center \
deals (colocation, powered shell, build-to-suit) and is deliberately building \
the engineering fluency to negotiate them precisely. Their profile — beats, \
active matters, what they are learning — is given to you.

Your job for each story:

- what_happened: two sentences, plain English, no markdown. Only facts \
supported by the headlines and summaries you are given. If the material is \
thin, say less rather than guessing. Never invent numbers, parties, or dates.
- why_it_matters: ONE sentence, addressed to this reader, naming the concrete \
connection to a beat, an active matter, or something they are learning. If \
there is no real connection, say so plainly instead of manufacturing one.
- tag: deal-relevant (bears on how a deal gets papered or negotiated), \
career-learning (teaches the engineering, regulatory, or market substance), \
market-context (useful background, no direct bearing), skip (noise, \
stock-market commentary, or non-U.S.).
- relevance: 0-100 for this specific reader, not general newsworthiness.
- beat: the single closest beat label from the profile, or "" if none fit.
- term: one technical, regulatory, or market term from this story that the \
reader would benefit from understanding precisely, or "" if none.

Be honest and specific. A brief that flags three things that matter beats one \
that flatters ten. Never use markdown formatting in any field.
"""

ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "what_happened": {"type": "string", "description": "Two plain sentences of fact."},
        "why_it_matters": {"type": "string", "description": "One sentence addressed to this reader."},
        "tag": {"type": "string", "enum": list(TAGS)},
        "relevance": {"type": "integer", "description": "0-100 for this reader."},
        "beat": {"type": "string", "description": "Closest beat label, or empty string."},
        "term": {"type": "string", "description": "One term worth learning, or empty string."},
    },
    "required": ["what_happened", "why_it_matters", "tag", "relevance", "beat", "term"],
    "additionalProperties": False,
}

LEARN_SCHEMA = {
    "type": "object",
    "properties": {
        "term": {"type": "string", "description": "The term being explained."},
        "explainer": {"type": "string", "description": "Exactly three sentences, plain English, no markdown."},
        "why_now": {"type": "string", "description": "One clause tying it to today's stories."},
    },
    "required": ["term", "explainer", "why_now"],
    "additionalProperties": False,
}


class APIError(RuntimeError):
    pass


def api_key() -> str | None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    return key or None


def call_model(
    prompt: str,
    schema: dict,
    *,
    model: str = DEFAULT_MODEL,
    system: str = SYSTEM_PROMPT,
    max_tokens: int = 800,
    key: str | None = None,
    timeout: int = 60,
    retries: int = 4,
) -> dict:
    """One structured-output Messages API call. Returns the parsed object."""
    key = key or api_key()
    if not key:
        raise APIError("ANTHROPIC_API_KEY is not set")

    body = json.dumps(
        {
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
            "output_config": {"format": {"type": "json_schema", "schema": schema}},
        }
    ).encode("utf-8")

    headers = {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": API_VERSION,
    }

    delay = 2
    last: Exception | None = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(API_URL, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode("utf-8", "replace")[:400]
            except Exception:
                pass
            # 429 and 5xx are worth retrying; 4xx means the request is wrong.
            if e.code != 429 and e.code < 500:
                raise APIError(f"HTTP {e.code}: {detail}") from e
            last = APIError(f"HTTP {e.code}: {detail}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last = APIError(f"{type(e).__name__}: {e}")
        if attempt == retries:
            raise last or APIError("request failed")
        time.sleep(delay)
        delay *= 2

    if payload.get("stop_reason") == "refusal":
        raise APIError("model declined this request")

    text = next(
        (b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text"),
        "",
    )
    if not text:
        raise APIError("empty response")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise APIError(f"response was not valid JSON: {text[:200]}") from e


def _cluster_prompt(cluster: Cluster, profile: Profile) -> str:
    lines = [
        "READER PROFILE",
        profile_brief_text(profile),
        "",
        "STORY — every headline and summary we have on it:",
    ]
    for it in cluster.items[:8]:
        published = it.get("published")
        when = published.strftime("%Y-%m-%d") if published else "undated"
        lines.append(f"- [{it.get('source', 'unknown')}, {when}] {it.get('title', '')}")
        summary = (it.get("summary") or "").strip()
        if summary:
            lines.append(f"  summary: {summary[:400]}")
    if cluster.section:
        lines.append("")
        lines.append(f"The aggregator filed this under: {cluster.section}")
    lines.append("")
    lines.append(
        "Write the editorial treatment for this story. Base every factual claim "
        "on the material above — you have not read the underlying articles."
    )
    return "\n".join(lines)


def run_editorial(
    clusters: list[Cluster],
    profile: Profile,
    *,
    model: str = DEFAULT_MODEL,
    max_items: int = DEFAULT_MAX_API_ITEMS,
    verbose: bool = True,
) -> list[str]:
    """Fill in `cluster.editorial` for the top `max_items` clusters. Returns a
    list of human-readable failures; a failed cluster keeps its local score and
    is rendered without editorial text."""
    failures: list[str] = []
    key = api_key()
    if not key:
        return ["ANTHROPIC_API_KEY is not set — ran the local stages only"]

    ranked = sorted(clusters, key=lambda c: c.local_score, reverse=True)
    for cluster in ranked[:max_items]:
        try:
            cluster.editorial = call_model(
                _cluster_prompt(cluster, profile),
                ITEM_SCHEMA,
                model=model,
                key=key,
            )
            if verbose:
                tag = cluster.editorial.get("tag", "?")
                print(f"[api] {tag:<15} {cluster.title[:70]}", file=sys.stderr)
        except APIError as e:
            failures.append(f"{cluster.title[:60]}: {e}")
            if verbose:
                print(f"[api] failed: {cluster.title[:60]}: {e}", file=sys.stderr)
    return failures


def run_learn_slot(
    clusters: list[Cluster],
    profile: Profile,
    *,
    model: str = DEFAULT_MODEL,
) -> dict | None:
    """One extra call: pick a term out of today's news and explain it in three
    sentences. This is the half of the brief that is education rather than
    awareness, and it feeds the critical-load glossary."""
    candidates = [
        (c, (c.editorial or {}).get("term", "").strip())
        for c in clusters
        if (c.editorial or {}).get("term", "").strip()
    ]
    if not candidates:
        return None

    lines = [
        "READER PROFILE",
        profile_brief_text(profile),
        "",
        "Terms surfaced by today's stories, each with the story it came from:",
    ]
    for cluster, term in candidates[:8]:
        lines.append(f"- {term} — from: {cluster.title[:110]}")
    lines.append("")
    lines.append(
        "Pick the ONE term this reader would most benefit from understanding "
        "precisely, given what they are learning and the deals they negotiate. "
        "Prefer something that shows up in contract obligations or utility "
        "process over general market vocabulary. Explain it in exactly three "
        "sentences: what it is, how it works, and where it bites in a deal."
    )
    try:
        return call_model(
            "\n".join(lines),
            LEARN_SCHEMA,
            model=model,
            max_tokens=600,
        )
    except APIError as e:
        print(f"[api] learn slot failed: {e}", file=sys.stderr)
        return None


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

TAG_LABEL = {
    "deal-relevant": "Deal-relevant",
    "career-learning": "Worth learning",
    "market-context": "Context",
    "skip": "Noise",
}


def _sources_line(cluster: Cluster) -> str:
    names = cluster.sources
    primary = (cluster.primary.get("source") or "").strip()
    published = cluster.published
    when = published.strftime("%Y-%m-%d") if published else ""
    others = [n for n in names if n.lower() != primary.lower()]
    bits = [primary or "unknown"]
    if when:
        bits.append(when)
    line = ", ".join(bits)
    if others:
        shown = ", ".join(others[:4])
        more = f" +{len(others) - 4} more" if len(others) > 4 else ""
        line += f" · also {shown}{more}"
    return line


def render(
    date_str: str,
    clusters: list[Cluster],
    *,
    errors: list[str],
    api_failures: list[str],
    learn: dict | None,
    lead_count: int = DEFAULT_LEAD_COUNT,
    editorial_ran: bool,
) -> str:
    ranked = sorted(clusters, key=final_score, reverse=True)
    lead = [c for c in ranked if (c.editorial or {}).get("tag") != "skip"][:lead_count]
    lead_ids = {id(c) for c in lead}
    rest = [c for c in ranked if id(c) not in lead_ids]

    L: list[str] = []
    L.append(f"# Data Center News Brief — {date_str}")
    L.append("")
    mode = "clustered + edited for one reader" if editorial_ran else "clustered (local only — no API key)"
    L.append(
        f"*{len(clusters)} distinct stories from {sum(len(c.items) for c in clusters)} "
        f"items; {mode}. Editorial standard: `profile.md`. Every claim below is "
        f"drawn from headlines and summaries, not from the full articles — click "
        f"through before relying on a fact.*"
    )
    L.append("")

    if not lead:
        L.append("## Today")
        L.append("- Nothing in the last 24–36 hours cleared the bar.")
        L.append("")
    else:
        L.append("## What matters to you today")
        L.append("")
        for i, cluster in enumerate(lead, 1):
            ed = cluster.editorial or {}
            tag = TAG_LABEL.get(ed.get("tag", ""), "")
            beat = (ed.get("beat") or cluster.section or "").strip()
            header = f"### {i}. [{cluster.title}]({cluster.link})"
            L.append(header)
            meta = " · ".join(x for x in (tag, beat) if x)
            if meta:
                L.append(f"*{meta}*")
                L.append("")
            why = (ed.get("why_it_matters") or "").strip()
            if why:
                L.append(f"**Why this matters to you:** {why}")
                L.append("")
            what = (ed.get("what_happened") or "").strip()
            if not what:
                what = (cluster.primary.get("summary") or "").strip()
            if what:
                L.append(what)
                L.append("")
            elif editorial_ran and not why:
                # The editorial pass ran and still had nothing to say about this
                # one — worth flagging rather than padding.
                L.append("_Headline only; the feed carried no summary text._")
                L.append("")
            L.append(f"<sub>{_sources_line(cluster)}</sub>")
            L.append("")

    if learn:
        L.append("## Learn this")
        L.append("")
        term = (learn.get("term") or "").strip()
        explainer = (learn.get("explainer") or "").strip()
        why_now = (learn.get("why_now") or "").strip()
        L.append(f"**{term}** — {explainer}")
        if why_now:
            L.append("")
            L.append(f"*In today's news: {why_now}*")
        L.append("")

    if rest:
        L.append("## Also happened")
        L.append("")
        for cluster in rest:
            source = (cluster.primary.get("source") or "unknown").strip()
            extra = f" (+{len(cluster.items) - 1})" if len(cluster.items) > 1 else ""
            L.append(f"- [{cluster.title}]({cluster.link}) — {source}{extra}")
        L.append("")

    if errors:
        L.append("## Feeds that failed this run")
        for e in errors:
            L.append(f"- {e}")
        L.append("")

    if api_failures:
        L.append("## Editorial pass notes")
        for f in api_failures:
            L.append(f"- {f}")
        L.append("")

    L.append("---")
    L.append("")
    L.append(
        "Wrong emphasis? Edit `profile.md` — add a phrase under **Boost** to see "
        "more of something, under **Mute** to see less, or add an entry under "
        "**Matters** when a new deal starts. The next run reads it."
    )
    L.append("")
    L.append(
        f"Generated by `scripts/daily_brief.py --editorial` at "
        f"{dt.datetime.now(dt.timezone.utc).isoformat()}."
    )
    return "\n".join(L)


# --------------------------------------------------------------------------
# Replay: rebuild items from an existing brief file
# --------------------------------------------------------------------------

ITEM_RE = re.compile(
    r"^- \*\*\[(?P<title>.+?)\]\((?P<link>[^)]+)\)\*\*"
    r"(?:\s*—\s*(?P<summary>.*?))?"
    r"\s*_\((?P<meta>[^)]*)\)_\s*$"
)


def parse_brief(path: Path) -> list[dict]:
    """Rebuild the item list from a brief this repo already wrote.

    Lets the editorial layer be run against a past day's output for a true
    side-by-side comparison, without refetching feeds or touching seen.json.
    """
    items: list[dict] = []
    section = ""
    in_tldr = False
    for raw in path.read_text().splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            section = line[3:].strip()
            in_tldr = section.lower().startswith("tl;dr")
            continue
        if in_tldr or not line.startswith("- **["):
            continue
        m = ITEM_RE.match(line)
        if not m:
            continue
        meta = m.group("meta") or ""
        source, _, date_part = meta.partition(",")
        published = None
        date_part = date_part.strip()
        if date_part:
            try:
                published = dt.datetime.strptime(date_part, "%Y-%m-%d").replace(
                    tzinfo=dt.timezone.utc
                )
            except ValueError:
                published = None
        summary = (m.group("summary") or "").strip().rstrip("…")
        items.append(
            {
                "title": m.group("title").strip(),
                "link": m.group("link").strip(),
                "summary": summary,
                "source": source.strip(),
                "published": published,
                "section": section,
            }
        )
    return items


# --------------------------------------------------------------------------
# Entry point used by daily_brief.py
# --------------------------------------------------------------------------

def build(
    date_str: str,
    items: list[dict],
    *,
    errors: list[str] | None = None,
    use_api: bool = True,
    model: str = DEFAULT_MODEL,
    max_api_items: int = DEFAULT_MAX_API_ITEMS,
    lead_count: int = DEFAULT_LEAD_COUNT,
    learn_slot: bool = True,
    now: dt.datetime | None = None,
    verbose: bool = True,
) -> str:
    """Clean -> cluster -> score -> (optional) edit -> render."""
    now = now or dt.datetime.now(dt.timezone.utc)
    profile = load_profile()
    if profile.is_empty and verbose:
        print(
            f"[warn] no usable reader profile at {PROFILE_PATH} — "
            f"ranking on source quality and freshness only",
            file=sys.stderr,
        )

    cleaned = [clean_item(it) for it in items]
    clusters = cluster_items(cleaned)
    for cluster in clusters:
        score_cluster(cluster, profile, now)

    if verbose:
        print(
            f"[cluster] {len(cleaned)} items -> {len(clusters)} stories "
            f"(largest: {max((len(c.items) for c in clusters), default=0)} outlets)",
            file=sys.stderr,
        )

    api_failures: list[str] = []
    learn: dict | None = None
    editorial_ran = False
    if use_api:
        api_failures = run_editorial(
            clusters, profile, model=model, max_items=max_api_items, verbose=verbose
        )
        editorial_ran = any(c.editorial for c in clusters)
        if editorial_ran and learn_slot:
            learn = run_learn_slot(clusters, profile, model=model)

    return render(
        date_str,
        clusters,
        errors=errors or [],
        api_failures=api_failures,
        learn=learn,
        lead_count=lead_count,
        editorial_ran=editorial_ran,
    )
