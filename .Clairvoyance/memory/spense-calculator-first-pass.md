# Spense Calculator First-Pass Memory

> Last updated: 2026-04-22
> Author: Quinn
> Source: Inferred from sprint/todo records and current backend files. Haalee should review.

## Read This First

This workspace is the backend for the Spense ROI calculator. It uses Cloudflare Workers plus one R2 bucket, `spense-calculator`, to publish prospect-specific calculator pages, track visits, send Slack notifications, and provide an internal dashboard.

Main docs:

- `.clairvoyance/Docs/project-overview.md`
- `.clairvoyance/Docs/architecture.md`
- `.clairvoyance/Docs/project-history-and-decisions.md`
- `.clairvoyance/Docs/roadmap-ideas.md`

Frontend repo:

- Authoritative local clone: `/Users/morten_spense/spense-calculator`
- GitHub: `github.com/MortenSpense/spense-calculator`
- Live URL: `https://mortenspense.github.io/spense-calculator/`
- Canonical file: `index.html`
- Current product state: v3.0 with Publish for prospect.
- Earlier observation: local clone once reported commit `5ba07ab Add slug overwrite protection with confirm dialog`; this is now stale as a status marker.
- `/Users/morten_spense/Downloads/spense-calculator` also exists but Morten says it is probably outdated. Do not use it unless Haalee confirms otherwise.

## Key Mental Model

The system has three Workers:

- `publish/` creates prospect calculator pages in R2.
- `tracker/` serves those pages and records visits.
- `dashboard/` shows internal status and deletes pages.

There is no database. R2 object metadata carries the important state: who published, prospect name, created date, visit count, and last visit.

## Current Work State

Ready for review:

- Publish Worker shared-secret auth.
- Publish Worker 5MB payload limit.
- Management dashboard.
- Rep-name dropdown in frontend.

Still open or needs confirmation:

- 90-day R2 expiry.
- Rep onboarding guide.
- Tracker rate limiting.
- Slack notifications are tested and working; exact setup should be preserved if tracker changes.
- Slug overwrite protection deployment status should be verified live.
- How Haalee is maintaining frontend and backend together as one project across two local project folders.

Roadmap ideas captured:

- Very short term: remove or de-emphasize Save assumptions now that Publish for prospect exists.
- Short term: lead-gen calculator for Framer, and dashboard-managed sales rep list.
- Mid term: explore quote-tool evolution.
- Long term: migrate from Morten personal accounts to company-managed infrastructure.

## Important Caveat

The dashboard todo originally specified HTTP Basic Auth, but the current dashboard code uses a login form and secure cookie. Treat the code as current unless Haalee says otherwise.
