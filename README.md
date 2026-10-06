# Unscrewed

**An independent barter marketplace for nearby goods, skills, and time, designed around free core exchanges.**

Unscrewed is a mission project that communities can run themselves. Posting, browsing, proposing, negotiating, and signing a basic trade do not require a platform fee. This is early software, with no claim of nonprofit status, institutional endorsement, or guaranteed community impact.

## Features

- Goods and service listings, wants, location and remote-exchange preferences.
- Listing photos, discovery, browsing, maps, and public community pages.
- Email/password accounts and optional passkeys.
- Negotiation rooms with live updates and basic trade-contract flows.
- Moderation, reports, account controls, and community metrics.
- Turnstile protection and optional transactional email.
- Public safety, terms, reuse guides, and community evidence pages.

The software helps people coordinate. Operators must define moderation, prohibited goods, safety practices, support routes, and legal terms appropriate to their community. Optional phone fields are contact information; this app does not verify phone numbers or send SMS.

## Architecture

| Component | Cloudflare Service | Source |
| --- | --- | --- |
| React/Vite frontend | Pages | `apps/web` |
| Hono API | Workers | `apps/api` |
| Relational data | D1 / Drizzle | `packages/db` |
| Shared validation | TypeScript / Zod | `packages/shared` |
| Listing photos | R2 | `PHOTOS` |
| Sessions and rate limits | KV | `SESSIONS`, `RATE_LIMIT` |
| Live negotiation | Durable Objects | `NEGOTIATION` / `NegotiationRoom` |
| AI helpers | Workers AI | `AI` |
| Optional email | Cloudflare Email Service | `EMAIL` |

Frontend and API are deployed separately. This release provides a manual setup because a Worker-only button would leave the Pages frontend, Turnstile widget, sender authorization, origins, and cookies unfinished. Existing production hosting is not required to self-host.

## Requirements

Node.js 22 or later is recommended, pnpm 11.4.0 (matching `packageManager`), Git, and a Cloudflare account with D1, KV, and R2 enabled. Use your own account/resources, domain, Turnstile widget, and email sender if enabled.

## Local Quick Start

```sh
git clone https://github.com/shawnbure/unscrewed.git
cd unscrewed
pnpm install --frozen-lockfile
cp apps/api/.dev.vars.example apps/api/.dev.vars
# Configure a new SESSION_SECRET; optionally use Turnstile testing credentials.
pnpm --filter @unscrewed/db migrate:local
pnpm dev
```

The web app runs on port 5173 and API on 8787. Vite proxies `/api` to the local API. Copy `apps/web/.env.example` to `.env.local` only if overriding frontend configuration. Never put `SESSION_SECRET` or the Turnstile secret in a frontend variable. The absent Turnstile secret permits local development; configure it for a public deployment.

## Create Cloudflare Resources

```sh
cd apps/api
pnpm exec wrangler login
pnpm exec wrangler d1 create unscrewed
pnpm exec wrangler kv namespace create SESSIONS
pnpm exec wrangler kv namespace create RATE_LIMIT
pnpm exec wrangler r2 bucket create unscrewed-photos
```

Replace the D1 `database_id` and both KV `id` placeholders in `apps/api/wrangler.toml`. Give the R2 bucket a unique name in your account and update `bucket_name` if needed. Durable Object storage is created by the Worker migration. Keep the binding names unchanged unless you also update code.

Set `PUBLIC_BASE_URL` to the exact frontend HTTPS origin and `API_BASE_URL` to your API origin. Set `OPERATOR_EMAIL` to your own support address. CORS accepts the configured frontend origin and localhost development; it does not automatically trust unrelated Pages preview hosts.

## Deploy API And Frontend

Use frontend and API custom domains under the same parent domain for browser session cookies (for example `community.example.org` and `api.example.org`). A Pages preview and an unrelated `workers.dev` hostname can encounter cross-site cookie restrictions; that setup is not the verified full-account deployment path.

```sh
# From apps/api:
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler d1 migrations apply DB --remote
pnpm exec wrangler deploy
# From the repository root:
VITE_API_BASE=https://api.example.org VITE_TURNSTILE_SITE_KEY=YOUR_PUBLIC_SITE_KEY pnpm build:web
pnpm --filter @unscrewed/api exec wrangler pages deploy ../web/dist --project-name YOUR_PAGES_PROJECT
```

Create the Turnstile widget for your frontend hostname and use its public site key and private secret in the matching places. Add your own API route/custom domain in the Worker dashboard; add your frontend domain in Pages. The public template does not attach the original author's domains.

For Git-connected Pages builds, select your fork, root build command `pnpm build:web`, output directory `apps/web/dist`, and configure both frontend variables. If enabling the root `functions/` directory, first adapt its original hosted-site canonical URLs and API fetches to your deployment; these optional SEO wrappers still describe the original community. The React app/API can be deployed without them. Public policy and brand copy also need an operator review before a new community launch.

## Optional Email

