<!--
Default PR template for unscrewed.lol.

Flow:
  feature/* → PR → dev → PR → main

If this PR is a release (dev → main), append `?template=release.md` to
the PR-creation URL to load the release-specific template instead.
-->

## Summary
<!-- 1–3 bullets describing what this PR changes and why. -->

-
-

## Affected surfaces
- [ ] Web (`apps/web`)
- [ ] API Worker (`apps/api`)
- [ ] Shared schemas (`packages/shared`)
- [ ] DB schema or migrations (`packages/db`)
- [ ] Worker bindings / `wrangler.toml`
- [ ] Build / CI config (`.github`, `wrangler.toml`, etc.)
- [ ] Docs only

## Migrations / breaking changes
<!-- Anything in this PR that needs a manual step before/after deploy?
Examples: new D1 migration, new wrangler secret, new env var, new
Cloudflare resource (KV / R2 / DO class), new Telnyx number, etc. -->

- [ ] No migration or breaking change
- [ ] D1 migration included → ran on dev D1 before review
- [ ] New secret required → set on `unscrewed-api` and `unscrewed-api-dev` via `wrangler secret put --env …`
- [ ] New env var in Pages → set for Production and Preview in dashboard
- [ ] Other (describe below)

## How was this tested
<!-- Replace with what you actually did. -->

- [ ] Local dev (`pnpm dev`) — describe what flow was exercised:
- [ ] Dev preview (after Pages preview build):
- [ ] Logged in as a seed demo user (`unscrewed-demo-2026`)
- [ ] Tested as admin

## Screenshots / recordings
<!-- For UI changes, drop a screenshot or short clip. Mobile + desktop
if the change affects layout. -->

## Risk
<!-- Cap at one paragraph. What's the blast radius if something is
wrong? What's the rollback (PR revert? wrangler rollback? DB action?) -->

## Follow-ups
<!-- Out-of-scope items you noticed while doing this. Open issues or
note them here so they aren't forgotten. -->

-

---
🤖 Generated with Claude. Please review carefully before merging.
