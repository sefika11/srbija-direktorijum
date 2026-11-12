#!/bin/sh
# The four rules to re-run after every import, in this order, then the data rules (a FAIL there is a bug to fix first). Run from the repo root:
#   set -a && . apps/web/.env.local; set +a; sh tools/reach/after_import.sh
# Each step writes its own undo file to db/fixes/. Never run a schema change while an import is open (see load_in_batches.py).
set -e
PY=.venv/bin/python
echo "1/4 city municipality from coordinates, settlement or address tail"
$PY -m importers.jobs.assign_city_municipality --write | tail -3
echo "2/4 city municipality from the street address"
$PY -m tools.reach.assign_go_by_street --write | tail -3
echo "3/4 trust badge from the source"
$PY tools/reach/relabel_verification.py --write | tail -2
echo "4/4 map points from address data"
$PY -m tools.reach.geocode_from_map --write | tail -7
echo "data rules"
$PY tools/ops/check_data.py
