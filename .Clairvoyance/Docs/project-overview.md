# Spense Calculator Project Overview

> Last updated: 2026-04-28
> Author: Haalee

## Overview

Backend for the Spense ROI calculator. Sales reps use the calculator to configure a prospect-specific ROI analysis, publish it as a hosted URL, and track whether the prospect opens it. The system runs on Cloudflare Workers and R2 with no external database.

## Project Structure

`spense-backend` (this repo) and `spense-calculator` (frontend) are two repos for one product.

- Todos and sprints live here in `spense-backend`.
- Frontend-specific context is in `/Users/morten_spense/spense-calculator/.clairvoyance/`.
- A task touching both repos gets one todo here, not one in each.
- `/Users/morten_spense/Downloads/spense-calculator` is stale — ignore it.

## Live URLs

| URL | Purpose |
|---|---|
| `https://mortenspense.github.io/spense-calculator/` | Rep-facing calculator frontend |
| `https://spense-publish.results-calc.workers.dev/publish` | Publish endpoint |
| `https://spense-roi.results-calc.workers.dev/{slug}` | Prospect-facing calculator URL |
| `https://spense-dashboard.results-calc.workers.dev/` | Internal management dashboard |

## Main Users

- **Sales reps** — configure the calculator and publish prospect URLs.
- **Prospects** — receive and open their calculator URL.
- **Morten / internal team** — use the dashboard for visibility and management.

## Sales Reps (dashboard-managed)

The rep list is stored in R2 (`config/reps.json`) and managed from the dashboard. The frontend publish modal fetches the live list on open. Current reps:

- Lars Vangen Jordet
- Didrik Jarlsby
- Morten Olsson
- Claus Persson

## Product Workflow

1. Rep opens the calculator frontend, selects market and preset.
2. Rep clicks **Publish for prospect**, enters prospect name and selects their own name from the dashboard-managed rep list.
3. Frontend sends configured HTML to the Publish Worker.
4. Publish Worker stores the page at `slugs/{slug}.html` in R2 and returns the Tracker URL.
5. Rep sends the URL to the prospect.
6. When the prospect opens the URL, the Tracker Worker serves the page, records the visit (timestamp + country), and fires a Slack notification for the first two visits.
7. The dashboard shows all published prospects, visit counts, per-prospect visit history with country flags, and a recent activity log.

## Calculator Features (frontend — current state)

- Aftersales, Car Sales, and Combined views.
- Market presets: Norway, Denmark, **Sweden** (added 2026-04-29 for Claus's start on 2026-05-04), Benelux, Germany, Switzerland, Italy, UK.
- Payback period display shows `< 1 mo` for sub-month payback periods.
- **Publish for prospect**: primary distribution action. Locks Spense pricing read-only in the published copy.
- **Export PDF**: secondary action.
- Save Assumptions button: **removed** (2026-04-22). Publish for prospect is the primary workflow.
- Monetary fields are number inputs only — sliders caused rounding/snapping bugs and were removed.

## Sprint Status (as of 2026-04-28)

### Completion Sprint — all done
- Dashboard built and deployed.
- R2 90-day lifecycle expiry configured.
- Rep onboarding materials written (see: `Rep Quick-Start - Spense Calculator.md` in Clairvoyance notes).
- Tracker rate limiting: won't fix on free tier.

### Security Hardening Sprint — all done
- PUBLISH_SECRET rotation (worker secret + frontend token, 2026-04-23).
- Constant-time secret comparison in publish and dashboard workers.
- Dashboard session tokens (UUID in KV, not password-in-cookie).
- Dashboard brute-force lockout (5 attempts → 15 min block).
- Audit log for deletes and overwrites (stored in R2 `logs/`, visible in dashboard).
- Secret rotation runbook written: `.clairvoyance/Docs/secret-rotation-runbook.md`.

### Roadmap Sprint — in progress

| Todo | Priority | Status |
|---|---|---|
| Dashboard Pagination & Search | High | Open |
| R2 Off-Site Backup Strategy | High | Open |
| Lead-Gen Calculator — Self-Serve Result Page | High | In Design |
| Quote Tool Discovery | Low | Open |
| Company Infrastructure Migration | Medium | Open |

## Recent Shipping History

| Date | What shipped |
|---|---|
| 2026-04-22 | Dashboard v1, rep dropdown, slug overwrite protection |
| 2026-04-23 | Security hardening, audit log, PUBLISH_SECRET rotation, rep management (dashboard-managed), payback `< 1 mo` fix, URL rename (`spense-tracker` → `spense-roi`, `morten-olsson` → `results-calc`) |
| 2026-04-27 | Slack fixed (secret missing after rename), visit country tracking, Slack limited to first 2 visits, clickable visit history in dashboard, XSS fix in rep add form |

## Design Notes

- Visual style: clean and minimal. White cards, light grey borders, Spense blue `#3d60f5`.
- Dashboard typography: Montserrat (headings/numbers) + Open Sans (body).
- Icons: professional, understated line-style SVGs.

## Commercial Assumptions

- Aftersales payments are per location, multiplied by location count.
- Denmark aftersales baseline: 229 payments/month/location, 10 minutes per payment.
- Car sales pricing (Denmark): DKK 990/location/month + DKK 30/car sold.
- Car sales ROI is highly sensitive to minutes-per-car. 18 minutes from Hedin Norway is an important validation point.
- PSP fee is modelled on both sides (net-zero impact on savings by default).

## Known Tradeoffs

- No database — R2 metadata is the system of record.
- PUBLISH_SECRET is embedded in the public GitHub Pages frontend (visible to anyone who can inspect source). Accepted tradeoff; rotation runbook exists.
- Shared dashboard password, not named accounts.
- Hard delete from dashboard is permanent (no undo). Audit log captures the event.
- R2 bucket is the only copy of prospect data — no off-site backup yet (roadmap).
- Infrastructure is on Morten's personal Cloudflare and GitHub accounts (company migration is in roadmap).
