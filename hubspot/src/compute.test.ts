/**
 * Tests for the lead-gen savings calculation.
 *
 * Numbers below are computed manually from market presets and form inputs;
 * if these tests fail after a code change, decide deliberately whether the
 * calc is wrong or the assumptions changed.
 */

import { describe, it, expect } from 'vitest';
import { compute } from './compute';
import { MARKETS } from './markets';

describe('compute()', () => {
  describe('Denmark — 5 locations, 229 payments/loc/mo, 10 min/payment', () => {
    const result = compute(
      { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 },
      MARKETS.denmark,
    );

    it('produces positive net annual savings', () => {
      expect(result.netAnnualSavings).toBeGreaterThan(0);
    });

    it('annual labour today: 1145 payments/mo × 10 min × 12 mo × 285 DKK/h ≈ 652,650 DKK', () => {
      // tPpm = 229 × 5 = 1145; hours/year = 1145 × (10/60) × 12 = 2290; × 285 DKK/h
      expect(result.adminCostToday).toBeCloseTo(652_650, 0);
    });

    it('annual labour with Spense: same volume × 3 min × 285 DKK/h ≈ 195,795 DKK', () => {
      expect(result.adminCostWithSpense).toBeCloseTo(195_795, 0);
    });

    it('Denmark txf = 0.05% (post-correction): annual fee on 65.6M DKK volume ≈ 32,800 DKK', () => {
      // The pre-correction value of 0.5% would have produced 328,000 DKK — 10× higher.
      // This test guards against the bug coming back.
      expect(result.feeBreakdown.transaction).toBeGreaterThan(30_000);
      expect(result.feeBreakdown.transaction).toBeLessThan(35_000);
    });

    it('payback is within a few months', () => {
      expect(result.paybackMonths).toBeLessThan(6);
      expect(result.paybackMonths).toBeGreaterThan(0);
    });

    it('5-year projection has 5 entries with monotonically growing volumes', () => {
      expect(result.fiveYearChartData).toHaveLength(5);
      for (let i = 1; i < 5; i++) {
        expect(result.fiveYearChartData[i].current).toBeGreaterThan(
          result.fiveYearChartData[i - 1].current,
        );
      }
    });

    it('5-year net savings is materially larger than 1-year savings (compounding labour growth)', () => {
      expect(result.fiveYearNetSavings).toBeGreaterThan(result.netAnnualSavings * 4);
    });
  });

  describe('Sweden vs Denmark — same form inputs, different pricing', () => {
    const form = { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 };
    const dk = compute(form, MARKETS.denmark);
    const se = compute(form, MARKETS.sweden);

    it('Sweden produces different fees than Denmark (txf 0.10% vs 0.05%)', () => {
      expect(se.feeBreakdown.transaction).not.toEqual(dk.feeBreakdown.transaction);
    });

    it('both produce positive net savings', () => {
      expect(dk.netAnnualSavings).toBeGreaterThan(0);
      expect(se.netAnnualSavings).toBeGreaterThan(0);
    });
  });

  describe('Single location, low volume — savings should still be positive', () => {
    const result = compute(
      { locations: 1, paymentsPerMonth: 100, adminMinutesPerPayment: 10 },
      MARKETS.denmark,
    );

    it('produces positive net annual savings', () => {
      expect(result.netAnnualSavings).toBeGreaterThan(0);
    });

    it('payback is finite (single-loc dealerships have longer payback but still positive ROI)', () => {
      expect(Number.isFinite(result.paybackMonths)).toBe(true);
    });
  });

  describe('Trivial volume — savings can be negative or near zero', () => {
    const result = compute(
      { locations: 1, paymentsPerMonth: 5, adminMinutesPerPayment: 10 },
      MARKETS.denmark,
    );

    it('returns finite numbers', () => {
      expect(Number.isFinite(result.netAnnualSavings)).toBe(true);
      expect(Number.isFinite(result.spenseFees)).toBe(true);
    });

    it('returns Infinity for payback when savings are non-positive', () => {
      if (result.netAnnualSavings <= 0) {
        expect(result.paybackMonths).toBe(Infinity);
      }
    });
  });

  describe('All markets — sanity check', () => {
    const baseForm = { locations: 5, paymentsPerMonth: 229, adminMinutesPerPayment: 10 };

    for (const [key, preset] of Object.entries(MARKETS)) {
      it(`${key}: produces finite numbers in correct currency`, () => {
        const result = compute(baseForm, preset);
        expect(Number.isFinite(result.adminCostToday)).toBe(true);
        expect(Number.isFinite(result.spenseFees)).toBe(true);
        expect(Number.isFinite(result.netAnnualSavings)).toBe(true);
        expect(result.fiveYearChartData).toHaveLength(5);
        expect(preset.currency).toMatch(/^(NOK|DKK|SEK|EUR|CHF|GBP)$/);
      });
    }
  });
});
