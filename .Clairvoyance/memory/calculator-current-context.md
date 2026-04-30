# Calculator Current Context

> Last updated: 2026-04-22
> Author: Quinn

## Project Structure Note

`spense-calculator` and `spense-backend` are one product. **Todos and sprints live in `spense-backend`** — look there for planning context. This memory file covers frontend-specific rules and context only.

## Start Here

The calculator is currently a self-contained `index.html` sales tool hosted on GitHub Pages:

```text
https://mortenspense.github.io/spense-calculator/
```

The active product version is v3.0: reps can publish prospect-specific URLs through the Cloudflare backend.

## Most Important Rules

- Do not add sliders back to monetary fields.
- Keep Spense pricing visible but read-only in saved/published prospect copies.
- Preserve the active view when saving or publishing.
- Treat `/Users/morten_spense/spense-calculator` as the authoritative frontend clone.
- Ignore `/Users/morten_spense/Downloads/spense-calculator` unless told otherwise.

## Backend Connection

Publish endpoint:

```text
https://spense-publish.morten-olsson.workers.dev/publish
```

Prospect URLs:

```text
https://spense-tracker.morten-olsson.workers.dev/{slug}
```

The frontend currently contains a publish token. Be careful not to paste or expose it in documentation or chat.

## Open Items

- Confirm R2 90-day lifecycle expiry (Cloudflare dashboard config, no code change).
- Keep README updated whenever workflow changes.

## Confirmed Working (as of 2026-04-22)

- Publish for prospect flow: end-to-end with PUBLISH_SECRET auth.
- Slug overwrite: frontend shows confirm dialog; worker returns 409 on conflict. Commit: `5ba07ab`.
- Slack notifications: tested and working. No further IT setup needed.
- Rep dropdown: Lars Vangen Jordet, Didrik Jarlsby, Morten Olsson, Claus Persson.
