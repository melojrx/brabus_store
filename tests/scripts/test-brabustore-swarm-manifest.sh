#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
stack="$root/deploy/swarm/brabustore.yml"
edge="$root/deploy/swarm/brabustore-edge.yml"

grep -Fq 'brabustore_backend:' "$stack"
grep -Fq 'brabustore_postgres_data:' "$stack"
grep -Fq 'brabustore_uploads:' "$stack"
grep -Fq 'command: ["/usr/local/bin/docker-start.sh"]' "$stack"
grep -Fq 'POSTGRES_PASSWORD_FILE: /run/secrets/brabustore_postgres_password' "$stack"
grep -Fq 'traefik.http.routers.brabustore.rule=Host(`brabustore.com.br`)' "$stack"
grep -Fq 'traefik.http.services.brabustore.loadbalancer.server.port=3000' "$stack"
grep -Fq 'brabustore_cloudflared_tunnel_token' "$edge"
