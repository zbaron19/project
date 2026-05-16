# Daily brief prompt

Paste this as the prompt for the scheduled trigger that runs the daily brief.

---

Produce today's daily data center news brief.

1. Invoke the `data-center-news` subagent and ask it to produce a brief covering
   the **last 24 hours** of U.S. data center news, following the format in its
   instructions. Use today's UTC date in the filename.
2. Save the result to `briefs/YYYY-MM-DD.md` (e.g. `briefs/2026-05-16.md`).
   Overwrite if the file already exists for today.
3. Commit the new file with the message:

       Add data center news brief for YYYY-MM-DD

4. Push to the current branch with `git push -u origin <branch>`.
   If the push fails for a network reason, retry up to 4 times with
   exponential backoff (2s, 4s, 8s, 16s).
5. If the subagent reports that no substantive news was found, still create
   the file with a short "Nothing notable in the last 24 hours" note and
   commit it — the empty-day signal is itself useful.

Do not open a pull request. Do not modify any files outside `briefs/`.
