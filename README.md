# Spense ROI & TCO Calculator
 
A self-contained sales tool for demonstrating the business case for Spense to dealership prospects. No installation, no server, no dependencies — opens in any browser.
 
---
 
## Live URL
 
The calculator is hosted at:
 
```
https://mortenspense.github.io/spense-calculator/
```
 
This URL can be embedded in an iframe on the Spense website.
 
---
 
## What it does
 
The calculator models the return on investment for two Spense products:
 
- **Aftersales** — quantifies admin time saved on payment reconciliation in the service department
- **Car Sales** — quantifies admin time saved on payment confirmation at point of handover, plus optional key handover risk exposure
- **Combined** — presents a unified business case when both products are relevant
 
Results include annual savings, 5-year net savings, payback period, 5-year ROI, FTE equivalent saved, and a full year-by-year breakdown.
 
---
 
## How to use it in a sales meeting
 
1. Open the calculator in a browser (either the live URL or the local HTML file)
2. Select the relevant **market preset** to load typical assumptions for that country
3. Adjust inputs to match the prospect — locations, payment volumes, admin time, pricing
4. Walk the prospect through the results on screen
5. Use **Export PDF** to print a branded leave-behind on A4 landscape
 
---
 
## Save assumptions (sending to a prospect)
 
The **Save assumptions** button downloads a personalised copy of the calculator as an HTML file with your current inputs baked in as defaults.
 
**Workflow:**
1. Configure all inputs to match the prospect's situation
2. Click **Save assumptions**
3. A file called `spense-roi-calculator.html` downloads to your computer
4. Attach it to an email with a message along the lines of:
 
> *"I've prepared a business case with numbers I believe match your situation. If I'm off on any of them, feel free to adjust the inputs — the calculator will update in real time."*
 
The prospect opens the file in their browser and sees your numbers pre-loaded. They can adjust any slider or input freely. No installation required on their end.
 
> **Note:** Some corporate email systems block `.html` attachments. If delivery fails, zip the file first — `spense-roi-calculator.zip` is less likely to be flagged.
 
---
 
## Market presets
 
Selecting a market preset loads typical assumptions for that country including currency, payment volumes, admin costs, and Spense pricing.
 
| Market | Currency | Notes |
|--------|----------|-------|
| Norway | NOK | Default market |
| Denmark | DKK | Validated against live Nellemann/Ejby customer data |
| Benelux | EUR | |
| Germany | EUR | |
| Switzerland | CHF | |
| Italy | EUR | |
| UK | GBP | |
 
Car sales pricing for non-Denmark markets is placeholder — update when confirmed pricing is available.
 
---
 
## Key assumptions to validate with each prospect
 
- **Payments per month per location** — ask the finance manager, not the dealer principal
- **Admin minutes per payment** — the most sensitive input; validated conservative baseline is 10 min (Nellemann, Denmark)
- **Admin minutes per car sale** — validated at 18 min from Hedin Norway data; 10 min is conservative
- **Number of locations** — confirm group structure, not just the location you're meeting at
 
---
 
## Updating the calculator
 
When a new version of the HTML file is ready:
 
1. Go to [github.com/MortenSpense/spense-calculator](https://github.com/MortenSpense/spense-calculator)
2. Click **Add file → Upload files**
3. Upload the new HTML file
4. Click **Commit changes**
 
The live URL updates automatically within ~1 minute. No further action needed.
 
---
 
## Version history
 
| Version | Changes |
|---------|---------|
| v2.5 | Save assumptions uses fetch when hosted; locations slider extended to 50 |
| v2.4 | Save assumptions button — downloads personalised copy with current values as defaults |
| v2.3 | POS terminals per location slider added |
| v2.2 | FTE hours badge bug fixed; combined FTE card added to combined view |
| v2.1 | Avg car value slider min lowered to cover kr175,000 DKK |
| v2.0 | Three-view tool: Aftersales, Car Sales, Combined |
| v1.4 | Transaction fee slider goes to zero; overlap duration extended to 36 months |
| v1.3 | Flag emoji replaced with ISO code badges (Windows compatibility) |
| v1.2 | PSP fee fixed to Option A — added to both sides, net zero on savings |
| v1.1 | Denmark preset updated to 10 min admin time (validated Nellemann baseline) |
| v1.0 | Initial field-ready release |
 
---
 
## Reference cases
 
**Nellemann A/S (Denmark)** — kr295K annual savings at 10 min conservative baseline. 5 locations, 229 payments/month per location.
 
**Bil i Nord (Norway)** — kr592K combined annual savings (kr527K aftersales + kr64K car sales). 9 locations, 165 payments/month, 25 cars/month per location, 18 min car admin time. 14 month payback, 29% 5-year ROI.
