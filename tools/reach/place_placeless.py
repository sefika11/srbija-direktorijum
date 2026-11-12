"""Give a seat to institutions of the Treasury register that were loaded without any location.

  .venv/bin/python -m tools.reach.place_placeless            # dry run
  .venv/bin/python -m tools.reach.place_placeless --write

The Treasury row names a place ("mesto") and the Treasury unit that serves it ("oj_name"). The loader skipped rows whose
place it could not resolve (a village name shared by several municipalities, "BEOGRAD, ZEMUN" written with a comma). Rule:
the place itself when it resolves to one municipality; a village name shared by several municipalities when exactly one of
them is the Treasury unit's municipality; otherwise the Treasury unit's municipality, with the place kept as the settlement.
Units in Kosovo are left out (the site has no pages for them). The new location has no street: only a town.
Written ids go to db/fixes/placed_placeless_<stamp>.json.
"""
import json, re, sys, time, collections
from importers.common import db
from importers.common.match import upsert_location
from importers.common.normalize import cyr_to_lat
from importers.sources.rfzo_apoteke import LatinResolver, fold

WRITE = "--write" in sys.argv
def nice(s): return " ".join(w.capitalize() if len(w) > 2 or i == 0 else w.lower() for i, w in enumerate((s or "").lower().split()))
stats = collections.Counter(); made = []; left = []
with db.conn() as c, c.cursor() as cur:
    resolver = LatinResolver(cur)
    cur.execute("select id, name_lat, level, parent_id, coalesce(in_kosovo, false) as kos from territorial_units where level in ('jls', 'gradska_opstina')")
    units = {r["id"]: r for r in cur.fetchall()}
    by_name = collections.defaultdict(list)
    for u in units.values(): by_name[fold(u["name_lat"])].append(u)
    cur.execute("""select o.id, o.slug, o.name_lat, p.raw from organizations o join provenance p on p.entity_type = 'organization' and p.entity_id = o.id
                   where o.status = 'active' and not exists (select 1 from locations l where l.org_id = o.id and l.status = 'active')""")
    for o in cur.fetchall():
        raw = o["raw"] or {}; mesto = nice(cyr_to_lat(raw.get("mesto") or "")); oj = cyr_to_lat(raw.get("oj_name") or "")
        oj_units = [u for u in by_name.get(fold(oj), []) if not u["kos"]]
        oj_jls = {(u["parent_id"] if u["level"] == "gradska_opstina" else u["id"]) for u in oj_units}
        tu = None; how = None; sett = None
        m2 = re.sub(r"^beograd\s*[-,]\s*", "", mesto, flags=re.I)   # "Beograd, Zemun" -> "Zemun"
        for cand in (mesto, m2):
            hit = [u for u in by_name.get(fold(cand), []) if not u["kos"]]
            if len(hit) == 1: tu, how = hit[0]["id"], "place is a municipality"; break
        if tu is None:
            cands = resolver.nas.get(fold(m2), set()) | resolver.nas.get(fold(mesto), set())
            cands = {j for j in cands if j in units and not units[j]["kos"]}
            if len(cands) == 1: tu, how, sett = next(iter(cands)), "village of one municipality", m2
            elif cands & oj_jls and len(cands & oj_jls) == 1: tu, how, sett = next(iter(cands & oj_jls)), "village, municipality from the Treasury unit", m2
        if tu is None and len(oj_units) == 1 and mesto and not by_name.get(fold(mesto)):
            tu, how, sett = oj_units[0]["id"], "Treasury unit's municipality", m2
        if tu is None: stats["left without a place"] += 1; left.append((o["slug"], mesto, oj)); continue
        stats[how] += 1
        if WRITE:
            lid = upsert_location(cur, org_id=o["id"], slug="sediste", unit_name_lat="Sedište", unit_kind="sediste", territorial_unit_id=tu, street=None, street_number=None, is_primary=True)
            if sett: cur.execute("update locations set settlement_name_lat = %s where id = %s and settlement_name_lat is null", (sett, lid))
            cur.execute("update locations set verification = 'auto_verified' where id = %s", (lid,))
            made.append(lid)
    for kk, v in stats.most_common(): print(f"{v:5d}  {kk}")
    print("left, first 12:", left[:12])
    if WRITE:
        path = f"db/fixes/placed_placeless_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump({"note": "delete these locations to undo", "locations": made}, open(path, "w")); c.commit(); print("written;", path)
