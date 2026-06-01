#!/bin/bash
set -euo pipefail

APP_DIR=/srv/apps/brabustore
COMPOSE_FILE=docker-compose.vps.yml
ENV_FILE=.env.production
TAG="[deploy]"

echo "$TAG Started at $(date -Iseconds)"
cd "$APP_DIR"

# 1. Pull latest code
echo "$TAG Pulling latest code..."
git fetch origin main
BEFORE=$(git rev-parse HEAD)
git reset --hard origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ] && [ "${FORCE:-}" != "1" ]; then
  echo "$TAG No changes detected (use FORCE=1 to redeploy). Skipping."
  exit 0
fi

echo "$TAG Deploying ${BEFORE:0:7} → ${AFTER:0:7}"
echo "$TAG Changes:"
git log --oneline $BEFORE..$AFTER 2>/dev/null || true

# 2. Build new image
echo "$TAG Building Docker image..."
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --pull app 2>&1 | tail -5

# 3. Recreate container (entrypoint handles migrate + start)
echo "$TAG Restarting container..."
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --force-recreate --no-deps app 2>&1

# 4. Health check
echo "$TAG Waiting for health..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "$TAG Healthy after ${i}s"
    break
  fi
  [ $i -eq 60 ] && { echo "$TAG FAILED - not healthy after 60s"; docker compose -f $COMPOSE_FILE logs --tail=30 app; exit 1; }
  sleep 1
done

# 5. Cleanup
docker image prune -f --filter 'until=24h' > /dev/null 2>&1 || true

echo "$TAG Completed at $(date -Iseconds)"
