"""Fold an entry known only from the open map into the same business loaded from an official register.

  .venv/bin/python -m tools.reach.merge_map_into_register advokat agencija-za-nekretnine            # dry run
  .venv/bin/python -m tools.reach.merge_map_into_register advokat agencija-za-nekretnine --write

Lawyers and estate agents were first loaded from OpenStreetMap (2026-11-09) and on 2026-11-12 from the bar directories and
the ministry's register, so some businesses exist twice. A map entry is folded into a register entry of the same kind in
the same city or municipality when their names agree: after dropping words every such business carries ("advokat",
"kancelarija", "agencija", "nekretnine", "doo", ...), one name's words are all in the other's and at least two words
match (a first name and a surname, or two words of a firm's name). When two register entries fit, nothing is folded.
What moves: the map point, and the map's phone, site and hours where the register entry has none (they keep the label
OpenStreetMap). The map organisation gets status 'merged' and its address answers with a redirect to the register entry.
Undo file: db/fixes/merged_map_into_register_<stamp>.json.
"""
import collections, json, sys, time
from importers.common import db
from importers.jobs.assign_city_municipality import fold

WRITE = "--write" in sys.argv; TYPES = [a for a in sys.argv[1:] if not a.startswith("--")]
GENERIC = set("""advokat advokati advokatska advokatsko kancelarija ortacko drustvo zajednicka adv law office lawyer attorney agencija agencije nekretnine nekretnina
za promet i doo d o pr preduzetnik beograd novi sad nis real estate posredovanje poslovanje nekretninama usluge sr stan stanovi tim team""".split())
def words(name): return {w for w in fold(name).split() if w not in GENERIC and len(w) > 1 and not w.isdigit()}
stats = collections.Counter(); log = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, level, parent_id from territorial_units"); units = {r["id"]: r for r in cur.fetchall()}
    def jls(uid):
        u = units.get(uid)
        return (u["parent_id"] if u and u["level"] == "gradska_opstina" else uid)
    for ty in TYPES:
        cur.execute("""select o.id, o.name_lat, l.id as lid, l.territorial_unit_id as tu, l.lat, l.lng,
                         exists (select 1 from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id and s.code <> 'osm') as reg
                       from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
                       where o.status = 'active' and t.slug = %s""", (ty,))
        rows = cur.fetchall(); reg = collections.defaultdict(list)
        for r in rows:
            if r["reg"]: reg[jls(r["tu"])].append((words(r["name_lat"]), r))
        for m in rows:
            if m["reg"]: continue
            mw = words(m["name_lat"])
            if len(mw) < 2: stats[f"{ty}: map name too short to match"] += 1; continue
            hits = [r for w, r in reg.get(jls(m["tu"]), []) if len(mw & w) >= 2 and (mw <= w or (w <= mw and len(mw) - len(w) <= 1))]   # a joint office of three is not one of its members
            if len(hits) != 1: stats[f"{ty}: {'no register twin' if not hits else 'two register entries fit'}"] += 1; continue
            k = hits[0]; stats[f"{ty}: folded"] += 1; log.append({"map_org": m["id"], "map_name": m["name_lat"], "into": k["id"], "register_name": k["name_lat"], "map_location": m["lid"], "into_location": k["lid"]})
            if not WRITE: continue
            if m["lat"] is not None and k["lat"] is None:
                cur.execute("update locations set lat = %s, lng = %s, geo_precision = 'rooftop' where id = %s", (m["lat"], m["lng"], k["lid"]))
            for kind in ("phone", "mobile", "website"):
                cur.execute("""insert into location_contacts (location_id, kind, value, value_display, label)
                               select %s, kind, value, value_display, coalesce(label, 'OpenStreetMap') from location_contacts c where c.location_id = %s and c.kind = %s::contact_kind
                                 and not exists (select 1 from location_contacts x where x.location_id = %s and x.kind in ('phone', 'mobile', 'website') and (x.kind = c.kind or (c.kind <> 'website' and x.kind <> 'website')))""",
                            (k["lid"], m["lid"], kind, k["lid"]))
            cur.execute("""update opening_hours set location_id = %s, note = coalesce(note, 'OpenStreetMap') where location_id = %s
                           and not exists (select 1 from opening_hours h where h.location_id = %s)""", (k["lid"], m["lid"], k["lid"]))
            cur.execute("update locations set status = 'merged', moved_to_location_id = %s, updated_at = now() where org_id = %s and status = 'active'", (k["lid"], m["id"]))
            cur.execute("update organizations set status = 'merged', merged_into_org_id = %s, updated_at = now() where id = %s", (k["id"], m["id"]))
    for kk, v in sorted(stats.items()): print(f"{v:5d}  {kk}")
    for x in log[:12]: print("  ", x["map_name"], "->", x["register_name"])
    if WRITE:
        p = f"db/fixes/merged_map_into_register_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump(log, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=0); c.commit(); print("written;", p)
    else: c.rollback()
