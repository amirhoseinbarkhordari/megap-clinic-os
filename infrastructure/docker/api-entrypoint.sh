#!/bin/sh
# Local Docker entrypoint. Generates and persists local-only secrets in /data when none are
# provided, applies migrations with the admin role, then starts the API.
set -eu

mkdir -p /data

if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
  [ -s /data/jwt.secret ] || node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))' > /data/jwt.secret
  JWT_ACCESS_SECRET="$(cat /data/jwt.secret)"
  export JWT_ACCESS_SECRET
fi

if [ -z "${MEGAP_PHI_ENCRYPTION_KEYS:-}" ]; then
  [ -s /data/phi.key ] || node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))' > /data/phi.key
  MEGAP_PHI_ENCRYPTION_KEYS="{\"v1\":\"$(cat /data/phi.key)\"}"
  MEGAP_PHI_ACTIVE_KEY_VERSION=v1
  export MEGAP_PHI_ENCRYPTION_KEYS MEGAP_PHI_ACTIVE_KEY_VERSION
fi

echo "Applying database migrations..."
pnpm exec prisma migrate deploy

echo "Starting MEGAP API on port ${API_PORT:-4000}"
exec node dist/main.js
