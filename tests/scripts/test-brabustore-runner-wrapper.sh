#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
wrapper="$root/ops/homelab-runner/deploy-brabustore"

grep -Fq "BRABUSTORE_ROOT='/srv/brabustore'" "$wrapper"
grep -Fq 'validate_brabustore_image "$image"' "$wrapper"
grep -Fq 'tar -C "$checkout" -cf - deploy/swarm scripts/homelab' "$wrapper"
grep -Fq '"$BRABUSTORE_ROOT/bin/deploy-stack.sh" "$release_directory" "$image"' "$wrapper"
! grep -Eq '(^|[[:space:]])(git pull|git fetch|docker build)' "$wrapper"
