#!/bin/sh
set -eu

exec npx prisma migrate deploy
