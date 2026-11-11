"""Phones from OpenStreetMap for locations that have none.

  python -m tools.reach.osm_phones            # dry run
  python -m tools.reach.osm_phones --write

Input: .cache/osm/phones_rs.json (Overpass: every named element in Serbia with a phone, contact:phone or contact:mobile tag)
and the municipal boundaries in .cache/osm/admin_7_9.geojson. Open data (ODbL), not an official source: every number is
stored with the label "OpenStreetMap", which the page prints beside it, and with provenance source `osm`.
A map element feeds one of our locations in one of two ways, both inside the same municipality and the same kind:
  address  both sides are the only ones of that kind on that street and number; kinds that trade under a name must also
           share a name word (a shop can change hands)
  name     for seats only: the distinctive words of the two names are the same set (at least one word of 4+ letters that
           is not a type word), and no other element or seat of that kind in the municipality carries those words
Schools, kindergartens and public bodies take landlines only (a mobile there is usually a person's); two numbers at most.
Written ids go to db/fixes/osm_phones_<stamp>.json; undo = delete those location_contacts rows.
"""
import json, re, sys, time, collections
from importers.common import db
from importers.common.normalize import cyr_to_lat, phones_in
from importers.jobs.assign_city_municipality import Shape, fold

WRITE = "--write" in sys.argv
FAM = {"pharmacy": "apoteka", "bureau_de_change": "menjacnica", "clinic": "zdr", "doctors": "zdr", "doctor": "zdr", "hospital": "zdr", "centre": "zdr", "dentist": "stom", "veterinary": "vet",
       "school": "skola", "kindergarten": "vrtic", "library": "bibl", "townhall": "uprava", "hotel": "hotel", "driving_school": "auto", "community_centre": "kc", "arts_centre": "kc",
       "museum": "muzej", "courthouse": "sud", "university": "fak", "college": "fak", "estate_agent": "nekr", "accountant": "rac", "police": "mup",
       "social_facility": "soc", "nursing_home": "soc", "employment_agency": "zap", "bank": "banka", "insurance": "osig", "theatre": "poz", "cinema": "bio", "post_office": "posta"}
TYPES = {"apoteka": "apoteka", "menjacnica": "menjacnica", "dom-zdravlja": "zdr", "privatna-ordinacija": "zdr", "opsta-bolnica": "zdr", "specijalna-bolnica": "zdr", "klinika-institut": "zdr",
         "stomatoloska-ordinacija": "stom", "veterinarska-stanica": "vet", "osnovna-skola": "skola", "srednja-skola": "skola", "privatna-skola": "skola", "muzicka-skola": "skola",
         "predskolska-ustanova": "vrtic", "privatni-vrtic": "vrtic", "narodna-biblioteka": "bibl", "opstinska-uprava": "uprava", "gradska-uprava": "uprava", "uprava-gradske-opstine": "uprava",
         "hotel": "hotel", "auto-skola": "auto", "kulturni-centar": "kc", "muzej": "muzej", "osnovni-sud": "sud", "visi-sud": "sud", "prekrsajni-sud": "sud", "fakultet": "fak", "visoka-skola": "fak",
         "agencija-za-nekretnine": "nekr", "racunovodstvena-agencija": "rac", "mup-policijska-uprava": "mup", "centar-za-socijalni-rad": "soc", "dom-za-stare": "soc",
         "agencija-za-zaposljavanje": "zap", "banka": "banka", "osiguravajuce-drustvo": "osig", "pozoriste": "poz", "bioskop": "bio", "jp-posta-srbije": "posta"}
