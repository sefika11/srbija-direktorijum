"""Give a unit its village when the unit's own name carries it.

  .venv/bin/python -m tools.reach.units_village_from_name predskolska-ustanova [osnovna-skola ...]            # dry run
  .venv/bin/python -m tools.reach.units_village_from_name predskolska-ustanova --write

The education register names a village group by its village ("Bela Reka", "Dedina - PPP", "Objekat u Klenku") and gives it
no settlement, so the page said only the municipality. A unit without a settlement and without a street gets the village
when exactly one settlement of its own municipality (statistical office's list, staging.rzs_naselja) stands in its name as
whole words, outside any quotation marks (a school's namesake is not a place), and that settlement is not the municipality's
own seat. Nothing else changes: no street, no map point.
Undo file: db/fixes/units_village_from_name_<stamp>.json (set settlement_name_lat back to null for those ids).
"""
import collections, json, re, sys, time
from importers.common import db
from importers.jobs.assign_city_municipality import fold

WRITE = "--write" in sys.argv; TYPES = [a for a in sys.argv[1:] if not a.startswith("--")]
NOISE = re.compile(r'["“”„\']|\bppp\b|\bppg\b|pripremn\w*|predškolsk\w*|program\w*|grupa|vrtić|vrtic|\bs\.|selo|\bpu\b|objekat|odeljenje|izdvojeno|vaspitn\w*|-|–|,|\.', re.I)
def unquoted(name):
    """The name without what stands in quotation marks: a school named after "Branko Radičević" is not in the village Radičević."""
    n = re.sub(r",,|''|[“”„»«]", '"', name)
    return re.sub(r'"[^"]*"', " ", n)
stats = collections.Counter(); out = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, level, parent_id, name_lat from territorial_units"); units = {r["id"]: r for r in cur.fetchall()}
    def jls(u):
        x = units.get(u); return x["parent_id"] if x and x["level"] == "gradska_opstina" else u
    villages = collections.defaultdict(dict)
    cur.execute("select naziv_lat, jls_id from staging.rzs_naselja where jls_id is not null and naziv_lat is not null")
    for r in cur.fetchall():
        base = re.sub(r"\s*\(.*\)\s*$", "", r["naziv_lat"]).strip(); villages[r["jls_id"]][fold(base)] = base
    cur.execute("""select l.id, l.unit_name_lat, l.territorial_unit_id, t.slug from locations l join organizations o on o.id = l.org_id and o.status = 'active'
                   join org_types t on t.id = o.org_type_id where l.status = 'active' and not l.is_primary and t.slug = any(%s)
                     and coalesce(l.settlement_name_lat, '') = '' and coalesce(l.street, '') = ''""", (TYPES,))
    for r in cur.fetchall():
        j = jls(r["territorial_unit_id"]); seat = fold((units.get(j) or {}).get("name_lat") or "")
        f = " ".join(fold(NOISE.sub(" ", unquoted(r["unit_name_lat"] or ""))).split())
        hit = {n for n in villages.get(j, {}) if n and n != seat and re.search(r"(^| )" + re.escape(n) + r"( |$)", f)}
        hit = {n for n in hit if not any(n != m and n in m for m in hit)}            # "Gornji Stupanj" wins over "Stupanj"
        if len(hit) != 1: stats[f"{r['slug']}: {'no village in the name' if not hit else 'two villages in the name'}"] += 1; continue
        v = villages[j][hit.pop()]; stats[f"{r['slug']}: village set"] += 1; out.append((r["id"], r["unit_name_lat"], v))
    for k, v in sorted(stats.items()): print(f"{v:6d}  {k}")
    for x in out[:10] + out[len(out) // 2: len(out) // 2 + 10]: print("   ", x[1], "->", x[2])
    if WRITE and out:
        p = f"db/fixes/units_village_from_name_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump({"note": "set settlement_name_lat to null to undo", "locations": [o[0] for o in out]}, open(p, "w"))
        cur.executemany("update locations set settlement_name_lat = %s, updated_at = now() where id = %s and coalesce(settlement_name_lat, '') = ''", [(o[2], o[0]) for o in out])
        c.commit(); print("written;", p)
    else: c.rollback()
