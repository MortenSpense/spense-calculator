import { describe, it, expect } from 'vitest';
import { computeSlug, parseSlugFromUrl } from './slug';

const SECRET = 'test-worker-secret';
const FORM_A = { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 };
const FORM_B = { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 12 };

describe('computeSlug()', () => {
  it('produces a slug in the expected format: lg-{6 hex chars}', async () => {
    const slug = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    expect(slug).toMatch(/^lg-[a-f0-9]{6}$/);
  });

  it('is deterministic — same inputs produce the same slug', async () => {
    const a = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    const b = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    expect(a).toBe(b);
  });

  it('different contactId → different slug', async () => {
    const a = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    const b = await computeSlug('99999', FORM_A, 'denmark', SECRET);
    expect(a).not.toBe(b);
  });

  it('different form values → different slug (so resubmission triggers new URL)', async () => {
    const a = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    const b = await computeSlug('12345', FORM_B, 'denmark', SECRET);
    expect(a).not.toBe(b);
  });

  it('different market → different slug', async () => {
    const a = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    const b = await computeSlug('12345', FORM_A, 'sweden', SECRET);
    expect(a).not.toBe(b);
  });

  it('different secret → different slug (unguessable from outside)', async () => {
    const a = await computeSlug('12345', FORM_A, 'denmark', SECRET);
    const b = await computeSlug('12345', FORM_A, 'denmark', 'different-secret');
    expect(a).not.toBe(b);
  });
});

describe('parseSlugFromUrl()', () => {
  it('extracts the slug from a valid lead-gen URL', () => {
    expect(
      parseSlugFromUrl('https://spense-roi.results-calc.workers.dev/lg/lg-7a3b2c'),
    ).toBe('lg-7a3b2c');
  });

  it('returns null for a rep-published URL (no /lg/ prefix)', () => {
    expect(
      parseSlugFromUrl('https://spense-roi.results-calc.workers.dev/acme-motors'),
    ).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(parseSlugFromUrl('not a url at all')).toBeNull();
    expect(parseSlugFromUrl('https://example.com/lg/wrong-format')).toBeNull();
  });
});
