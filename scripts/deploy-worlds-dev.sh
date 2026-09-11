#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/home/park-pro/VilaPro"
BRANCH="${WORLDS_DEPLOY_BRANCH:-v0.4/workspace-architecture}"
FRONTEND_DIR="$BASE_DIR/frontend-dev"
WEB_SERVICE="worlds-web.service"
API_SERVICE="worlds-api.service"
WEB_URL="http://127.0.0.1:3001"
API_URL="http://127.0.0.1:8001/health"

if [[ ! "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "ERROR: invalid deployment branch: $BRANCH" >&2
  exit 1
fi

cd "$BASE_DIR"

step_start() {
  STEP_NAME="$1"
  STEP_START_NS="$(date +%s%N)"
  echo
  echo "[$STEP_NAME] START $(date -Is)"
}

step_end() {
  local end_ns elapsed_ms
  end_ns="$(date +%s%N)"
  elapsed_ms="$(( (end_ns - STEP_START_NS) / 1000000 ))"
  echo "[$STEP_NAME] END $(date -Is) duration=${elapsed_ms}ms"
}

runner_snapshot() {
  echo "[runner] $(date -Is) load=$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || true)"
  if command -v free >/dev/null 2>&1; then free -m | awk 'NR==1 || NR==2 {print "[runner] " $0}' || true; fi
  if command -v df >/dev/null 2>&1; then df -h "$BASE_DIR" | awk 'NR==1 || NR==2 {print "[runner] " $0}' || true; fi
}

echo "=== Worlds DEV deployment ==="
echo "Repository: $BASE_DIR"
echo "Branch:     $BRANCH"
runner_snapshot

step_start "1/8 Checking working tree"
if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "ERROR: expected branch $BRANCH, got $(git branch --show-current)" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean; refusing to deploy." >&2
  git status --short >&2
  exit 1
fi
step_end

step_start "2/8 Updating source"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"
DEPLOYED_COMMIT="$(git rev-parse HEAD)"
echo "Deploying commit: $DEPLOYED_COMMIT"
step_end

step_start "3/8 Backend tests"
cd "$BASE_DIR/worlds"
PYTHONPATH=src python3 -m unittest discover -s tests
step_end

step_start "4/8 Frontend dependencies"
cd "$FRONTEND_DIR"
npm ci
step_end

step_start "5/8 Frontend lint"
npm run lint
step_end

step_start "6/8 Frontend tests and build"
npm test
npm run build
step_end

step_start "7/8 Installing/updating Worlds web service"
sudo install -m 0644 "$BASE_DIR/deploy/systemd/worlds-web.service" "/etc/systemd/system/$WEB_SERVICE"
sudo systemctl daemon-reload
sudo systemctl restart "$API_SERVICE"
sudo systemctl restart "$WEB_SERVICE"
step_end

step_start "8/8 Health checks"
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
step_end

runner_snapshot
echo
echo "=== Worlds DEV deployment complete ==="
echo "Commit:  $DEPLOYED_COMMIT"
echo "Web:     $WEB_URL"
echo "API:     $API_URL"
