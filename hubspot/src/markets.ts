/**
 * Market presets for the lead-gen calculator.
 *
 * All monetary values are in **native currency** — there is no EUR-pivot.
 * Pricing matrix validated 2026-04-29 with Morten. Industry-assumption fields
 * (hourlyCost, avgPaymentValue, growthRatePct) are derived from the rep-facing
 * tool's existing presets and may be revised once Henning's native-currency
 * frontend refactor lands and live data refines them.
 *
 * Sweden was added 2026-04-29 ahead of Claus Persson's start (2026-05-04);
 * its industry assumptions mirror Denmark pending Claus's review.
 */

export type MarketKey =
  | 'norway'
  | 'denmark'
  | 'sweden'
  | 'benelux'
  | 'germany'
  | 'italy'
  | 'switzerland'
  | 'uk'
  | 'otherEur';

export type Currency = 'NOK' | 'DKK' | 'SEK' | 'EUR' | 'CHF' | 'GBP';

export interface MarketPreset {
  currency: Currency;
  displayName: string;

  // Industry defaults (apply to fields the lead-gen form does not capture)
  hourlyCost: number;              // labour cost per hour, native currency
  avgPaymentValue: number;         // average aftersales payment value, native currency
  growthRatePct: number;           // annual transaction growth, fraction (0.03 = 3%)
  minutesPerPaymentSpense: number; // post-Spense admin time per payment (min)
  onboardingHoursPerLoc: number;   // implementation labour hours per location

  // Spense pricing — aftersales (the lead-gen scope)
  licensePerLocPerMonth: number;
  terminalPerMonth: number;
  terminalsPerLoc: number;
  transactionFeeFraction: number;  // e.g. 0.0005 for Denmark's 0.05%
  onboardingFeePerLoc: number;     // one-time
  smsFeePerSms: number;            // hidden default
  personalisedUrlPerMonth: number; // hidden default

  // Spense pricing — car sales (not used by lead-gen v1; included for completeness)
  carSalesLicensePerLocPerMonth: number;
  carSalesFeePerCar: number;
}

/** Assumed SMS messages per aftersales payment. Default 1.0; revisit with usage data. */
export const SMS_PER_PAYMENT_ASSUMPTION = 1.0;

export const MARKETS: Record<MarketKey, MarketPreset> = {
  norway: {
    currency: 'NOK',
    displayName: 'Norway',
    hourlyCost: 465,
    avgPaymentValue: 31500,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 3500,
    terminalPerMonth: 250,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 5000,
    smsFeePerSms: 1.0,
    personalisedUrlPerMonth: 190,
    carSalesLicensePerLocPerMonth: 1500,
    carSalesFeePerCar: 50,
  },

  denmark: {
    currency: 'DKK',
    displayName: 'Denmark',
    hourlyCost: 285,
    avgPaymentValue: 4775,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 2500,
    terminalPerMonth: 250,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0005,
    onboardingFeePerLoc: 5000,
    smsFeePerSms: 0.5,
    personalisedUrlPerMonth: 125,
    carSalesLicensePerLocPerMonth: 990,
    carSalesFeePerCar: 30,
  },

  sweden: {
    currency: 'SEK',
    displayName: 'Sweden',
    hourlyCost: 420,
    avgPaymentValue: 7000,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 3650,
    terminalPerMonth: 365,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0010,
    onboardingFeePerLoc: 7300,
    smsFeePerSms: 0.75,
    personalisedUrlPerMonth: 185,
    carSalesLicensePerLocPerMonth: 1450,
    carSalesFeePerCar: 45,
  },

  benelux: {
    currency: 'EUR',
    displayName: 'Benelux',
    hourlyCost: 32,
    avgPaymentValue: 2700,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 335,
    terminalPerMonth: 30,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 670,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 15,
    carSalesLicensePerLocPerMonth: 135,
    carSalesFeePerCar: 4,
  },

  germany: {
    currency: 'EUR',
    displayName: 'Germany',
    hourlyCost: 30,
    avgPaymentValue: 2800,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 335,
    terminalPerMonth: 30,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 670,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 15,
    carSalesLicensePerLocPerMonth: 135,
    carSalesFeePerCar: 4,
  },

  italy: {
    currency: 'EUR',
    displayName: 'Italy',
    hourlyCost: 24,
    avgPaymentValue: 2400,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 335,
    terminalPerMonth: 30,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 670,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 15,
    carSalesLicensePerLocPerMonth: 135,
    carSalesFeePerCar: 4,
  },

  switzerland: {
    currency: 'CHF',
    displayName: 'Switzerland',
    hourlyCost: 53,
    avgPaymentValue: 2700,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 310,
    terminalPerMonth: 28,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 625,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 14,
    carSalesLicensePerLocPerMonth: 125,
    carSalesFeePerCar: 4,
  },

  uk: {
    currency: 'GBP',
    displayName: 'United Kingdom',
    hourlyCost: 24,
    avgPaymentValue: 2150,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 290,
    terminalPerMonth: 30,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 670,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 15,
    carSalesLicensePerLocPerMonth: 115,
    carSalesFeePerCar: 4,
  },

  // Catch-all for Spanish, Portuguese, Austrian etc. prospects choosing
  // "Other EUR market" on the form. Quoted in EUR using benelux pricing.
  otherEur: {
    currency: 'EUR',
    displayName: 'Other EUR market',
    hourlyCost: 30,
    avgPaymentValue: 2700,
    growthRatePct: 0.03,
    minutesPerPaymentSpense: 3,
    onboardingHoursPerLoc: 3,
    licensePerLocPerMonth: 335,
    terminalPerMonth: 30,
    terminalsPerLoc: 1,
    transactionFeeFraction: 0.0020,
    onboardingFeePerLoc: 670,
    smsFeePerSms: 0.1,
    personalisedUrlPerMonth: 15,
    carSalesLicensePerLocPerMonth: 135,
    carSalesFeePerCar: 4,
  },
};

/** Map a HubSpot form value to a market key, or null if unsupported. */
export function resolveMarket(formValue: string): MarketKey | null {
  const normalised = formValue.trim().toLowerCase();
  const map: Record<string, MarketKey> = {
    'no': 'norway',           'norway': 'norway',
    'dk': 'denmark',          'denmark': 'denmark',
    'se': 'sweden',           'sweden': 'sweden',
    'ger': 'germany',         'de': 'germany',         'germany': 'germany',
    'uk': 'uk',               'united kingdom': 'uk',  'gb': 'uk',
    'be': 'benelux',          'belgium': 'benelux',
    'nl': 'benelux',          'netherlands': 'benelux',
    'lux': 'benelux',         'luxembourg': 'benelux',
    'it': 'italy',            'italy': 'italy',
    'ch': 'switzerland',      'switzerland': 'switzerland',
    'other eur market': 'otherEur',
    'other': 'otherEur',
  };
  return map[normalised] ?? null;
}
