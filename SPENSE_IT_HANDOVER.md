# Spense ROI Calculator — Handover to Spense Internal IT

**From:** Morten Olsson (morten.olsson@gmail.com)
**Date:** 2026-06-19
**Status:** Full operational handover. Project is on pause and ready for IT to take ownership.

---

## 1. Executive summary (read this first)

The Spense ROI Calculator is a small but business-critical sales tool. It is **live and in daily use** by Spense's sales reps (rep-published calculator pages). A second use case — self-serve inbound calculator pages triggered from the marketing site — is **half-built and on pause**.

Everything currently runs on Morten Olsson's personal infrastructure (his GitHub account, his Cloudflare account). The single highest-priority task for IT is **transferring ownership** of both accounts to Spense. Until that happens, the project has a bus-factor of one and any account-level problem is a Spense problem with a personal-account blocker.

**What's live and working today:**

- Rep-facing calculator at https://mortenspense.github.io/spense-calculator/
- Prospect-specific URLs at `https://spense-roi.results-calc.workers.dev/{slug}`
- Internal management dashboard at `https://spense-dashboard.results-calc.workers.dev/`
- Slack notifications on prospect visits
- 90-day automatic cleanup of old prospect pages

**What's half-built:**

- HubSpot lead-gen integration (a 4th Cloudflare Worker, code skeleton only). Architecture pivoted from a HubSpot Workflow trigger to a browser-side trigger after Helion (the marketing agency) flagged that the original design needed an Operations Hub Professional subscription that Spense doesn't have. The revised design is documented in section 7 and is ready to finish.

**What IT inherits:**

1. Two account migrations (GitHub repo + Cloudflare account)
2. One unfinished worker to either finish or delete
3. A relationship with Helion (the marketing agency) to coordinate the HubSpot side
4. A small operational surface (4 workers, 1 R2 bucket, 1 KV namespace, 1 GitHub Pages site)
5. Roadmap items in priority order (section 6)

**Estimated effort to reach "fully owned and operational":** 1–2 developer-days for migrations + 4–6 developer-hours to finish the HubSpot worker once Helion delivers their side. No specialised infrastructure expertise required — anyone comfortable with Cloudflare Workers and basic TypeScript can take this over.

---

## 2. What this project actually is

Spense sells SaaS to automotive dealerships that automates payment reconciliation in aftersales and increasingly car sales. The ROI Calculator quantifies how much time and money a dealership saves by switching from manual payment admin to Spense.

There are **two ways** a prospect ends up looking at a personalised calculator URL:

| Flow | Status | Description |
|---|---|---|
| **1. Rep-published** | **Live** | A sales rep configures the calculator with a prospect's real numbers and clicks "Publish for prospect". Gets a hosted, prospect-named URL to share via email/LinkedIn. |
| **2. Self-serve lead-gen** | **In progress** | A prospect fills out a HubSpot form on the marketing site. The backend auto-generates a personalised, read-only result page and HubSpot emails them the URL. |

Both flows write the URL to the contact's `spense_calculator_url` property in HubSpot. Both flows track when the prospect opens the page and fire Slack notifications.

### Live URLs

| URL | Purpose | Public |
|---|---|---|
| `https://mortenspense.github.io/spense-calculator/` | Rep-facing calculator (the tool reps use) | Yes |
| `https://spense-publish.results-calc.workers.dev/publish` | Internal: receives publish requests from the frontend | Yes (bearer-token protected) |
| `https://spense-roi.results-calc.workers.dev/{slug}` | Prospect-facing URL pattern | Yes |
| `https://spense-dashboard.results-calc.workers.dev/` | Internal management dashboard | Yes (password-protected) |
| `https://spense-hubspot.results-calc.workers.dev/` | Lead-gen webhook target (**not yet deployed**) | Will be public |

### Users

| Group | What they do |
|---|---|
| **Sales reps** (4 people, see section 11) | Use the calculator frontend, publish prospect URLs |
| **Prospects** | Open the URLs the reps send them |
| **Internal Spense team** | Use the dashboard for prospect tracking, rep management |
| **Marketing prospects** (planned) | Will fill out the HubSpot form, receive an auto-generated URL by email |
| **Helion (marketing agency)** | Builds and owns the HubSpot side of the lead-gen flow |

---

## 3. Architecture at a glance

Four Cloudflare Workers, one R2 bucket, one KV namespace, one GitHub Pages site. All share a single Cloudflare account.

### The components

| Component | Type | Role |
|---|---|---|
| Calculator frontend | Static HTML on GitHub Pages | The tool sales reps use to configure prospect-specific ROI cases |
| `publish` worker | Cloudflare Worker | Receives publish requests from the frontend, writes prospect HTML to R2, returns the prospect URL |
| `tracker` worker | Cloudflare Worker | Serves prospect URLs to the public, records visits, fires Slack notifications on visits #1 and #2 |
| `dashboard` worker | Cloudflare Worker | Internal management UI — list/delete prospects, manage reps, view visit history and audit log |
| `hubspot` worker | Cloudflare Worker (**unfinished**) | Will handle the self-serve lead-gen flow. Code skeleton only; not deployed. |
| R2 bucket (`spense-calculator`) | Cloudflare R2 object storage | Single source of truth for all prospect HTML, visit logs, audit log, and rep config |
| KV namespace | Cloudflare KV | Dashboard session tokens and brute-force lockout state |

### The rep-published flow (live today)

1. **Rep** opens the calculator at the GitHub Pages URL and configures inputs for their prospect.
2. **Rep** clicks "Publish for prospect" — the frontend POSTs the configured HTML to the `publish` worker with a bearer token.
3. **`publish` worker** validates the request, writes the HTML to R2 at `slugs/{slug}.html`, and returns the prospect URL.
4. **Rep** sends that URL to the prospect via email or LinkedIn.
5. **Prospect** opens the URL — the `tracker` worker reads the HTML from R2, serves it, and increments the visit count.
6. **`tracker` worker** fires a Slack notification on the first two visits.
7. **Internal team** monitors all prospects, visit counts, and the audit log via the `dashboard` worker.

### The lead-gen flow (planned — full detail in section 7)

