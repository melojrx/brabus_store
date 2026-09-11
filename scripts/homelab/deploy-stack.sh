#!/bin/sh
set -eu

SCRIPT_DIRECTORY=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
BRABUSTORE_ROOT='/srv/brabustore'
CONFIGURATION_FILE="$BRABUSTORE_ROOT/brabustore.env"
WEB_SERVICE='brabustore_web'
MIGRATE_SERVICE='brabustore_migrate'

# shellcheck disable=SC1091
. "$SCRIPT_DIRECTORY/load-env.sh"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

show_service_diagnostics() {
  service=$1
  printf 'Redacted diagnostics for %s:\n' "$service" >&2
  docker service ps --no-trunc "$service" >&2 || :
}

rollback_web_only() {
  printf '%s\n' 'Readiness failed; rolling back only the web service.' >&2
  if ! docker service rollback "$WEB_SERVICE"; then
    printf '%s\n' 'No prior web revision is available; scaling the web service to zero.' >&2
    docker service scale "$WEB_SERVICE=0"
  fi
}

wait_for_migration() {
  attempt=1
  while [ "$attempt" -le 60 ]; do
    states=$(docker service ps --no-trunc --format '{{.CurrentState}}|{{.Error}}' "$MIGRATE_SERVICE")
    if printf '%s\n' "$states" | grep -q '^Complete'; then
      return 0
    fi
    if printf '%s\n' "$states" | grep -Eq '^(Failed|Rejected)'; then
      return 1
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  return 1
}

web_container_id() {
  docker ps \
    --filter "label=com.docker.swarm.service.name=$WEB_SERVICE" \
    --filter status=running \
    --format '{{.ID}}' | sed -n '1p'
}

wait_for_web_health() {
  attempt=1
  while [ "$attempt" -le 60 ]; do
    container_id=$(web_container_id)
    if [ -n "$container_id" ]; then
      health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id")
      case "$health" in
        healthy) return 0 ;;
        unhealthy) return 1 ;;
      esac
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  return 1
}

verify_readiness() {
  container_id=$(web_container_id)
  [ -n "$container_id" ] || return 1
  docker exec "$container_id" curl --fail --silent --show-error \
    --header 'Host: brabustore.com.br' \
    --header 'X-Forwarded-Proto: https' \
    http://127.0.0.1:3000/api/health >/dev/null
}

if [ "$#" -ne 2 ]; then
  fail 'Usage: deploy-stack.sh <release-directory> <GHCR-image-digest>'
fi

release_directory=$1
BRABUS_STORE_IMAGE=$2
validate_brabustore_image "$BRABUS_STORE_IMAGE" || exit 1

case "$release_directory" in
  "$BRABUSTORE_ROOT"/releases/*) ;;
  *) fail "Invalid release directory: $release_directory" ;;
esac

stack_file="$release_directory/deploy/swarm/brabustore.yml"
[ -r "$stack_file" ] || fail "Stack file is not readable: $stack_file"
[ -r "$CONFIGURATION_FILE" ] || fail "Configuration file is not readable: $CONFIGURATION_FILE"

load_env_file "$CONFIGURATION_FILE"
export BRABUS_STORE_IMAGE

swarm_state=$(docker info --format '{{.Swarm.LocalNodeState}}')
[ "$swarm_state" = 'active' ] || fail 'Docker Swarm is not active.'

for network in edge brabustore_backend; do
  docker network inspect "$network" >/dev/null 2>&1 || fail "Required network is missing: $network"
done

for secret in \
  brabustore_postgres_password \
  brabustore_database_url \
  brabustore_nextauth_secret \
  brabustore_mercadopago_access_token \
  brabustore_mercadopago_webhook_secret \
  brabustore_cron_secret \
  brabustore_integration_api_key_pepper; do
  docker secret inspect "$secret" >/dev/null 2>&1 || fail "Required secret is missing: $secret"
done

if ! docker service inspect "$WEB_SERVICE" >/dev/null 2>&1; then
  docker stack deploy --with-registry-auth -c "$stack_file" brabustore
  docker service scale "$WEB_SERVICE=0"
fi

docker service update \
  --with-registry-auth \
  --image "$BRABUS_STORE_IMAGE" \
  --force \
  --update-monitor 0s \
  --detach=true \
  "$MIGRATE_SERVICE"
docker service scale --detach=true "$MIGRATE_SERVICE=1"
if ! wait_for_migration; then
  show_service_diagnostics "$MIGRATE_SERVICE"
  docker service scale "$MIGRATE_SERVICE=0" || :
  fail 'Migration did not complete successfully.'
fi
docker service scale --detach=true "$MIGRATE_SERVICE=0"

docker stack deploy --with-registry-auth -c "$stack_file" brabustore
if ! wait_for_web_health; then
  show_service_diagnostics "$WEB_SERVICE"
  rollback_web_only
  exit 1
fi

if ! verify_readiness; then
  show_service_diagnostics "$WEB_SERVICE"
  rollback_web_only
  exit 1
fi

printf '%s\n' "Brabus Store release is ready: $BRABUS_STORE_IMAGE"
