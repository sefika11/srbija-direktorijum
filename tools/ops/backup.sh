#!/bin/sh
# Full dump of the live database to .cache/dumps/ (outside git: it holds contact data of named persons). Keeps the last 8.
#   set -a && . apps/web/.env.local; set +a; sh tools/ops/backup.sh
# Restore into an empty database:  gunzip -c <file> | psql "<connection string>"
# Run it before every large import and once a week.
set -e
: "${DATABASE_URL_UNPOOLED:?load apps/web/.env.local first}"
PG_DUMP=$(ls /opt/homebrew/opt/postgresql@17/bin/pg_dump /opt/homebrew/opt/postgresql@16/bin/pg_dump /opt/homebrew/bin/pg_dump 2>/dev/null | head -1)
mkdir -p .cache/dumps
OUT=".cache/dumps/srbdir_$(date +%Y-%m-%d_%H%M).sql.gz"
"$PG_DUMP" --no-owner --no-privileges "$DATABASE_URL_UNPOOLED" | gzip > "$OUT"
[ "$(gunzip -c "$OUT" | tail -5 | grep -c 'PostgreSQL database dump complete')" = "1" ] || { echo "dump did not complete: $OUT"; exit 1; }
ls -t .cache/dumps/srbdir_*.sql.gz | tail -n +9 | xargs -I{} rm -f {}
echo "written $OUT ($(du -h "$OUT" | cut -f1))"
