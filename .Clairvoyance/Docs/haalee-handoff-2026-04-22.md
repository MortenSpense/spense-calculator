# Haalee Handoff: Spense Calculator

> Last updated: 2026-04-22
> Author: Quinn
> Audience: Haalee

## Why This Exists

You hit a provider limit before you could update all project memory/docs. Morten asked me to infer and capture project state while waiting for your reset.

This is a quick re-entry note so you can resume without reconstructing everything from chat history.

## Current State

The project has moved beyond a standalone calculator. It is now effectively a lightweight prospect-publishing platform:

- frontend calculator hosted on GitHub Pages
- publish Worker stores personalized prospect HTML in R2
- tracker Worker serves prospect URLs and records visits
- dashboard Worker exists for internal management
- Slack notifications have been tested and work

Canonical frontend:

```text
/Users/morten_spense/spense-calculator/index.html
https://mortenspense.github.io/spense-calculator/
```

Backend:

```text
/Users/morten_spense/spense-backend
R2 bucket: spense-calculator
Publish endpoint: https://spense-publish.results-calc.workers.dev/publish
Prospect URL format: https://spense-roi.results-calc.workers.dev/{slug}
Dashboard: https://spense-dashboard.results-calc.workers.dev/
```

## Important Updates Since The Earlier Todos

- Slack notifications are no longer pending. Morten says they were tested and work.
- Frontend is at v3.0 product state: **Publish for prospect** is the main workflow.
- **Save assumptions** may become secondary or be removed/de-emphasized.
- Monetary fields must stay as number inputs only. Do not reintroduce sliders for money fields.
- Prospect-facing saved/published copies should show Spense pricing but make pricing fields read-only.
- ISO country-code badges are intentional; emoji flags broke on Windows.
- The frontend local clone in `/Users/morten_spense/spense-calculator` is authoritative.
- Ignore `/Users/morten_spense/Downloads/spense-calculator` unless Morten says otherwise.

## Docs I Added/Updated

Backend memory/docs:

- `.clairvoyance/Docs/project-overview.md`
- `.clairvoyance/Docs/architecture.md`
- `.clairvoyance/Docs/project-history-and-decisions.md`
- `.clairvoyance/Docs/roadmap-ideas.md`
- `.clairvoyance/Docs/staff-working-notes.md`
- `.clairvoyance/memory/spense-calculator-first-pass.md`
- `.clairvoyance/library.md`

Frontend memory/docs:

- `/Users/morten_spense/spense-calculator/.Clairvoyance/Docs/calculator-product-history.md`
- `/Users/morten_spense/spense-calculator/.Clairvoyance/memory/calculator-current-context.md`
- `/Users/morten_spense/spense-calculator/.Clairvoyance/library.md`

## Roadmap Ideas Morten Mentioned

Very short term:

- Remove or de-emphasize **Save assumptions** now that Publish for prospect exists.

Short term:

- Create a simpler lead-gen version for Spense's Framer site.
- Add **Add user / sales rep** function in the management dashboard, and use that source to populate the publish dropdown.

Mid term:

- Explore evolving the calculator into a quote tool. This is still premature and touches pricing governance.

Long term:

- Migrate from Morten-owned GitHub/Cloudflare accounts to company-managed infrastructure.

## Open Items To Verify

- Test v3.0 publish flow end-to-end from live GitHub Pages if not already done after latest upload.
- Verify slug overwrite flow live.
- Confirm R2 lifecycle expiry is configured for 90 days.
- Confirm tracker rate limiting status/approach.
- Confirm dashboard auth model is the intended one. Earlier todo said Basic Auth; current code uses login form + secure cookie.
- Confirm whether dashboard should keep hard-delete only, or eventually support soft delete/audit trail.
- Update todos/sprint statuses/comments to reflect verified reality. Important: do not mark todos `done` unless Morten explicitly asks; use `ready_for_review` where appropriate.

## Staff Process Note

Please update project memory/docs when implementation or verification changes state. Example: Slack notifications were verified working, but docs still described them as pending.

For this project, update docs before/after major feature work:

- backend `.clairvoyance/Docs/*`
- frontend `.Clairvoyance/Docs/*`
- frontend `README.md` when user-facing workflow changes
- relevant todos/sprint comments

This avoids Morten having to be the human changelog, which is not the best use of a perfectly good Morten.
