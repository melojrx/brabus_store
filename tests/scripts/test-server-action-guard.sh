#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
proxy="$root/proxy.ts"

grep -Fq 'req.method === "POST"' "$proxy"
grep -Fq 'req.headers.has("next-action")' "$proxy"
grep -Fq 'Server Actions are not enabled' "$proxy"
