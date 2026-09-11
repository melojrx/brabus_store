#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT

printf '%s' '__BRABUS_EMPTY__' > "$fixture/pepper"

# shellcheck disable=SC1091
. "$root/scripts/docker-load-secrets.sh"
load_brabustore_secret INTEGRATION_API_KEY_PEPPER "$fixture/pepper"

[ "${INTEGRATION_API_KEY_PEPPER+x}" = x ]
[ -z "$INTEGRATION_API_KEY_PEPPER" ]
