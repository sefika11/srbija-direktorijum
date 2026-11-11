"""Health centres (zdravstveni centar) against the rows imported from the Ministry of Health's directory.

  python -m tools.reach.health_centres            # dry run: prints what would change
  python -m tools.reach.health_centres --write    # applies it and writes db/fixes/health_centres_<stamp>.json

The ministry's directory lists "Dom zdravlja X" and "Opšta bolnica X" as separate entries in towns where the Treasury's
register of public-fund users (Spisak KJS, snapshot 2026-10-31) holds one legal body, "Zdravstveni centar X", and no
separate health centre or hospital. The combined centre is therefore the current institution and the two are its parts.
  merge   a hospital row from the directory that sits at the same street and number, with a shared phone, as a
          Treasury-listed hospital or combined centre of the same municipality is that body's seat: it is retired into it
          (status 'merged', merged_into_org_id; its locations 'merged' + moved_to_location_id) and its name is kept as the
          target's short_name, which the search index reads.
  parent  every other directory row (health centre or hospital) the Treasury does not list on its own becomes a unit of
          the combined centre of its municipality, or of Zdravstveni centar Užice when that centre's own site names it.
Undo: per entry of the fixes file. merge: organisation back to 'active' with merged_into_org_id null, the listed locations
back to 'active' with moved_to_location_id null, target short_name back to short_name_before. parent: parent_org_id null.
"""
import json, os, re, sys, time, collections
import psycopg, xlrd
from importers.common.http import PoliteClient
from importers.common.normalize import cyr_to_lat
from importers.sources.rfzo_apoteke import fold
from importers.sources.trezor_kjs import ARCHIVE

WRITE = "--write" in sys.argv
KJS_URL = ARCHIVE.format(y=2026, m=10, d=31)
# units the Užice centre names on its own site (https://zcue.rs): they sit in other municipalities of the district
UZICE = "zdravstveni-centar-uzice-uzice"
UZICE_UNITS = {"dom zdravlja " + x for x in ("arilje", "bajina basta", "kosjeric", "nova varos", "pozega", "priboj", "sjenica", "cajetina")} | {"opsta bolnica priboj", "opsta bolnica prijepolje"}
STOP = {"ulica", "ul", "bb", "br", "broj", "bulevar", "bul", "trg", "i"}
def norm(s): return " ".join(fold(s).split())
def street(a): return frozenset(w for w in fold((a or "").split(",")[0]).split() if len(w) > 2 and not w.isdigit() and w not in STOP)
def number(a): m = re.search(r"\b(\d+)", (a or "").split(",")[0]); return m.group(1) if m else "bb" if re.search(r"(?i)\bbb\b", a or "") else None
def kind(n):
    n = " " + norm(n) + " "
    return "dom zdravlja" if " dom zdravlja " in n else "opsta bolnica" if " opsta bolnica " in n else "zdravstveni centar" if " zdravstveni centar " in n else None

sh = xlrd.open_workbook(file_contents=PoliteClient(delay=2.0).get(KJS_URL).content).sheet_by_index(0)
kjs = []  # (folded name, folded place, mb) of every health centre, hospital and combined centre the Treasury lists
for r in range(sh.nrows):
    v = [str(x).strip() for x in sh.row_values(r)]
    if len(v) > 4 and kind(cyr_to_lat(v[2])): kjs.append((norm(cyr_to_lat(v[2])), norm(cyr_to_lat(v[3])), v[4]))
kjs_mb = {k[2] for k in kjs}
def treasury_lists(name, town):
    """The Treasury holds a body of this kind for this town under its own name."""
    k = kind(name); t = norm(town)
    return any(x[0].startswith(k) and (t in x[0] or t == x[1]) for x in kjs)

