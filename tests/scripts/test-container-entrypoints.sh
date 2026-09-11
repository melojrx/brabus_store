#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)

grep -Fq 'exec node server.js' "$root/scripts/docker-start.sh"
grep -Fq 'npx prisma migrate deploy' "$root/scripts/docker-migrate.sh"
! grep -Fq 'npx prisma migrate deploy' "$root/scripts/docker-start.sh"
grep -Fq 'COPY scripts/docker-start.sh /usr/local/bin/docker-start.sh' "$root/Dockerfile"
grep -Fq 'COPY scripts/docker-migrate.sh /usr/local/bin/docker-migrate.sh' "$root/Dockerfile"
