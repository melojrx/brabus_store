#!/bin/sh
set -eu

REPOSITORY_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
HOMELAB_HOST='melojr@100.93.170.120'
BRABUSTORE_ROOT='/srv/brabustore'

# shellcheck disable=SC1091
. "$REPOSITORY_ROOT/scripts/homelab/load-env.sh"

run_remote() {
  # Commands contain only fixed paths and a digest validated before this call.
  # shellcheck disable=SC2029
  ssh "$HOMELAB_HOST" "$1"
}

stage_only=false
case "$#" in
  1) BRABUS_STORE_IMAGE=$1 ;;
  2)
    if [ "$1" != '--stage-only' ]; then
      printf '%s\n' 'Usage: scripts/deploy-homelab.sh [--stage-only] <GHCR-image-digest>' >&2
      exit 1
    fi
    stage_only=true
    BRABUS_STORE_IMAGE=$2
    ;;
  *)
    printf '%s\n' 'Usage: scripts/deploy-homelab.sh [--stage-only] <GHCR-image-digest>' >&2
    exit 1
    ;;
esac

validate_brabustore_image "$BRABUS_STORE_IMAGE" || exit 1

for file in \
  deploy/swarm/brabustore.yml \
  deploy/swarm/brabustore-edge.yml \
  deploy/swarm/brabustore.env.example \
  scripts/homelab/load-env.sh \
  scripts/homelab/deploy-stack.sh; do
  if [ ! -f "$REPOSITORY_ROOT/$file" ]; then
    printf 'Required release file is missing: %s\n' "$file" >&2
    exit 1
  fi
done

digest=${BRABUS_STORE_IMAGE#ghcr.io/melojrx/brabus_store@sha256:}
release_directory="$BRABUSTORE_ROOT/releases/sha256-$digest"

run_remote "sudo install -d -m 0750 -o root -g root '$release_directory'"
# The release directory is derived from the validated digest.
# shellcheck disable=SC2029
tar -C "$REPOSITORY_ROOT" -cf - deploy/swarm scripts/homelab | \
  ssh "$HOMELAB_HOST" "sudo tar -xf - -C '$release_directory'"

if [ "$stage_only" = true ]; then
  printf '%s\n' "Release staged at $release_directory"
  exit 0
fi

run_remote "sudo install -m 0755 '$release_directory/scripts/homelab/load-env.sh' '$BRABUSTORE_ROOT/bin/load-env.sh' && sudo install -m 0755 '$release_directory/scripts/homelab/deploy-stack.sh' '$BRABUSTORE_ROOT/bin/deploy-stack.sh' && sudo '$BRABUSTORE_ROOT/bin/deploy-stack.sh' '$release_directory' '$BRABUS_STORE_IMAGE'"