c = psycopg.connect(os.environ["DATABASE_URL"]); cur = c.cursor()
cur.execute("""
select o.id, o.slug, o.name_lat, t.slug, o.mb, o.parent_org_id, o.short_name, l.id, l.territorial_unit_id, u.name_lat, l.address_display,
  (select array_agg(lc.value) from location_contacts lc where lc.location_id = l.id and lc.kind in ('phone', 'mobile')),
  exists (select 1 from provenance p join data_sources ds on ds.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id and ds.code = 'zdravlje_mreza')
from organizations o join org_types t on t.id = o.org_type_id
join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
left join territorial_units u on u.id = l.territorial_unit_id
where o.status = 'active' and t.slug in ('dom-zdravlja', 'opsta-bolnica')""")
K = ("id", "slug", "name", "type", "mb", "parent", "short", "loc", "tu", "town", "addr", "phones", "directory")
orgs = [dict(zip(K, r)) for r in cur.fetchall()]
for o in orgs: o["mb"] = (o["mb"] or "").strip() or None; o["phones"] = set(o["phones"] or [])
legal = [o for o in orgs if o["mb"] in kjs_mb and kind(o["name"])]                       # bodies the Treasury lists
cand = [o for o in orgs if o["directory"] and not o["mb"] and kind(o["name"])]          # rows made from the directory
merges, parents, left = [], [], []
for o in cand:
    if treasury_lists(o["name"], o["town"] or ""): left.append((o, "the Treasury lists it under its own name")); continue
    here = [x for x in legal if x["tu"] == o["tu"] and x["id"] != o["id"]]
    twin = [x for x in here if x["type"] == "opsta-bolnica" and o["type"] == "opsta-bolnica" and street(x["addr"]) == street(o["addr"]) and street(o["addr"])
            and number(x["addr"]) == number(o["addr"]) and x["phones"] & o["phones"]]
    centre = [x for x in here if kind(x["name"]) == "zdravstveni centar"]
    if len(twin) == 1: merges.append((o, twin[0]))
    elif kind(o["name"]) == "zdravstveni centar": left.append((o, "a combined centre with no Treasury twin at its address"))
    elif len(centre) == 1 and not o["parent"]: parents.append((o, centre[0]))
    elif norm(o["name"]) in UZICE_UNITS and not o["parent"]: parents.append((o, next(x for x in legal if x["slug"] == UZICE)))
    else: left.append((o, "no combined centre in its municipality"))

print(f"Treasury snapshot: {len(kjs)} health centres, hospitals and combined centres | directory rows checked: {len(cand)}")
print(f"\nMERGE {len(merges)}")
for o, x in merges: print(f"  {o['name'][:48]:48s} -> {x['name'][:42]:42s} | {o['addr']} | extra phones: {sorted(o['phones'] - x['phones']) or '-'}")
print(f"\nPARENT {len(parents)}")
for o, x in parents: print(f"  {o['name'][:48]:48s} unit of {x['name']}")
print(f"\nLEFT AS IS {len(left)}")
for o, why in left: print(f"  {o['name'][:48]:48s} {why}")
if not WRITE: sys.exit(0)

undo = []
for o, x in merges:
    cur.execute("select id from locations where org_id = %s and status = 'active'", (o["id"],)); locs = [r[0] for r in cur.fetchall()]
    undo.append({"action": "merge", "org_id": o["id"], "org_slug": o["slug"], "into_org_id": x["id"], "into_slug": x["slug"], "location_ids": locs, "short_name_before": x["short"]})
for o, x in parents: undo.append({"action": "parent", "org_id": o["id"], "org_slug": o["slug"], "parent_org_id": x["id"], "parent_slug": x["slug"]})
path = f"db/fixes/health_centres_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
with open(path, "x", encoding="utf-8") as f: json.dump({"basis": KJS_URL, "entries": undo}, f, ensure_ascii=False, indent=1)
named = collections.Counter()
for o, x in merges:
    cur.execute("update locations set status = 'merged', moved_to_location_id = %s where org_id = %s and status = 'active'", (x["loc"], o["id"]))
    cur.execute("update organizations set status = 'merged', merged_into_org_id = %s where id = %s", (x["id"], o["id"]))
    if not x["short"] and not named[x["id"]]:
        cur.execute("update organizations set short_name = %s where id = %s", (re.sub(r"''|[“”„]", '"', o["name"]), x["id"])); named[x["id"]] += 1
for o, x in parents: cur.execute("update organizations set parent_org_id = %s where id = %s", (x["id"], o["id"]))
c.commit()
print(f"\nwritten: {len(merges)} merged, {len(parents)} linked to a parent | undo: {path}")