1. **Marketing prospect** lands on the HubSpot landing page and submits the form.
2. **HubSpot** creates a contact with the form values.
3. **JavaScript snippet on the page** captures the submission and POSTs the values to the `hubspot` worker.
4. **`hubspot` worker** computes savings, renders a personalised result page, writes it to R2 at `leadgen/{slug}.html`, and writes the URL back to the contact via HubSpot API.
5. **Browser** redirects the prospect to their result URL (also served by the `tracker` worker, under the `/lg/{slug}` path).
6. **HubSpot** sends the standard form follow-up email with the URL embedded.

### Key technical facts

| Fact | Value | Note |
|---|---|---|
| Frontend hosting | GitHub Pages | Static HTML, served from `main` branch automatically |
| Backend runtime | Cloudflare Workers (V8 isolates, not Node.js) | All four workers |
| Backend storage | Cloudflare R2 (`spense-calculator` bucket) | S3-compatible object storage |
| Backend session/auth | Cloudflare KV (`e8712cc98c0744118082be9a8c2d79e2`) | Dashboard sessions, brute-force lockout |
| Cloudflare account ID | `dc361af4342ed66e4fca1631388936e0` | **Personal Cloudflare account — needs migration** |
| Cloudflare subdomain | `results-calc` | This is what appears in all `workers.dev` URLs |
| Source control | `github.com/MortenSpense/spense-calculator` | **Personal GitHub account — needs migration** |
| Local working copy | `/Users/morten_spense/spense-calculator` | On Morten's MacBook |
| R2 retention policy | 90-day automatic delete | Configured in Cloudflare dashboard |
| Deployment tool | Wrangler (`npx wrangler deploy`) | One command per worker, run from worker directory |

---

## 4. Current state of each component

### Live and operational

| Component | Status | Notes |
|---|---|---|
| Frontend (`index.html`) | ✅ Live | Field-tested with Bil i Nord (Norway) and Ejner Hessel (Denmark, 35 locations, ~1,750 cars/month). Used daily by the sales team. |
| `publish` worker | ✅ Live | Last deployed 2026-05-01 |
| `tracker` worker | ✅ Live | Last deployed 2026-05-01. Slack notifications fire on visits #1 and #2 per prospect. |
| `dashboard` worker | ✅ Live | Last deployed 2026-05-01. Password-protected, brute-force protected, audit log active. |
| R2 bucket + KV namespace | ✅ Live | 90-day lifecycle on R2 confirmed |

### Unfinished

| Component | Status | What's missing |
|---|---|---|
| `hubspot` worker | 🟡 Skeleton only | Code is a stub that returns `501 Not Implemented`. The supporting helper files (`compute.ts`, `slug.ts`, `template.ts`, `markets.ts`) are complete and have passing tests, but they are **not wired into the request handler**. Architecture pivoted recently — see section 7. |

### Stale / housekeeping

| Item | Action needed |
|---|---|
| `/Users/morten_spense/spense-backend` on Morten's Mac | Should be deleted — it's an empty shell of the old layout, not under git. The live code is the monorepo at `/Users/morten_spense/spense-calculator`. Confirmed stale on 2026-06-19. |
| `For_Helion.md` in repo root | Was written for the v1 architecture (HubSpot Workflow webhook). The architecture pivoted on 2026-06-19. The relevant content for Helion is now in section 7 of this document. Either update `For_Helion.md` to reflect v2 or delete it and replace with the section 7 content. |

---

## 5. Asset inventory

### GitHub

| Asset | Detail |
|---|---|
| Repo | `github.com/MortenSpense/spense-calculator` |
| Owner | `MortenSpense` (personal GitHub account, owned by Morten Olsson) |
| Branches | `main` only |
| Last commit | `0e8746d` ("Slug computation, HTML template, and sample renders") on 2026-05-01 |
| GitHub Pages | Serves `main` branch contents at `https://mortenspense.github.io/spense-calculator/` |
| Access today | Only Morten has write access |
| **Action required** | Transfer repo to a Spense GitHub Organisation. See section 9. |

### Cloudflare

| Asset | Detail |
|---|---|
| Account | Personal Cloudflare account, owned by Morten Olsson |
| Account ID | `dc361af4342ed66e4fca1631388936e0` |
| `workers.dev` subdomain | `results-calc` |
| Workers deployed | `spense-publish`, `spense-roi`, `spense-dashboard` (and `spense-hubspot` once finished) |
| R2 bucket | `spense-calculator` |
| KV namespace ID | `e8712cc98c0744118082be9a8c2d79e2` |
| Plan | Free tier (workers + R2 + KV all under free-tier limits) |
| **Action required** | Add a Spense-owned email as Super Administrator. See section 9. |

### Secrets currently in use

Listed here for inventory only — **actual secret values will be handed over via 1Password or another secure channel, not in this document**.

| Secret | Worker | Purpose | Set via |
|---|---|---|---|
| `PUBLISH_SECRET` | publish | Frontend auth → publish worker | `npx wrangler secret put PUBLISH_SECRET` |
| `SLACK_WEBHOOK_URL` | tracker | Posts visit notifications to Slack | `npx wrangler secret put SLACK_WEBHOOK_URL` |
| `DASHBOARD_PASSWORD` | dashboard | Login password for the management UI | `npx wrangler secret put DASHBOARD_PASSWORD` |

When the HubSpot worker is finished, four more secrets will be added (see section 7):
`HUBSPOT_API_TOKEN`, `SLACK_WEBHOOK_URL` (same value as tracker), `WORKER_SECRET`, `TURNSTILE_SECRET`.

#### Where the current values live (and why you probably don't need them)

Wrangler secrets are **write-only** — once set, the value can't be read back from Cloudflare. So the current values live wherever they were originally saved.

| Secret | Where to find the current value | If you can't find it |
|---|---|---|
| `PUBLISH_SECRET` | Embedded in `index.html` at line 995 (`const PUBLISH_SECRET_TOKEN = '...'`). Always visible in the public frontend by design. | n/a — always retrievable from source |
| `SLACK_WEBHOOK_URL` | Slack workspace → Apps → Manage → Incoming Webhooks. Or Morten's password manager. | Create a fresh incoming webhook in Slack |
| `DASHBOARD_PASSWORD` | Morten's password manager. Not stored anywhere else. | Just pick a new one |

