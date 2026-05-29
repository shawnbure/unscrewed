# Release process

Two long-lived branches. Two environments. One deploy gate per direction.

```
   feature/* ──PR──▶ dev ──PR──▶ main
                     │            │
                     ▼            ▼
            dev.unscrewed.lol   unscrewed.lol
            api-dev.uns…        api.uns…
```

## Daily work

```bash
# Start from latest dev
git checkout dev && git pull

# Branch
git checkout -b feature/short-slug

# Code, commit
git push -u origin feature/short-slug

# Open a PR feature/* → dev on GitHub
#   Cloudflare Pages comments the preview URL on the PR (build all branches)
#   Review the preview, merge into dev
```

Once merged into `dev`:

- **Pages** rebuilds and deploys `dev` → `dev.unscrewed.lol`
- **Workers Builds** rebuilds and deploys via `npx wrangler deploy --env dev`
  → `api-dev.unscrewed.lol`

## Shipping a release (dev → main)

When `dev` has accumulated enough changes to ship:

```bash
git checkout dev && git pull
git log main..dev --oneline    # what's about to ship
gh pr create --base main --head dev --title "Release vYYYY.MM.DD" \
  --body-file .github/PULL_REQUEST_TEMPLATE/release.md
# Or open the compare link with ?template=release.md
```

Use the release PR to:

1. Paste the `git log main..dev` output as the release contents
2. Apply any **D1 migrations to prod** before merging
3. Apply any **new secrets / Pages env vars** before merging
4. Run the **pre-release verification checklist** against
   `dev.unscrewed.lol`
5. Merge. Production auto-deploys.

## Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/short-slug
# fix, commit, push
gh pr create --base main --head hotfix/short-slug --title "Hotfix: …"
# Merge → prod
# Then back-merge to dev so it doesn't regress on the next release
git checkout dev && git pull
git merge main && git push
```

## Branch protection on `main`

> **Heads up — GitHub Free does not allow branch protection or rulesets
> on private repos.** You have three options:
>
> 1. **Make the repo public** — no secrets are in the tree (`.dev.vars`,
>    `.env` are gitignored; only resource IDs in `wrangler.toml`). This
>    enables rulesets on Free.
> 2. **Upgrade to GitHub Pro** ($4/mo) — keeps the repo private and
>    enables both classic protection and rulesets.
> 3. **Skip technical enforcement** — rely on the PR template,
>    `gh pr create --base main` workflow, and discipline. Honest tradeoff
>    for solo dev.
>
> The script below will work once protection is available — it's
> idempotent and safe to re-run.

Applied via `gh api` — see `scripts/setup-branch-protection.sh`:

- Direct pushes to `main` are blocked (PR required, 0 approvals)
- Force pushes blocked
- Branch deletion blocked
- Admins exempt from the rules (so a solo dev can still emergency-merge)
- Stale review dismissal off (solo dev)

If you ever need to bypass for an emergency:

```bash
# from a clean main checkout, with admin override
git push origin main           # blocked by default
gh api repos/shawnbure/unscrewed/branches/main/protection -X DELETE
# … fix the world …
# … then re-apply protection:
bash scripts/setup-branch-protection.sh
```

## What still requires the Cloudflare dashboard

These can't be done from CLI / API:

- Connecting Workers Builds for `unscrewed-api-dev` to GitHub
  (Pages does Git, but Workers Builds Git connection needs the
  dashboard OAuth dance — one-time setup)
- Setting `dev.unscrewed.lol` as a branch alias for `dev` on the
  Pages project (Settings → Custom Domains → Set branch)
- Adding the DNS CNAME `dev → unscrewed-web.pages.dev` (needs a
  CF API token with DNS:Edit, which wrangler OAuth doesn't have)