Authorize your own sender through Cloudflare Email Service, add an `EMAIL` binding supported by the project's Wrangler version, and use your sender in the email implementation. Email account authorization is separate from publishing a Worker. Without it, do not advertise working verification or transactional email delivery. No original sender credentials are included. See [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) for current eligibility and configuration.

## Accounts And Moderation

No default administrator or password is supplied. Register your own account through the app, then promote only that known user in your own D1 database:

```sql
UPDATE users SET is_admin = 1 WHERE id = 'YOUR_REGISTERED_USER_ID';
```

Sign out and sign back in so the session reflects the new role. Do not expose a public route that runs this SQL. Existing account security is retained. Administrator status does not provide an account password or bypass the normal login flow.

## Configuration Reference

| Value | Where | Meaning |
| --- | --- | --- |
| `SESSION_SECRET` | Worker secret / local `.dev.vars` | Session security; fresh random 32+ characters |
| `TURNSTILE_SECRET_KEY` | Worker secret | Server-side bot verification |
| `VITE_TURNSTILE_SITE_KEY` | Frontend build variable | Public widget key |
| `VITE_API_BASE` | Frontend build variable | Your API origin; defaults to `/api` |
| `PUBLIC_BASE_URL` | Worker vars | Exact frontend origin and links |
| `API_BASE_URL` | Worker vars | Your API origin |
| `OPERATOR_EMAIL` | Worker vars | Your operator contact |
| `TOS_VERSION` | Worker vars | Your terms version |

Listing photos use the same API base as requests. The public build does not silently send a fork's photos or app requests to `api.unscrewed.lol`.

## Checks And Troubleshooting

```sh
pnpm typecheck
pnpm build
```

Before inviting users, test registration, login/logout, passkey signup and return, listing/photo creation, browsing, negotiation updates, reports, moderation, and trade completion using disposable accounts. Test email delivery only after sender authorization. Check browser cookie behavior on the actual custom domains.

- `no such table`: run the database migrations against the configured API `DB`.
- Browser CORS error: `PUBLIC_BASE_URL` must match the frontend origin exactly.
- Login succeeds but subsequent requests are anonymous: check cookies, HTTPS, and same-site frontend/API domains.
- Photos are missing: check `PHOTOS`, bucket existence, and frontend `VITE_API_BASE`.
- Turnstile fails: use a matching widget site key/secret and allow your hostname.
- Negotiation updates fail: check the DO migration and Worker logs.

Read [DEPLOY.md](DEPLOY.md) for the self-hosting checklist and [apps/api/SETUP.md](apps/api/SETUP.md) for binding setup.

## License

[GNU AGPL v3](LICENSE). Keep required source availability for modified hosted versions. Hosted community content, user listings, and personal information are not redistributed as part of the source license.

## Secrets And Public Source

No operator passwords, API credentials, login cookies, private keys, local databases, or deployment secret files are distributed. `.dev.vars`, `.env`, `.wrangler`, and local data are ignored. Example files contain names and empty placeholders only. Create fresh secrets in your own account; never copy credentials from the original hosted service. Cloudflare account IDs and resource IDs are configuration identifiers, not API credentials, but the public templates use placeholders so your instance does not target the author's resources.

Keep secrets in Wrangler secrets or your deployment provider's secret store. Do not put them in frontend `VITE_*` values, public posts, issues, screenshots, or command arguments. A frontend variable is compiled into public JavaScript. If you accidentally commit a credential, revoke/rotate it before considering Git history cleanup. Changing a repository to public exposes its branches, tags, and commit history as well as its current files.

## Operating Your Instance

Use separate resources for development and production. Review Cloudflare billing and service limits for the features you enable; this repository does not promise a zero-cost deployment. Enable logs, monitor failed requests, and configure your own custom domain after the default deployment works. Back up persistent storage and test recovery before relying on the service. A Worker rollback does not roll back D1 data or Durable Object state. Read migrations before applying them to an existing database.

For upgrades: back up your database, pull a reviewed release, install from the lockfile, run the documented checks, apply migrations where applicable, then deploy. Keep encryption keys stable unless you also migrate the encrypted records. If you use an API token for CI, scope it to your own account and required resources and save it as a CI secret.

## Contributing

Start with the local setup and existing tests. Keep pull requests focused, describe user-visible behavior and verification, and include migration or deployment notes when those change. Do not add generated databases, private customer information, provider secrets, build output, or unrelated marketing material. Dependency upgrades should include lockfile changes and compatibility checks. This project accepts community contributions without promising a managed service, support response time, or product roadmap.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Report vulnerabilities privately through GitHub's private vulnerability reporting when enabled; public issues should omit exploit credentials and personal data.

## Cloudflare References

- [Deploy to Cloudflare button setup and supported resources](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

A build or deployment dry run validates packaging; it does not validate a real account's permissions, provisioned resources, custom domain, email delivery, or external provider connections. The button uses Cloudflare's own cloning and deployment flow; review its build/deploy fields and complete the checks below after deployment.
