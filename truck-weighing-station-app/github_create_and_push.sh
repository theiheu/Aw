#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

REPO_NAME=${1:-truck-weighing-station-app}
VISIBILITY=${2:-private}  # private|public
API=https://api.github.com

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "[ERR] GH_TOKEN is not set. Please export a GitHub personal access token with repo scope, e.g.:"
  echo "      export GH_TOKEN=ghp_xxx_your_token_with_repo_scope"
  exit 1
fi

# Get authenticated username
AUTH_JSON=$(curl -sS -H "Authorization: token $GH_TOKEN" -H "Accept: application/vnd.github+json" "$API/user")
AUTH_USER=$(printf '%s' "$AUTH_JSON" | sed -n 's/.*"login"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
if [[ -z "${AUTH_USER:-}" ]]; then
  echo "[ERR] Could not determine GitHub username. Check GH_TOKEN."
  echo "$AUTH_JSON" | sed -n '1,40p'
  exit 1
fi

echo "[INFO] Authenticated as: $AUTH_USER"

# Create repo (201 created, 422 already exists)
PRIVATE_FLAG=true
if [[ "$VISIBILITY" == "public" ]]; then PRIVATE_FLAG=false; fi
HTTP_CODE=$(curl -sS -o /tmp/gh_repo_create.json -w "%{http_code}" \
  -H "Authorization: token $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":$PRIVATE_FLAG}" \
  "$API/user/repos")

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "422" ]]; then
  echo "[ERR] Failed to create repo (HTTP $HTTP_CODE). Response:"
  cat /tmp/gh_repo_create.json
  exit 1
fi

CLEAN_URL="https://github.com/$AUTH_USER/$REPO_NAME.git"
TOKEN_URL="https://$AUTH_USER:$GH_TOKEN@github.com/$AUTH_USER/$REPO_NAME.git"

git remote remove origin 2>/dev/null || true

echo "[INFO] Adding clean remote: $CLEAN_URL"
git remote add origin "$CLEAN_URL"

echo "[INFO] Pushing main using a temporary auth remote..."
git remote add origin-push "$TOKEN_URL"
# Ensure branch main exists
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  git branch -M main
fi

git push -u origin-push main

echo "[INFO] Cleaning tokenized remote and setting upstream to origin/main"
git remote remove origin-push || true
git branch --set-upstream-to=origin/main main || true

echo "[DONE] Repository available at: $CLEAN_URL"


