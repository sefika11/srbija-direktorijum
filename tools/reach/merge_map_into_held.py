"""Fold an entry made from the open map into the institution we already hold under the same name, whatever its kind.

  .venv/bin/python -m tools.reach.merge_map_into_held            # dry run, prints every pair
  .venv/bin/python -m tools.reach.merge_map_into_held --write

tools/reach/merge_map_into_register.py folds a map entry into a register entry of the SAME kind (lawyers, estate agents).
This pass is for the rest: the map import files a clinic as "privatna ordinacija", so a public clinic, institute or
hospital we hold from the Treasury list got a second entry of another kind (Klinika za psihijatrijske bolesti "Dr Laza
Lazarević" existed twice). A map entry (its slug ends in the map id, or its only source is the map) is folded into an
entry from any other source in the same city or municipality when the names agree: after dropping legal-form words and
the town's own name, the two names have the same words, at least two of them. A two-word name also needs a shared place
(the same door, or map points within 150 m). When two held entries fit, nothing is folded. A person's entry in a register
is never a target. BY_HAND holds the pairs the name rule misses, decided by reading them.
What happens to the map entry's place:
  same place   (no street on one side, the same street and number, or the two map points within 150 m): it is merged into
               the held seat, which takes the map point, a street if it has none (with a provenance row naming the map),
               and the phone, site and hours it lacks (labelled OpenStreetMap)
  other place  (both have a street and they differ): it moves in as a unit of the held institution
The map organisation gets status merged and merged_into_org_id, so its address redirects.
Undo file: db/fixes/merged_map_into_held_<stamp>.json.
"""
import collections, json, math, re, sys, time
from importers.common import db
from importers.jobs.assign_city_municipality import fold

WRITE = "--write" in sys.argv
LEGAL = set("""doo d o ad a jp jkp pr sr str szr ustanova javna zdravstvena privatna praksa ordinacija ordinacije i u za na sa the of dr prof""".split())
# a person's entry in a register (a mediator, a court expert) is not the office the map shows under the same name; lawyers have their own pass
PERSON = {"medijator", "sudski-vestak", "sudski-prevodilac", "procenitelj-nepokretnosti", "stecajni-upravnik", "advokat", "javni-beleznik", "javni-izvrsitelj"}
# Pairs the name rule misses, decided by reading them (2026-11-13): map entry -> (held entry, "merge" into its seat | "unit" of it)
BY_HAND = {
    "alma-nekretnine-stara-pazova-n7106614768": ("agencija-za-nekretnine-alma-causevic-pr-agencija-za-nekretnine-alma-nekretnine", "merge"),
    "univerzitetska-decja-klinika-tirsova-beograd-w1947884766": ("univerzitetska-decja-klinika-beograd", "merge"),
    "dom-zdravlja-zrenjanin-n8649865636": ("dom-zdravlja-dr-bosko-vrebalov-zrenjanin", "merge"),
    "zavod-za-zdravstvenu-zastitu-radnika-mup-beograd-m734931944": ("zavod-za-zdravstvenu-zastitu-radnika-ministarstvo-unutrasnjih-poslova-beograd", "merge"),
    "zavod-za-zdravstvenu-zastitu-radnika-ztp-a-beograd-beograd-m11445995866": ("zavod-za-zdravstvenu-zastitu-radnika-zeleznice-srbije-beograd", "merge"),
    "kbc-zemun-neuroloska-sluzba-beograd-n8441423305": ("klinicko-bolnicki-centar-zemun-beograd", "unit"),
    "kbc-zemun-poliklinika-beograd-w1818290580": ("klinicko-bolnicki-centar-zemun-beograd", "unit"),
    "zavod-za-javno-zdravlje-mikrobiologija-kikinda-n11229083845": ("zavod-za-javno-zdravlje-kikinda-kikinda", "unit"),
    "dom-zdravlja-ripanj-centar-beograd-w1359738050": ("dom-zdravlja-vozdovac-beograd", "unit"),
    "dom-zdravlja-sirogojno-cajetina-w1454520268": ("dom-zdravlja-cajetina-cajetina", "unit"),
}
def words(name, town=()):
    f = re.sub(r"\bkbc\b", "klinicko bolnicki centar", fold(name))
    return frozenset(w for w in f.split() if w not in LEGAL and w not in town and len(w) > 1 and not w.isdigit())
