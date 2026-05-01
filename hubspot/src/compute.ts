/**
 * Lead-gen savings calculation.
 *
 * Pure function. Native-currency math throughout. Mirrors the rep-facing
 * tool's calcAS() but simplified for lead-gen scope:
 *   - aftersales only (no car sales view)
 *   - no toggleable scenarios (hidden complexity, PSP, overlap, risk are off)
 *   - SMS and personalised-URL fees included as defaults
 *
 * Formulas correspond to the rep-tool's calcAS in /index.html. If they
 * diverge, that is a bug — both must produce the same numbers for the
 * same inputs and pricing.
 */

import type { MarketPreset } from './markets';
import { SMS_PER_PAYMENT_ASSUMPTION } from './markets';

export interface FormInputs {
  /** Number of dealership locations (>= 1). */
  locations: number;
  /** Aftersales payments per month, **per location**. */
  paymentsPerMonth: number;
  /** Current admin minutes spent per payment. */
  adminMinutesPerPayment: number;
}

export interface YearProjection {
  year: number;
  current: number;     // annual cost without Spense in this year
  withSpense: number;  // annual cost with Spense in this year
  savings: number;     // current - withSpense
}

export interface SavingsResult {
  // Annual case
  adminCostToday: number;       // labour cost today, full year
  adminCostWithSpense: number;  // labour cost with Spense, full year
  spenseFees: number;           // total annual Spense fees
  netAnnualSavings: number;     // adminCostToday - (adminCostWithSpense + spenseFees)

  // Implementation + payback
  implementationCost: number;   // one-time onboarding (fee + labour)
  paybackMonths: number;        // months until net savings cover implementationCost; Infinity if savings <= 0

  // 5-year projection
  fiveYearChartData: YearProjection[];
  fiveYearNetSavings: number;   // cumulative 5-year (current - withSpense) minus implementationCost

  // Spense fee breakdown (handy for tooltips / detailed views)
  feeBreakdown: {
    license: number;
    terminal: number;
    transaction: number;
    sms: number;
    personalisedUrl: number;
  };
}

const HOURS_PER_MONTH = (mins: number) => mins / 60;

export function compute(form: FormInputs, market: MarketPreset): SavingsResult {
  const { locations, paymentsPerMonth, adminMinutesPerPayment } = form;
  const totalPaymentsPerMonth = paymentsPerMonth * locations;

  // -- Annual labour costs --
  const annualHours = (mpp: number) => totalPaymentsPerMonth * HOURS_PER_MONTH(mpp) * 12;
  const adminCostToday = annualHours(adminMinutesPerPayment) * market.hourlyCost;
  const adminCostWithSpense = annualHours(market.minutesPerPaymentSpense) * market.hourlyCost;

  // -- Annual Spense fees --
  const annualLicense = market.licensePerLocPerMonth * locations * 12;
  const annualTerminal = market.terminalPerMonth * market.terminalsPerLoc * locations * 12;
  const annualTransactionVolume = totalPaymentsPerMonth * market.avgPaymentValue * 12;
  const annualTransactionFee = annualTransactionVolume * market.transactionFeeFraction;
  const annualSms = totalPaymentsPerMonth * SMS_PER_PAYMENT_ASSUMPTION * market.smsFeePerSms * 12;
  const annualPersonalisedUrl = market.personalisedUrlPerMonth * locations * 12;

  const spenseFees =
    annualLicense + annualTerminal + annualTransactionFee + annualSms + annualPersonalisedUrl;

  const netAnnualSavings = adminCostToday - (adminCostWithSpense + spenseFees);

  // -- Implementation cost --
  const onboardingFee = market.onboardingFeePerLoc * locations;
  const onboardingLabour = market.onboardingHoursPerLoc * locations * market.hourlyCost;
  const implementationCost = onboardingFee + onboardingLabour;

  // -- Payback --
  const monthlySavings = netAnnualSavings / 12;
  const paybackMonths = monthlySavings > 0 ? implementationCost / monthlySavings : Infinity;

  // -- 5-year projection (transactions grow at growthRatePct annually; Spense fees scale with volume) --
  const fiveYearChartData: YearProjection[] = [];
  let cumulativeCurrent = 0;
  let cumulativeWithSpense = 0;

  for (let year = 1; year <= 5; year++) {
    const growthFactor = Math.pow(1 + market.growthRatePct, year - 1);
    const yearPpm = totalPaymentsPerMonth * growthFactor;
    const yearVolume = yearPpm * market.avgPaymentValue * 12;

    const yearAdminToday = yearPpm * HOURS_PER_MONTH(adminMinutesPerPayment) * 12 * market.hourlyCost;
    const yearAdminSpense = yearPpm * HOURS_PER_MONTH(market.minutesPerPaymentSpense) * 12 * market.hourlyCost;
    const yearTransactionFee = yearVolume * market.transactionFeeFraction;
    const yearSms = yearPpm * SMS_PER_PAYMENT_ASSUMPTION * market.smsFeePerSms * 12;

    // License + terminal + personalised-URL are per-location/per-month, not volume-driven — they don't grow with transactions
    const yearWithSpense =
      yearAdminSpense + annualLicense + annualTerminal + yearTransactionFee + yearSms + annualPersonalisedUrl;

    cumulativeCurrent += yearAdminToday;
    cumulativeWithSpense += yearWithSpense;

    fiveYearChartData.push({
      year,
      current: yearAdminToday,
      withSpense: yearWithSpense,
      savings: yearAdminToday - yearWithSpense,
    });
  }

  const fiveYearNetSavings = cumulativeCurrent - cumulativeWithSpense - implementationCost;

  return {
    adminCostToday,
    adminCostWithSpense,
    spenseFees,
    netAnnualSavings,
    implementationCost,
    paybackMonths,
    fiveYearChartData,
    fiveYearNetSavings,
    feeBreakdown: {
      license: annualLicense,
      terminal: annualTerminal,
      transaction: annualTransactionFee,
      sms: annualSms,
      personalisedUrl: annualPersonalisedUrl,
    },
  };
}
