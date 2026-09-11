#!/bin/sh
set -eu

. /usr/local/bin/docker-load-secrets.sh
load_brabustore_secrets

exec npx prisma migrate deploy
