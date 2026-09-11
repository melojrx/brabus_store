#!/bin/sh
set -eu

mkdir -p /app/public/uploads/products
exec node server.js
