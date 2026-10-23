#!/usr/bin/env bash
#
# Rebuild the Neon Postgres database from the local SQLite source of truth.
#
#   ./scripts/migrate-to-neon.sh [--keep-data]
#
# By default the public schema is dropped and rebuilt from scratch, so the
# result is reproducible from `backend/db.sqlite3`.
#
# Requires: backend/.venv (Django), psql, and a .env.local holding
# DATABASE_URL_UNPOOLED (direct connection - PgBouncer transaction pooling
# breaks the advisory locks Django's migrations take).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

KEEP_DATA=0
if [[ "${1:-}" == "--keep-data" ]]; then
  KEEP_DATA=1
fi

if [[ ! -f .env.local ]]; then
  echo "error: .env.local not found (need DATABASE_URL_UNPOOLED)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

: "${DATABASE_URL_UNPOOLED:?DATABASE_URL_UNPOOLED is not set}"

PY="$ROOT/backend/.venv/bin/python"
DUMP="$ROOT/backend/neon-dump.json"

# Django reads DATABASE_URL to pick its database, so it has to be unset for the
# dump step (which must read the SQLite source) and set for everything else.
export DATABASE_URL="$DATABASE_URL_UNPOOLED"

echo "==> checking the target database"
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -tAc \
  "select current_database(), current_user" | head -1

if [[ $KEEP_DATA -eq 0 ]]; then
  echo "==> dropping and recreating the public schema"
  psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -c \
    "drop schema public cascade; create schema public; grant all on schema public to public;"
fi

echo "==> applying Django migrations"
cd "$ROOT/backend"
"$PY" manage.py migrate --noinput

echo "==> dumping the SQLite source data"
cd "$ROOT/backend"
env -u DATABASE_URL "$PY" manage.py dumpdata \
  --natural-foreign --natural-primary \
  --exclude admin.logentry \
  --exclude sessions \
  --exclude token_blacklist \
  > "$DUMP"

echo "==> loading data into Neon (from $(wc -c < "$DUMP" | tr -d ' ') bytes)"
"$PY" manage.py loaddata "$DUMP"

echo "==> seeding demo data"
"$PY" manage.py seed_demo

rm -f "$DUMP"

echo "==> done"
