#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)

grep -Fq "BRABUSTORE_ROOT='/srv/brabustore'" "$root/scripts/deploy-homelab.sh"
grep -Fq 'validate_brabustore_image' "$root/scripts/homelab/load-env.sh"
grep -Fq 'docker service rollback "$WEB_SERVICE"' "$root/scripts/homelab/deploy-stack.sh"
grep -Fq 'docker service scale --detach=true "$MIGRATE_SERVICE=1"' "$root/scripts/homelab/deploy-stack.sh"
grep -Fq 'brabustore_backend' "$root/scripts/homelab/deploy-stack.sh"

image_assignment_line=$(grep -n '^BRABUS_STORE_IMAGE=\$2$' "$root/scripts/homelab/deploy-stack.sh" | cut -d: -f1)
config_load_line=$(grep -n 'load_env_file "\$CONFIGURATION_FILE"' "$root/scripts/homelab/deploy-stack.sh" | cut -d: -f1)
[ "$image_assignment_line" -gt "$config_load_line" ]
