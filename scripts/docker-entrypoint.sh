#!/bin/sh
set -eu

mkdir -p /app/public/uploads/products

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