**Recommended handover approach:** don't try to recover the current values. Once IT has Cloudflare access (P0-1), rotate all three to fresh values IT generates locally (P0-3). This solves both the "where was it saved" problem and the "former-owner knows the secret" problem in one move, and avoids any handover-day coordination of secrets via email or chat.

⚠️ The `PUBLISH_SECRET` rotation has a coordination cost (also requires a frontend push); see section 8. The other two rotate cleanly with a single command each.

### R2 data layout

| R2 key pattern | What's stored | Metadata |
|---|---|---|
| `slugs/{slug}.html` | Rep-published prospect HTML | `createdAt`, `publishedBy`, `prospectName`, `visitCount`, `lastVisitedAt` |
| `leadgen/{slug}.html` (planned) | Lead-gen result pages | `createdAt`, `prospectName`, `email`, `leadSource: "self_serve"`, `hubspotContactId` |
| `visits/{slug}.json` | Append-only visit log per prospect (max 100 entries) | — |
| `logs/{ts}-{action}-{slug}.json` | Audit log entries for delete/overwrite | `action`, `slug`, `prospectName`, `performedBy`, `timestamp` |
| `config/reps.json` | Sales rep list (dashboard-managed) | — |

### KV data layout

| Key pattern | Value | TTL |
|---|---|---|
| `session:{uuid}` | `"1"` | 8 hours |
| `login_fail:{ip}` | failure count | 15 minutes |
| `lockout:{ip}` | `"1"` | 15 minutes |

---

## 6. Prioritized action list

This is the primary deliverable of this document. Items are ordered by what IT should do first.

### 🔴 P0 — Today / this week. Blocks everything else.

| # | Action | Why | Who | Estimate |
|---|---|---|---|---|
| P0-1 | **Receive Cloudflare account access.** Morten invites a Spense-owned email address as Super Administrator (Cloudflare → Manage Account → Members → Invite). Confirm receipt and successful login. | Until IT has Cloudflare access, **you cannot deploy code, rotate secrets, read logs, or respond to incidents.** Single biggest dependency. | IT to provide email; Morten to invite | 30 min total |
| P0-2 | **Receive GitHub repo access.** Morten transfers `github.com/MortenSpense/spense-calculator` to a Spense GitHub Organisation. If the org doesn't exist, create it (free for public repos, ~$4/user/month for private). | Same reason as P0-1 — IT can't ship anything without push access to the repo. Transferring (rather than re-cloning) preserves all history, GitHub Pages URL stays valid. | IT to create/identify org; Morten executes transfer | 30 min |
| P0-3 | **Rotate all three production secrets** (`PUBLISH_SECRET`, `SLACK_WEBHOOK_URL`, `DASHBOARD_PASSWORD`) once Cloudflare access is in place. | Hygiene — even with no reason to distrust Morten, secrets a former owner knows shouldn't stay valid in production. Runbook: section 8. | IT | 30 min (PUBLISH_SECRET rotation requires a small frontend update too) |
| P0-4 | **Identify the Spense IT engineer who will own this project day-to-day.** Add them to the rep list in the dashboard if they need to receive Slack notifications. | Bus factor cleanup. Right now there's an assumption that "IT" owns this collectively; in practice one person should be the named owner. | IT | n/a |

### 🟡 P1 — This month. The lead-gen integration.

Decide whether to finish or kill the HubSpot lead-gen flow. **Recommended: finish it.** It's a small remaining effort and the design is locked.

