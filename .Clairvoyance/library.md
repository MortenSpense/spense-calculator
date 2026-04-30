# Workspace Knowledge Library

> This is a living document. Staff should keep it up to date as they learn more about this workspace.
> If a `CLAUDE.md` or `agents.md` file exists in the workspace root, read it for additional project-level guidance.

## Documents

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [project-overview.md](Docs/project-overview.md) | Plain-language project overview, current sprint status, product workflow, and review gaps | 2026-04-29 |
| [architecture.md](Docs/architecture.md) | Backend architecture, Worker responsibilities, data model, security model, and operations | 2026-04-29 |
| [calculator-product-history.md](Docs/calculator-product-history.md) | Frontend product history, version milestones, design decisions | 2026-04-22 |
| [project-history-and-decisions.md](Docs/project-history-and-decisions.md) | Project history, product decisions, validated assumptions | 2026-04-22 |
| [roadmap-ideas.md](Docs/roadmap-ideas.md) | Future roadmap ideas: lead-gen calculator (in design), rep management, quote tool, company migration | 2026-04-29 |
| [staff-working-notes.md](Docs/staff-working-notes.md) | Working discipline for staff: update docs after verification and leave handoff notes | 2026-04-22 |
| [haalee-handoff-2026-04-22.md](Docs/haalee-handoff-2026-04-22.md) | Re-entry handoff for Haalee after provider limit | 2026-04-22 |
| [haalee-handoff-2026-04-29.md](Docs/haalee-handoff-2026-04-29.md) | Lead-gen design session + pricing correction recap | 2026-04-29 |
| [secret-rotation-runbook.md](Docs/secret-rotation-runbook.md) | Step-by-step runbook for rotating PUBLISH_SECRET and DASHBOARD_PASSWORD | 2026-04-23 |
| [company-managed-infrastructure-migration.md](Docs/company-managed-infrastructure-migration.md) | Plan for migrating from Morten-owned infra to company accounts | 2026-04-23 |

## Quick Reference

- **Repo (monorepo, since 2026-04-30):** `spense-calculator` — frontend + backend in one place
- **Live URLs:**
  - Rep-facing calculator: `https://mortenspense.github.io/spense-calculator/`
  - Prospect URLs: `https://spense-roi.results-calc.workers.dev/{slug}`
  - Lead-gen URLs (planned): `https://spense-roi.results-calc.workers.dev/lg/{slug}`
  - Publish endpoint: `https://spense-publish.results-calc.workers.dev/publish`
  - Dashboard: `https://spense-dashboard.results-calc.workers.dev/`
- **Stack:** static HTML (frontend) + Cloudflare Workers + R2 (backend)
- **Workers:** `publish/`, `tracker/`, `dashboard/`, soon `hubspot/` (lead-gen)

## Project Structure (since 2026-04-30 monorepo move)

`spense-calculator` is now a **single repo** containing both the rep-facing calculator HTML and all Cloudflare Workers. Previously the frontend was here and backend lived in a separate ungit `/Users/morten_spense/spense-backend` directory.

- Top-level: `index.html` (frontend), `README.md`, four worker directories
- Frontend deploys via GitHub Pages on push to `main`
- Backend deploys via `wrangler deploy` from each worker subdirectory
- Todos and sprints managed in Clairvoyance, not split across workspaces

## Important Rules

- Monetary fields must remain number inputs only — never reintroduce sliders (rounding/snap bugs)
- `PUBLISH_SECRET` value is embedded in the public frontend source — accepted tradeoff, rotation runbook exists
- Don't mark todos `done` without explicit user approval — use `ready_for_review`
- Dashboard auth is login form + secure cookie, NOT HTTP Basic Auth
- `/Users/morten_spense/Downloads/spense-calculator` is stale — ignore it
- All seven existing markets had pricing corrections on 2026-04-29; pricing is now validated against actual Spense rate sheets

## Current Verified State (2026-04-30)

- Three workers deployed and live: `publish` (`spense-publish`), `tracker` (`spense-roi`), `dashboard` (`spense-dashboard`)
- 8 markets supported in rep-facing calculator: Norway, Denmark, Sweden (added 2026-04-29 for Claus's start), Benelux, Germany, Switzerland, Italy, UK
- Pricing matrix corrected and live (commit `0aa878d`)
- Sweden support live (commit `025cbd1`)
- Lead-gen calculator design phase complete; build phase pending Helion's HubSpot setup
- R2 90-day lifecycle active
- No off-site R2 backup yet — roadmap todo `todo-1777280939474-mep4t2`
- Active sprint: Roadmap (`sprint-1776860000000-road01`)

## Recent Discoveries

- 2026-04-30: Monorepo consolidation — backend code merged into the calculator repo. `spense-backend/` is now redundant.
- 2026-04-29: All seven existing market presets had material pricing bugs; corrected to validated values. Sweden added ahead of Claus Persson's start (2026-05-04).
- 2026-04-29: Lead-gen direction decided — dedicated result page (Option B), not pre-filled rep tool. HubSpot landing page + Framer-as-CMS.
- 2026-04-22: Frontend is the authoritative sales calculator. Prospect copies preserve active view and lock Spense pricing as read-only.