STOP = {"ulica", "ul", "bb", "br", "broj", "bulevar", "bul", "trg", "i", "lokal", "tc"}
def street(l, town=()): return (frozenset(w for w in fold(l["street"] or "").split() if len(w) > 2 and not w.isdigit() and w not in STOP and w not in town), re.sub(r"\D.*", "", (l["street_number"] or "").strip()))
def metres(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (float(a["lat"]), float(a["lng"]), float(b["lat"]), float(b["lng"])))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(h))

stats = collections.Counter(); log = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, level, parent_id, name_lat from territorial_units"); units = {r["id"]: r for r in cur.fetchall()}
    def jls(uid):
        u = units.get(uid); return u["parent_id"] if u and u["level"] == "gradska_opstina" else uid
    cur.execute("""select o.id, o.slug, o.name_lat, t.slug as type, l.id as lid, l.territorial_unit_id as tu, l.street, l.street_number, l.lat, l.lng,
                     (o.slug ~ '-[nwrm][0-9]{6,}$' or (exists (select 1 from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id and s.code = 'osm')
                        and not exists (select 1 from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id and s.code <> 'osm'))) as from_map,
                     (select count(*) from locations x where x.org_id = o.id and x.status = 'active') as locs
                   from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
                   where o.status = 'active'""")
    rows = cur.fetchall(); held = collections.defaultdict(list)
    def town(r): return set(fold(units[jls(r["tu"])]["name_lat"]).split()) | set(fold(units[r["tu"]]["name_lat"]).split()) | {"srbije", "srbija", "vojvodine"}
    for r in rows:
        if not r["from_map"] and r["tu"] in units and r["type"] not in PERSON: held[jls(r["tu"])].append(r)
    by_slug = {r["slug"]: r for r in rows}
    for m in rows:
        if not m["from_map"] or m["tu"] not in units: continue
        stats["map entries"] += 1; tw = town(m); mw = words(m["name_lat"], tw); hand = BY_HAND.get(m["slug"])
        if hand:
            k = by_slug.get(hand[0])
            if not k: stats["by hand: held entry not found"] += 1; continue
            how = "merged into the held seat" if hand[1] == "merge" else "moved in as a unit"
        else:
            if len(mw) < 2: stats["name too short to match"] += 1; continue
            hits = [r for r in held.get(jls(m["tu"]), []) if words(r["name_lat"], tw) == mw]
            if not hits: stats["no held twin"] += 1; continue
            if len(hits) > 1: same = [r for r in hits if r["type"] == m["type"]]; hits = same if len(same) == 1 else hits
            if len(hits) > 1: stats["two held entries fit: left"] += 1; continue
            k = hits[0]; ms, ks = street(m, tw), street(k, tw)
            near = m["lat"] is not None and k["lat"] is not None and metres(m, k) <= 150
            same_street = bool(ms[0] and ks[0] and ms[0] & ks[0]); same_door = same_street and ms[1] == ks[1]
            if len(mw) < 3 and not (near or same_door): stats["two-word name with no shared place: left"] += 1; continue     # "Art nekretnine" in two streets, an unnamed "Veterinarska stanica"
            same_place = near or not ms[0] or not ks[0] or same_street                                                  # one street, two numbers: one of the two is a typing slip
            how = "merged into the held seat" if same_place else "moved in as a unit"
        if m["locs"] > 1: how = "moved in as a unit"                                          # a map entry with branches keeps them all
        stats[how] += 1; stats["  " + m["type"] + " -> " + k["type"]] += 1
        log.append({"map_org": m["id"], "map_slug": m["slug"], "map_name": m["name_lat"], "map_type": m["type"], "map_location": m["lid"], "map_address": f"{m['street'] or ''} {m['street_number'] or ''}".strip(),
                    "into": k["id"], "into_slug": k["slug"], "into_name": k["name_lat"], "into_type": k["type"], "into_location": k["lid"], "into_address": f"{k['street'] or ''} {k['street_number'] or ''}".strip(), "how": how,
                    "into_street_empty": not street(k, tw)[0]})
    for kk, v in sorted(stats.items(), key=lambda x: (x[0].startswith("  "), -x[1])): print(f"{v:5d}  {kk}")
    for x in log: print(f"  {x['how'][:6]} | {x['map_type'][:18]:18s} {x['map_name'][:44]:44s} [{x['map_address'][:24]:24s}] -> {x['into_type'][:16]:16s} {x['into_name'][:44]:44s} [{x['into_address'][:24]}]")
    if not WRITE: c.rollback(); sys.exit()
    for x in log:
        if x["how"] == "moved in as a unit":
            cur.execute("""update locations set org_id = %s, slug = case when exists (select 1 from locations x where x.org_id = %s and x.slug = locations.slug) then 'map-' || locations.id else slug end, is_primary = false, unit_kind = case when is_primary then 'ostalo'::unit_kind else unit_kind end,
                             unit_name_lat = case when is_primary or coalesce(unit_name_lat, '') = '' then %s else unit_name_lat end, updated_at = now()
                           where org_id = %s and status = 'active'""", (x["into"], x["into"], x["map_name"][:120], x["map_org"]))
        else:
            cur.execute("""update locations s set street = u.street, street_number = u.street_number, postal_code = coalesce(s.postal_code, u.postal_code), updated_at = now() from locations u
                           where s.id = %s and u.id = %s and (coalesce(s.street, '') = '' or %s) and coalesce(u.street, '') <> '' returning s.id""", (x["into_location"], x["map_location"], x["into_street_empty"]))
            if cur.fetchone():
                x["street_given"] = True
                cur.execute("""insert into provenance (entity_type, entity_id, field, source_id, source_url, fetched_at, confidence)
                               select 'location', %s, 'address', source_id, source_url, fetched_at, confidence from provenance where entity_type = 'location' and entity_id = %s limit 1""", (x["into_location"], x["map_location"]))
            cur.execute("update locations s set lat = u.lat, lng = u.lng, geo_precision = 'rooftop' from locations u where s.id = %s and u.id = %s and s.lat is null and u.lat is not null", (x["into_location"], x["map_location"]))
            for kind in ("phone", "mobile", "website"):
                cur.execute("""insert into location_contacts (location_id, kind, value, value_display, label)
                               select %s, kind, value, value_display, coalesce(label, 'OpenStreetMap') from location_contacts c where c.location_id = %s and c.kind = %s::contact_kind
                                 and not exists (select 1 from location_contacts x where x.location_id = %s and x.kind in ('phone', 'mobile', 'website') and (x.kind = c.kind or (c.kind <> 'website' and x.kind <> 'website')))""",
                            (x["into_location"], x["map_location"], kind, x["into_location"]))
            cur.execute("""update opening_hours set location_id = %s, note = coalesce(note, 'OpenStreetMap') where location_id = %s
                           and not exists (select 1 from opening_hours h where h.location_id = %s)""", (x["into_location"], x["map_location"], x["into_location"]))
            cur.execute("update locations set status = 'merged', moved_to_location_id = %s, updated_at = now() where org_id = %s and status = 'active'", (x["into_location"], x["map_org"]))
        cur.execute("update organizations set status = 'merged', merged_into_org_id = %s, updated_at = now() where id = %s", (x["into"], x["map_org"]))
    p = f"db/fixes/merged_map_into_held_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump(log, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=0); c.commit(); print("written;", p)
