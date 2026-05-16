# Daily brief prompt

Paste this as the prompt for the scheduled trigger that runs the daily brief.

---

Produce today's daily data center news brief and email a digest.

**Step 1 — Generate the full brief**
1. Invoke the `data-center-news` subagent and ask it to produce a brief covering
   the **last 24 hours** of U.S. data center news, following the format in its
   instructions. Use today's UTC date in the filename.
2. Save the result to `briefs/YYYY-MM-DD.md` (e.g. `briefs/2026-05-16.md`).
   Overwrite if the file already exists for today.

**Step 2 — Generate the email digest**

Build a compact HTML digest from the full brief with this structure:

- **Subject:** `Data Center News Brief — <weekday, full date>` (e.g. `Data Center News Brief — Saturday, May 16, 2026`)
- **Body (HTML):**
  - Opening line: link to the full brief on GitHub (`https://github.com/zbaron19/project/blob/claude/data-center-news-agent-UmgAm/briefs/YYYY-MM-DD.md`).
  - **TL;DR** — the 3–6 TL;DR bullets verbatim from the full brief, with the same inline source links preserved as `<a href>` tags.
  - **Section headlines** — for each non-empty section in the full brief
    (Site selection, Power, Leasing/M&A, Tax/incentives, Regulation/litigation,
    General industry), list each item's **one-line headline only** (not the full
    1–3 sentence summary), followed by its primary source link as an `<a href>` tag.
  - **Watch list** — verbatim.
  - Closing line: "Full brief and archive: [link to briefs/ folder on GitHub]".
- Every claim in the digest must carry its source link. No links, no claim.
- If a section says "Nothing notable" in the full brief, omit it from the digest.

**Step 3 — Create the Gmail draft**

Call `mcp__24b60b2b-11ce-4438-9d0c-109e21683498__create_draft` with:
- `to`: `["Zbaron19@gmail.com"]`
- `subject`: as defined in Step 2
- `htmlBody`: the HTML digest from Step 2
- `body`: a plain-text fallback (strip the HTML tags, keep URLs inline in parentheses)

The draft will land in the Drafts folder of that Gmail account. If Gmail auth
has expired, surface the re-auth prompt and continue with Step 4 — the full
brief still gets committed; the email can be re-sent manually.

**Step 4 — Push notification to phone**

Call the `PushNotification` tool with a one-line summary of today's brief:
- Under 200 characters, one line, no markdown.
- Lead with the most newsworthy 2–3 headlines (verb-first, comma-separated),
  then a short pointer back. Example:
  `Data center brief: NC moves to repeal tax exemption; FERC large-load order due June; BXDC trades May 14. Full digest in Gmail Drafts.`
- If the brief is "Nothing notable," push: `Data center brief: quiet day — no material U.S. news in the last 24 hours.`
- `status` is `"proactive"`.

If Remote Control isn't connected (the tool returns "not sent"), don't retry —
the email draft is the fallback. Just continue to Step 5.

**Step 5 — Commit and push the brief**

1. Commit the new brief file with the message:

       Add data center news brief for YYYY-MM-DD

2. Push to the current branch with `git push -u origin <branch>`.
   If the push fails for a network reason, retry up to 4 times with
   exponential backoff (2s, 4s, 8s, 16s).

**Edge cases**

- If the subagent reports that no substantive news was found, still create
  the file with a short "Nothing notable in the last 24 hours" note, commit it,
  still send the email digest, and still push the notification — it's useful
  to know it was a quiet day.
- Do not open a pull request. Do not modify any files outside `briefs/`.
