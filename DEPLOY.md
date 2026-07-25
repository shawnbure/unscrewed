# Deploying unscrewed.lol

Both Cloudflare projects pull straight from `shawnbure/unscrewed`. There is no
GitHub Actions workflow — Cloudflare's own Git integration handles the builds.

## Production branch

`main` is the production branch. Do implementation work on `dev`, verify it in
the preview deployment, then fast-forward `main` to release. Cloudflare Pages
deploys `dev` as a preview; production traffic remains on `main` until that
promotion happens.

## Pages: `unscrewed-web`

Connected via Cloudflare dashboard → Pages → Git integration.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Vite |
| Build command | `pnpm install && pnpm --filter @unscrewed/web build` |
| Build output | `apps/web/dist` |
| Root directory | *(blank — uses repo root)* |
| Node version | 22 (from `.nvmrc`) |
| `packageManager` field | `pnpm@11.4.0` (auto-detected) |

**Required env vars (Production + Preview):**

| Var | Value |
| --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | `0x4AAAAAADX94Jnt9tTJvk9D` |

**Custom domains** (set in Pages → unscrewed-web → Custom domains):
- `unscrewed.lol`
- `www.unscrewed.lol`

DNS (in unscrewed.lol zone, both proxied):
- `@ CNAME unscrewed-web.pages.dev`
- `www CNAME unscrewed-web.pages.dev`

## Workers: `unscrewed-api`

Connected via Workers & Pages → unscrewed-api → Settings → Build → Connect to Git.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm install` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `apps/api` |

> **Don't** prepend `npm install -g pnpm` to the build command. Cloudflare's
> Workers Builds image auto-installs pnpm based on the `packageManager` field
> in the root `package.json`, and the global install collides with `/pnpx`.

Worker config lives in [`apps/api/wrangler.toml`](apps/api/wrangler.toml).

**Bindings** (configured in wrangler.toml):
- D1: `unscrewed` (`9369c48b-e156-4963-827e-a0b7ed76e149`)
- KV: `SESSIONS`, `RATE_LIMIT`
- R2: `unscrewed-photos`
- Durable Object: `NegotiationRoom` (SQLite-backed)
- Custom domain: `api.unscrewed.lol`

**Secrets** (set via `wrangler secret put`, not in git):
- `SESSION_SECRET`
- `TURNSTILE_SECRET_KEY`

## Local dev

```bash
pnpm install
pnpm dev           # web on :5173, api on :8787
```

`apps/api/.dev.vars` holds local secrets (gitignored). Mirror values from
`wrangler secret list` or the dashboard.

## Manual deploy (escape hatch)

If Git auto-deploy is broken, both projects can be deployed by hand:

```bash
# web
pnpm --filter @unscrewed/web build
CLOUDFLARE_ACCOUNT_ID=485a8b721eeb6afa98c6e4071b50fe04 \
  pnpm --filter @unscrewed/web exec wrangler pages deploy \
    apps/web/dist --project-name unscrewed-web --branch dev

# api
CLOUDFLARE_ACCOUNT_ID=485a8b721eeb6afa98c6e4071b50fe04 \
  pnpm --filter @unscrewed/api exec wrangler deploy
```
