# Data Center News Briefs

Daily briefings on U.S. data center news with a commercial real estate / legal lens.
Each file is named `YYYY-MM-DD.md` and covers the prior 24 hours.

## How it runs

The brief is produced by the `data-center-news` subagent (see
`.claude/agents/data-center-news.md`) and is intended to run once a day
as a **scheduled trigger** on Claude Code on the web.

Each daily run does two things:
1. Writes the full brief to `briefs/YYYY-MM-DD.md`, commits, and pushes.
2. Creates a compact HTML email digest (TL;DR + section headlines + source
   links + a link back to the full brief on GitHub) as a Gmail draft addressed
   to `Zbaron19@gmail.com`. The draft lands in your Gmail Drafts folder — open
   it to read, or hit Send to push it into your Inbox.

### One-time setup: schedule the daily run

1. Open this repo's environment on https://claude.ai/code.
2. Open the environment's **Triggers** panel and create a new **Schedule** trigger.
   - Frequency: daily (pick the time you want — early morning U.S. Eastern is a good default).
   - Source: this repository, branch `claude/data-center-news-agent-UmgAm` (or wherever this agent lives).
   - Prompt: paste the contents of `briefs/DAILY_PROMPT.md` below.
3. Save. Claude Code will spin up a session at that time each day, produce the brief,
   commit it to the branch, and push.

### Ad-hoc use

Inside any Claude Code session in this repo, ask:

> Use the data-center-news agent to brief me on the past week.

or

> Use the data-center-news agent — anything new on Loudoun County moratoriums?

### Asking questions about the archive

Because every brief is just a markdown file in `briefs/`, you can also open
this repo in Claude Code on the web at any time and ask questions across the
whole archive — Claude will read the dated files and answer. Examples:

> Summarize Loudoun County zoning activity from the last 30 days.

> What's pending at FERC right now?

> Pull every tax-incentive item from the past 60 days and group by state.

No special command — just open the repo, ask the question. Pair it with the
`data-center-news` subagent if you also want fresh web research mixed in.

## Notes

- Briefs older than ~90 days can be archived/pruned if the folder gets noisy.
- If a daily brief is missing, the scheduled session likely hit a network/auth issue
  on that date — re-run manually with the prompt in `DAILY_PROMPT.md`.
