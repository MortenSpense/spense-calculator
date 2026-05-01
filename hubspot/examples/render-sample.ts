/**
 * Generate a sample lead-gen result page for visual inspection.
 *
 * Run via:  npm run sample
 * Output:   examples/sample-denmark.html (open in a browser)
 *
 * Renders a realistic 5-location Danish dealership scenario so the
 * visual style and number presentation can be reviewed before the
 * worker is deployed.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute } from '../src/compute';
import { MARKETS } from '../src/markets';
import { renderResultPage } from '../src/template';

const here = dirname(fileURLToPath(import.meta.url));

const samples = [
  {
    name: 'sample-denmark.html',
    prospect: { firstname: 'Anna', lastname: 'Jensen', company: 'Acme Motors', email: 'anna@acme.dk' },
    market: MARKETS.denmark,
    form: { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 },
    repName: 'Morten Olsson',
    ctaUrl: 'https://meetings.hubspot.com/morten-olsson',
  },
  {
    name: 'sample-norway.html',
    prospect: { firstname: 'Lars', lastname: 'Berg', company: 'Bil i Nord', email: 'lars@bil-i-nord.no' },
    market: MARKETS.norway,
    form: { locations: 8, paymentsPerMonth: 280, adminMinutesPerPayment: 12 },
    repName: 'Didrik Jarlsby',
    ctaUrl: 'https://meetings.hubspot.com/didrik-jarlsby',
  },
  {
    name: 'sample-germany.html',
    prospect: { firstname: 'Klaus', lastname: 'Müller', company: 'Auto München GmbH', email: 'klaus@am.de' },
    market: MARKETS.germany,
    form: { locations: 12, paymentsPerMonth: 320, adminMinutesPerPayment: 9 },
    repName: 'Morten Olsson',
    ctaUrl: 'https://meetings.hubspot.com/morten-olsson',
  },
];

for (const s of samples) {
  const savings = compute(s.form, s.market);
  const html = renderResultPage({
    prospect: s.prospect,
    market: s.market,
    form: s.form,
    savings,
    ctaUrl: s.ctaUrl,
    repName: s.repName,
  });
  const outPath = resolve(here, s.name);
  writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  Net annual savings: ${Math.round(savings.netAnnualSavings).toLocaleString('en-US')} ${s.market.currency}`);
  console.log(`  Payback: ${Math.round(savings.paybackMonths)} months`);
  console.log(`  5-year net: ${Math.round(savings.fiveYearNetSavings).toLocaleString('en-US')} ${s.market.currency}`);
}
