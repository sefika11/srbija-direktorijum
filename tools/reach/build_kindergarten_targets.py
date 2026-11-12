"""Targets for the second look at kindergarten buildings: public preschool institutions whose own site we know and whose
buildings still lack a street or a phone after the pass of 2026-11-11.

  .venv/bin/python -m tools.reach.build_kindergarten_targets <out_dir> [per_file]

A building counts as fillable when it has a name of its own (not a village group, not a group hosted in a school or a hall:
those have no address a site would print) and lacks a street, or has a street and lacks a phone. An institution enters with
three or more fillable buildings. Each row lists every building of the institution we hold, so a building the site lists
can be told from a new one. Read-only.
"""
import collections, json, os, re, sys
import psycopg
from importers.jobs.assign_city_municipality import fold

OUT = sys.argv[1]; PER = int(sys.argv[2]) if len(sys.argv) > 2 else 9; os.makedirs(OUT, exist_ok=True)
HOSTED = re.compile(r"\bo\.?\s?š\b|osnovn|škol|skol|mesn|\bmz\b|dom kulture|prostor|zadruž|bolnic", re.I)
NOISE = re.compile(r'["“”„\']|\bppp\b|\bppg\b|pripremn\w*|predškolsk\w*|program\w*|grupa|vrtić|vrtic|\bs\.|selo|\bpu\b|objekat|odeljenje|izdvojeno|vaspitn\w*|-|–', re.I)
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("select id, level, parent_id from territorial_units"); units = {r[0]: r for r in k.fetchall()}
def jls(u):
    x = units.get(u); return x[2] if x and x[1] == "gradska_opstina" else u
villages = collections.defaultdict(set)
k.execute("select naziv_lat, jls_id from staging.rzs_naselja where jls_id is not null and naziv_lat is not null")
for n, j in k.fetchall(): villages[j].add(fold(re.sub(r"\s*\(.*\)\s*$", "", n)))
def village_of(name, tu, muni):
    """The village of the municipality that the building's name carries, or None."""
    f = " ".join(fold(NOISE.sub(" ", name or "")).split())
    hit = [n for n in villages.get(jls(tu), ()) if n and n != fold(muni or "") and re.search(r"(^| )" + re.escape(n) + r"( |$)", f)]
    return max(hit, key=len) if hit else None

if __name__ == "__main__":
    k.execute("""select o.id, o.slug, o.name_lat, o.website, u.name_lat from organizations o join org_types t on t.id = o.org_type_id
    left join lateral (select territorial_unit_id from locations l where l.org_id = o.id and l.is_primary and l.status = 'active' limit 1) s on true
    left join territorial_units u on u.id = s.territorial_unit_id
    where o.status = 'active' and t.slug = 'predskolska-ustanova' and coalesce(o.website, '') <> '' order by u.name_lat, o.id""")
    rows = []
    for oid, slug, name, web, place in k.fetchall():
        k.execute("""select l.id, l.unit_name_lat, l.address_display, l.territorial_unit_id, coalesce(l.street, '') <> '',
          (select string_agg(coalesce(x.value_display, x.value), '; ') from location_contacts x where x.location_id = l.id and x.kind in ('phone', 'mobile')),
          exists (select 1 from opening_hours h where h.location_id = l.id) or coalesce(l.hours_text, '') <> ''
          from locations l where l.org_id = %s and l.status = 'active' and not l.is_primary order by l.unit_name_lat""", (oid,))
        held = []; fillable = 0
        for lid, uname, addr, tu, has_street, phones, has_hours in k.fetchall():
            own = not HOSTED.search(uname or "") and not village_of(uname, tu, place)
            if own and (not has_street or not phones): fillable += 1
            held.append({"location_id": lid, "name": uname, "address": addr if has_street else None, "phones": phones, "has_hours": has_hours})
        if fillable >= 3: rows.append({"org_slug": slug, "name": name, "municipality": place, "website": web, "fillable": fillable, "held_buildings": held})
    big = [r for r in rows if r["fillable"] >= 30]; rest = [r for r in rows if r["fillable"] < 30]     # a large city network gets a file of its own
    files = [[r] for r in big] + [rest[i:i + PER] for i in range(0, len(rest), PER)]; n = 0
    for chunk in files:
        n += 1; fid = f"pu-{n:02d}"
        json.dump({"id": fid, "rows": chunk}, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(rows), "institutions,", n, "files,", sum(r["fillable"] for r in rows), "fillable buildings,", sum(len(r["held_buildings"]) for r in rows), "buildings listed")
