# Haalee Handoff: 2026-04-29 Session Recap

> Last updated: 2026-04-29
> Author: Haalee
> Audience: Future Haalee + Morten

## Why This Exists

Long working session today across two threads (lead-gen calculator design + a pricing-correctness side-quest). Morten asked for a full write-up so we can pick up cleanly tomorrow. This is the canonical record of what changed, what's decided, and what's still open.

## Headline Summary

Two things happened today:

1. **Lead-gen calculator design moved from "let's build it" to "here's how we'll build it"** — direction confirmed (Option B: dedicated result page, not pre-filled rep tool), Wireloom mockup approved, comprehensive data-flow design doc written, two of the six big design decisions locked.
2. **Pricing correctness diversion** — discovered that the rep-facing calculator's market presets had several substantively wrong values (most damagingly: Denmark's transaction fee was 10× actual). Patched in production. Logged a separate todo for the full native-currency refactor including the SMS + Personalised URL line items.

Plus: Sweden support added to the rep-facing calculator ahead of Claus Persson's start on 2026-05-04.

## Decisions Locked Today

### Lead-gen calculator
1. **Approach** — Option B: dedicated read-only result page. Hero savings number, echoed inputs, single CTA. Aftersales-only. *Not* a pre-filled mode of the rep-facing tool.
2. **Hosting model** — HubSpot landing page, Framer used as CMS for content authoring. The form on the page is a HubSpot form (so contact creation is native).
3. **Auth** — bearer token in `Authorization: Bearer {HUBSPOT_WEBHOOK_SECRET}` header. Workflow → Webhook in HubSpot. Same pattern as `PUBLISH_SECRET`. (HMAC was the alternative; ruled out as more setup than the trust boundary needs.)
4. **Markets supported** — locked dropdown: NO, DK, SE, GER, UK, BE, NL, LUX, IT, CH, "Other EUR market". BE/NL/LUX are separate dropdown values for prospect familiarity but map to the same `benelux` preset.
5. **Rep routing** — Pattern A: worker assigns the rep at page-generation time, mapping lives in extended `config/reps.json`. New per-rep fields: `markets: string[]` and `meetingUrl: string`. Rep gets baked into the page CTA.

### Pricing
6. **Pricing matrix validated for all 7 existing markets** in their native currencies. Confirmed material bugs in current presets (Denmark txf, EUR markets, Norway, CH, UK).
7. **Sweden pricing** — converted from DKK using 12-month average rate (1.4651 SEK/DKK), rounded to clean SEK numbers, transaction fee set to 0.10% (between DK 0.05% and EUR 0.20%).
8. **SMS + Personalised URL fees** — to be added to the calculator as hidden defaults (toggleable in advanced section, on by default). Combined ~EUR 35-50/loc/month so they don't materially shift ROI but are real fees and shouldn't be omitted. Deferred to the full native-currency refactor.

## Code Changes Shipped Today

### `spense-calculator` repo (GitHub Pages)

| Commit | What | Why |
| --- | --- | --- |
| `0aa878d` | Pricing-correctness patch — corrected DK txf (10× overstatement), EUR markets license/txf/terminal/onboarding, Norway terminal/license/csLic/onboarding, CH/UK license/terminal/onboarding | Pitches were going out with materially wrong Spense fees. Quick fix using existing EUR-pivot model. Full refactor still pending. |
| `025cbd1` | Added Sweden market preset with full SEK pricing | Claus Persson starts 2026-05-04 working the Swedish market. |

Both pushed to `main` and live on GitHub Pages.

### `spense-backend` repo (not under git yet)

No code changes today. The HubSpot worker is still in design phase.

## Documentation Changes

### Updated (existing)
- `.clairvoyance/Docs/roadmap-ideas.md` — Lead-gen section rewritten with Option B direction, hosting model, link to mockup + active todo.
- `.clairvoyance/Docs/architecture.md` — added "Planned: HubSpot Lead-Gen Worker" section (worker URL, flow, planned R2 keys, planned secrets, slug pattern).
- `.clairvoyance/Docs/project-overview.md` — sprint table updated (Lead-Gen Calculator priority bumped to High, status "In Design"); Sweden added to supported markets line.
- `For_Helion.md` — fixed stale `morten-olsson.workers.dev` URL → `results-calc.workers.dev`. Replaced "full calculator pre-filled" section with dedicated result-page description. Added Sweden to markets table. Added explicit URL patterns for self-serve (`/lg/{slug}`) vs rep-published (`/{slug}`).

### Created (new)
- Clairvoyance note **Lead-Gen Calculator Mockup** — Wireloom layout for the result page (saved earlier in session, reviewed and approved by Morten).
- Clairvoyance note **Lead-Gen Data Flow Design** — comprehensive design doc for the `spense-hubspot` worker. Covers: end-to-end flow, webhook auth, payload shape, market resolution, the math (lifted from rep tool), render pipeline, write-back to HubSpot, idempotency, all seven failure modes, CTA / rep routing (Pattern A locked), and what we need from Helion.

## Todos

### Active in Roadmap Sprint (`sprint-1776860000000-road01`)

