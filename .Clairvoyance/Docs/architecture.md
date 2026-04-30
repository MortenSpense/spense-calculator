# Spense Backend Architecture

> Last updated: 2026-04-28
> Author: Haalee
> Source: Current source files and verified deployment state.

## Plain-Language Model

Three small Cloudflare services share one R2 storage bucket:

- **Publish** creates a prospect-specific calculator page.
- **Tracker** (named `spense-roi`) serves that page, records visits with country, and notifies Slack on the first two visits.
- **Dashboard** lets the internal team manage prospects, view visit history, and manage the rep list.

There is no central database. The saved calculator file and its attached metadata are the system of record.

## Infrastructure

| Piece | Details |
|---|---|
| Runtime | Cloudflare Workers |
| Storage | Cloudflare R2 (`spense-calculator` bucket) |
| Session/auth state | Cloudflare KV (`e8712cc98c0744118082be9a8c2d79e2`) |
| Cloudflare account ID | `dc361af4342ed66e4fca1631388936e0` |
| Account workers.dev subdomain | `results-calc` |
| Deployment tool | Wrangler (`npx wrangler deploy` per worker) |
| Secrets | Set with `wrangler secret put`, never committed |
| Frontend repo | Local: `/Users/morten_spense/spense-calculator`, remote: `github.com/MortenSpense/spense-calculator` |

## Worker Responsibilities

### Publish Worker

Location: `publish/`
Endpoint: `https://spense-publish.results-calc.workers.dev/publish`

- Accepts `POST /publish` from the calculator frontend.
- Requires `Authorization: Bearer {PUBLISH_SECRET}` — compared with constant-time equality to prevent timing attacks.
- Rejects payloads over 5MB.
- Validates slug format (`[a-z0-9-]+`).
- Returns `409` on slug conflict unless `force: true` is included.
- Writes `slugs/{prospectSlug}.html` with metadata: `createdAt`, `publishedBy`, `prospectName`.
- On force-overwrite: writes an audit log entry to `logs/`.
- Returns the Tracker Worker URL for the prospect.
- CORS restricted to `https://mortenspense.github.io`.

### Tracker Worker

Location: `tracker/`
Endpoint pattern: `https://spense-roi.results-calc.workers.dev/{slug}`

- Serves `slugs/{slug}.html` from R2.
- Increments `visitCount` and updates `lastVisitedAt` in R2 object metadata.
- Reads `request.cf.country` (Cloudflare-provided ISO country code, e.g. `CH`, `NO`).
- Appends `{ timestamp, country }` to `visits/{slug}.json` (fire-and-forget via `waitUntil`).
- Fires Slack webhook **only on visit #1 and #2**. Message includes prospect name, visit number, and country flag emoji.
- R2 has no in-place metadata edit — tracker reads the HTML body and rewrites the object with updated metadata.

### Dashboard Worker

Location: `dashboard/`
Endpoint: `https://spense-dashboard.results-calc.workers.dev/`

**Authentication:**
- Login form + `HttpOnly; Secure; SameSite=Strict` session cookie.
- On login: generates a UUID token, stores it in KV with 8-hour TTL.
- Brute-force protection: 5 failed attempts triggers a 15-minute IP lockout stored in KV.
- Passwords compared with constant-time equality.

**Protected routes (require session cookie):**
- `GET /` — lists all prospects, recent audit log (last 20 entries), and current rep list.
- `GET /visits/{slug}` — returns full visit history for a prospect as JSON.
- `POST /delete` — deletes `slugs/{slug}.html` and `visits/{slug}.json`, writes a delete audit log entry.
- `POST /reps/add` — adds a rep to `config/reps.json`.
- `POST /reps/delete` — removes a rep from `config/reps.json`.
- `POST /logout` — invalidates session token in KV.

**Public routes (no auth):**
- `GET /api/reps` — returns active rep list as JSON. CORS restricted to `https://mortenspense.github.io`. Used by the frontend publish modal to populate the rep dropdown dynamically.
- `OPTIONS /api/reps` — CORS preflight.

## Data Model

### R2 Object Keys

| Key pattern | Contents | Metadata fields |
|---|---|---|
| `slugs/{slug}.html` | Prospect calculator HTML | `createdAt`, `publishedBy`, `prospectName`, `visitCount`, `lastVisitedAt` |
| `visits/{slug}.json` | Array of `{ timestamp, country }` — max 100 entries | — |
| `logs/{ts}-{action}-{slug}.json` | Audit log entry (JSON body + customMetadata) | `action`, `slug`, `prospectName`, `performedBy`, `timestamp`, `previousProspectName?` |
| `config/reps.json` | `{ reps: [{ id, name }] }` | — |

Audit log `action` values: `"delete"`, `"overwrite"`.

### KV Keys

| Key pattern | Value | TTL |
|---|---|---|
| `session:{uuid}` | `"1"` | 8 hours |
| `login_fail:{ip}` | Failure count string | 15 minutes |
| `lockout:{ip}` | `"1"` | 15 minutes |

