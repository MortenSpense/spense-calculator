# Haalee — Personal Staff Memory

> Last updated: 2026-04-29

## Working Style Notes

- Morten is non-technical but architecturally sharp. He will catch logical inconsistencies in the product model fast.
- He doesn't need explanation of what the code does — he needs to understand what to *do next* in plain English.
- He communicates directly and concisely. Match that energy; don't over-explain.
- He gives strong product opinions and pushes back confidently ("this deserves a v3.0"). Take his product instincts seriously.

## Project Context I've Built Up

The Spense calculator project spans two local repos:
- Backend: `/Users/morten_spense/spense-backend` (this repo) — **primary home for todos and sprints**
- Frontend: `/Users/morten_spense/spense-calculator` — frontend-specific memory only, no separate planning

They are one product. Tasks that touch both repos get one todo here, not one in each. Frontend deploys via GitHub Pages push; backend deploys via `npx wrangler deploy` per worker.

## Things To Watch Out For

- Never re-introduce sliders on monetary fields. This was a deliberate fix for snapping/rounding bugs.
- Never expose the `PUBLISH_SECRET` value in docs, chat, or screenshots — it's embedded in the frontend HTML.
- Don't mark todos `done` without Morten explicitly saying so. Use `ready_for_review`.
- The `dashboard` worker uses login-form + cookie auth — NOT HTTP Basic Auth. Don't suggest reverting it.
- `/Users/morten_spense/Downloads/spense-calculator` is stale — ignore it.

## Session History Notes

- 2026-04-22: Full day building Phase 3 (dashboard), security hardening (PUBLISH_SECRET, size limit, slug overwrite), and rep dropdown. All deployed. Hit a provider rate limit; Quinn stepped in and captured project context.
- 2026-04-23: Security sprint completed — constant-time comparison (publish + dashboard), PUBLISH_SECRET rotation (both worker secret AND frontend token — first attempt missed the worker side), dashboard session tokens + brute-force lockout, audit log for deletes/overwrites, secret rotation runbook. Roadmap: Sales Rep Management shipped (dashboard UI + R2 storage + public `/api/reps` endpoint + frontend dynamic dropdown). Payback period display bug fixed (`< 1 mo` instead of `0 mo`). Tracker worker renamed `spense-tracker` → `spense-roi`; Cloudflare account subdomain changed `morten-olsson` → `results-calc` (Quinn did subdomain change while I was rate-limited). All prospect URLs now `spense-roi.results-calc.workers.dev/{slug}`. New roadmap todo added by Quinn: Dashboard Pagination & Search.
- 2026-04-29: Big lead-gen design day. Morten pushed back early ("read the project documentation first") — caught a real inconsistency: I had drafted Option A in `For_Helion.md` (pre-fill rep tool with form values) when the roadmap explicitly argued for Option B (dedicated result page). Lesson re-learned: **read the project's own docs before drafting solutions**, especially in a project where Morten has put real thought into the strategic direction. Decisions locked: Option B confirmed, Wireloom mockup approved (note "Lead-Gen Calculator Mockup"), HubSpot landing page + Framer-as-CMS hosting model confirmed, bearer token auth, market dropdown locked, Pattern A rep routing. Side-quest: discovered Denmark's transaction fee was 10× actual (0.5% vs 0.05%) and EUR/CH/UK/NO presets were also wrong against real Spense pricing. Patched (commit `0aa878d`) and logged a separate todo for the full native-currency refactor (`todo-1777462527726-7l2efz`) which will also add SMS + Personalised URL line items as hidden defaults. Sweden added to rep-facing calculator (commit `025cbd1`) ahead of Claus Persson's start on 2026-05-04. Full session recap: `.clairvoyance/Docs/haalee-handoff-2026-04-29.md`. Lead-gen design doc with all open items: Clairvoyance note "Lead-Gen Data Flow Design".

## Notes To Future Me

- The lead-gen calculator is **its own product**, not a stripped-down rep tool. The roadmap was clear about this and I missed it on first pass. If anyone (including future me) ever proposes "just pre-fill the rep tool with form values", that's the wrong answer. Read `roadmap-ideas.md` and the Wireloom mockup before pushing back on the dedicated-page direction.
- Reading the *existing* canonical pricing in code is not the same as confirming it's *correct*. The 10× Denmark txf bug had been there silently. When pricing matters, ask Morten for the source-of-truth values, don't trust what's in the code.
- Morten distinguishes between "design source-of-truth in repo/Clairvoyance" (markdown, iterative) and "polished external doc" (Word, via Claude.ai). I shouldn't try to do the polished version myself when the source-of-truth lives in markdown.
- When Morten says "this is annoying me" about something in the product — that's an invitation to estimate effort, not a request to fix it immediately. Estimate first, then he'll decide scope/priority.
