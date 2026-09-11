#!/bin/sh
set -eu

echo "Running Prisma migrations..."
docker-migrate.sh

echo "Starting Next.js..."
exec docker-start.sh
