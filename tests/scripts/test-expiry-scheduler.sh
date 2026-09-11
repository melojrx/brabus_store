#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
script="$root/scripts/expiry-scheduler.mjs"
stack="$root/deploy/swarm/brabustore.yml"

grep -Fq 'brabustore_cron_secret' "$script"
grep -Fq 'Authorization' "$script"
grep -Fq 'SCHEDULER_RUN_ONCE' "$script"
grep -Fq '  scheduler:' "$stack"
grep -Fq 'expiry-scheduler.mjs' "$root/Dockerfile"
