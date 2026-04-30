# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spense backend — a Cloudflare Workers + R2 backend for the [Spense ROI calculator](https://mortenspense.github.io/spense-calculator/). Sales reps publish prospect-specific calculator URLs from the frontend without manual file management. No database; all state lives in R2 object metadata.

## Stack

- **Runtime**: Cloudflare Workers (V8 isolates, not Node.js)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **CLI**: Wrangler (`npx wrangler` or `wrangler` if globally installed)
- **Config**: `wrangler.toml` per worker

## Common Commands

```bash
# Develop locally (starts a local Worker + R2 simulation)
wrangler dev

# Deploy to Cloudflare
wrangler deploy

# Tail live logs from a deployed worker
wrangler tail

# Run tests (Vitest with Workers pool)
npx vitest

# Run a single test file
npx vitest src/publish.test.ts
```

## Architecture

Three workers, each with its own `wrangler.toml`:

### 1. `publish` worker
- Receives `POST /publish` from the calculator frontend with a JSON body containing the configured HTML payload and a `prospectSlug`.
- Requires `Authorization: Bearer {PUBLISH_SECRET}`.
- Rejects payloads over 5MB.
- Checks for slug conflicts and returns 409 unless `force: true` is set.
- Writes the HTML to R2 at key `slugs/{prospectSlug}.html` with metadata: `createdAt`, `publishedBy`, `prospectName`.
- Returns the tracker worker URL for the prospect.

### 2. `tracker` worker (`spense-roi`)
- Serves the HTML from R2 when a prospect visits their URL.
- On each visit: increments `visitCount`, updates `lastVisitedAt` in R2 metadata.
- Reads `request.cf.country` and appends `{ timestamp, country }` to `visits/{slug}.json` (fire-and-forget via `waitUntil`).
- Fires Slack webhook on visit #1 and #2 only. Message includes prospect name, visit number, and country flag emoji.
- R2 metadata is the primary visit record. `visits/{slug}.json` is the per-prospect visit log.

### 3. `dashboard` worker
- Password-protected internal management UI at `https://spense-dashboard.results-calc.workers.dev/`.
- Uses login form + session token cookie. Token stored in KV with 8-hour TTL. Brute-force lockout after 5 failed attempts (15 min).
- Lists all published prospects with visit counts. Visit count is clickable — expands inline visit history with country flag and timestamp.
- Audit log section shows last 20 delete/overwrite events.
- Sales Rep management: add/delete reps stored in R2 `config/reps.json`. Public `/api/reps` endpoint feeds the frontend publish modal.
- Hard-deletes prospect HTML and visit log from R2 on delete. Writes audit log entry.

## Key Design Decisions

- **No database**: All state (publish time, visit count, publisher identity) is stored as R2 custom metadata on the HTML object itself. Metadata updates require a metadata-only copy operation (`copyObject`) since R2 does not support in-place metadata edits.
- **Slug as primary key**: `prospectSlug` (URL-safe, lowercase, hyphenated) is the only identifier. Collisions overwrite silently.
- **CORS**: The `publish` worker must return permissive CORS headers so the GitHub Pages frontend (`mortenspense.github.io`) can POST to it.
- **Public read**: R2 bucket must have public access enabled (or the `tracker` worker serves objects) — pick one approach and stay consistent.

## Environment / Secrets

Secrets are set via `wrangler secret put`, never committed:

| Secret | Used by | Purpose |
|---|---|---|
| `PUBLISH_SECRET` | publish | Bearer token required by the frontend to publish |
| `SLACK_WEBHOOK_URL` | tracker | Incoming webhook URL for visit notifications |
| `DASHBOARD_PASSWORD` | dashboard | Shared password for the internal dashboard login |

R2 bucket binding is declared in `wrangler.toml` (e.g., `binding = "BUCKET"`).
