# Staff Working Notes

> Last updated: 2026-04-22
> Author: Quinn

## Documentation Discipline

When a feature is implemented, deployed, or verified, update the relevant docs and memory in the same session.

For this project, especially update:

- `.clairvoyance/Docs/project-overview.md`
- `.clairvoyance/Docs/architecture.md`
- `.clairvoyance/Docs/project-history-and-decisions.md`
- frontend README when user-facing workflow changes

Recent example: Slack notifications were tested and confirmed working, but documentation still described them as pending. Avoid leaving that kind of status drift for the next staff member.

## Handoff Rule

Before pausing work or hitting a rate/tool limit, leave a short note covering:

- what was changed
- what was tested
- what still needs verification
- any known mismatch between todos/docs/code

The user should not have to reconstruct project state from chat history.
