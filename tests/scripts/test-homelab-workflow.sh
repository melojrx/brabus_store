#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
workflow="$root/.github/workflows/build-homelab-image.yml"

grep -Fq 'packages: write' "$workflow"
grep -Fq 'linux/amd64' "$workflow"
grep -Fq 'npm run lint -- .' "$workflow"
grep -Fq 'npm test' "$workflow"
grep -Fq 'npm run build' "$workflow"
grep -Fq 'ghcr.io/melojrx/brabus_store' "$workflow"
grep -Fq 'docker/setup-buildx-action@v3' "$workflow"
grep -Fq "printf '%s\\n' \"- Image: \${image}\"" "$workflow"
grep -Fq "printf '%s\\n' \"- Commit: \${GITHUB_SHA}\"" "$workflow"
grep -Fq "printf '%s\\n' \"- Platform: linux/amd64\"" "$workflow"
