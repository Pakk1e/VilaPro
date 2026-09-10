#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/home/park-pro/VilaPro"
BRANCH="v0.4/workspace-architecture"
FRONTEND_DIR="$BASE_DIR/frontend-dev"
WEB_SERVICE="worlds-web.service"
API_SERVICE="worlds-api.service"
WEB_URL="http://127.0.0.1:3001"
API_URL="http://127.0.0.1:8001/health"

cd "$BASE_DIR"

echo "=== Worlds DEV deployment ==="
echo "Repository: $BASE_DIR"
echo "Branch:     $BRANCH"

echo

echo "[1/8] Checking working tree..."
if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "ERROR: expected branch $BRANCH, got $(git branch --show-current)" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean; refusing to deploy." >&2
  git status --short >&2
  exit 1
fi

echo
 echo "[2/8] Updating source..."
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

DEPLOYED_COMMIT="$(git rev-parse HEAD)"
echo "Deploying commit: $DEPLOYED_COMMIT"

echo
 echo "[3/8] Backend tests..."
cd "$BASE_DIR/worlds"
PYTHONPATH=src python3 -m unittest discover -s tests

 echo
 echo "[4/8] Frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci

 echo
 echo "[5/8] Frontend lint..."
npm run lint

 echo
 echo "[6/8] Frontend tests and build..."
npm test
npm run build

 echo
 echo "[7/8] Installing/updating Worlds web service..."
sudo install -m 0644 "$BASE_DIR/deploy/systemd/worlds-web.service" "/etc/systemd/system/$WEB_SERVICE"
sudo systemctl daemon-reload
sudo systemctl restart "$API_SERVICE"
sudo systemctl restart "$WEB_SERVICE"

 echo
 echo "[8/8] Health checks..."
for attempt in {1..20}; do
  if curl --fail --silent --show-error "$API_URL" >/dev/null && curl --fail --silent --show-error "$WEB_URL" >/dev/null; then
    break
  fi
  if [[ "$attempt" == 20 ]]; then
    echo "ERROR: Worlds DEV health check failed." >&2
    sudo systemctl --no-pager --full status "$API_SERVICE" "$WEB_SERVICE" || true
    exit 1
  fi
  sleep 1
done

sudo systemctl --no-pager --full status "$API_SERVICE" "$WEB_SERVICE"

echo
echo "=== Worlds DEV deployment complete ==="
echo "Commit:  $DEPLOYED_COMMIT"
echo "Web:     $WEB_URL"
echo "API:     $API_URL"