### R2 Lifecycle

90-day delete rule configured in Cloudflare dashboard for the `spense-calculator` bucket. Objects older than 90 days are automatically removed.

## Security Model

| Layer | Protection |
|---|---|
| Publish auth | PUBLISH_SECRET bearer token, constant-time comparison |
| Publish input | 5MB size limit, slug format validation, overwrite protection |
| Dashboard auth | Session tokens in KV (not password-in-cookie), 8-hour TTL |
| Dashboard brute-force | 5 failures → 15-minute IP lockout |
| Dashboard cookies | HttpOnly, Secure, SameSite=Strict |
| Secret comparison | `crypto.subtle.timingSafeEqual` used everywhere |
| Rep list API | Public but read-only, CORS-restricted to GitHub Pages |

**Known limitations:**
- PUBLISH_SECRET is embedded in the public GitHub Pages frontend source — visible to anyone who can inspect the page. Accepted tradeoff for a small internal tool. Rotation runbook: `.clairvoyance/Docs/secret-rotation-runbook.md`.
- Dashboard uses a shared password, not named user accounts.
- Tracker is public by design (prospects need access). Rate limiting is a won't-fix on free tier.
- No off-site backups — R2 bucket is the only copy of prospect data. Tracked in roadmap todo `todo-1777280939474-mep4t2`.

## Operational Commands

```bash
# Deploy individual workers
cd publish && npx wrangler deploy
cd tracker && npx wrangler deploy
cd dashboard && npx wrangler deploy

# Set/rotate secrets
cd publish  && npx wrangler secret put PUBLISH_SECRET
cd tracker  && npx wrangler secret put SLACK_WEBHOOK_URL
cd dashboard && npx wrangler secret put DASHBOARD_PASSWORD
```

Full rotation procedure: `.clairvoyance/Docs/secret-rotation-runbook.md`

## Planned: HubSpot Lead-Gen Worker

A fourth worker is on the roadmap (todo `todo-1776860000003-lead01`). Not yet implemented; documenting here so the architecture story stays whole.

**Purpose:** Self-serve inbound flow — a prospect fills a HubSpot form (HubSpot landing page, Framer-authored content), and the backend produces a personalised result page that HubSpot then emails to them.

**Worker:** `spense-hubspot` at `https://spense-hubspot.results-calc.workers.dev/`.

**Flow:**
1. HubSpot form submission triggers a webhook to the worker.
2. Worker verifies the HubSpot signature (no unauthenticated writes).
3. Worker computes savings from form values + market preset, renders a result-page HTML template, and writes it to R2 at `leadgen/{slug}.html`.
4. Worker calls the HubSpot Properties API to write the page URL to the contact's `spense_calculator_url` property.
5. A HubSpot workflow (Helion-built) detects the property change and sends the prospect an email with the URL.
6. The tracker worker serves `leadgen/{slug}.html` at `https://spense-roi.results-calc.workers.dev/lg/{slug}` — same visit tracking, Slack notifications, and dashboard visibility as rep-published URLs.

**Page experience:** dedicated read-only result page (hero savings number, echoed form values, annual + 5-year case, CTA). Not the rep-facing calculator with values pre-filled — see Clairvoyance note **Lead-Gen Calculator Mockup** and `For_Helion.md` for full design.

**Planned R2 additions:**

| Key pattern | Contents | Metadata fields |
|---|---|---|
| `leadgen/{slug}.html` | Lead-gen result page HTML | `createdAt`, `prospectName`, `email`, `leadSource: "self_serve"`, `visitCount`, `lastVisitedAt` |

**Planned secrets:**

| Secret | Used by | Purpose |
|---|---|---|
| `HUBSPOT_WEBHOOK_SECRET` | hubspot | Verify incoming HubSpot webhook signatures |
| `HUBSPOT_API_TOKEN` | hubspot | Private app token for writing back to the contact's `spense_calculator_url` property |

**Slug pattern:** `lg-{shortid}` (e.g., `lg-7k3p2`) so lead-gen URLs are visually distinguishable from rep-published slugs (`acme-motors`).

## Resolved Questions

- R2 lifecycle expiry: **configured** — 90-day delete rule active in Cloudflare dashboard.
- Audit log: **implemented** — delete and overwrite events written to `logs/` in R2.
- Dashboard auth: **login form + secure cookie** is the final implementation (not HTTP Basic Auth).
- Session security: **session tokens in KV**, not password-in-cookie.
- Constant-time comparison: **implemented** in both publish and dashboard workers.
- PUBLISH_SECRET: **rotated** 2026-04-23 after exposure in public GitHub repo.
- Tracker worker name: renamed from `spense-tracker` to `spense-roi` to remove the word "tracker" from customer-facing URLs.
- Account subdomain: changed from `morten-olsson` to `results-calc`.
- Tracker rate limiting: **won't fix** — free-tier Cloudflare does not support it. Noted for company infrastructure migration.
