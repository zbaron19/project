# Counterpart — the negotiation dojo

Practice negotiation against an opponent who is actually trying to beat you.

Every scenario puts you across the table from an AI counterparty playing a
character with a **hidden brief**: a real walkaway, a concession ladder, secret
client pressures, things they'll only disclose if you ask the right question,
and a negotiating style that punishes lazy technique. You negotiate. When you
end the bout, a coach who can see *both* sides of the table grades you against
a 100-point rubric and shows you:

- **What you won** — and whether you got the best version available
- **What you left on the table** — concessions sitting in the brief, unclaimed
- **What you never saw** — questions you didn't ask, bluffs you didn't test
- **The reveal** — the counterparty's actual bottom line and hidden pressures

There are also **drills**: five-minute issue-spotting reps on salted clauses,
graded against an answer key.

Scores accumulate into a belt (White → Blue → Purple → Brown → Black).

## Why this exists

You can read about anchoring, BATNAs, and concession pacing forever. The only
thing that builds the skill is **reps against resistance with honest feedback**
— and real deals are a terrible classroom: the stakes are real, the feedback
loop is years long, and you never get to see the other side's brief. Counterpart
closes the loop. It's deliberate practice for the thing that, more than
drafting, determines what your clients actually get.

All scenarios are fictional. Nothing here touches client data.

## Run it

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python3 counterpart/server.py
# open http://localhost:8787
```

No dependencies — Python 3 standard library only. Everything stays local
except the API calls. Progress is saved to `counterpart/data/progress.jsonl`
(gitignored).

Options:

| Env var | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for negotiations and grading |
| `COUNTERPART_MODEL` | `claude-opus-4-8` | Model for the counterparty and the coach |
| `COUNTERPART_PORT` | `8787` | Server port |

Cost ballpark on the default model: a 10-turn bout plus debrief is typically a
few tens of cents. Set `COUNTERPART_MODEL=claude-sonnet-4-6` for cheaper reps.

## The roster

| Bout | Domain | Tier |
|---|---|---|
| The Assignment Clause | Leasing | Associate |
| The One-Way Mirror | Contracts (NDA) | Associate |
| Thirty Days in the Dirt | Purchase & Sale | Senior Associate |
| Skin in the Game | Leasing (guaranty) | Senior Associate |
| The $90 Per Foot Question | Leasing (work letter) | Senior Associate |
| The Advisor Who Wants Two Percent | Founder life | Partner |
| Quiet Enjoyment, Loud Lender | Finance (SNDA) | Partner |

Plus six drills: NDA, assignment clause, indemnity, PSA remedies, guaranty,
and SaaS terms.

## Adding your own scenarios

Drop a JSON file in `scenarios/` (copy an existing one for the shape). The
interesting part is `hidden_brief`: give the counterparty a concession ladder,
a walkaway, secrets they only reveal under direct questioning, and a style
note about what they reward and punish. Rubric points must sum to 100.
Restart the server to pick it up.

The hidden brief never leaves the server until the debrief — the browser only
ever sees the public fields.

## See also

`VISION.md` — why this might be more than a toy.
