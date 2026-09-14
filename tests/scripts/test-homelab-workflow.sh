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
grep -Fq 'outputs:' "$workflow"
grep -Fq 'image: ${{ steps.build.outputs.digest }}' "$workflow"
grep -Fq 'deploy:' "$workflow"
grep -Fq 'needs: image' "$workflow"
grep -Fq '[self-hosted, homelab-brabustore-deploy]' "$workflow"
grep -Fq 'cancel-in-progress: false' "$workflow"
test ! -e "$root/.github/workflows/deploy.yml"