| # | Action | Why | Who | Estimate |
|---|---|---|---|---|
| P1-1 | **Confirm the HubSpot subscription tier with Helion.** The original architecture assumed Operations Hub Professional; the revised architecture (section 7) avoids that requirement. Confirm with Helion that the revised path is acceptable to them. | Avoid a wasted build cycle. | IT + Helion | 1 day round-trip |
| P1-2 | **Create a Cloudflare Turnstile site** in the Cloudflare dashboard (Cloudflare → Turnstile → Add site). Domain = the HubSpot landing page domain (Helion to confirm). | Provides the abuse-protection token for the browser → worker call. Replaces the bearer token from the v1 design. Free, no quota concerns. | IT | 5 min |
| P1-3 | **Helion delivers their part:** (a) embedded HubSpot form on the landing page, (b) HubSpot Private App token with `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes, (c) custom property internal names. | This is the gating dependency on the external partner. The message to Helion is in section 11. | Helion | 1–2 weeks |
| P1-4 | **Complete the `spense-hubspot` worker** — wire up the four already-built helper files (compute, slug, template, markets) into `index.ts`, add the Turnstile verification, contact lookup, R2 write, HubSpot API call, and Slack notification. Add the hourly catch-up cron. Full spec in section 7. | This is the actual code work. ~4–6 hours for someone comfortable with TypeScript and Cloudflare Workers. | IT engineer | 4–6 hrs |
| P1-5 | **Helion pastes the JavaScript snippet** (in section 7) into the HubSpot page Footer HTML, with the Turnstile site key filled in. | Final integration step before end-to-end testing. | Helion + IT (provide site key) | 15 min |
| P1-6 | **Update `tracker` worker** to serve `/lg/{slug}` routes from the `leadgen/` R2 prefix. | Lead-gen URLs need their own route pattern to be distinguishable from rep-published ones. ~15 lines of code. | IT engineer | 30 min |
| P1-7 | **End-to-end test:** submit the form on the HubSpot landing page, verify a contact is created in HubSpot, a result page exists in R2, the URL is written back to the contact, and the email goes out. | Confirms the integration works. | IT + Helion | 1 hr |

### 🟢 P2 — Within 1–3 months. Hardening.

| # | Action | Why | Who | Estimate |
|---|---|---|---|---|
| P2-1 | **Set up a custom Spense-owned domain** for the prospect-facing URLs (e.g., `roi.spense.io/{slug}`). Currently they're on `spense-roi.results-calc.workers.dev` — functional but unprofessional in customer-facing material. | Removes any visible reference to a personal account hostname. Improves trust with prospects. | IT | 1 hr (Cloudflare custom domain setup) |
| P2-2 | **Set up R2 off-site backup.** Right now the R2 bucket is the only copy of all prospect data. A daily backup to another Cloudflare account, S3, or Backblaze is recommended. | Catastrophic data loss protection. R2 itself is reliable, but a misconfiguration or accidental delete could wipe the bucket with no recovery path. | IT | 2–4 hrs (write a backup worker on a daily cron) |
| P2-3 | **Replace the shared dashboard password with named user accounts** (or OAuth via Google/Microsoft if Spense is on either). | Current model: one password shared among multiple people. No audit of who logged in, no per-user revocation. Acceptable for a small team but should change as more people get access. | IT | 4–8 hrs |
| P2-4 | **Decommission Morten's access** to GitHub repo and Cloudflare account once IT has full ownership and the team has had a few weeks to confirm everything is in their hands. | Removes the bus-factor-of-Morten entirely. | IT | 5 min |

### 🔵 P3 — Backlog. Pre-existing roadmap items, not blocking anything.

| # | Item | Description |
|---|---|---|
| P3-1 | Dashboard pagination & search | The dashboard currently lists all prospects on one page. Fine today (~few dozen entries) but will degrade as the list grows. Plain pagination + search box is sufficient. |
| P3-2 | Visit count → HubSpot | Pipe prospect visit counts back to HubSpot as a contact property so the sales team can see engagement signal in their CRM. |
| P3-3 | Quote tool extension | Evolve the calculator into a quote/proposal tool (long-term commercial idea, not committed). |
| P3-4 | Car-sales lead-gen | The current lead-gen flow is aftersales-only by design. Adding car-sales mode is possible later. |

---

## 7. The HubSpot lead-gen integration (full context)

This is the most complex outstanding piece. The intent is enough detail that an IT engineer who has never seen the project can finish it without further context.

### The goal

A prospect on Spense's marketing site fills out a HubSpot form ("get your personalised savings estimate"). Within seconds, they receive an email with a link to a personalised, read-only result page showing their dealership's projected savings. The page has a "Book a 30-min call" CTA pointing at the right sales rep based on the prospect's market.

### The architectural pivot (important context)

The **original design** (v1) used a HubSpot Workflow with a "Send a webhook" action to trigger the Cloudflare Worker. Helion (the marketing agency) flagged that this action requires **HubSpot Operations Hub Professional** (~€720/mo list price). Spense doesn't have that subscription, and upgrading just for this feature isn't justifiable.

The **revised design** (v2) moves the trigger from a HubSpot Workflow to a JavaScript snippet in the HubSpot landing page itself. The snippet listens for the embedded form's submission event and POSTs the form data directly to the Cloudflare Worker. **This works on any HubSpot tier** that supports embedded forms (i.e., all of them).

### The v2 flow

```
1. Prospect lands on the HubSpot landing page
2. Prospect fills out the embedded HubSpot form and clicks submit
3. HubSpot creates/updates the contact with the form values (unchanged from any normal form)
4. The page's JS snippet listens for HubSpot's onFormSubmitted event,
   captures the form values, gets a Cloudflare Turnstile token for abuse protection,
   and POSTs to the spense-hubspot worker
5. The worker:
   a. Verifies the Turnstile token with Cloudflare's siteverify endpoint
   b. Looks up the just-created contact in HubSpot by email
   c. Computes savings using the prospect's inputs + the market preset
   d. Renders a personalised result-page HTML
   e. Writes it to R2 at leadgen/{slug}.html
   f. PATCHes the contact's spense_calculator_url property via HubSpot Private App
   g. Fires a Slack notification
   h. Returns the result URL to the browser
6. The JS snippet redirects the prospect to their result page
7. HubSpot's standard form follow-up email also carries the URL via
   {{contact.spense_calculator_url}} token — backup delivery path

If anything in step 4-6 fails (browser closes, JS blocked, network error),
the contact still exists in HubSpot but spense_calculator_url is empty.
An hourly catch-up cron in the worker queries HubSpot for contacts with
lead_source=self_serve_calculator AND empty spense_calculator_url AND
created <24h ago, then runs the same compute → write path. The standard
HubSpot follow-up email picks up the populated property and sends the link.
```

### What Helion must deliver

| Item | Notes |
|---|---|
| HubSpot embedded form (not iframe or 3rd-party) on the landing page | Required so the `onFormSubmitted` JS callback fires |
| Custom property internal names | For: locations, payments/month, admin minutes, market. Helion to send the internal names to IT so the worker can read them. |
| Form market dropdown values | Must match: NO, DK, SE, GER, UK, BE, NL, LUX, IT, CH, "Other EUR market" |
| Custom property `lead_source` | Set to `self_serve_calculator` on form submission. Used by the catch-up cron. |
| HubSpot Private App | Scopes: `crm.objects.contacts.read` + `crm.objects.contacts.write`. Token shared securely with IT. |
| Form follow-up email | Standard HubSpot form follow-up (not a Workflow), with `{{contact.spense_calculator_url}}` token embedded |
| Paste the JS snippet | Into the landing page's HubSpot Footer HTML (path: Page editor → Settings → Advanced Options → Additional code snippets → Footer HTML). Snippet provided below. |

### What IT must deliver

| Item | Notes |
|---|---|
| Cloudflare Turnstile site key + secret | Free, set up in Cloudflare dashboard. Share site key with Helion. |
| Finish the `spense-hubspot` worker code | Spec below |
| Add hourly catch-up cron to wrangler.toml | Spec below |
| Update `tracker` worker to serve `/lg/{slug}` route | ~15 lines of code |
| Add `hubspotOwnerId` and `meetingUrl` to each rep in `config/reps.json` | Owner IDs available from HubSpot → Settings → Users & Teams → click user → ID is in the URL |
| Deploy and run end-to-end smoke test | One real form submission, verify email arrives |

### The JavaScript snippet for the HubSpot landing page

This goes into **Page editor → Settings → Advanced Options → Additional code snippets → Footer HTML** on the lead-gen landing page in HubSpot. Helion pastes it.

Two placeholders:
- `TURNSTILE_SITE_KEY_HERE` — Cloudflare Turnstile site key (IT provides)
- The worker URL — already correct, assumes the worker is deployed at `spense-hubspot.results-calc.workers.dev`

```html
<!-- Spense lead-gen result-page integration. Do not modify without checking with Spense IT. -->

