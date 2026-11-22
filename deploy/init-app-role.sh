#!/bin/sh
set -eu
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set in .env.postgres.local}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE wedding_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE wedding_site TO wedding_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO wedding_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO wedding_app;
SQL
