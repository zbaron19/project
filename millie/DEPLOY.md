# Putting Millie on a real phone number (~20 minutes)

## 1. Host the app

Any host that runs Python works. Render is the simplest:

1. Push this repo to GitHub (already done if you're reading this there).
2. render.com → New → Web Service → connect the repo, root directory `millie/`.
3. Build command: `pip install -r requirements.txt`
   Start command: `uvicorn run:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `ANTHROPIC_API_KEY` — from console.anthropic.com (optional but recommended)
   - `MILLIE_TZ_OFFSET` — e.g. `-7` for Pacific daylight time
   - (after step 2) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
5. Note your public URL, e.g. `https://millie.onrender.com`.

**Persistence note:** SQLite lives on the instance disk. On Render, attach a
1GB persistent disk mounted at `/data` and set `MILLIE_DB=/data/millie.db`.

## 2. Get a Twilio number

1. twilio.com → buy a local voice+SMS number (~$1.15/mo).
2. Phone Numbers → your number → Voice configuration:
   - "A call comes in" → Webhook → `https://YOUR-URL/twilio/voice` → HTTP POST
3. Messaging configuration:
   - "A message comes in" → Webhook → `https://YOUR-URL/twilio/sms` → HTTP POST
4. Copy Account SID + Auth Token into the host's env vars, set
   `TWILIO_FROM_NUMBER` to the number you bought (E.164, e.g. `+14255551234`).

## 3. Point the business at the number

Update the business row so the webhook routes to the right profile — set its
`phone` to the Twilio number in E.164 form (via the API):

```bash
curl -X PUT https://YOUR-URL/api/business/1 \
  -H "Content-Type: application/json" \
  -d '{"phone": "+14255551234", "owner_phone": "+1YOURCELL"}'
```

Call the number. Millie answers.

## 4. Client go-live: conditional call forwarding

Don't replace the client's published number — catch what they miss. On the
client's carrier, enable "forward when busy / no answer" to the Twilio number
(e.g. Verizon: `*71` + Twilio number; AT&T: `*61*number#` / `*67*number#`).
Their phone still rings first; Millie catches everything they don't pick up,
plus everything after hours.

## 5. Local dev with real calls (optional)

`ngrok http 8035` → point the Twilio webhooks at the ngrok URL. Handy for
tuning the conversation with your own voice before deploying.

## Security checklist before real client traffic

- Put the dashboard behind auth (Render's built-in basic auth, Cloudflare
  Access, or a reverse-proxy password) — it shows customer phone numbers.
- Validate Twilio signatures on the webhooks (Twilio's `X-Twilio-Signature`
  header) once you're past the pilot stage.
- Back up `/data/millie.db` (it's the schedule and the audit trail).
