/**
 * Deterministic slug computation for lead-gen result pages.
 *
 * The same (contactId, formValues, secret) always produces the same slug.
 * This makes the system naturally idempotent:
 *   - HubSpot retries → same slug → R2 write is a no-op
 *   - Resubmission with same form values → same slug → no spam email
 *   - Resubmission with different form values → different slug → new URL → new email
 *
 * Slug format: `lg-` + first 6 hex chars of sha256(contactId + formValuesJson + secret).
 * 24 bits of entropy = ~16M possibilities. WORKER_SECRET makes it unguessable.
 */

import type { FormInputs } from './compute';

export async function computeSlug(
  contactId: string,
  formValues: FormInputs,
  market: string,
  workerSecret: string,
): Promise<string> {
  // Stable JSON: same inputs always produce same string
  const stableInput = JSON.stringify({
    contactId,
    market,
    locations: formValues.locations,
    paymentsPerMonth: formValues.paymentsPerMonth,
    adminMinutesPerPayment: formValues.adminMinutesPerPayment,
    secret: workerSecret,
  });

  const bytes = new TextEncoder().encode(stableInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `lg-${hex.slice(0, 6)}`;
}

/** Extract the slug from a tracker URL like .../lg/lg-7k3p2 — returns null on mismatch. */
export function parseSlugFromUrl(url: string): string | null {
  const match = url.match(/\/lg\/(lg-[a-f0-9]{6})$/);
  return match ? match[1] : null;
}
