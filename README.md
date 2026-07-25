# [unscrewed.lol](https://unscrewed.lol)

An independent, public-benefit-intended barter marketplace for exchanging
nearby goods, skills, and time without a platform taking a cut.

The project is deliberately early. Review the
[live community evidence](https://unscrewed.lol/community) and
[testable operating commitments](https://unscrewed.lol/public-benefit),
including the zeroes, rather than treating signup totals or repository activity
as proof of community impact.

Core barter stays free: browsing, posting, proposing, negotiating, and signing
a basic trade carry no platform fee. unscrewed is not a nonprofit,
public-benefit corporation, university program, or endorsement claim.

## Try or review it

- [Browse real active listings](https://unscrewed.lol/browse)
- [Read the safety guidance](https://unscrewed.lol/safety)
- [Review the terms and enforcement rules](https://unscrewed.lol/tos)
- [Read practical barter and reuse guides](https://unscrewed.lol/blog)
- [Follow the public Atom feed](https://unscrewed.lol/blog/feed.xml)
- [Ask a question or report a problem](https://unscrewed.lol/contact)

## Stack

- **Frontend**: React + Vite + TailwindCSS + React Router + MapLibre GL
  → deployed to **Cloudflare Pages** (project: `unscrewed-web`, account: `smb`)
- **API**: Hono on **Cloudflare Workers** at `api.unscrewed.lol`
- **DB**: **Cloudflare D1** (SQLite) via Drizzle ORM
- **Storage**: **Cloudflare R2** for listing photos
- **Sessions / rate limits**: **Cloudflare KV**
- **Realtime negotiation rooms**: **Durable Objects** (one per negotiation)
- **Bot protection**: **Cloudflare Turnstile**
- **Transactional email**: **Cloudflare Email Service**
- **Authentication**: email/password or passkey; optional phone numbers are
  contact fields only and are never texted or verified

## Domain

- `unscrewed.lol` / `www.unscrewed.lol` → Pages
- `api.unscrewed.lol` → Workers

## Layout

```
apps/
  web/          Vite + React frontend
  api/          Hono Worker API
packages/
  shared/       Zod schemas + TypeScript types shared by web + api
  db/           Drizzle schema + D1 migrations
```

## First-time setup

1. **Install deps** — `pnpm install` from repo root
2. **Cloudflare login** — `pnpm dlx wrangler login` and pick the `smb` account
3. **Create D1 / KV / R2 / DO bindings** — see `apps/api/SETUP.md`
4. **Set secrets** (never commit these):
   ```bash
   cd apps/api
   pnpm dlx wrangler secret put SESSION_SECRET
   pnpm dlx wrangler secret put TURNSTILE_SECRET_KEY
   ```
5. **Run migrations** — `pnpm --filter @unscrewed/db migrate:local`
6. **Dev** — `pnpm dev` (runs web on `:5173`, api on `:8787`)

## Branch policy

Implementation lands on `dev`; verified production releases are fast-forwarded
to `main`.
