#!/bin/sh
set -e

echo "[MANIA] Applying database migrations..."
npx prisma migrate deploy

echo "[MANIA] Starting application on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}"
