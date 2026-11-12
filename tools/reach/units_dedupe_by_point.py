"""Second look at the "new" health-centre branches: a branch we hold from the open map often has no village in its name.

  .venv/bin/python -m tools.reach.units_dedupe_by_point db/contacts/health_units_2026-11-12

For every branch the centre already holds with a map point, the village is read from the point (settlement boundaries,
.cache/osm/admin_7_9.geojson). A "new" row for that village is then the same branch: it leaves _new.json, and when exactly
one held branch sits in that village the fields it lacks go to _held.json. Read-only on the database.
"""
import collections, json, os, re, sys
import psycopg
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold
from importers.jobs.assign_city_municipality import rings

OUT = sys.argv[1]
def inside(geom, x, y):
    ins = False
    for poly in rings(geom):
        for ring in poly:
            j = len(ring) - 1
            for i in range(len(ring)):
                xi, yi = ring[i][0], ring[i][1]; xj, yj = ring[j][0], ring[j][1]
                if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: ins = not ins
                j = i
    return ins
feats = []
for f in json.load(open(".cache/osm/admin_7_9.geojson"))["features"]:
    if f["properties"].get("admin_level") != "9": continue
    xs = [pt[0] for poly in rings(f["geometry"]) for ring in poly for pt in ring]; ys = [pt[1] for poly in rings(f["geometry"]) for ring in poly for pt in ring]
    if xs: feats.append((min(xs), min(ys), max(xs), max(ys), fold(re.sub(r"\(.*?\)", "", cyr_to_lat(f["properties"].get("name") or ""))), f["geometry"]))
def village(lat, lng):
    for x0, y0, x1, y1, name, geom in feats:
        if x0 <= lng <= x1 and y0 <= lat <= y1 and inside(geom, lng, lat): return name
    return None
new = json.load(open(os.path.join(OUT, "_new.json"), encoding="utf-8")); held = json.load(open(os.path.join(OUT, "_held.json"), encoding="utf-8"))
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""select o.slug, l.id, l.lat, l.lng, l.address_display,
  exists (select 1 from location_contacts x where x.location_id = l.id and x.kind in ('phone', 'mobile')), exists (select 1 from opening_hours h where h.location_id = l.id)
  from locations l join organizations o on o.id = l.org_id where o.slug = any(%s) and l.status = 'active' and not l.is_primary and l.lat is not null""", (list({r["org_slug"] for r in new}),))
by = collections.defaultdict(list)
for slug, lid, lat, lng, addr, has_phone, has_hours in k.fetchall():
    v = village(float(lat), float(lng))
    if v: by[(slug, v)].append((lid, addr, has_phone, has_hours))
keep = []; stats = collections.Counter()
for r in new:
    mine = by.get((r["org_slug"], fold(r["place"])))
    if not mine: keep.append(r); continue
    stats["already held (found by its map point)"] += 1
    if len(mine) == 1:
        lid, addr, has_phone, has_hours = mine[0]; add = {"location_id": lid, "source_url": r["source_url"]}
        if r["address"] != r["place"] and not addr: add["address"] = r["address"]
        if r["phones"] and not has_phone: add["phones"] = r["phones"]
        if r["hours"] and not has_hours: add["hours"] = r["hours"]
        if len(add) > 2: held.append(add); stats["held branch gains a field"] += 1
json.dump(keep, open(os.path.join(OUT, "_new.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(held, open(os.path.join(OUT, "_held.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for kk, v in stats.items(): print(f"{v:5d}  {kk}")
print("new branches left:", len(keep), "| held rows to apply:", len(held))
