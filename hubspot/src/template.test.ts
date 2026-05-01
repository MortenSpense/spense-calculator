import { describe, it, expect } from 'vitest';
import { renderResultPage } from './template';
import { compute } from './compute';
import { MARKETS } from './markets';

const SAMPLE = {
  prospect: { firstname: 'Anna', lastname: 'Jensen', company: 'Acme Motors', email: 'anna@acme.dk' },
  market: MARKETS.denmark,
  form: { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 },
  savings: compute({ locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 }, MARKETS.denmark),
  ctaUrl: 'https://meetings.hubspot.com/morten-olsson',
  repName: 'Morten Olsson',
};

describe('renderResultPage()', () => {
  const html = renderResultPage(SAMPLE);

  it('returns a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
    expect(html).toContain('<title>');
  });

  it('shows the prospect company name in the hero', () => {
    expect(html).toContain('Acme Motors');
  });

  it('greets the prospect by first name', () => {
    expect(html).toContain('Anna');
  });

  it('shows market name', () => {
    expect(html).toContain('Denmark');
  });

  it('shows the form-input echo (locations, payments, minutes)', () => {
    expect(html).toContain('5');           // locations
    expect(html).toContain('229');          // payments/mo
    expect(html).toContain('10 minutes');   // admin time
  });

  it('shows annual breakdown rows', () => {
    expect(html).toContain('Admin cost today');
    expect(html).toContain('Admin cost with Spense');
    expect(html).toContain('Spense fees');
    expect(html).toContain('Net annual savings');
    expect(html).toContain('Payback period');
  });

  it('shows the 5-year section with chart and total', () => {
    expect(html).toContain('Over 5 years');
    expect(html).toContain('5-year net savings');
    expect(html).toContain('<svg ');
    // 5 bars rendered for the cumulative chart
    expect((html.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(5);
    // "Year 1" through "Year 5" axis labels
    for (let y = 1; y <= 5; y++) {
      expect(html).toContain(`Year ${y}`);
    }
  });

  it('uses native currency symbol for Denmark (kr)', () => {
    expect(html).toContain('kr');
  });

  it('renders the rep-specific CTA when repName is provided', () => {
    expect(html).toContain('Morten Olsson');
    expect(html).toContain('Book a 30-minute call');
    expect(html).toContain('https://meetings.hubspot.com/morten-olsson');
  });

  it('renders generic CTA when repName is missing', () => {
    const generic = renderResultPage({ ...SAMPLE, repName: undefined });
    expect(generic).not.toContain('with <strong>');
    expect(generic).toContain('our team');
  });

  it('escapes HTML in user-supplied fields (XSS guard)', () => {
    const malicious = renderResultPage({
      ...SAMPLE,
      prospect: { ...SAMPLE.prospect, company: '<script>alert(1)</script>' },
    });
    expect(malicious).not.toContain('<script>alert(1)</script>');
    expect(malicious).toContain('&lt;script&gt;');
  });

  it('contains no external network requests (no http(s):// in script/link/img tags)', () => {
    // We allow https://meetings.hubspot.com in href (the CTA), but disallow loaded resources
    expect(html).not.toMatch(/<script[^>]*src=/);
    expect(html).not.toMatch(/<link[^>]*href=["']https?:/);
    expect(html).not.toMatch(/<img[^>]*src=/);
  });

  it('produces sensible output for every market preset', () => {
    for (const [key, preset] of Object.entries(MARKETS)) {
      const result = renderResultPage({
        ...SAMPLE,
        market: preset,
        savings: compute(SAMPLE.form, preset),
      });
      expect(result.length).toBeGreaterThan(2_000);
      expect(result).toContain(preset.displayName);
    }
  });
});
