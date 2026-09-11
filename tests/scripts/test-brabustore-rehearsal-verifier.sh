#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
script="$root/scripts/homelab/verify-rehearsal.sh"

grep -Fq '/api/health' "$script"
grep -Fq '/admin/pdv' "$script"
grep -Fq 'prisma migrate status' "$script"
grep -Fq 'load_brabustore_secrets' "$script"
grep -Fq 'sha256sum --check' "$script"
