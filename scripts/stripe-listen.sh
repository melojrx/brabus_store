#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI nao encontrado. Instale a CLI antes de continuar."
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Arquivo .env nao encontrado em ${ROOT_DIR}"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "STRIPE_SECRET_KEY nao definida no .env"
  exit 1
fi

FORWARD_PORT="${PORT:-3000}"
FORWARD_URL="${STRIPE_FORWARD_URL:-http://localhost:${FORWARD_PORT}/api/stripe/webhook}"

echo "Encaminhando eventos Stripe para ${FORWARD_URL}"

exec stripe listen \
  --api-key "${STRIPE_SECRET_KEY}" \
  --forward-to "${FORWARD_URL}" \
  "$@"
