"""File freshly imported organisations under the city municipality their register row names.

  python -m tools.reach.assign_go_from_import <db/imports/file.json>            # dry run
  python -m tools.reach.assign_go_from_import <db/imports/file.json> --write

importers.jobs.load_orgs_json files a row whose municipality is a city municipality (Zvezdara, Medijana, Petrovaradin)
under the city itself. When the import row says which city municipality it is, this moves the organisation's seat there:
only rows still filed under a city, only to a municipality of that same city (so Palilula of Beograd and Palilula of Niš
cannot be mixed up). Changes go to db/fixes/go_from_import_<stamp>.json (location id, old unit, new unit).
"""
import json, sys, time
from importers.common import db
from importers.common.normalize import clean_ws
from importers.jobs.load_orgs_json import lat, nice_case, slugify
from importers.sources.rfzo_apoteke import fold

FILE = sys.argv[1]; WRITE = "--write" in sys.argv
rows = json.load(open(FILE, encoding="utf-8"))["rows"]
changes, stats = [], {"rows": len(rows), "names a city municipality": 0, "moved": 0, "organisation not found": 0, "not under that city": 0}
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, slug, name_lat, parent_id from territorial_units where level = 'gradska_opstina' and status = 'active'")
    gos = {}
    for g in cur.fetchall(): gos.setdefault(fold(g["name_lat"]), []).append(g)
    cur.execute("select slug from org_types"); type_slugs = {r["slug"] for r in cur.fetchall()}
    for r in rows:
        cand = gos.get(fold(clean_ws(lat(r.get("municipality")) or "")))
        if not cand: continue
        stats["names a city municipality"] += 1
        name = nice_case(clean_ws(lat(r.get("name")) or "")); town = clean_ws(lat(r.get("town")) or ""); t = r["type_slug"]
        slug = slugify(f"{name}-{town}") if slugify(name).startswith(slugify(t).split("-")[0]) else slugify(f"{t}-{name}-{town}")  # as the loader builds it
        cur.execute("select l.id, l.territorial_unit_id as tu from organizations o join locations l on l.org_id = o.id and l.is_primary where o.slug = %s", (slug,))
        loc = cur.fetchone()
        if not loc: stats["organisation not found"] += 1; continue
        go = next((g for g in cand if g["parent_id"] == loc["tu"]), None)
        if not go: stats["not under that city"] += 1; continue
        changes.append({"location_id": loc["id"], "old_unit": loc["tu"], "new_unit": go["id"], "to": go["slug"], "org": slug})
        if WRITE: cur.execute("update locations set territorial_unit_id = %s where id = %s and territorial_unit_id = %s", (go["id"], loc["id"], loc["tu"]))
    stats["moved"] = len(changes)
    if WRITE and changes:
        path = f"db/fixes/go_from_import_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
        with open(path, "x", encoding="utf-8") as f: json.dump(changes, f, ensure_ascii=False, indent=0)
        c.commit(); print("written", path)
    else: c.rollback()
print(stats)
