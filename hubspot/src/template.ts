/**
 * Lead-gen result page template.
 *
 * Pure function: takes the savings result + prospect data and returns a
 * complete, self-contained HTML document. No external dependencies (no
 * fonts, scripts, or stylesheets loaded from CDNs) so the page works in
 * any browser without network conditions.
 *
 * Design intent: read-only, single-screen narrative. Hero savings number,
 * echoed inputs, annual case, 5-year cumulative chart, single CTA. Mirrors
 * the agreed Wireloom mockup (Clairvoyance note "Lead-Gen Calculator
 * Mockup", reviewed and approved 2026-04-29).
 */

import type { FormInputs, SavingsResult } from './compute';
import type { MarketPreset } from './markets';

export interface RenderInput {
  prospect: {
    firstname?: string;
    lastname?: string;
    company: string;
    email?: string;
  };
  market: MarketPreset;
  form: FormInputs;
  savings: SavingsResult;
  /** Where the "Book a 30-minute call" CTA button points. */
  ctaUrl: string;
  /** Rep assigned to the prospect (shown in the CTA section as "talk to {repName}"). */
  repName?: string;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  NOK: 'kr',
  DKK: 'kr',
  SEK: 'kr',
  CHF: 'CHF',
  GBP: '£',
};

/** Format a number as currency. Compact (1.2M / 595K) for hero, full for breakdowns. */
function formatCurrency(value: number, currency: string, compact = false): string {
  const sym = SYMBOLS[currency] ?? currency;
  const v = Math.round(value);
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${sym} ${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sym} ${Math.round(v / 1_000).toLocaleString('en-US')}K`;
  }
  // Always use a stable locale so server-rendered output is deterministic.
  const formatted = v.toLocaleString('en-US').replace(/,/g, ' ');
  return `${sym} ${formatted}`;
}

function formatMonths(m: number): string {
  if (!isFinite(m) || m <= 0) return '—';
  if (m < 1) return '< 1 month';
  return `${Math.round(m)} months`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ */
/* SVG bar chart — cumulative 5-year savings                          */
/* ------------------------------------------------------------------ */

function renderCumulativeChart(yearData: SavingsResult['fiveYearChartData'], currency: string): string {
  // Cumulative running total of (current - withSpense)
  const cumulative: number[] = [];
  let running = 0;
  for (const y of yearData) {
    running += y.current - y.withSpense;
    cumulative.push(running);
  }

  const maxValue = cumulative[cumulative.length - 1];
  if (maxValue <= 0) return '<div class="chart-empty">No cumulative savings to chart.</div>';

  // SVG geometry
  const width = 500;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 50, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / cumulative.length;
  const barInner = barWidth * 0.65;

  const bars = cumulative
    .map((value, i) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + i * barWidth + (barWidth - barInner) / 2;
      const y = padding.top + (chartHeight - barHeight);
      const labelY = padding.top + chartHeight + 18;
      const valueLabelY = y - 6;
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barInner.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" class="chart-bar" />
        <text x="${(x + barInner / 2).toFixed(1)}" y="${valueLabelY.toFixed(1)}" class="chart-bar-label" text-anchor="middle">${formatCurrency(value, currency, true)}</text>
        <text x="${(x + barInner / 2).toFixed(1)}" y="${labelY}" class="chart-axis-label" text-anchor="middle">Year ${i + 1}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg" role="img" aria-label="Cumulative savings over 5 years">
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" class="chart-axis" />
      ${bars}
    </svg>
  `;
}

/* ------------------------------------------------------------------ */
/* Main render                                                        */
/* ------------------------------------------------------------------ */

