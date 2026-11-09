#!/bin/sh
# Local dev Postgres (not a brew service). Data dir lives in the Claude scratchpad; re-run initdb if it is gone.
export LC_ALL=C
PG=/opt/homebrew/opt/postgresql@16/bin
DATA=${PGDATA_LOCAL:-/private/tmp/claude-501/-Users-djoni--claude-spares-spare-30is2J/fe1fd8a2-d072-480d-ac64-adde3c99173c/scratchpad/pgdata}
case "$1" in
  start) $PG/pg_ctl -D "$DATA" -o "-p 54329 -k /tmp" -l "$DATA/../pg.log" start ;;
  stop)  $PG/pg_ctl -D "$DATA" stop ;;
  psql)  $PG/psql "postgresql://srbdir@/srbdir?host=/tmp&port=54329" ;;
  *) echo "usage: $0 start|stop|psql"; echo "DATABASE_URL=postgresql://srbdir@/srbdir?host=/tmp&port=54329" ;;
esac
