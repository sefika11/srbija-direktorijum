"""Targets for the health-centre branch pass: every health centre whose own site we know, with the branches we already hold.

  python tools/reach/build_health_unit_targets.py <out_dir>

Eight centres per file. An agent reads each centre's site for its village clinics and stations (ambulanta, zdravstvena
stanica, ogranak) and writes the ones we do not hold, and the address, phone or hours a held one lacks. Read-only.
"""
import json, os, sys
import psycopg

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""select o.id, o.slug, o.name_lat, o.website, u.name_lat from organizations o join org_types t on t.id = o.org_type_id
left join lateral (select territorial_unit_id from locations l where l.org_id = o.id and l.is_primary and l.status = 'active' limit 1) s on true
left join territorial_units u on u.id = s.territorial_unit_id
where o.status = 'active' and t.slug = 'dom-zdravlja' and coalesce(o.website, '') <> '' order by u.name_lat, o.id""")
orgs = k.fetchall(); rows = []
for oid, slug, name, web, place in orgs:
    k.execute("""select l.id, l.unit_name_lat, l.settlement_name_lat, l.address_display,
      (select string_agg(coalesce(c.value_display, c.value), '; ') from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')),
      exists (select 1 from opening_hours h where h.location_id = l.id) from locations l where l.org_id = %s and l.status = 'active' and not l.is_primary order by l.unit_name_lat""", (oid,))
    held = [{"location_id": r[0], "name": r[1], "settlement": r[2], "address": r[3], "phones": r[4], "has_hours": r[5]} for r in k.fetchall()]
    rows.append({"org_slug": slug, "name": name, "municipality": place, "website": web, "held_branches": held})
n = 0
for i in range(0, len(rows), 8):
    n += 1; fid = f"dz-{n:02d}"
    json.dump({"id": fid, "rows": rows[i:i + 8]}, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(rows), "health centres,", n, "files,", sum(len(r["held_branches"]) for r in rows), "branches held")