<!-- 1. Cloudflare Turnstile (anti-abuse) -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<!-- 2. Invisible Turnstile widget — generates a token on demand -->
<div id="spense-turnstile"
     class="cf-turnstile"
     data-sitekey="TURNSTILE_SITE_KEY_HERE"
     data-size="invisible"
     data-appearance="execute"
     data-action="leadgen_submit"></div>

<!-- 3. Bridge: HubSpot form → Spense worker → redirect -->
<script>
(function () {
  var WORKER_URL = 'https://spense-hubspot.results-calc.workers.dev/';
  var capturedFields = null;
  var capturedFormId = null;
  var capturedPortalId = null;

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'hsFormCallback') return;

    if (event.data.eventName === 'onFormSubmit') {
      var pairs = event.data.data || [];
      capturedFields = {};
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i] && pairs[i].name) {
          capturedFields[pairs[i].name] = pairs[i].value;
        }
      }
      capturedFormId = event.data.id || null;
    }

    if (event.data.eventName === 'onFormSubmitted') {
      capturedPortalId = (event.data.data && event.data.data.portalId) || null;
      sendToWorker();
    }
  });

  function sendToWorker() {
    if (!capturedFields) return;
    if (typeof turnstile === 'undefined') return;

    try {
      turnstile.execute('#spense-turnstile', {
        action: 'leadgen_submit',
        callback: postSubmission,
        'error-callback': function () {}
      });
    } catch (err) {}
  }

  function postSubmission(turnstileToken) {
    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formValues: capturedFields,
        formId: capturedFormId,
        portalId: capturedPortalId,
        turnstileToken: turnstileToken
      })
    })
    .then(function (r) { if (!r.ok) throw new Error('Spense worker ' + r.status); return r.json(); })
    .then(function (data) { if (data && data.url) window.location.href = data.url; })
    .catch(function () { /* catch-up cron handles failures */ });
  }
})();
</script>
```

**Behaviour notes:**
- If anything fails (Turnstile blocked, worker timing out, network blip), the snippet stays silent. HubSpot's standard form thank-you and follow-up email still fire as configured.
- The catch-up cron in the worker picks up the missed contact within the hour and the URL goes out via the standard HubSpot email.
- If form field internal names change, the snippet doesn't need to change — it forwards whatever HubSpot sends, and the worker is the place that knows the property names.

### Worker code spec — finishing `hubspot/src/index.ts`

The current code is a skeleton that returns `501 Not Implemented`. The supporting files (`compute.ts`, `slug.ts`, `template.ts`, `markets.ts`) are complete and have passing tests. The work is wiring them up.

Pseudocode for the finished handler:

```typescript
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const { formValues, turnstileToken } = await request.json();

    // 1. Verify Turnstile
    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${env.TURNSTILE_SECRET}&response=${turnstileToken}`,
    });
    const tsJson = await tsRes.json();
    if (!tsJson.success) return new Response('Turnstile failed', { status: 403 });

    // 2. Look up the contact in HubSpot by email
    const email = formValues.email;
    const contactRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email&properties=email,firstname,lastname,company,hubspot_owner_id,spense_calculator_url`,
      { headers: { Authorization: `Bearer ${env.HUBSPOT_API_TOKEN}` } }
    );
    if (!contactRes.ok) return new Response('Contact not found', { status: 404 });
    const contact = await contactRes.json();

    // 3. Resolve market & compute savings (use existing helpers)
    const market = resolveMarket(formValues.market);
    const savings = compute({
      locations: Number(formValues.locations),
      paymentsPerMonth: Number(formValues.paymentsPerMonth),
      adminMinutesPerPayment: Number(formValues.adminMinutes),
    }, market);

    // 4. Deterministic slug (idempotent)
    const slug = await computeSlug(contact.id, formValues, env.WORKER_SECRET);

    // 5. Resolve rep (HubSpot owner first, then market default)
    const reps = await loadReps(env.BUCKET);  // R2 config/reps.json
    const rep = resolveRep(contact.properties.hubspot_owner_id, formValues.market, reps);

    // 6. Render HTML
    const html = renderResultPage({
      prospect: { firstname: contact.properties.firstname, lastname: contact.properties.lastname, company: contact.properties.company },
      market,
      savings,
      rep,
    });

    // 7. Idempotency: if existing URL matches, no-op
    const existingUrl = contact.properties.spense_calculator_url;
    const newUrl = `https://spense-roi.results-calc.workers.dev/lg/${slug}`;
    if (existingUrl === newUrl) return Response.json({ url: newUrl });

    // 8. Delete old result page if URL is changing
    if (existingUrl) {
      const oldSlug = existingUrl.split('/').pop();
      ctx.waitUntil(env.BUCKET.delete(`leadgen/${oldSlug}.html`));
    }

    // 9. Write new result page
    await env.BUCKET.put(`leadgen/${slug}.html`, html, {
      customMetadata: {
        createdAt: new Date().toISOString(),
        prospectName: contact.properties.company,
        email: contact.properties.email,
        leadSource: 'self_serve',
        hubspotContactId: contact.id,
        assignedRepId: rep.id,
      },
    });

    // 10. PATCH HubSpot
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${env.HUBSPOT_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { spense_calculator_url: newUrl } }),
    });

    // 11. Slack
    ctx.waitUntil(fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🆕 Lead-gen submission: *${contact.properties.company}* (${market.name}) — assigned to ${rep.name} — ${newUrl}`,
      }),
    }));

    return Response.json({ url: newUrl });
  },

  // Hourly catch-up cron
  async scheduled(event, env, ctx) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.HUBSPOT_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: 'lead_source', operator: 'EQ', value: 'self_serve_calculator' },
            { propertyName: 'spense_calculator_url', operator: 'NOT_HAS_PROPERTY' },
            { propertyName: 'createdate', operator: 'GTE', value: since },
          ],
        }],
        properties: ['email', 'firstname', 'lastname', 'company', /* + custom form properties */ 'hubspot_owner_id'],
      }),
    });
    const data = await searchRes.json();
    for (const contact of (data.results || [])) {
      // Run the same compute → write → PATCH flow as above
      // Reconstruct formValues from the contact's properties
    }
  },
};
```

And the wrangler.toml additions:

```toml
[triggers]
crons = ["0 * * * *"]  # hourly catch-up

# Secrets (set via wrangler secret put — never commit):
#   HUBSPOT_API_TOKEN      — Private App token, scopes: crm.objects.contacts.read|write
#   SLACK_WEBHOOK_URL      — Same Slack webhook as tracker, or dedicated #lead-gen channel
#   WORKER_SECRET          — Random hex string, makes slugs unguessable
#   TURNSTILE_SECRET       — Cloudflare Turnstile siteverify secret
```

### Updating the tracker worker for `/lg/{slug}` routes

The tracker worker currently serves `slugs/{slug}.html` for any path. To support lead-gen URLs at `/lg/{slug}`, add a route check at the top of the handler:

```typescript
const url = new URL(request.url);
const path = url.pathname;
let r2Key;
if (path.startsWith('/lg/')) {
  r2Key = `leadgen/${path.slice(4)}.html`;
} else {
  r2Key = `slugs/${path.slice(1)}.html`;
}
// ... rest of the existing handler reads `r2Key` from R2
```

Everything else (visit tracking, Slack on visits #1 and #2, audit log) works the same way for both URL patterns.

### Estimated effort

For an engineer comfortable with TypeScript and Cloudflare Workers: **4–6 hours** end-to-end including tests and a deploy. Helpers are already tested, so the new code is mostly orchestration plus the Turnstile and HubSpot API calls.

---

## 8. Day-to-day operations

### Deploying a worker

Every worker is a standalone deploy. Run from the worker's directory:

```bash
cd /Users/morten_spense/spense-calculator/{worker}     # publish, tracker, dashboard, or hubspot
npx wrangler deploy
```

First time on a new machine, you'll need to log in to Cloudflare:

```bash
npx wrangler login
```

This opens a browser window. Log in with the Spense Cloudflare account.

### Reading live worker logs

```bash
cd /Users/morten_spense/spense-calculator/{worker}
npx wrangler tail
```

Streams logs in real time. Use this when debugging an incident.

### Setting or rotating a secret

```bash
cd /Users/morten_spense/spense-calculator/{worker}
npx wrangler secret put SECRET_NAME
```

You'll be prompted to paste the value. It's stored encrypted in Cloudflare and not retrievable — keep a copy in a password manager.

### Rotating `PUBLISH_SECRET` (the one with a coordination cost)

`PUBLISH_SECRET` is shared between the publish worker and the frontend. Both must be updated together.

1. Generate a new secret: `openssl rand -hex 32`
2. Update the worker: `cd publish && echo "NEW_SECRET" | npx wrangler secret put PUBLISH_SECRET`
3. Edit `/Users/morten_spense/spense-calculator/index.html`, find `const PUBLISH_SECRET_TOKEN = '...'`, replace the value
4. `git add index.html && git commit -m "Rotate PUBLISH_SECRET" && git push`
5. Wait ~60 seconds for GitHub Pages to redeploy
6. Verify by publishing a test prospect from the calculator

Between steps 2 and 4 the frontend will fail. Do this during low-traffic hours.

### Rotating `DASHBOARD_PASSWORD`

Self-contained — only the worker. After running `wrangler secret put DASHBOARD_PASSWORD`, share the new password with anyone who has dashboard access. Existing logged-in sessions stay valid until the 8-hour cookie TTL expires (sessions are stored in KV, not derived from the password).

### Adding/removing sales reps

Use the dashboard UI: `https://spense-dashboard.results-calc.workers.dev/`. Log in, scroll to the Sales Reps section, add or remove. The change is written to `config/reps.json` in R2 and picked up by the calculator frontend on next page load.

### Deleting a prospect's URL

Use the dashboard. Find the prospect, click delete. The R2 object and visit log are hard-deleted, and an audit log entry is written.

### Where the audit log lives

R2 keys under `logs/`. Visible in the dashboard's "Recent activity" section (last 20 entries shown).

---

## 9. Migration tasks (step-by-step)

### Transferring the GitHub repo

**Done by Morten:**

1. Confirm with IT which Spense GitHub Organisation should own the repo. If none exists, IT creates one first.
2. Navigate to `github.com/MortenSpense/spense-calculator` → Settings → bottom of page → Transfer ownership.
3. Type the destination org name and the repo name to confirm.
4. Click "Transfer".

**Done by IT:**

1. Accept the transfer request (received as a notification on the destination org).
2. Confirm GitHub Pages still serves at the new URL (it auto-redirects from the old URL, but the canonical URL changes).
3. **Action follow-up: update the CORS allowlist** in the publish worker and the dashboard worker if the GitHub Pages URL changes. Currently both workers allow `https://mortenspense.github.io` only. Search for that string in `publish/src/index.ts` and `dashboard/src/index.ts` and update.
4. Add team members with appropriate permissions.

### Transferring the Cloudflare account

Cloudflare doesn't transfer accounts in the GitHub sense, but you can transfer effective ownership by:

**Done by Morten:**

1. Cloudflare dashboard → Manage Account → Members → Invite Members
2. Email: provide the Spense-owned email IT will use
3. Role: **Super Administrator** (gives full control including billing)
4. Send invite.

**Done by IT:**

1. Accept invite from the email.
2. Log in. Verify access to: Workers, R2, KV namespaces, Turnstile, billing.
3. Add a payment method on the Spense-owned billing account (free tier today, but worth setting up for headroom).
4. Once stable, optionally demote Morten to Administrator or remove him entirely.

The R2 bucket, workers, KV namespace, and all secrets remain in place during this transition — nothing needs to be re-created.

### Setting up a custom Spense-owned domain

When Spense is ready to expose this on a branded URL:

1. Decide on the subdomain (suggested: `roi.spense.io` or similar).
2. In Cloudflare dashboard → Workers → spense-roi → Triggers → Custom Domains → Add Custom Domain.
3. Add the DNS record (CNAME) on Spense's DNS provider pointing at `spense-roi.results-calc.workers.dev`.
4. Cloudflare auto-provisions the SSL certificate.
5. Update the publish worker so newly-published URLs use the new hostname.
6. Existing URLs on the old hostname continue to work — both hostnames will resolve to the same worker.

---

## 10. Incident playbook

Common failure scenarios and what to do.

### "A prospect says they got the URL but the page returns 404"

| Step | What to check |
|---|---|
| 1 | Open the URL yourself in a private browser window. Does it 404? |
| 2 | Look up the slug in the dashboard. Is the prospect listed? |
| 3 | If not listed → the publish never completed. Ask the rep to republish. |
| 4 | If listed but URL 404s → R2 object was deleted. Check the audit log for a delete event. The URL needs to be regenerated. |

### "Slack notifications stopped firing"

| Step | What to check |
|---|---|
| 1 | `cd tracker && npx wrangler tail` — visit a test prospect URL, watch the log |
| 2 | If the worker logs show no Slack call → check the Slack webhook URL is still set: `npx wrangler secret list` |
| 3 | If logged but Slack returns 4xx → the webhook URL may have been revoked. Create a new incoming webhook in Slack and `npx wrangler secret put SLACK_WEBHOOK_URL` |

### "Dashboard login isn't working"

| Step | What to check |
|---|---|
| 1 | Confirm the password is correct (a recent rotation might not have been communicated to everyone) |
| 2 | Check if you're locked out: 5 failed attempts triggers a 15-min IP lockout. Wait 15 min and retry. |
| 3 | If session immediately expires after login → KV namespace may be misconfigured. Check the binding in `dashboard/wrangler.toml`. |

### "Lead-gen email didn't go out for a prospect who submitted the form"

| Step | What to check |
|---|---|
| 1 | Look up the contact in HubSpot. Does `spense_calculator_url` have a value? |
| 2 | If yes → the email workflow on HubSpot's side didn't fire. Check Helion's email workflow status. |
| 3 | If no → the worker call didn't complete from the browser. Wait up to 1 hour for the catch-up cron to pick it up. |
| 4 | If still no after 1 hour → check the hubspot worker logs: `cd hubspot && npx wrangler tail`. Look for the contact's email in recent traffic. |
| 5 | If the catch-up cron isn't running at all → check the `[triggers]` config in `hubspot/wrangler.toml` and run `npx wrangler deployments list` to confirm the latest deploy includes the cron. |

### "All workers returning 5xx"

| Step | What to check |
|---|---|
| 1 | Cloudflare status page: https://www.cloudflarestatus.com/ |
| 2 | If a Cloudflare incident is active → wait. The workers will recover automatically. |
| 3 | If Cloudflare is healthy → check recent deploys. If a deploy happened immediately before the failure, roll back: `cd {worker} && npx wrangler rollback` |
| 4 | If neither applies → `npx wrangler tail` on each worker to see the actual error |

### "Calculator frontend (GitHub Pages) is down"

| Step | What to check |
|---|---|
| 1 | https://www.githubstatus.com/ — check for a Pages incident |
| 2 | Verify the repo still has Pages enabled (Settings → Pages in the GitHub repo) |
| 3 | Check that the `main` branch has a valid `index.html` at the root |

---

## 11. Helion (external partner)

Helion B2B is an inbound marketing agency contracted to run campaigns for Spense. They own the HubSpot side of the lead-gen flow — landing page content, forms, contact properties, email templates. They are paid by Spense and report into Spense's marketing function (specifically Morten Olsson today; IT to clarify the post-handover marketing owner).

**Why this matters for IT:** when there's a problem in the lead-gen flow, the question is always "is this our side (worker, R2, HubSpot API call) or their side (form, contact properties, email)?" The interface between the two is documented in section 7 — know what they own.

### The message to send to Helion

(Morten will have already sent this if he had time; otherwise IT can send it as the first action.)

> **Subject:** HubSpot calculator integration — revised design + handover
>
> Hi [Helion contact],
>
> Two things in one message:
>
> First, you were right about the Ops Hub Pro dependency on the Workflow webhook action. We're not going to upgrade for that one feature, so we've revised the architecture: the trigger now lives in the embedded HubSpot form's `onFormSubmit` JavaScript callback in the browser, not in a Workflow. The submission still creates/updates the contact in HubSpot exactly as today; a small JS snippet on the landing page POSTs the same values to our Cloudflare Worker at the moment of submission. The standard HubSpot form follow-up email continues to carry the URL via `{{contact.spense_calculator_url}}`. No HubSpot Workflows required at all. Works on any HubSpot tier.
>
> Second, the project is being handed over from me to Spense Internal IT. Your day-to-day contact will be [IT name + email] going forward. Please loop them in on anything HubSpot-side.
>
> Two questions for you before any further work:
> 1. Can the landing page use an embedded HubSpot form (not iframe or third-party)?
> 2. Can you create a HubSpot Private App in our portal with `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes, and share the token with IT?
>
> If both are yes, IT will send over the JS snippet for the page and confirm the integration is ready.
>
> Thanks,
> Morten

### Helion's key contact

(Morten to fill in for IT before sending this document, or provided separately.)

---

## 12. Field validation & commercial context

This section is reference material — useful context if IT ever needs to discuss the numbers with the sales team or with a prospect's questions.

### Why the calculator's defaults are what they are

| Default | Source / validation |
|---|---|
| Denmark aftersales: 229 payments/month/location | Median across 5 Nellemann / Van Mossel locations (2026) |
| Denmark avg payment: ~DKK 4,775 | Same data set |
| Admin time per payment: 10 minutes | Conservative baseline. ROI also holds at 18 minutes (Hedin Norway data point). |
| Car sales: 70 cars/location/month | Danish market data |
| Norwegian hourly cost: 340 DKK loaded | Updated 2026-05-01 by Morten based on Spense internal benchmarks |
| Per-market pricing matrix | Validated 2026-04-29 by Morten. Source of truth lives in the worker `markets.ts` files. |

### Why per-market pricing was rebuilt in native currencies (April 2026)

Until April 2026 the calculator priced everything in EUR and converted at fixed averaged exchange rates. This produced visibly off numbers for non-EUR markets (Denmark, Norway, Sweden, UK, Switzerland). The April 2026 refactor rebuilt the pricing as a native-currency table per market. This is why the calculator no longer shows an exchange rate disclaimer and no longer has a currency selector.

### Validation customers

| Customer | Market | Validation use |
|---|---|---|
| Bil i Nord (Norway) | Norway | Field use by Didrik Jarlsby (rep) |
| Ejner Hessel (Denmark) | Denmark, 35 locations, ~1,750 cars/month | End-to-end field test |
| Nellemann / Van Mossel | Denmark | Source of Denmark default payment volume |
| Hedin (Norway) | Norway | Source of the 18-min admin time data point |

### Reps and market lead-rep mapping

Per-market lead reps for new lead-gen prospects:

| Market | Lead rep |
|---|---|
| Norway | Didrik Jarlsby (Lars Vangen Jordet covers existing accounts) |
| Denmark | Claus Persson |
| Sweden | Claus Persson |
| Germany | Morten Olsson |
| Benelux (BE/NL/LUX) | Didrik Jarlsby |
| Switzerland | Morten Olsson |
| Italy | Morten Olsson |
| UK | Morten Olsson |
| Other EUR market | Morten Olsson |

Existing-account prospects are routed by HubSpot owner, not by this table.

---

## 13. Known risks and watch items

Honest list of tradeoffs IT inherits.

| Risk | Severity | Notes |
|---|---|---|
| **PUBLISH_SECRET embedded in public frontend source** | Low (mitigated) | Visible to anyone who inspects the page source. Acceptable because the publish worker validates slug format and has a 5MB size limit — worst case is an attacker publishing a junk page at a slug name that can be deleted. Rotation runbook exists. |
| **No off-site backup of R2** | Medium | R2 is the only copy of all prospect data. R2 itself is reliable, but a misconfiguration or destructive incident could lose everything. P2 item. |
| **Shared dashboard password** | Low–medium | One password for all dashboard users. No audit of who logged in, no per-user revocation. Fine today (~3 users) but should change as the team grows. P2 item. |
| **Personal accounts hosting production** | High (until migrated) | GitHub + Cloudflare are personal accounts. **This is the P0 fix.** |
| **Bus factor of 1 (currently)** | High (until migrated) | Same root cause. After migration, multiple IT staff have access. |
| **Tracker worker is publicly accessible** | Low | By design — prospects need to load it without auth. Free tier doesn't support rate limiting; if abuse becomes a problem, the path forward is upgrading to a paid Cloudflare plan and adding rate limiting. |
| **`spense-hubspot` worker is unfinished** | Medium | Lead-gen flow doesn't work until it's finished. Doesn't affect the live rep-published flow. |
| **Stale `/Users/morten_spense/spense-backend` folder** | None (cosmetic) | Empty shell of the old layout, not under git. Should be deleted. Confirmed stale 2026-06-19. |

---

## 14. Contacts

| Role | Name | Contact | Notes |
|---|---|---|---|
| **Handing over** | Morten Olsson | morten.olsson@gmail.com | Available for questions during handover period. Project is on pause from his side. |
| **External: Marketing agency** | Helion B2B contact | (Morten to provide name + email) | Owns HubSpot configuration. Paid by Spense. |
| **Internal: Sales team users** | Lars Vangen Jordet, Didrik Jarlsby, Morten Olsson, Claus Persson | (use existing Spense directory) | Daily users of the calculator. Worth informing them when handover completes and when secrets are rotated. |
| **Internal: Slack channel for visit notifications** | (currently goes to a specific channel) | Check the `SLACK_WEBHOOK_URL` value | IT may want to redirect this to an IT-monitored channel after handover. |

---

## Appendix A — Repository structure

```
/Users/morten_spense/spense-calculator/
├── .Clairvoyance/              ← AI assistant context, not load-bearing for production
│   └── Docs/                   ← Internal design docs (architecture, runbooks, history)
├── .git/                       ← Git repository (SSH remote)
├── .gitignore                  ← Excludes node_modules/, .wrangler/, .DS_Store
├── CLAUDE.md                   ← Guidance file for AI assistants on this repo
├── For_Helion.md               ← Stale: v1 architecture handover for Helion. See section 7 for v2.
├── README.md                   ← Project README
├── SPENSE_IT_HANDOVER.md       ← This document
├── dashboard/                  ← dashboard worker
│   ├── package.json
│   ├── src/
│   ├── tsconfig.json
│   └── wrangler.toml
├── ejner-hessel.html           ← Static field-validation artefact, can stay
├── hubspot/                    ← hubspot worker (unfinished)
│   ├── examples/
│   ├── node_modules/
│   ├── package.json
│   ├── src/
│   │   ├── compute.ts          ← Complete + tested
│   │   ├── compute.test.ts
│   │   ├── index.ts            ← Skeleton, needs finishing
│   │   ├── markets.ts          ← Complete
│   │   ├── slug.ts             ← Complete + tested
│   │   ├── slug.test.ts
│   │   ├── template.ts         ← Complete + tested
│   │   └── template.test.ts
│   ├── tsconfig.json
│   └── wrangler.toml
├── index.html                  ← Calculator frontend (GitHub Pages serves this)
├── publish/                    ← publish worker
└── tracker/                    ← tracker worker
```

---

## Appendix B — Commands cheat sheet

```bash
# Deploy any worker (run from the worker's directory)
cd /Users/morten_spense/spense-calculator/{worker}
npx wrangler deploy

# Read live logs
npx wrangler tail

# Set/rotate a secret
npx wrangler secret put SECRET_NAME

# List secrets currently set
npx wrangler secret list

# Login to Cloudflare (first time on a machine)
npx wrangler login

# Run tests for a worker (where they exist)
npx vitest

# Rollback to the previous deploy if something breaks
npx wrangler rollback

# List recent deploys
npx wrangler deployments list
```

---

*End of handover document. Questions to Morten Olsson during the transition period.*
