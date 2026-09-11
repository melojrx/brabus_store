#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT

printf '%s' '__BRABUS_EMPTY__' > "$fixture/pepper"

# shellcheck disable=SC1091
. "$root/scripts/docker-load-secrets.sh"
load_brabustore_secret INTEGRATION_API_KEY_PEPPER "$fixture/pepper"
[ -z "$INTEGRATION_API_KEY_PEPPER" ]

load_brabustore_secret MERCADO_PAGO_WEBHOOK_SECRET "$fixture/pepper"
[ -z "$MERCADO_PAGO_WEBHOOK_SECRET" ]

[ "${INTEGRATION_API_KEY_PEPPER+x}" = x ]
