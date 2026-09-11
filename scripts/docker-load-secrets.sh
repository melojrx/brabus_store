#!/bin/sh

load_brabustore_secret() {
  name=$1
  file=$2

  if [ ! -r "$file" ]; then
    echo "Missing required secret file: $file" >&2
    exit 1
  fi

  value=$(cat "$file")
  export "$name=$value"
}

load_brabustore_secrets() {
  if [ ! -r /run/secrets/brabustore_database_url ]; then
    return 0
  fi

  load_brabustore_secret DATABASE_URL /run/secrets/brabustore_database_url
  load_brabustore_secret NEXTAUTH_SECRET /run/secrets/brabustore_nextauth_secret
  load_brabustore_secret MERCADO_PAGO_ACCESS_TOKEN /run/secrets/brabustore_mercadopago_access_token
  load_brabustore_secret MERCADO_PAGO_WEBHOOK_SECRET /run/secrets/brabustore_mercadopago_webhook_secret
  load_brabustore_secret CRON_SECRET /run/secrets/brabustore_cron_secret
  load_brabustore_secret INTEGRATION_API_KEY_PEPPER /run/secrets/brabustore_integration_api_key_pepper
}
