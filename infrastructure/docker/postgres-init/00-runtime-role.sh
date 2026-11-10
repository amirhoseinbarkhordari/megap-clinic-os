#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=app_password="$MEGAP_APP_PASSWORD" \
  --file=/docker-entrypoint-initdb.d/01-runtime-role.sql.template