TRADED = {"apoteka", "menjacnica", "banka", "osig", "zdr", "stom", "vet", "hotel", "auto", "nekr", "rac"}
LANDLINE_ONLY = {"skola", "vrtic", "bibl", "uprava", "kc", "muzej", "sud", "fak", "mup", "soc", "poz", "posta"}
BY_NAME = {"skola", "vrtic", "bibl", "kc", "muzej", "hotel", "poz", "bio", "fak", "zdr", "stom", "vet", "auto", "soc"}  # kinds whose name tells them apart inside a municipality
STOP = {"ulica", "ul", "bulevar", "bul", "trg", "put"}
TYPE_WORDS = set("""osnovna osnovne skola skole os oš srednja srednje gimnazija tehnicka ekonomska medicinska muzicka predskolska ustanova ustanove pu vrtic decji decija dom doma zdravlja
apoteka apotekarska hotel garni biblioteka narodna gradska opstinska kulturni centar kulture muzej narodni pozoriste bioskop fakultet univerzitet visoka strukovnih studija
ordinacija stomatoloska specijalisticka privatna poliklinika bolnica opsta specijalna klinika veterinarska stanica ambulanta auto centar za stare lica doo sveti sveta""".split())
def skey(street): return " ".join(w for w in fold(cyr_to_lat(street) or "").split() if w not in STOP and len(w) > 1)
def nkey(no): return re.sub(r"[^0-9a-z]", "", fold(cyr_to_lat(no) or ""))
def words(name): return frozenset(w for w in re.sub(r"[^a-z0-9 ]", " ", fold(cyr_to_lat(name) or "")).split() if len(w) >= 3 and w not in TYPE_WORDS)
def national(p):
    """'+381 11 123-456' / '011/123-456' -> '011123456', or None when it is not a Serbian number."""
    d = re.sub(r"\D", "", p)
    if d.startswith("00381"): d = "0" + d[5:]
    elif d.startswith("381"): d = "0" + d[3:]
    d = re.sub(r"^00+", "0", d)
    return d if d.startswith("0") and 8 <= len(d) <= 10 else None
def phones_of(tags, fam):
    out = []
    for k in ("phone", "contact:phone", "contact:mobile"):
        for p in re.split(r"[;,]", tags.get(k) or ""):
            n = national(p)
            if n and n not in out and not (fam in LANDLINE_ONLY and n.startswith("06")): out.append(n)
    out.sort(key=lambda n: n.startswith("06"))
    return out[:2]

feats = json.load(open(".cache/osm/admin_7_9.geojson"))["features"]
shapes = [(fold(f["properties"].get("name_lat") or ""), Shape(f["geometry"])) for f in feats if f["properties"].get("admin_level") in ("7", "8")]
def places(lng, lat):
    return {re.sub(r"^(gradska opstina|opstina|grad) ", "", name) for name, sh in shapes if sh.has(lng, lat)}

stats = collections.Counter(); by_addr = collections.defaultdict(list); by_fam = collections.defaultdict(list)
for x in json.load(open(".cache/osm/phones_rs.json"))["elements"]:
    t = x.get("tags") or {}
    fam = FAM.get(t.get("amenity") or "") or FAM.get(t.get("office") or "") or FAM.get(t.get("tourism") or "") or FAM.get(t.get("healthcare") or "")
    if not fam: continue
    lat = x.get("lat") or (x.get("center") or {}).get("lat"); lng = x.get("lon") or (x.get("center") or {}).get("lon")
    ph = [n for n in phones_of(t, fam) if phones_in(n)]
    if lat is None or not ph: stats["map element without a usable phone"] += 1; continue
    e = {"fam": fam, "places": places(lng, lat) | ({fold(cyr_to_lat(t["addr:city"]))} if t.get("addr:city") else set()), "phones": ph, "name": t.get("name"),
         "w": words(t.get("name")), "url": f"https://www.openstreetmap.org/{x['type']}/{x['id']}"}
    by_fam[fam].append(e)
    if t.get("addr:street") and t.get("addr:housenumber"): by_addr[(fam, skey(t["addr:street"]), nkey(t["addr:housenumber"]))].append(e)
stats["map elements with a phone, of a kind we hold"] = sum(len(v) for v in by_fam.values())

made = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("""
      select l.id, t.slug as ty, l.is_primary, l.street, l.street_number, l.settlement_name_lat as sett, u.name_lat as jls, p.name_lat as parent, o.name_lat as org, l.unit_name_lat as unit,
        exists (select 1 from location_contacts x where x.location_id = l.id and x.kind in ('phone', 'mobile')) as has_phone
      from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
      left join territorial_units u on u.id = l.territorial_unit_id left join territorial_units p on p.id = u.parent_id
      where l.status = 'active'""")
    rows = [r for r in cur.fetchall() if TYPES.get(r["ty"])]
    for r in rows: r["fam"] = TYPES[r["ty"]]; r["here"] = {fold(x) for x in (r["sett"], r["jls"], r["parent"]) if x}; r["w"] = words(r["org"])
    ours_addr = collections.defaultdict(list)
    for r in rows:
        if r["street"] and r["street_number"]: ours_addr[(r["fam"], skey(r["street"]), nkey(r["street_number"]))].append(r)
    seats = collections.defaultdict(list)
    for r in rows:
        if r["is_primary"]: seats[r["fam"]].append(r)
    need = [r for r in rows if not r["has_phone"]]; stats["our locations without a phone, of a kind the map holds"] = len(need)
    used = set()
    for r in need:
        e = how = None
        if r["street"] and r["street_number"]:
            k = (r["fam"], skey(r["street"]), nkey(r["street_number"]))
            cand = [x for x in by_addr.get(k, []) if x["places"] & r["here"]]
            same = [m for m in ours_addr[k] if m["here"] & r["here"]]
            if len(cand) == 1 and len(same) == 1:
                if r["fam"] in TRADED and not ({w for w in r["w"] if len(w) >= 4} & cand[0]["w"]): stats["same address, another name"] += 1
                else: e, how = cand[0], "address"
            elif cand: stats["address ambiguous"] += 1
        if not e and r["is_primary"] and r["fam"] in BY_NAME and r["w"] and any(len(w) >= 4 for w in r["w"]):
            cand = [x for x in by_fam[r["fam"]] if x["places"] & r["here"] and x["w"] == r["w"]]
            twins = [m for m in seats[r["fam"]] if m["here"] & r["here"] and m["w"] == r["w"]]
            if len(cand) == 1 and len(twins) == 1: e, how = cand[0], "name"
            elif cand: stats["name ambiguous"] += 1
        if not e: stats["no map twin"] += 1; continue
        if e["url"] in used: stats["map element already used"] += 1; continue
        used.add(e["url"]); stats["matched by " + how] += 1; stats["matched " + r["ty"]] += 1
        made.append({"location_id": r["id"], "phones": e["phones"], "how": how, "osm": e["url"], "org": r["org"], "unit": r["unit"], "osm_name": e["name"], "contact_ids": []})
        if WRITE:
            for raw in e["phones"]:
                for p in phones_in(raw):  # valid Serbian numbers only, stored as E.164 with a national display form
                    cur.execute("""insert into location_contacts (location_id, kind, value, value_display, label)
                                   select %s, %s::contact_kind, %s, %s, 'OpenStreetMap' where not exists (select 1 from location_contacts where location_id = %s and value = %s)
                                   returning id""", (r["id"], p.kind, p.e164, p.display, r["id"], p.e164))
                    got = cur.fetchone()
                    if got: made[-1]["contact_ids"].append(got["id"])
            db.provenance(cur, "location", r["id"], "phone", "osm", e["url"], 0.6, {"phones": e["phones"], "match": how})
    if not WRITE: c.rollback()
for k2, v in sorted(stats.items(), key=lambda x: -x[1]): print(f"  {v:6d} {k2}")
for how in ("address", "name"):
    sample = [m for m in made if m["how"] == how]
    for m in sample[:: max(1, len(sample) // 14)][:14]: print(f"   {how:7s}", (m["org"] or "")[:44].ljust(44), "<=", (m["osm_name"] or "")[:40].ljust(40), "|", m["phones"])
if WRITE:
    path = f"db/fixes/osm_phones_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump(made, open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0); print("written", path, len(made))
