<!--
Release template: open this when merging dev → main to ship a
production release. Invoke via:
  https://github.com/shawnbure/unscrewed/compare/main...dev?template=release.md
-->

## Release `vYYYY.MM.DD`
<!-- Replace with a version. Suggested: calver for date-based releases. -->

## What's in this release
<!-- Group by surface. Paste from `git log main..dev --oneline` and edit. -->

### Web

-

### API

-

### DB / infra

-

## Migrations to apply BEFORE merging this PR

<!-- For each migration file, prove it's been applied to the prod D1.
Use:
  cd apps/api && pnpm exec wrangler d1 execute unscrewed --remote --file ../path/to/migration.sql
-->

- [ ] No migrations
- [ ] Migrations applied to prod D1 (list files):
  - `packages/db/src/migrations/…`

## Secrets / config changes to apply BEFORE merging

- [ ] None
- [ ] New `wrangler secret put` needed on `unscrewed-api` (list names, not values):
- [ ] New env vars on Pages Production:

## Pre-release verification on dev.unscrewed.lol

- [ ] Homepage loads + categories render
- [ ] Signup → SMS code → verify works
- [ ] Login → session cookie set
- [ ] Post a trade → photo upload → listing visible on Browse
- [ ] Propose a trade against a listing → AI contract draft works
- [ ] Sign a contract from both parties → status flips to signed
- [ ] My Trades inbox shows the negotiation + contract correctly
- [ ] Admin section accessible for admin users only

## Rollback plan

- Revert this PR (`Revert` button on the merged PR).
- Pages and Workers auto-redeploy from the revert commit.
- If a migration was applied that needs to be undone, run the reverse
  SQL on prod D1 manually — do not rely on the PR revert for schema.

## Communication

- [ ] No outward communication needed
- [ ] Tweet / post / email after merge (note where)

---
🤖 Generated with Claude. Production releases get more scrutiny than
feature PRs — fill every section before merging.
