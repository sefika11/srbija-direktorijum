"""Put the clinics that the map import of 2026-11-09 hung on one health centre per city where they belong.

  .venv/bin/python -m tools.reach.fix_map_clinics            # dry run, prints every decision
  .venv/bin/python -m tools.reach.fix_map_clinics --write

The import gave every map point named like a public clinic to "the" health centre of its city. In Belgrade that put 103
points under Dom zdravlja "Savski venac": other health centres, institutes, hospitals and private clinics among them.
For each active unit with a slug osm-* and the kind ambulanta, in this order:
The right institution for a unit is, in this order:
  - the health centre its name starts with ("Dom zdravlja Zemun - Ambulanta Boljevci");
  - in a city with several health centres, the health centre of its city municipality, for a plain clinic
    ("Zdravstvena stanica Banjica") and for a branch named by its quarter ("Dom zdravlja Mirijevo");
  - for another kind of institution (institute, hospital, clinical centre, emergency service, a health centre in quotation
    marks that we do not hold as a public one): the institution we hold in the same city under that name, or under that
    name plus the city, or whose name the unit's name starts with. The rows no rule places are decided in BY_HAND: a real
    institution the directory lacks becomes an entry of its own (labelled as map-sourced), the rest is set inactive and
    listed in the log with its address and contacts.
Inside the right institution the row is merged into a location that institution already has at the same address (or, with
no address, under the same name, or its seat when the name is the institution's own); else it moves in as a unit. A merged
row gets status merged and moved_to_location_id; the location it merges into takes any contact kind it lacks, and a seat
without a street takes the row's street, with a provenance row that names the map as its source.
Log and undo file: db/fixes/map_clinics_<stamp>.json (old org_id and status of every row touched).
"""
import collections, json, re, sys, time
from importers.common import db
from importers.jobs.assign_city_municipality import fold

WRITE = "--write" in sys.argv
OTHER = re.compile(r"^(institut|kbc|klinick|klinika|bolnica|opsta bolnica|specijalna bolnica|dnevna bolnica|zavod|gradski zavod|nacionalni|vojnomedicinsk|vma\b|univerzitetsk|poliklinika|dom za|gerontolosk|apoteka|studentska poliklinika|centar za)|\bmedigroup\b|\bmedigrup\b|\bhitn\w* pomoc")
NOISE = {"dom", "zdravlja", "dz", "dr", "ambulanta", "zdravstvena", "stanica", "ogranak", "objekat", "sluzba", "za", "i", "u", "na", "beograd", "srbije", "srbija"}
def norm(name): return re.sub(r"\bkbc\b", "klinicko bolnicki centar", fold(name))
def core(name):
    """The words of a name that tell one institution from another."""
    return [w for w in norm(name).split() if w not in NOISE and len(w) > 1]
def is_dz(name): return bool(re.match(r"^(dom zdravlja|dz)\b", fold(name)))
# Rows no rule can place, decided by reading them (2026-11-13). Key: the unit's name, folded.
#   ("org", slug)                 a unit of an institution we hold under another name
#   ("new", type, private)        an institution the directory lacks: it becomes an entry of its own, labelled as map-sourced
#   ("unit_of_new", key)          a unit of one of the new entries
#   ("district",)                 a public branch named in quotation marks: the health centre of its city municipality
#   ("keep",) / ("inactive",)     stays / not a place the public goes to (institutes of the medical faculty), or unclear
BY_HAND = {
    "gradski zavod za hitnu medicinsku pomoc": ("new", "ustanova", False),
    "ambulanta hitne pomoci": ("unit_of_new", "gradski zavod za hitnu medicinsku pomoc"),
    "hitna pomoc ada ciganlija": ("unit_of_new", "gradski zavod za hitnu medicinsku pomoc"),
    "zavod za zdravstvenu zastitu radnika mup": ("new", "ustanova", False),
    "zavod za zdravstvenu zastitu radnika ztp a beograd": ("new", "ustanova", False),
    "zavod za stomatologiju kragujevac": ("new", "ustanova", False),
    "specijalna bolnica za endemsku nefropatiju": ("new", "specijalna-bolnica", False),
    "specijalna bolnica za urologiju uroadria": ("new", "privatna-ordinacija", True),
    "specijalna bolnica vita": ("new", "privatna-ordinacija", True),
    "dom zdravlja jedro": ("new", "privatna-ordinacija", True),
    "dom zdravlja medigrup dr cvjetkovic": ("new", "privatna-ordinacija", True),
    "dom zdravlja medigroup bulevar": ("org", "medigroup-beograd-n14132252301"),
    "dom zdravlja medigrup kalenic": ("org", "medigroup-beograd-n14132252301"),
    "medigroup dom zdravlja": ("org", "medigroup-beograd-n14132252301"),
    "zavod za zdravstvenu zastitu studenata": ("org", "zavod-za-zdrastvenu-zastitu-studenata-sa-stacionarom-beograd"),
    "dnevna bolnica dr laza lazarevic": ("org", "klinika-za-psihijatrijske-bolesti-dr-laza-lazarevic-beograd"),
    "dom zdravlja sumice": ("district",),
    "hitna pomoc": ("keep",),
    "specijalna bolnica za internet bolesti lazarevac": ("inactive",),
}
def quoted(name): return bool(re.search(r'["“”„»«]', name or ""))

