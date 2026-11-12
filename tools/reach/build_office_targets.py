"""Targets for the registry-office and local-tax pass: one row per municipality and city municipality with its official site.

  python tools/reach/build_office_targets.py <out_dir>

The official site is the one we hold for the unit itself or for its administration (opštinska uprava, gradska uprava, uprava
gradske opštine, organ JLS). Units in Kosovo are left out. Nine units per file. Read-only on the database.
"""
import json, os, sys, collections
import psycopg

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""select u.id, u.slug, u.name_lat, u.level, p.slug, p.name_lat, u.website, u.path::text
from territorial_units u left join territorial_units p on p.id = u.parent_id
where u.level in ('jls', 'gradska_opstina') and not coalesce(u.in_kosovo, false) and u.status = 'active' order by u.path""")
units = k.fetchall()
k.execute("""select l.territorial_unit_id, t.slug, o.website, o.name_lat from organizations o join org_types t on t.id = o.org_type_id
join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
where o.status = 'active' and o.website is not null and t.slug in ('opstinska-uprava', 'gradska-uprava', 'uprava-gradske-opstine', 'organ-jls')""")
sites = collections.defaultdict(collections.Counter)
RANK = {"opstinska-uprava": 5, "gradska-uprava": 5, "uprava-gradske-opstine": 5, "organ-jls": 1}
for tu, ty, web, _ in k.fetchall(): sites[tu][web.rstrip("/")] += RANK[ty]
rows = []
for (uid, slug, name, level, pslug, pname, web, path) in units:
    cand = [w for w, _ in sites[uid].most_common(3)]
    if web and web.rstrip("/") not in cand: cand.insert(0, web.rstrip("/"))
    rows.append({"unit_id": uid, "unit": name, "unit_slug": slug, "level": level, "city": pname if level == "gradska_opstina" else None, "official_sites": cand})
n = 0
for i in range(0, len(rows), 9):
    n += 1; fid = f"of-{n:02d}"
    json.dump({"id": fid, "rows": rows[i:i + 9]}, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(rows), "units,", n, "files,", sum(1 for r in rows if not r["official_sites"]), "without a known site")
