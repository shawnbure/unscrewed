#!/usr/bin/env bash
# Apply a Ruleset to main on shawnbure/unscrewed.
#
# Rulesets are the modern replacement for "branch protection" — they're
# available on private repos on the GitHub Free plan, while classic
# branch protection requires GitHub Pro for private repos.
#
# Solo-dev friendly:
#   - PR required (0 approvals required)
#   - No direct pushes to main
#   - No force pushes, no deletions
#   - Repository Admin can bypass in emergencies
#
# Re-run is safe — the script deletes any existing "Protect main" ruleset
# and recreates it.

set -euo pipefail

REPO="shawnbure/unscrewed"
RULESET_NAME="Protect main"

echo "Applying ruleset to ${REPO}…"

# Clean up any pre-existing ruleset with the same name so this is idempotent.
existing=$(gh api "/repos/${REPO}/rulesets" \
  | python3 -c "
import sys, json
for r in json.load(sys.stdin):
    if r.get('name') == '${RULESET_NAME}':
        print(r['id'])
        break")
if [ -n "${existing}" ]; then
  echo "  Removing existing ruleset id=${existing}"
  gh api "/repos/${REPO}/rulesets/${existing}" --method DELETE
fi

# Create the new ruleset.
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/rulesets" \
  --input - <<'JSON' | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"  ✓ created ruleset id={r['id']} enforcement={r['enforcement']}\")
for rule in r.get('rules', []):
    print(f\"    rule: {rule['type']}\")"
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    }
  ],
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "RepositoryRole",
      "bypass_mode": "always"
    }
  ]
}
JSON

echo
echo "Done. Try a direct push to verify (it should be blocked):"
echo "  git push origin main"
echo
echo "Open a release PR with:"
echo "  gh pr create --base main --head dev --title 'Release vYYYY.MM.DD' \\"
echo "    --body-file .github/PULL_REQUEST_TEMPLATE/release.md"
