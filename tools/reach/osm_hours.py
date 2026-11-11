"""Opening hours from OpenStreetMap for locations that have none, matched by kind, street, house number and municipality.

  python -m tools.reach.osm_hours            # dry run
  python -m tools.reach.osm_hours --write

Input: .cache/osm/opening_hours_rs.json (Overpass: every named element in Serbia with an opening_hours tag) and the
municipal boundaries in .cache/osm/admin_7_9.geojson. A map element feeds a location only when both sides are the only
ones of that kind on that street and number in that municipality. Hours are stored with the note "OpenStreetMap", so the
page can say where they come from; written ids go to db/fixes/osm_hours_<stamp>.json. Open data (ODbL), not an official source.
"""
import json, re, sys, time, collections
from importers.common import db
from importers.common.match import add_hours
from importers.common.normalize import parse_hours, cyr_to_lat
from importers.jobs.assign_city_municipality import Shape, fold

WRITE = "--write" in sys.argv
FAM = {"pharmacy": "apoteka", "bureau_de_change": "menjacnica", "clinic": "zdr", "doctors": "zdr", "hospital": "zdr", "dentist": "stom", "veterinary": "vet",
       "school": "skola", "kindergarten": "vrtic", "library": "bibl", "townhall": "uprava", "hotel": "hotel", "driving_school": "auto", "community_centre": "kc",
       "museum": "muzej", "courthouse": "sud", "university": "fak", "college": "fak", "estate_agent": "nekr", "accountant": "rac", "government": "drz", "police": "mup",
       "social_facility": "soc", "employment_agency": "zap", "bank": "banka", "insurance": "osig"}
TYPES = {"apoteka": "apoteka", "menjacnica": "menjacnica", "dom-zdravlja": "zdr", "privatna-ordinacija": "zdr", "opsta-bolnica": "zdr", "specijalna-bolnica": "zdr", "klinika-institut": "zdr",
         "stomatoloska-ordinacija": "stom", "veterinarska-stanica": "vet", "osnovna-skola": "skola", "srednja-skola": "skola", "privatna-skola": "skola", "muzicka-skola": "skola",
         "predskolska-ustanova": "vrtic", "privatni-vrtic": "vrtic", "narodna-biblioteka": "bibl", "opstinska-uprava": "uprava", "gradska-uprava": "uprava", "uprava-gradske-opstine": "uprava",
         "hotel": "hotel", "auto-skola": "auto", "kulturni-centar": "kc", "muzej": "muzej", "osnovni-sud": "sud", "visi-sud": "sud", "prekrsajni-sud": "sud", "fakultet": "fak", "visoka-skola": "fak",
         "agencija-za-nekretnine": "nekr", "racunovodstvena-agencija": "rac", "drzavni-organ": "drz", "mup-policijska-uprava": "mup", "centar-za-socijalni-rad": "soc", "dom-za-stare": "soc",
         "agencija-za-zaposljavanje": "zap", "banka": "banka", "osiguravajuce-drustvo": "osig"}
