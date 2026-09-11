#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)

grep -Fq '"test": "node --import tsx --test --test-concurrency=1 tests/*.test.ts"' "$root/package.json"
grep -Fq 'postgres:16' "$root/.github/workflows/build-homelab-image.yml"
grep -Fq 'npx prisma migrate deploy' "$root/.github/workflows/build-homelab-image.yml"
