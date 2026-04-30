# Company-Managed Infrastructure Migration

> Last updated: 2026-04-23
> Author: Quinn

## Purpose

This note captures migration considerations for moving the Spense calculator platform from Morten-owned infrastructure to company-managed infrastructure.

## Current State

- Frontend hosted on GitHub Pages under Morten-owned GitHub repository.
- Backend Workers and R2 bucket live in Morten-owned Cloudflare account.
- Prospect URL format currently uses a Cloudflare `workers.dev` hostname.

Current public prospect URL format:

```text
https://spense-roi.results-calc.workers.dev/{slug}
```

## Naming Note

On 2026-04-23, the public worker name was changed from `spense-tracker` to `spense-roi` to avoid sending customer links containing the word `tracker`.

This improved the customer-facing hostname immediately, but two personal-account artifacts remain:

- `morten-olsson` in the `workers.dev` account subdomain
- Morten-owned GitHub and Cloudflare accounts

## Preferred Long-Term End State

- company-managed GitHub organization/repository
- company-managed Cloudflare account
- company-managed secrets
- ideally a company-owned custom domain for prospect URLs

Example desired future format:

```text
https://roi.spense.{tld}/{slug}
```

## Interim Option

If needed before full migration, the Cloudflare account subdomain can be changed from `morten-olsson` to a neutral/company name. This will change every `workers.dev` URL under the account, so it should only be done when there are no important live links or when redirects/custom-domain cutover are ready.
