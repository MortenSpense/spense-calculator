# For Helion

Handover notes for **Helion B2B** — the inbound marketing agency running campaigns for Spense.

This document describes how Spense's ROI Calculator integrates with HubSpot, so Helion can build the landing page, form, email, and workflows that turn calculator interest into pipeline.

---

## The Spense ROI Calculator (background)

Spense sells SaaS to automotive dealerships that automates payment reconciliation in aftersales (and increasingly car sales). The ROI Calculator quantifies the time and money a dealership saves by replacing manual payment admin with Spense.

The rep-facing calculator lives at https://mortenspense.github.io/spense-calculator/. Each prospect can be given a personalised, hosted page at a unique URL, with their numbers baked in.

There are **two paths** by which a prospect ends up with one of these personalised URLs:

1. **Customer self-serve via landing page** — *the primary path, what this document is mostly about.* Lands on a focused, read-only **lead-gen result page** at `https://spense-roi.results-calc.workers.dev/lg/{slug}`.
2. **Sales rep publishes for a prospect** — secondary, but still in active use. Lands on the full rep-facing calculator at `https://spense-roi.results-calc.workers.dev/{slug}`.

Both paths write the URL to the contact's `spense_calculator_url` property in HubSpot. They produce **different page experiences** — see below.

---

## Primary flow: customer self-serve via landing page

### What the prospect experiences

1. Prospect lands on the campaign landing page (URL TBD — Helion to build).
2. Page opens with copy on **time savings with Spense** for dealerships.
3. Copy leads into a teaser for the calculator: *"Want to know how much your dealership can save with Spense? Fill out the form and get your personalised results via email."*
4. Prospect fills out the form (fields below) and submits.
5. Within a few seconds, prospect receives an email from HubSpot with a link to their personalised calculator URL.
6. Prospect clicks the link, sees their personalised business case, and (ideally) books a meeting via the calculator's CTA.

### The form — fields to capture

The HubSpot form should collect, in this order:

| Field | HubSpot property | Notes |
| --- | --- | --- |
| Name | `firstname` + `lastname` (or single `name`) | Standard HubSpot contact fields |
| Dealership name | `company` | Standard HubSpot contact field |
| Market / country | `country` (or a custom property) | Drives which market preset the calculator uses. Supported markets: **NO, DK, SE, GER, UK, BE, NL, LUX, IT, CH, "Other EUR market"**. |
| Number of locations | *new custom property* | Numeric — feeds into the calculator |
| Aftersales payments per month (per location) | *new custom property* | Numeric — feeds into the calculator |
| Time spent per payment in admin (minutes) | *new custom property* | Numeric — admin time across front desk + finance |
| Email address | `email` | Standard, used as the unique identifier |

Helion to decide on the exact custom property names; just let us know the internal names so the backend can map form submissions to calculator inputs.

### What happens on submit (technical, but worth understanding)

When the form is submitted:

1. **HubSpot** creates the contact (or updates if the email already exists) with the form values stored on standard + custom properties.
2. **HubSpot fires a webhook** to Spense's backend (a dedicated Cloudflare Worker — `spense-hubspot.results-calc.workers.dev` — set up by Morten).
3. **The backend** takes the form values, computes the savings, renders a personalised result page, and writes the URL back to HubSpot on the contact's `spense_calculator_url` property.
4. **A HubSpot workflow** (built by Helion) detects that `spense_calculator_url` is now populated and sends the prospect an email containing the URL.

Helion does not need to wire up the backend webhook — that's our side. Helion's responsibility is everything inside HubSpot: form, contact properties, workflow, email template.

### Result page shown to the self-serve prospect

The self-serve prospect lands on a **dedicated, read-only result page** — *not* the full rep-facing calculator. This is intentional: there is no rep present to explain inputs, and giving the prospect controls to tweak just creates a path to making the savings number smaller.

What the page contains:

- **Hero savings number** ("Spense could save Acme Motors 595,000 DKK / year")
- **Echoed form values** so the prospect can see their inputs and spot any typos
- **Annual case** — admin cost today, admin cost with Spense, Spense fees, net annual savings, payback period
- **5-year case** — cumulative savings chart and 5-year net total
- **Single CTA** — "Book a 30-minute call" (HubSpot meeting link), with a softer secondary CTA to email the team

What the page does **not** contain:

- No sliders, number inputs, or other controls
- No Car Sales view or Combined view (lead-gen scope is aftersales-only by default)
- No view-tab switching, no preset selectors, no rep dropdown

Numbers are based on the prospect's form inputs plus the market preset (so a Danish dealership sees Denmark-aligned baselines for any field they didn't supply themselves). The result page is a snapshot — once rendered, it's frozen HTML in R2, identical hosting to rep-published URLs.

Mockup: see Clairvoyance note **Lead-Gen Calculator Mockup** for the agreed layout.

---

## Secondary flow: sales rep publishes for a prospect

A Spense sales rep can also generate a calculator URL manually:

1. Rep opens the calculator at https://mortenspense.github.io/spense-calculator/
2. Configures inputs based on a known prospect (often after a discovery call where they have real numbers)
3. Clicks **Publish for prospect**, enters the prospect's name + email
4. Backend hosts the personalised URL and pushes the contact + URL into HubSpot (same `spense_calculator_url` property)
5. Rep sends the URL to the prospect manually (typically via their own email or LinkedIn)

