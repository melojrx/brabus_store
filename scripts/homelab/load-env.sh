#!/bin/sh

load_env_file() {
  if [ "$#" -ne 1 ]; then
    printf '%s\n' 'Usage: load_env_file <configuration-file>' >&2
    return 1
  fi

  file=$1
  if [ ! -r "$file" ]; then
    printf 'Configuration file is not readable: %s\n' "$file" >&2
    return 1
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
      *=*) ;;
      *)
        printf 'Invalid configuration line: %s\n' "$line" >&2
        return 1
        ;;
    esac

    key=${line%%=*}
    value=${line#*=}

    if ! printf '%s\n' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then
      printf 'Invalid configuration key: %s\n' "$key" >&2
      return 1
    fi

    export "$key=$value"
  done < "$file"
}

validate_brabustore_image() {
  if [ "$#" -ne 1 ]; then
    printf '%s\n' 'Usage: validate_brabustore_image <image-reference>' >&2
    return 1
  fi

  image_reference=$1
  prefix='ghcr.io/melojrx/brabus_store@sha256:'

  case "$image_reference" in
    "$prefix"*) digest=${image_reference#"$prefix"} ;;
    *)
      printf 'Invalid image reference: %s\n' "$image_reference" >&2
      return 1
      ;;
  esac

  case "$digest" in
    ''|*[!0123456789abcdef]*)
      printf 'Invalid image reference: %s\n' "$image_reference" >&2
      return 1
      ;;
  esac

  if [ "${#digest}" -ne 64 ]; then
    printf 'Invalid image reference: %s\n' "$image_reference" >&2
    return 1
  fi
}
