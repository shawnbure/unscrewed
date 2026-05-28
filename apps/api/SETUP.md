# API setup (one-time, against the `smb` Cloudflare account)

```bash
# 1. login
pnpm dlx wrangler login            # pick the smb account in the browser flow

# 2. create resources
pnpm dlx wrangler d1 create unscrewed
# → copy database_id into wrangler.toml [[d1_databases]] database_id

pnpm dlx wrangler kv namespace create SESSIONS
pnpm dlx wrangler kv namespace create RATE_LIMIT
# → copy each id into wrangler.toml

pnpm dlx wrangler r2 bucket create unscrewed-photos

# 3. apply schema
pnpm --filter @unscrewed/db migrate:local     # local D1
pnpm --filter @unscrewed/db migrate:remote    # remote D1 (smb account)

# 4. set secrets (Telnyx + session signing + Turnstile)
pnpm dlx wrangler secret put TELNYX_API_KEY
pnpm dlx wrangler secret put TELNYX_MESSAGING_PROFILE_ID
pnpm dlx wrangler secret put TELNYX_FROM_NUMBER       # E.164, e.g. +18885551234
pnpm dlx wrangler secret put SESSION_SECRET           # 32+ random bytes (openssl rand -hex 32)
pnpm dlx wrangler secret put TURNSTILE_SECRET_KEY

# 5. deploy
pnpm --filter @unscrewed/api deploy

# 6. point api.unscrewed.lol at the Worker via Cloudflare dashboard → Workers Routes
```

## Telnyx side

1. Buy / port a long code or toll-free number in the Telnyx portal.
2. Create a **Messaging Profile**; attach the number.
3. Configure inbound webhook URL: `https://api.unscrewed.lol/webhooks/telnyx`
   (delivery receipts go to the same endpoint).
4. Copy the **API v2 key** and the **Messaging Profile ID** into the
   `wrangler secret put` commands above.
