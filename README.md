# unscrewed.lol

A barter marketplace — trade goods and services without giving corporations a cut.
Listings, negotiation chat, signed social contracts. Built 100% on Cloudflare.

## Stack

- **Frontend**: React + Vite + TailwindCSS + React Router + MapLibre GL
  → deployed to **Cloudflare Pages** (project: `unscrewed-web`, account: `smb`)
- **API**: Hono on **Cloudflare Workers** at `api.unscrewed.lol`
- **DB**: **Cloudflare D1** (SQLite) via Drizzle ORM
- **Storage**: **Cloudflare R2** for listing photos
- **Sessions / rate limits**: **Cloudflare KV**
- **Realtime negotiation rooms**: **Durable Objects** (one per negotiation)
- **Bot protection**: **Cloudflare Turnstile**
- **SMS 2FA**: **Telnyx** Messaging API

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
   pnpm dlx wrangler secret put TELNYX_API_KEY
   pnpm dlx wrangler secret put TELNYX_MESSAGING_PROFILE_ID
   pnpm dlx wrangler secret put TELNYX_FROM_NUMBER
   pnpm dlx wrangler secret put SESSION_SECRET
   pnpm dlx wrangler secret put TURNSTILE_SECRET_KEY
   ```
5. **Run migrations** — `pnpm --filter @unscrewed/db migrate:local`
6. **Dev** — `pnpm dev` (runs web on `:5173`, api on `:8787`)

## Branch policy

All work on `dev`. `main` is reserved for tagged releases.