| ID | Title | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| `todo-1776860000003-lead01` | Lead-Gen Calculator — Self-Serve Result Page | High | todo | Renamed today, story points 2→5, full description rewrite, decision comment added |
| `todo-1777462527726-7l2efz` | Native-Currency Presets + Pricing Correction | High | todo | New today; full pricing matrix + bugs + Sweden comment baked in |
| `todo-1777280939474-mep4t2` | R2 Off-Site Backup Strategy | High | todo | Untouched today |
| `todo-1776951400000-page01` | Dashboard Pagination and Search | High | todo | Untouched today |
| `todo-1776860000005-migr01` | Migrate To Company-Managed Infrastructure | Medium | todo | Untouched today |
| `todo-1776860000004-quote01` | Quote Tool Discovery | Low | todo | Untouched today |

## Open Items For Tomorrow

The lead-gen design doc has six remaining decisions before code can begin. Two locked today (auth, rep-routing pattern). Four still open:

### Pattern A sub-decisions (rep routing)

**A1 — Tiebreaker for multi-rep markets.** Three options:
- Round-robin (recommended) — counter in R2, even distribution
- First match in `reps.json` — simplest
- Manual per-market `primary: true` flag — explicit control

**A2 — Coverage gap fallback.** What if no rep covers the market a prospect picks?
- Hard-coded fallback rep
- Render page without CTA, show "Email us" link instead
- Reject submission, no calculator URL ever generated

**A3 — Initial rep-market mapping.** Need this from Morten before launch:
- Norway → ?  (Lars Vangen Jordet?)
- Denmark → ?  (Morten Olsson?)
- Sweden → Claus Persson ✅
- Benelux → ?
- Germany → ?
- Italy → ?
- Switzerland → ?
- UK → ?
- Other EUR market → ?

Plus the HubSpot meeting URL per rep (`https://meetings.hubspot.com/{handle}`).

### Other open design decisions

**#4 — Chart library.** Inline SVG (recommended, self-contained, no external dependency) vs Chart.js (consistent with rep tool, but adds a CDN dependency).

**#5 — Idempotency hash.** Should we hash form values into R2 metadata so HubSpot retries / prospect resubmissions are detected and don't generate orphaned pages? My recommendation: yes.

**#6 — Slack on every lead-gen submission.** Yes/no? My recommendation: yes, low cost, high signal for the team.

### Then: Helion-side asks (after our design is locked)

- Confirm Workflow → Webhook is the trigger (not subscription webhook).
- Define internal names for custom contact properties: locations, payments/month, admin minutes, market.
- Constrain the form's market dropdown to our supported list.
- Create HubSpot Private App with `crm.objects.contacts.write` scope; share token with us.
- Confirm workflow fires only on form submission (not on every contact creation).

### Then: Build phase

- New worker directory `spense-backend/hubspot/` (wrangler.toml, src/index.ts, src/compute.ts, src/template.ts, src/hubspot.ts, src/markets.ts).
- Update tracker worker to serve `lg/{slug}` from `leadgen/` prefix in R2.
- Update dashboard to surface lead-gen prospects with a `lead_source` distinction.
- Extend dashboard rep-management UI to include `markets` (multi-select) and `meetingUrl` fields per rep.
- End-to-end smoke test with a real HubSpot form submission.

## Deadlines

- **2026-05-04** — Claus Persson starts. Sweden support in rep-facing calculator: ✅ live (commit `025cbd1`). Full lead-gen self-serve pipeline: **not realistic by then** (still in design, Helion has work too). Suggested framing: Claus uses the rep-facing tool from day 1; lead-gen lands when ready.

## Where To Pick Up Tomorrow

Right back at the open lead-gen design decisions. Suggested order:

1. Get Morten's calls on A1, A2, A3 (rep routing details + market mapping).
2. Get his calls on #4, #5, #6.
3. Once everything is locked, draft the message to Helion with concrete asks (form fields, custom property names, workflow setup, Private App).
4. Once Helion confirms internal property names + has the workflow ready to point at us, we're unblocked to build the worker.

The data flow design note (in Clairvoyance notes) is the canonical reference for all of this — keep it updated as decisions land.

## What I Learned About Morten Today

- He pushes back when I make decisions without reading project documentation first. Good push — it caught a Helion-doc inconsistency I had introduced.
- He prefers being walked through tradeoffs before deciding (the auth-approach explanation was a good fit for his style).
- He'll make rapid one-by-one calls when given a clear list of options. The market list, the auth approach, Pattern A — all decided in single replies.
- He spotted the Denmark transaction fee discrepancy ("you are right on Denmark transaction fee, it is actually lower") immediately — he knows the pricing better than the code did.
- He uses Claude.ai for polished Word documents; Clairvoyance / repo docs are for source-of-truth iteration.

## Files To Read When Picking Up

- `.clairvoyance/Docs/architecture.md` — current backend architecture + planned HubSpot worker
- `.clairvoyance/Docs/roadmap-ideas.md` — strategic direction
- `For_Helion.md` (in repo root) — what Helion is being asked to do
- Clairvoyance note **Lead-Gen Data Flow Design** — full worker design + open items
- Clairvoyance note **Lead-Gen Calculator Mockup** — agreed page layout
- Todo `todo-1776860000003-lead01` — lead-gen calculator (current focus)
- Todo `todo-1777462527726-7l2efz` — native-currency refactor (with Sweden pricing comment)
