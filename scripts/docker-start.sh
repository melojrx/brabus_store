#!/bin/sh
set -eu

. /usr/local/bin/docker-load-secrets.sh
load_brabustore_secrets

mkdir -p /app/public/uploads/products
exec node server.js