stats = collections.Counter(); plan = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, level, parent_id, name_lat, slug from territorial_units"); tu = {r["id"]: r for r in cur.fetchall()}
    def jls(u):
        x = tu.get(u); return x["parent_id"] if x and x["level"] == "gradska_opstina" else u
    cur.execute("""select o.id, o.slug, o.name_lat, t.slug as type, l.id as seat, l.territorial_unit_id as tu, l.street, l.street_number, l.lat
                   from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
                   where o.status = 'active'""")
    orgs = cur.fetchall(); by_id = {o["id"]: o for o in orgs}
    by_jls = collections.defaultdict(list)
    for o in orgs: by_jls[jls(o["tu"])].append(o)
    district_of = {}                                                        # health centre -> its city municipality
    for j, os_ in by_jls.items():
        dz = [o for o in os_ if o["type"] == "dom-zdravlja"]; gos = {t["id"] for t in tu.values() if t["level"] == "gradska_opstina" and t["parent_id"] == j}
        for o in dz:
            if o["tu"] in gos: district_of[o["id"]] = o["tu"]
        free = gos - set(district_of.values()); loose = [o for o in dz if o["tu"] == j]
        if len(free) == 1 and len(loose) == 1: district_of[loose[0]["id"]] = free.pop()      # Belgrade: "Dr Milutin Ivković" is filed under the city, Palilula has no other
    cur.execute("select id, org_id, is_primary, unit_name_lat as name, street, street_number, lat from locations where status = 'active'")
    locs_of = collections.defaultdict(list)
    for r in cur.fetchall(): locs_of[r["org_id"]].append(r)
    gone = set()                                                            # rows already merged away: nothing merges into them
    def addr(x): return (fold(x["street"] or ""), (x["street_number"] or "").lower().replace(" ", ""))
    def place(u, t):
        """Where a unit goes inside the institution t: into a location t already has (same address, or same name), into its seat, or in as a unit."""
        mine = [x for x in locs_of[t["id"]] if x["id"] != u["id"] and x["id"] not in gone]
        if u["street"]:
            same = [x for x in mine if addr(x) == addr(u)]
            if same: return "merge", sorted(same, key=lambda x: not x["is_primary"])[0]["id"]
        twin = [x for x in mine if not x["is_primary"] and fold(x["name"] or "") == fold(u["name"])]
        if twin and not u["street"]: return "merge", twin[0]["id"]
        named = is_dz(u["name"]) or bool(core(u["name"]))                       # a bare "Ambulanta" on the map is some clinic of the centre, not its seat
        if named and not (set(core(u["name"])) - set(core(t["name_lat"]))) and (not u["street"] or not t["street"]): return "merge", t["seat"]   # the institution's own name: its seat, when one of the two has no address
        return ("keep", None) if t["id"] == u["org_id"] else ("move", None)
    cur.execute("""select l.id, l.org_id, l.unit_name_lat as name, l.territorial_unit_id as tu, l.street, l.street_number, l.lat, l.lng, l.address_display
                   from locations l where l.slug like 'osm-%%' and l.unit_kind = 'ambulanta' and l.status = 'active' and not l.is_primary order by l.org_id, l.unit_name_lat""")
    for u in cur.fetchall():
        cur_org = by_id.get(u["org_id"]); j = jls(u["tu"]); f = norm(u["name"]); cw = core(u["name"])
        if not cur_org: stats["owner not active: left"] += 1; continue
        dzs = [o for o in by_jls[j] if o["type"] == "dom-zdravlja"]; town = set(fold(tu[j]["name_lat"]).split()) | {"vojvodine"}
        target = None; kind = None; into = None; hand = BY_HAND.get(fold(u["name"]))
        if hand and hand[0] == "org" and by_id[next(o["id"] for o in orgs if o["slug"] == hand[1])]["tu"] is None: hand = None
        def by_district():
            here = [o for o in dzs if district_of.get(o["id"]) == u["tu"]]
            return here[0] if len(dzs) > 1 and tu.get(u["tu"], {}).get("level") == "gradska_opstina" and len(here) == 1 else None
        if hand and hand[0] in ("new", "unit_of_new", "inactive", "keep"):
            kind = {"new": "new entry of its own", "unit_of_new": "unit of a new entry", "inactive": "other: set inactive", "keep": "keep"}[hand[0]]
            stats[kind] += 1
            plan.append({"id": u["id"], "name": u["name"], "address": u["address_display"], "from_org": cur_org["slug"], "old_org_id": u["org_id"], "action": kind, "to_org": None, "to_org_id": None,
                         "into": None, "other_kind": True, "hand": list(hand), "jls": j, "jls_slug": tu[j].get("slug")})
            continue
        if hand and hand[0] == "org": target = next(o for o in orgs if o["slug"] == hand[1])
        elif hand and hand[0] == "district": target = by_district() or cur_org
        elif is_dz(u["name"]) and not OTHER.search(f):
            hits = [o for o in dzs if core(o["name_lat"]) and set(core(o["name_lat"])) <= set(cw)]          # the health centre this name starts with
            hits = [o for o in hits if not any(o is not p and set(core(o["name_lat"])) < set(core(p["name_lat"])) for p in hits)]
            if len(dzs) == 1 and not hits and not (set(cw) - town): hits = dzs                             # "Dom zdravlja" alone in a town with one
            if len(hits) == 1: target = hits[0]
            elif len(dzs) > 1 and not quoted(u["name"]): target = by_district()                            # "Dom zdravlja Mirijevo": a branch named by its quarter
            if not target and (not dzs or (len(dzs) > 1 and quoted(u["name"]))): kind = "other"            # in a city with several: a health centre we do not hold under that name is private
            elif not target: target = cur_org
        elif OTHER.search(f): kind = "other"
        else: target = by_district() or cur_org                                                             # a plain clinic: the health centre of its city municipality
        if kind == "other" and not target:
            pool = [o for o in by_jls[j] if o["id"] != u["org_id"] and core(o["name_lat"])]; two = lambda o: len(core(o["name_lat"])) >= 2
            for test in (lambda o: set(core(o["name_lat"])) == set(cw),
                         lambda o: two(o) and set(cw) < set(core(o["name_lat"])) and set(core(o["name_lat"])) - set(cw) <= town,
                         lambda o: two(o) and set(core(o["name_lat"])) < set(cw) and o["type"] != "dom-zdravlja"):
                same = [o for o in pool if test(o)]
                if same: target = same[0] if len(same) == 1 else None; break
            if not target: kind = "other: set inactive"
        if target:
            step, into = place(u, target)
            kind = {"merge": "merged into a location the right institution has", "move": "moved to the right institution", "keep": "keep"}[step]
            if step == "merge": gone.add(u["id"])
            if step == "move": locs_of[target["id"]].append({"id": u["id"], "org_id": target["id"], "is_primary": False, "name": u["name"], "street": u["street"], "street_number": u["street_number"], "lat": u["lat"]})
        stats[kind] += 1
        plan.append({"id": u["id"], "name": u["name"], "address": u["address_display"], "from_org": cur_org["slug"], "old_org_id": u["org_id"], "action": kind,
                     "to_org": target["slug"] if target else None, "to_org_id": target["id"] if target else None, "into": into,
                     "other_kind": bool(OTHER.search(f))})
    where = {x["id"]: ("seat" if x["is_primary"] else (x["name"] or "")[:30]) + " · " + (x["street"] or "no street") + " " + (x["street_number"] or "") for xs in locs_of.values() for x in xs}
    for k, v in stats.most_common(): print(f"{v:5d}  {k}")
    for p in plan:
        if p["action"] != "keep": print(f"  {p['action'][:14]:14s} | {p['from_org'][:34]:34s} | {p['name'][:58]:58s} -> {p['to_org'] or '-'}" + (f" @ {where[p['into']]}" if p.get("into") else ""))
    if not WRITE: c.rollback(); sys.exit()
    cur.execute("select slug, id from org_types"); types = {r["slug"]: r["id"] for r in cur.fetchall()}; new_org = {}
    for p in plan:
        if p["action"] != "new entry of its own": continue
        cur.execute("select source_id, source_url, fetched_at, confidence from provenance where entity_type = 'location' and entity_id = %s limit 1", (p["id"],)); src = cur.fetchone()
        tail = (src["source_url"] or "").rstrip("/").split("/")[-1] if src else str(p["id"])
        cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form, status, verification, is_private, last_seen_at)
                       values (slugify_sr(%s), %s, 'jls', %s, %s, 'ostalo', 'active', 'auto_verified', %s, now()) returning id, slug""",
                    (f"{p['name']} {p['jls_slug']} m{tail}", types[p["hand"][1]], p["jls"], p["name"][:160], p["hand"][2]))
        o = cur.fetchone(); new_org[fold(p["name"])] = o["id"]; p["to_org_id"] = o["id"]; p["to_org"] = o["slug"]
        if src: cur.execute("insert into provenance (entity_type, entity_id, field, source_id, source_url, fetched_at, confidence) values ('organization', %s, null, %s, %s, %s, %s)",
                            (o["id"], src["source_id"], src["source_url"], src["fetched_at"], src["confidence"]))
        cur.execute("update locations set org_id = %s, is_primary = true, unit_kind = 'sediste', updated_at = now() where id = %s", (o["id"], p["id"]))
    for p in plan:
        if p["action"] in ("keep", "new entry of its own"): continue
        if p["action"] == "unit of a new entry":
            p["to_org_id"] = new_org[p["hand"][1]]
            cur.execute("update locations set org_id = %s, unit_kind = 'stanica', updated_at = now() where id = %s", (p["to_org_id"], p["id"]))
        elif p["action"].startswith("moved"):
            cur.execute("update locations set org_id = %s, unit_kind = %s, updated_at = now() where id = %s", (p["to_org_id"], "ostalo" if p["other_kind"] else "ambulanta", p["id"]))
        elif p["into"]:
            cur.execute("""update locations s set street = u.street, street_number = u.street_number, postal_code = coalesce(s.postal_code, u.postal_code), lat = u.lat, lng = u.lng, geo_precision = 'rooftop', updated_at = now()
                           from locations u where s.id = %s and u.id = %s and coalesce(s.street, '') = '' and coalesce(u.street, '') <> '' returning s.id""", (p["into"], p["id"]))
            if cur.fetchone():                                                             # the address came from the map: say so on the location that took it
                p["street_given"] = True
                cur.execute("""insert into provenance (entity_type, entity_id, field, source_id, source_url, fetched_at, confidence)
                               select 'location', %s, 'address', source_id, source_url, fetched_at, confidence from provenance where entity_type = 'location' and entity_id = %s limit 1""", (p["into"], p["id"]))
            cur.execute("""update locations s set lat = u.lat, lng = u.lng, geo_precision = 'rooftop' from locations u
                           where s.id = %s and u.id = %s and s.lat is null and u.lat is not null and coalesce(u.street, '') <> ''
                             and lower(coalesce(s.street, '')) = lower(u.street)""", (p["into"], p["id"]))
            cur.execute("""update location_contacts k set location_id = %s where k.location_id = %s
                           and not exists (select 1 from location_contacts x where x.location_id = %s and x.kind = k.kind)""", (p["into"], p["id"], p["into"]))
            cur.execute("update locations set status = 'merged', moved_to_location_id = %s, updated_at = now() where id = %s", (p["into"], p["id"]))
        else:
            cur.execute("select kind, coalesce(value_display, value) v from location_contacts where location_id = %s", (p["id"],)); p["contacts"] = [dict(r) for r in cur.fetchall()]
            cur.execute("select source_url from provenance where entity_type = 'location' and entity_id = %s limit 1", (p["id"],)); r = cur.fetchone(); p["source_url"] = r["source_url"] if r else None
            cur.execute("update locations set status = 'inactive', updated_at = now() where id = %s", (p["id"],))
    path = f"db/fixes/map_clinics_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump({"note": "undo: set org_id back to old_org_id, status to active, is_primary to false and unit_kind to ambulanta for each id, then set the new entries (action: new entry of its own, to_org_id) to inactive; contacts and streets given to a seat stay there", "rows": [p for p in plan if p["action"] != "keep"]},
              open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    c.commit(); print("written;", path)
