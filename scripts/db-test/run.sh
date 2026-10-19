#!/usr/bin/env bash
# Verifies migrations, seed and RLS on a plain local Postgres.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/db-test/run.sh [--types]
#   --types  also regenerate src/types/database.ts from the migrated schema
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
db="tarakari_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql() { command psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }

psql -f "$here/00_supabase_stub.sql"
for f in "$root"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  psql -f "$f"
done
psql -f "$root/supabase/seed.sql"
psql -f "$root/supabase/seed.sql"   # seed must be idempotent
psql -f "$here/10_rls_test.sql" >/dev/null
psql -f "$here/20_operations_test.sql" >/dev/null
echo "All database checks passed."
if [[ "${1:-}" == "--types" ]]; then
  PGDATABASE="$db" node "$here/gen-types.mjs"
fi