This path is **still important to Spense** — reps use it for warm prospects where they already have detailed numbers, and where personal sender beats automated workflow. From Helion's point of view, contacts arriving via this path look identical to self-serve contacts in HubSpot.

If Helion wants to differentiate the two paths in workflows (e.g., skip the "intro" email for rep-published contacts who probably already had a call), we can add a `lead_source` property — flag this and we'll wire it up.

---

## HubSpot setup

There are five things to set up on the HubSpot side. Items 1-3 are existing patterns; 4 and 5 are new for the lead-gen flow.

### 1. Custom contact property: `spense_calculator_url`

| Field | Value |
| --- | --- |
| **Internal name** | `spense_calculator_url` |
| **Label** | Spense Calculator URL |
| **Group** | Sales (or wherever fits Helion's existing structure) |
| **Type** | Single-line text (URL field type works too) |

This property holds the personalised calculator URL for that contact. **One value per contact, always overwritten with the latest URL.** No accumulation of historical URLs. If a contact resubmits with new inputs, the property is overwritten and a new email goes out.

### 2. Form custom properties

Helion to define and create the custom properties for the form fields:

- Number of locations (numeric)
- Aftersales payments per month per location (numeric)
- Admin time per payment in minutes (numeric)
- Market / country (single-select dropdown — values constrained to: NO, DK, SE, GER, UK, BE, NL, LUX, IT, CH, "Other EUR market")

Send the internal property names to Morten so the webhook handler can read them by name.

### 3. Workflow → send calculator email

Helion builds a HubSpot workflow that:

- **Triggers** when `spense_calculator_url` becomes known (empty → populated, or value changes)
- **Action**: send an email containing the URL
- Email template, copy, and design are Helion's call

Optional refinements Helion may want to consider:

- Delay the send slightly (e.g., 30 seconds) so the URL is fully ready by the time the email goes out
- Different email copy for self-serve vs rep-published contacts (would need a `lead_source` flag — flag this with Morten if interested)

### 4. Workflow → fire webhook to Spense backend (NEW)

This is what triggers the calculator-URL generation. Helion configures:

- **Trigger:** form submission (the lead-gen calculator form specifically)
- **Action:** Webhook → POST
- **URL:** `https://spense-hubspot.results-calc.workers.dev/` (Morten will provide the final URL once the worker is deployed)
- **Method:** POST
- **Custom header:** `Authorization: Bearer {SECRET}` — Morten will provide the secret value
- **Body:** include the contact's properties for: contact ID (vid / hs_object_id), email, firstname, lastname, company, market, locations, payments/month, admin minutes, hubspot_owner_id

This replaces the need for the backend to subscribe to HubSpot events directly — keeps the integration simple and gives Helion clear control over which form submissions trigger calculator generation.

### 5. HubSpot Private App + meeting links (NEW)

The backend needs HubSpot API access to:
- Read each contact's owner (so it can route the lead to the right rep)
- Write the calculator URL back to the `spense_calculator_url` property

Helion or Morten creates a HubSpot Private App with these scopes:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`

The private app's access token is shared with Morten and stored as a Wrangler secret on the backend (it never lives in HubSpot exports or anywhere outside the worker).

### 6. Rep meeting links (NEW)

The result page generated by the backend includes a "Book a 30-minute call" CTA. The backend picks the right rep based on:

1. **Existing relationship** — if the contact has a HubSpot owner, that owner gets the lead.
2. **Market lead rep** — if no owner, fall back to the lead rep for the prospect's market.

Per-market lead reps (lock 2026-04-30):

| Market | Lead rep (default for new contacts) |
| --- | --- |
| Norway | Didrik Jarlsby (Lars Vangen Jordet also covers existing accounts) |
| Denmark / Sweden | Claus Persson |
| Germany / Switzerland / Italy / UK / Other EUR market | Morten Olsson |
| Benelux (BE/NL/LUX) | Didrik Jarlsby |

Each rep needs a HubSpot meeting link (e.g., `https://meetings.hubspot.com/morten-olsson`). Helion to ensure each named rep has a meeting link configured in HubSpot. The backend reads these from a small config file we maintain on our side.

---

## Suggested campaign uses (beyond the immediate email)

A few starting points for Helion to consider:

- **Re-engagement nurture**: if a prospect was sent their calculator URL 2+ weeks ago and hasn't booked a meeting, send a soft nudge.
- **Visit-triggered handoff**: notify the assigned rep when their prospect re-visits the calculator. Visit data is captured in Spense's backend; we can pipe it to HubSpot if Helion finds it useful.
- **Multi-touch sequence**: pair the calculator email with a follow-up case study (Nellemann, Ejner Hessel, Bil i Nord) tailored to the prospect's market.

---

## Open items / future data

These aren't live yet but are likely to flow into HubSpot once we agree on the right shape:

- **Visit count**: how many times the prospect has opened their calculator URL
- **Last visited timestamp**: when they last opened it
- **Meeting booked**: confirmation that the prospect booked time with a rep (likely flowing the other way — HubSpot → Spense — via webhook)
- **Lead source**: `self_serve` vs `rep_published` (if Helion wants to differentiate workflows)

If any of these would meaningfully improve a Helion campaign, let's discuss and we'll add them.

---

## Contact

For technical questions about the integration, the calculator, or the backend: **Morten Olsson** (morten.olsson@gmail.com).

Before changing anything on the HubSpot side that affects the contract between HubSpot and the backend (form field names, custom property names, the webhook trigger), please raise it with Morten — there's a Cloudflare Worker on the Spense side that needs to match.
