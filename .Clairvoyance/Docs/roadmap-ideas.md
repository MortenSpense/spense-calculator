# Spense Calculator Roadmap Ideas

> Last updated: 2026-04-22
> Author: Quinn
> Source: Morten's future-ideas brain dump.

## Purpose

This note captures early roadmap ideas for the Spense calculator and publishing platform. These are not commitments or approved scope. Treat them as a parking lot for future planning.

## Very Short Term

### Remove Or De-Emphasize Save Assumptions

Now that reps can publish prospect-specific URLs, the **Save assumptions** button may no longer be needed in the main workflow.

Possible options:

- Remove it entirely.
- Move it to a secondary/advanced menu.
- Keep it temporarily as a fallback until the publish flow is field-proven.

Reasoning: the hosted URL workflow is cleaner, more professional, and avoids emailing HTML files.

## Short Term

### Lead-Generation Self-Serve Result Page

Self-serve, inbound-marketing version of the calculator for Spense's marketing site.

**Hosting model (confirmed 2026-04-29):** HubSpot landing page, with Framer used as the CMS for content authoring. The form on the page is a HubSpot form, so contact creation and follow-up email both stay native to HubSpot.

**Direction (decided 2026-04-29 — Option B):** Build a **dedicated result page**, not a pre-filled mode of the rep-facing sales tool. The prospect fills out the HubSpot form, the backend computes their numbers and hosts a personalised result page, HubSpot emails them the link.

Characteristics:

- read-only result page (no inputs, no sliders, no tabs)
- hero savings number, echoed form values, annual + 5-year case, single CTA
- aftersales-only by default (no Car Sales/Combined view in the lead-gen experience)
- email gating happens via the HubSpot form, before the result page is generated

Reasoning for separating from the rep-facing tool: an inbound prospect has no rep present to explain inputs, and letting them tweak inputs is mostly a path to making the savings number smaller. Marketing-qualified prospects need a credible number and a CTA, not an exploration tool.

Active todo: `todo-1776860000003-lead01` — *Lead-Gen Calculator — Self-Serve Result Page*.
Mockup: Clairvoyance note **Lead-Gen Calculator Mockup**.
Handover doc for Helion: `For_Helion.md` in this repo.

### Management Dashboard: Add Sales Reps

Management Dashboard should support adding/editing sales reps.

This should populate the rep dropdown used when publishing prospect URLs.

Open design question:

- Should the frontend fetch the rep list from the backend at runtime?
- Or should the dashboard generate/update a static config used by the calculator?

This would remove the need to edit `index.html` whenever a rep joins or leaves.

## Mid Term

### From ROI Calculator To Quote Tool

Early idea: evolve the calculator into a quote tool for Spense.

Possible direction:

- preserve the ROI/business-case layer
- add a pricing/proposal layer
- generate quote-ready packages
- potentially support approval workflows or discount boundaries
- produce a prospect-facing proposal document or link

Key caution: quote tooling touches pricing governance, approvals, and potentially CRM/process ownership. This should be scoped with sales leadership and possibly tech/ops before building.

## Long Term

### Move From Morten's Personal Accounts To Company-Managed Infrastructure

Current setup uses Morten-owned GitHub/Cloudflare infrastructure.

Long-term target:

- company-managed GitHub organization/repository
- company-managed Cloudflare account
- secrets owned by company admins
- documented deployment process
- access control for Spense staff
- handoff path for tech team ownership

Reasoning: the project is becoming operational sales infrastructure, not just a personal prototype.

## Notes

The current architecture should be kept portable:

- frontend remains static and easy to move
- Cloudflare Worker code should avoid personal-account assumptions where possible
- Worker URLs should remain configurable
- R2 data model should be simple enough to migrate later
