# Secret Rotation Runbook

## When to Rotate

- Suspected or confirmed compromise (e.g. secret exposed in public repo, Slack, email)
- Team member with access offboards
- Periodic hygiene (every 6–12 months)

---

## Rotating `PUBLISH_SECRET`

`PUBLISH_SECRET` is shared between two systems — the **publish worker** and the **frontend**. Both must be updated together; there is a brief window between steps where publishes will fail.

**Step 1 — Generate a new secret**

```bash
openssl rand -hex 32
```

Copy the output. This is your new token.

**Step 2 — Update the worker secret**

```bash
cd /Users/morten_spense/spense-backend/publish
echo "YOUR_NEW_TOKEN" | npx wrangler secret put PUBLISH_SECRET
```

From this point the old token is dead. The frontend will fail until Step 3 is complete.

**Step 3 — Update the frontend**

In `/Users/morten_spense/spense-calculator/index.html`, find:

```js
const PUBLISH_SECRET_TOKEN = '...'
```

Replace the value with the new token. Commit and push:

```bash
cd /Users/morten_spense/spense-calculator
git add index.html
git commit -m "Rotate PUBLISH_SECRET token"
git push
```

GitHub Pages deploys automatically. Allow ~60 seconds for propagation.

**Step 4 — Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://spense-publish.results-calc.workers.dev/publish \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>test</h1>","prospectSlug":"rotation-verify"}'
```

Expected: `200`. If `401`, the worker secret wasn't saved correctly — repeat Step 2.

Then delete the test slug from the dashboard.

---

## Rotating `DASHBOARD_PASSWORD`

This one is self-contained — only the dashboard worker needs updating.

**Step 1 — Choose a new password**

Use a strong passphrase or generate one:

```bash
openssl rand -base64 16
```

**Step 2 — Update the worker secret**

```bash
cd /Users/morten_spense/spense-backend/dashboard
echo "YOUR_NEW_PASSWORD" | npx wrangler secret put DASHBOARD_PASSWORD
```

All existing sessions are invalidated automatically on next request (KV session tokens reference the old password implicitly — the cookie stays valid until it expires, but that's fine since the session is stored in KV, not derived from the password). If you want to force immediate logout of all active sessions, clear the KV namespace or wait for session TTL (8 hours).

**Step 3 — Inform the team**

Share the new password with anyone who has dashboard access. There is no self-service reset.

**Step 4 — Verify**

Open `https://spense-dashboard.results-calc.workers.dev/` in a private window and log in with the new password.

---

## Notes

- `PUBLISH_SECRET` rotation has a coordination cost (frontend push required). Do it during low-traffic hours if possible.
- The frontend source is a public GitHub repo — never log or display the token in any commit message or PR description.
- Both secrets are managed via Wrangler; there is no Cloudflare dashboard UI for viewing secret values.