DAYS = {"Mo": "pon", "Tu": "uto", "We": "sre", "Th": "čet", "Fr": "pet", "Sa": "sub", "Su": "ned"}
STOP = {"ulica", "ul", "bulevar", "bul", "trg", "put"}
def skey(street): return " ".join(w for w in fold(cyr_to_lat(street) or "").split() if w not in STOP and len(w) > 1)
def nkey(no): return re.sub(r"[^0-9a-z]", "", fold(cyr_to_lat(no) or ""))
def serbian(oh):
    """OSM opening_hours -> our short form; None when it uses anything beyond weekdays and times."""
    s = oh.strip()
    if s == "24/7": return "pon-ned 00:00-24:00"
    s = re.sub(r";?\s*PH\s+(off|closed)", "", s); s = re.sub(r";?\s*(Sa|Su|Sa,Su|Sa-Su)\s+(off|closed)", "", s).strip(" ;")
    if not s or re.search(r"[A-Za-z]{3,}|PH|SH|\"|\[|\+|sunrise|week", re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", "", s)): return None
    s = re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", lambda m: DAYS[m.group(1)], s)
    return s if parse_hours(s) else None

feats = json.load(open(".cache/osm/admin_7_9.geojson"))["features"]
shapes = [(fold(f["properties"].get("name_lat") or ""), Shape(f["geometry"])) for f in feats if f["properties"].get("admin_level") in ("7", "8")]
def places(lng, lat):
    out = set()
    for name, sh in shapes:
        if sh.has(lng, lat): out.add(re.sub(r"^(gradska opstina|opstina|grad) ", "", name))
    return out

osm = collections.defaultdict(list); stats = collections.Counter()
for x in json.load(open(".cache/osm/opening_hours_rs.json"))["elements"]:
    t = x["tags"]; fam = FAM.get(t.get("amenity") or t.get("office") or t.get("tourism") or t.get("healthcare") or "")
    if not fam or not (t.get("addr:street") and t.get("addr:housenumber")): continue
    lat = x.get("lat") or (x.get("center") or {}).get("lat"); lng = x.get("lon") or (x.get("center") or {}).get("lon")
    hrs = serbian(t["opening_hours"])
    if lat is None: continue
    if not hrs: stats["osm hours not plain"] += 1; continue
    pl = places(lng, lat) | ({fold(cyr_to_lat(t["addr:city"]))} if t.get("addr:city") else set())
    osm[(fam, skey(t["addr:street"]), nkey(t["addr:housenumber"]))].append({"places": pl, "hours": hrs, "url": f"https://www.openstreetmap.org/{x['type']}/{x['id']}", "name": t.get("name")})
stats["osm elements usable"] = sum(len(v) for v in osm.values())

made = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("""
      select l.id, t.slug as ty, l.street, l.street_number, l.settlement_name_lat as sett, u.name_lat as jls, p.name_lat as parent, o.name_lat as org
      from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
      left join territorial_units u on u.id = l.territorial_unit_id left join territorial_units p on p.id = u.parent_id
      where l.status = 'active' and l.street is not null and l.street_number is not null and l.hours_text is null
        and not exists (select 1 from opening_hours h where h.location_id = l.id)""")
    ours = collections.defaultdict(list)
    for r in cur.fetchall():
        fam = TYPES.get(r["ty"])
        if fam: ours[(fam, skey(r["street"]), nkey(r["street_number"]))].append(r)
    stats["our locations without hours, with street"] = sum(len(v) for v in ours.values())
    for k, mine in ours.items():
        for r in mine:
            here = {fold(x) for x in (r["sett"], r["jls"], r["parent"]) if x}
            cand = [e for e in osm.get(k, []) if e["places"] & here]
            same = [m for m in mine if {fold(x) for x in (m["sett"], m["jls"], m["parent"]) if x} & here]
            if len(cand) != 1 or len(same) != 1: stats["ambiguous" if cand else "no map twin"] += 1; continue
            e = cand[0]
            # a shop can change hands: for kinds that trade under a name, the map's name must share a word with ours
            if k[0] in ("apoteka", "menjacnica", "banka", "osig", "zdr", "stom", "vet", "hotel", "auto", "nekr", "rac"):
                a_, b_ = ({w for w in fold(cyr_to_lat(x) or "").split() if len(w) >= 4} for x in (r["org"], e["name"]))
                if not (a_ & b_): stats["same address, another name"] += 1; continue
            stats["matched"] += 1; stats["matched " + r["ty"]] += 1
            made.append({"location_id": r["id"], "hours": e["hours"], "osm": e["url"], "org": r["org"], "osm_name": e["name"]})
            if WRITE:
                add_hours(cur, r["id"], parse_hours(e["hours"]), e["hours"])
                cur.execute("update opening_hours set note = 'OpenStreetMap' where location_id = %s and department_id is null", (r["id"],))
                db.provenance(cur, "location", r["id"], "hours", "osm", e["url"], 0.6, {"opening_hours": e["hours"]})
    if not WRITE: c.rollback()
for k2, v in sorted(stats.items(), key=lambda x: -x[1]): print(f"  {v:6d} {k2}")
for m in made[:: max(1, len(made) // 10)][:10]: print("   e.g.", m["org"][:40], "<=", m["osm_name"], "|", m["hours"])
if WRITE:
    path = f"db/fixes/osm_hours_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump(made, open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0); print("written", path, len(made))
