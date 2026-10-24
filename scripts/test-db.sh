#!/usr/bin/env bash
# Runs migrations and each SQL test against isolated THROWAWAY local PostgreSQL databases.
# Needs PostgreSQL server binaries (initdb, pg_ctl, psql). Skips with exit 0 if absent
# unless REQUIRE_DB_TESTS=1. Never connects to a remote database.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
if [ -z "${PGBIN}" ] || [ ! -x "${PGBIN}/initdb" ]; then
  echo "test-db: PostgreSQL server binaries not found; skipping DB tests"
  [ "${REQUIRE_DB_TESTS:-0}" = "1" ] && exit 1 || exit 0
fi
TMP="$(mktemp -d)"; PORT=54329
RUN=""
if [ "$(id -u)" = "0" ]; then chown "$(id -u nobody)" "$TMP"; RUN="runuser -u nobody --"; fi
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
$RUN "$PGBIN/initdb" -D "$TMP/data" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
for test_file in supabase/tests/*.test.sql; do
  echo "test-db: preparing isolated database for $test_file"
  "${PSQL[@]}" -d postgres -c "drop database if exists onboard_test" >/dev/null
  "${PSQL[@]}" -d postgres -c "create database onboard_test" >/dev/null
  "${PSQL[@]}" -d onboard_test -f supabase/tests/stubs.sql >/dev/null
  for migration in supabase/migrations/*.sql; do
    echo "test-db: applying $migration"
    "${PSQL[@]}" -d onboard_test -f "$migration" >/dev/null
  done
  echo "test-db: running $test_file"
  "${PSQL[@]}" -d onboard_test -f "$test_file"
done
