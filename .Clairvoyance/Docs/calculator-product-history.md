# Spense Calculator Product History

> Last updated: 2026-05-01
> Author: Henning
> Source: Morten's handoff of the Haalee collaboration history.

## What This Project Is

This frontend is the Spense ROI & TCO calculator. It is a sales tool for dealership prospects and is currently hosted at:

```text
https://mortenspense.github.io/spense-calculator/
```

The frontend is intentionally a self-contained `index.html` file. There is no framework, build system, or frontend server. This keeps it portable, easy to host, and easy to embed in Framer later.

## Current Product Shape

The calculator has three views:

- **Aftersales**: payment reconciliation value case for service/workshop payments.
- **Car Sales**: payment confirmation and handover value case for car sales.
- **Combined**: combined business case across both products.

Main outputs:

- annual savings
- 5-year net savings
- payback period
- ROI/cost multiple
- FTE equivalent saved
- 5-year table and charts
- one-page branded PDF export

## Distribution Modes

The calculator supports two distribution flows:

1. **Save assumptions**: downloads a personalized HTML copy with the current assumptions as defaults.
2. **Publish for prospect**: sends the personalized HTML to the Cloudflare publish Worker and returns a hosted prospect URL.

Saved/published prospect copies:

- preserve the active view so the prospect lands on the right tab
- lock Spense pricing fields as read-only
- allow the prospect to adjust operational assumptions like volume, locations, minutes, and hourly cost

## Version History Summary

| Version | Meaning |
|---|---|
| v1.0 | Field-ready standalone calculator |
| v1.1 | Denmark preset updated to 10 min validated conservative baseline |
| v1.2 | PSP fee modeled on both sides, net-zero effect |
| v1.3 | ISO market badges replace emoji flags for Windows compatibility |
| v1.4 | Transaction fee can go to 0%; overlap can extend to 36 months |
| v2.0 | Added Aftersales, Car Sales, Combined views |
| v2.3 | Added POS terminals per location |
| v2.4 | Added Save assumptions |
| v2.6 | Removed monetary sliders; locked pricing in saved copies |
| v3.0 | Added Publish for prospect with Cloudflare backend |
| v3.1 | Replaced EUR pivot pricing with native-currency market presets; added Sweden preset; added hidden-default SMS and personalised URL fees to aftersales costs; replaced the `Payments / month` control with a dense-slider hybrid; normalized aftersales `Avg payment value` presets from DKK 4,500 |

## Validated Assumptions

Aftersales:

- Payments are modeled per location.
- Real customer sample: 257, 257, 158, 203, 270 payments/month/location.
- Denmark baseline: 229 payments/month/location.
- Aftersales `Avg payment value` presets are anchored on DKK 4,500 and converted per market with nearest-`5` rounding: NOK 670, DKK 4500, SEK 655, EUR 600, CHF 555, GBP 520.
- 10 minutes per payment is treated as a validated conservative baseline from the Nellemann case.
- A payment is one payment against an invoice, regardless of invoice line count.

Car Sales:

- Cars sold are modeled per location.
- Danish base pricing: DKK 990 per location/month plus DKK 30 per car sold.
- Native-currency pricing is validated for 8 rep-facing markets: Norway, Denmark, Sweden, Benelux, Germany, Switzerland, Italy, UK.
- Hedin Norway supplied the key 18-minutes-per-car assumption used in the Bil i Nord case.
- The car-sales ROI is highly sensitive to admin minutes per car.
- Risk/key-handover exposure is shown as a supplemental value lever, not included directly in savings.

Reference cases:

- Nellemann A/S: approximately 295K DKK annual aftersales savings at 10 minutes.
- Bil i Nord: approximately 592K NOK combined annual savings, 14-month payback, 29% 5-year ROI.
- Ejner Hessel: high-volume car-sales stress case around 1,700-1,750 cars/month across 35 locations.

## Important Design Decisions

- Monetary fields are number inputs only. Do not reintroduce sliders for money; the old hybrid design caused repeated rounding/snapping bugs.
- Non-monetary fields can remain sliders.
- `Payments / month` is the deliberate exception: use the hybrid dense-slider + direct-entry control rather than a plain linear slider, because the working range clusters around 200 with occasional use up to 500-600.
- Market presets are native-currency only. Do not reintroduce exchange-rate conversion, hidden EUR shadow values, or a free currency dropdown.
- Pricing is visible but read-only in prospect copies.
- Aftersales SMS notifications and personalised URL fees are included as advanced-section defaults and stay on by default unless a rep explicitly turns them off.
- Use Spense blue `#3d60f5`.
- Use Montserrat for headings/numbers and Open Sans for body text.
- Use ISO code market badges, not emoji flags.
- PDF export should be a polished one-page A4 landscape summary.

## Known Future Ideas

- Add language selector for Germany/Italy only if prospects show actual language friction.
- Add analytics or visit tracking per prospect URL through the backend/tracker flow.
- Add PSP fee reduction modeling later if there are real negotiated examples.
- Build a simplified inbound-marketing calculator separately from this rep-facing sales tool.
