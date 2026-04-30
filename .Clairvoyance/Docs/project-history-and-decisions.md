# Spense Calculator Project History And Decisions

> Last updated: 2026-04-22
> Author: Quinn
> Source: Morten's long project-context handoff from Haalee collaboration.

## Executive Summary

The Spense calculator evolved from a standalone ROI/TCO HTML sales aid into a lightweight publishing platform:

- reps configure a calculator for a prospect
- reps click **Publish for prospect**
- a Cloudflare Worker stores the personalized HTML in R2
- the rep receives a prospect-specific URL
- the tracker Worker serves that URL and records visits
- dashboard and Slack notifications are intended to give the sales team visibility

The project is deliberately pragmatic: one self-contained HTML frontend, three Cloudflare Workers, one R2 bucket, and no database.

## Major Product Milestones

| Version | Meaning |
|---|---|
| v1.0 | Field-ready standalone calculator with branded one-page PDF export |
| v2.0 | Added three views: Aftersales, Car Sales, Combined |
| v2.4 | Added Save assumptions download flow |
| v2.6 | Removed sliders from monetary fields and locked Spense pricing in saved/published copies |
| v3.0 | Added Publish for prospect, backed by Cloudflare Workers + R2 |

## Important Commercial Decisions

- The sales-tool version should remain rich and configurable because a rep is present to interpret it.
- A future inbound-marketing version should be much simpler, probably only 3-4 inputs with hidden defaults.
- Prospect-facing saved/published copies should show Spense pricing but make pricing fields read-only. Pricing is transparent, but negotiation should happen with a person, not by a prospect editing a calculator alone.
- The published prospect URL workflow is preferred over emailing HTML attachments when possible because it feels more professional and allows tracking.

## Validated Data Points

Aftersales:

- Denmark/Nellemann baseline: 10 minutes per payment is treated as a conservative validated baseline.
- Nellemann-style case at 10 minutes still produces meaningful value: about 295K DKK annual savings and about 1.57M DKK over 5 years.
- Real payment-volume sample from existing customers: 257, 257, 158, 203, 270 payments/month/location; center around 229/month/location.
- A payment means one payment against an invoice, regardless of how many order lines were on the work order.

Car Sales:

- Denmark base price: DKK 990 per location per month plus DKK 30 per car sold.
- Norway/Bil i Nord case: about 592K NOK combined annual savings, with 527K NOK from Aftersales and 64K NOK from Car Sales.
- Hedin Norway car-sales admin-time assumption: 18 minutes per car.
- Car sales business case is sensitive to minutes per car. At 10 minutes, car sales can look thin at high volumes; at 18 minutes, it can become compelling.
- Ejner Hessel context: around 1,700-1,750 cars/month across 35 locations; used for stress-testing high-volume car-sales scenarios.

## Modeling Decisions

- Payments per month are modeled per location, then multiplied by number of locations.
- Cars sold per month are modeled per location, then multiplied by number of locations.
- Annual growth affects the 5-year model, not year-one savings.
- PSP fees are modeled as cost on both sides when enabled, producing net-zero effect on savings by default.
- Potential PSP fee reductions from Spense negotiation are a future enhancement, not currently modeled.
- R2 metadata is the system of record for published prospect files, visit counts, and last-visited timestamps.

## UI/UX Decisions

- Monetary fields are number-input only, not sliders. The slider/number-input hybrid caused snapping and rounding bugs.
- Non-monetary fields can remain sliders: locations, payments/month, cars/month, minutes, growth, terminal count, overlap duration.
- ISO country-code badges replaced emoji flags because Windows does not reliably render flag emoji.
- PDF export should look like a branded one-page report, not a screenshot of the app.
- Spense brand: blue `#3d60f5`, background `#f7f7f7`, typography Montserrat + Open Sans.

## Technical Decisions

- GitHub Pages hosts the frontend at `https://mortenspense.github.io/spense-calculator/`.
- The canonical frontend file is `index.html`.
- The backend lives in this repo and uses Cloudflare Workers + R2.
- Workers are deployed with Wrangler.
- R2 bucket: `spense-calculator`.
- Public prospect URLs are served through the tracker Worker, not GitHub Pages.
- Prospect file expiry should be handled through R2 lifecycle rules, expected target: 90 days.

## Open/Future Ideas

- Slack notifications have been tested and work.
- Localization may matter for Germany and Italy, but should be validated before building.
- Analytics for per-prospect URLs are more useful than analytics for the generic calculator.
- Management dashboard should prevent Morten becoming the team's manual file-renaming and upload service.
- Potential future: model PSP fee reduction after Spense negotiation as an extra value lever.
