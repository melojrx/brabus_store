#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

if [ "$#" -ne 2 ]; then
  fail 'Usage: verify-rehearsal.sh <https-base-url> <stack>'
fi

BASE_URL=${1%/}
STACK=$2

case "$BASE_URL" in
  https://*) ;;
  *) fail 'The rehearsal base URL must use HTTPS.' ;;
esac

case "$STACK" in
  ''|*[!A-Za-z0-9_-]*) fail 'Invalid Swarm stack name.' ;;
esac

curl --fail --silent --show-error --location "$BASE_URL/api/health" >/dev/null

effective_url=$(curl --fail --silent --show-error --location \
  --output /dev/null --write-out '%{url_effective}' "$BASE_URL/admin/pdv")
case "$effective_url" in
  */auth/login*) ;;
  *) fail "Unauthenticated PDV did not redirect to login: $effective_url" ;;
esac

WEB_SERVICE="${STACK}_web"
container_id=$(docker ps \
  --filter "label=com.docker.swarm.service.name=$WEB_SERVICE" \
  --filter status=running \
  --format '{{.ID}}' | sed -n '1p')
[ -n "$container_id" ] || fail "No running web task found for $WEB_SERVICE"

docker exec "$container_id" npx prisma migrate status >/dev/null

if [ -n "${UPLOADS_CHECKSUM_MANIFEST:-}" ]; then
  [ -r "$UPLOADS_CHECKSUM_MANIFEST" ] || fail "Uploads checksum manifest is not readable: $UPLOADS_CHECKSUM_MANIFEST"
  manifest_directory=$(CDPATH='' cd -- "$(dirname -- "$UPLOADS_CHECKSUM_MANIFEST")" && pwd)
  manifest_name=$(basename -- "$UPLOADS_CHECKSUM_MANIFEST")
  (CDPATH='' cd -- "$manifest_directory" && sha256sum --check "$manifest_name")
fi

printf '%s\n' "Rehearsal checks passed for $BASE_URL ($STACK)."