export function renderResultPage(input: RenderInput): string {
  const { prospect, market, form, savings, ctaUrl, repName } = input;
  const company = escapeHtml(prospect.company);
  const greetingName = prospect.firstname ? `${escapeHtml(prospect.firstname)}, ` : '';
  const repBlurb = repName
    ? `Pick a 30-minute slot with <strong>${escapeHtml(repName)}</strong> to talk it through.`
    : 'Pick a 30-minute slot with our team to talk it through.';

  const c = market.currency;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spense ROI for ${company}</title>
<meta name="robots" content="noindex,nofollow">
<style>
:root {
  --blue: #3d60f5;
  --blue-soft: #eaeefe;
  --bg: #f7f8fa;
  --card: #ffffff;
  --border: #e5e7eb;
  --text: #1a1a1a;
  --text-muted: #6b7280;
  --success: #16a34a;
  --radius: 10px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Open Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  line-height: 1.55;
}
.wrapper { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
.brandbar { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; }
.brandbar .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--blue); }
.brandbar .name { font-weight: 700; letter-spacing: 0.02em; color: var(--text); }
.hero { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px 28px; margin-bottom: 20px; }
.hero .label { font-size: 14px; color: var(--text-muted); margin: 0 0 6px; }
.hero .number { font-size: 44px; font-weight: 700; color: var(--blue); margin: 0; letter-spacing: -0.02em; }
.hero .number small { font-size: 18px; color: var(--text); font-weight: 500; }
.hero .sublabel { font-size: 13px; color: var(--text-muted); margin: 14px 0 0; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px 24px; margin-bottom: 16px; }
.card h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 0 0 14px; }
.kv-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed var(--border); }
.kv-row:last-child { border-bottom: none; }
.kv-row .k { color: var(--text-muted); }
.kv-row .v { font-weight: 600; }
.kv-row.total { border-top: 1px solid var(--text); border-bottom: none; padding-top: 11px; margin-top: 6px; }
.kv-row.total .v { color: var(--success); font-size: 17px; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 600px) { .cols { grid-template-columns: 1fr; } }
.cols .card { margin-bottom: 0; }
.chart-svg { width: 100%; height: auto; max-height: 220px; }
.chart-bar { fill: var(--blue); }
.chart-axis { stroke: var(--border); stroke-width: 1; }
.chart-axis-label { font-size: 11px; fill: var(--text-muted); }
.chart-bar-label { font-size: 10px; fill: var(--text); font-weight: 600; }
.chart-empty { color: var(--text-muted); font-style: italic; padding: 20px; text-align: center; }
.cta-card { text-align: center; padding: 28px 24px; }
.cta-card h2 { color: var(--text); font-size: 18px; text-transform: none; letter-spacing: 0; margin-bottom: 8px; font-weight: 700; }
.cta-card p { color: var(--text-muted); margin: 0 0 18px; }
.btn-primary { display: inline-block; background: var(--blue); color: #fff; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-weight: 600; }
.btn-primary:hover { opacity: 0.9; }
footer { margin-top: 26px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
</style>
</head>
<body>
<div class="wrapper">

  <div class="brandbar"><span class="dot"></span><span class="name">SPENSE</span></div>

  <div class="hero">
    <p class="label">${greetingName}Spense could save ${company}</p>
    <p class="number">${formatCurrency(savings.netAnnualSavings, c)} <small>/ year</small></p>
    <p class="sublabel">Net of all Spense fees. Based on industry-validated data and the inputs you submitted.</p>
  </div>

  <div class="card">
    <h2>Based on what you told us</h2>
    <div class="kv-row"><span class="k">Dealership</span><span class="v">${company}</span></div>
    <div class="kv-row"><span class="k">Market</span><span class="v">${escapeHtml(market.displayName)}</span></div>
    <div class="kv-row"><span class="k">Locations</span><span class="v">${form.locations}</span></div>
    <div class="kv-row"><span class="k">Aftersales payments / month</span><span class="v">${form.paymentsPerMonth} per location</span></div>
    <div class="kv-row"><span class="k">Time per payment today</span><span class="v">${form.adminMinutesPerPayment} minutes</span></div>
  </div>

  <div class="cols">
    <div class="card">
      <h2>Annual savings</h2>
      <div class="kv-row"><span class="k">Admin cost today</span><span class="v">${formatCurrency(savings.adminCostToday, c)}</span></div>
      <div class="kv-row"><span class="k">Admin cost with Spense</span><span class="v">${formatCurrency(savings.adminCostWithSpense, c)}</span></div>
      <div class="kv-row"><span class="k">Spense fees</span><span class="v">${formatCurrency(savings.spenseFees, c)}</span></div>
      <div class="kv-row total"><span class="k">Net annual savings</span><span class="v">${formatCurrency(savings.netAnnualSavings, c)}</span></div>
      <div class="kv-row"><span class="k">Payback period</span><span class="v">${formatMonths(savings.paybackMonths)}</span></div>
    </div>
    <div class="card">
      <h2>Over 5 years</h2>
      ${renderCumulativeChart(savings.fiveYearChartData, c)}
      <div class="kv-row total"><span class="k">5-year net savings</span><span class="v">${formatCurrency(savings.fiveYearNetSavings, c, true)}</span></div>
    </div>
  </div>

  <div class="card cta-card">
    <h2>Want to talk it through?</h2>
    <p>${repBlurb}</p>
    <a class="btn-primary" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener">Book a 30-minute call</a>
  </div>

  <footer>
    <span>Spense ApS · spense.com</span>
    <span>Calculations are estimates — final pricing confirmed in conversation</span>
  </footer>

</div>
</body>
</html>`;
}
