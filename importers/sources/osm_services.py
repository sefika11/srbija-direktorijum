"""Five private service kinds from OpenStreetMap (ODbL): fuel stations, car repair / tyre shops / car washes, opticians,
travel agencies, gyms. Approved by Nick on 2026-11-12 as entries labelled with their source (docs/08 §16).

  set -a && . apps/web/.env.local; set +a
  .venv/bin/python -m importers.sources.osm_services            # dry run: counts and a sample
  .venv/bin/python -m importers.sources.osm_services --write
  .venv/bin/python -m importers.sources.osm_services --rename-units     # only re-names the locations of brands

Input: .cache/osm/all_named_rows.json (tools/reach/osm_census_extract.py). What is taken:
  - named elements only; a fuel station always (its place is the point), the other kinds when the map has a phone, a street,
    a website or opening hours for them;
  - a brand with four or more fuel stations, optician shops or gyms becomes one organisation with a location per element
    (NIS Petrol, Sani Optik); everything else is one organisation per element;
  - phones are stored with the label "OpenStreetMap" and hours with the note "OpenStreetMap", which the page prints; e-mail
    addresses are not taken; organisations and locations are 'unverified', never "from the official register".
What is left out: elements whose name is only a person's name, public tourist organisations (held as their own type), two
map elements of one place (same name within about 100 m), and anything outside a municipality boundary.
Idempotent: an element whose map address is already in provenance is skipped. Written ids go to
db/fixes/osm_services_<stamp>.json (undo = delete those organisations; their locations, contacts and hours cascade).
"""
from __future__ import annotations
import collections, json, re, sys, time
from ..common import db
from ..common.match import add_contact, add_coverage, add_hours, upsert_location
from ..common.normalize import cyr_to_lat, parse_hours, phones_in
from ..jobs.assign_city_municipality import Shape
from ..jobs.load_orgs_json import slugify
from .osm_emergency import load_shapes, locate

WRITE = "--write" in sys.argv
RENAME = "--rename-units" in sys.argv        # re-apply the unit-name rule to brand locations that are already in (no other change)
ROWS = ".cache/osm/all_named_rows.json"; SOURCE = "osm"
CATS = {"amenity:fuel": ("benzinska-stanica", None), "shop:car_repair": ("auto-servis", "Auto-servis"), "craft:car_repair": ("auto-servis", "Auto-servis"), "shop:motorcycle_repair": ("auto-servis", "Servis motocikala"),
        "shop:tyres": ("auto-servis", "Vulkanizer"), "craft:tyres": ("auto-servis", "Vulkanizer"), "amenity:car_wash": ("auto-servis", "Perionica"),
        "shop:optician": ("optika", None), "shop:hearing_aids": ("optika", "Slušni aparati"), "shop:travel_agency": ("turisticka-agencija", None), "office:travel_agent": ("turisticka-agencija", None),
        "leisure:fitness_centre": ("teretana", None)}
CHAIN_TYPES = {"benzinska-stanica", "optika", "teretana"}; CHAIN_MIN = 4
UNIT_KIND = {"benzinska-stanica": "stanica"}
# a sign that says only what the place is: never a brand, and the entry is named with its street or town
GENERIC = {"vulkanizer", "vulkanizacija", "auto perionica", "autoperionica", "perionica", "auto servis", "autoservis", "servis", "optika", "teretana", "fitnes", "gym", "pumpa", "benzinska pumpa",
           "benzinska stanica", "turisticka agencija", "autoelektricar", "automehanicar", "auto spa", "prodaja guma", "samousluzna perionica", "park", "auto gas", "plin", "tng"}
PERSON = re.compile(r"(Dr\.? )?[A-ZŠĐČĆŽ][a-zšđčćž]+ [A-ZŠĐČĆŽ][a-zšđčćž]+(ić|ov|ev|ski|in)")
PUBLIC_TO = re.compile(r"turisti[čc]ka organizacija|turisti[čc]ki info|info centar", re.I)
DAYS = {"Mo": "pon", "Tu": "uto", "We": "sre", "Th": "čet", "Fr": "pet", "Sa": "sub", "Su": "ned"}

def fold(s: str) -> str:
    import unicodedata
    s = (cyr_to_lat(s) or "").replace("đ", "dj").replace("Đ", "Dj"); s = unicodedata.normalize("NFKD", s)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in s if not unicodedata.combining(c)).lower())).strip()
def brand_key(r: dict) -> str:
    k = fold(r.get("brand") or r.get("operator") or r.get("name") or "")
    k = re.sub(r"\b(benzinska stanica|benzinska pumpa|pumpa|bs|doo|d o o|ad|a d|optika|ocna kuca|teretana|fitnes|fitness|gym)\b", " ", k)
    k = re.sub(r"\s+", " ", k).strip()
    return {"nis": "nis petrol", "nis petrol gazprom": "nis petrol", "gazprom": "gazprom", "knez": "knez petrol", "eko serbia": "eko", "mol serbia": "mol", "omv srbija": "omv", "lukoil srbija": "lukoil"}.get(k, k)
def hours_sr(oh: str | None) -> str | None:
    """OSM opening_hours -> our short form ("pon-pet 08:00-20:00; sub 08:00-14:00"); None when it uses more than weekdays and times."""
    if not oh: return None
    s = oh.strip()
    if s == "24/7": return "Non-stop, 00–24"
    s = re.sub(r";?\s*PH\s+(off|closed)", "", s); s = re.sub(r";?\s*(Sa|Su|Sa,Su|Sa-Su)\s+(off|closed)", "", s).strip(" ;")
    if not s or re.search(r"[A-Za-z]{3,}|PH|SH|\"|\[|\+|sunrise|week", re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", "", s)): return None
    s = re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", lambda m: DAYS[m.group(1)], s)
    return s if parse_hours(s) else None
def site_of(r: dict) -> str | None:
    u = (r.get("website") or r.get("contact:website") or "").split(";")[0].strip()
    if not u or " " in u or "." not in u or re.search(r"facebook\.com|instagram\.com", u, re.I): return None
    return u if re.match(r"https?://", u) else "https://" + u

def main() -> None:
    rows = [r for r in json.load(open(ROWS, encoding="utf-8"))["rows"] if r["cat"] in CATS]
    shapes = load_shapes(); stats = collections.Counter(); stats["map elements of the five kinds"] = len(rows)
    # settlement boundaries (admin level 9) name a place more closely than the municipality: "MOL – Batajnica"; a part of a city
    # is named by its municipality ("Beograd (Zemun)" -> Zemun)
    lvl9 = [(f["properties"].get("name_lat") or cyr_to_lat(f["properties"].get("name") or ""), Shape(f["geometry"]))
            for f in json.load(open(".cache/osm/admin_7_9.geojson", encoding="utf-8"))["features"] if f["properties"].get("admin_level") == "9"]
    def settlement(lng: float, lat: float) -> str | None:
        for nm, sh in lvl9:
            if nm and sh.has(lng, lat):
                m = re.search(r"\((.+)\)", nm); base = re.sub(r"\s*\(.*?\)", "", nm).strip()
                return m.group(1).strip() if m and m.group(1).strip().lower() not in ("selo", "varoš", "varošica", "grad", "deo", "naselje") else base
        return None
    # pass 1: clean, place, drop doubles
    items = []; seen = collections.defaultdict(list)
    for r in rows:
        tslug, kind = CATS[r["cat"]]
        name = re.sub(r"\s+", " ", cyr_to_lat(r.get("name:sr-Latn") or r.get("name") or r.get("brand") or r.get("operator") or "") or "").strip(" \"'„“”")
        name = name[:1].upper() + name[1:]
        if not name: stats["skipped: no name"] += 1; continue
        if PERSON.fullmatch(name): stats["skipped: the name is only a person's name"] += 1; continue
        if tslug == "turisticka-agencija" and PUBLIC_TO.search(name): stats["skipped: public tourist organisation"] += 1; continue
        phones = []
        for k in ("phone", "contact:phone", "mobile", "contact:mobile"):
            for p in phones_in(r.get(k) or ""):
                if p.e164 not in [x.e164 for x in phones]: phones.append(p)
        street = (cyr_to_lat(r["addr:street"]).strip() if r.get("addr:street") else None); number = (cyr_to_lat(r.get("addr:housenumber")) or "").strip()[:12] or None
        site = site_of(r); hours = hours_sr(r.get("opening_hours"))
        if tslug != "benzinska-stanica" and not (phones or street or site or hours): stats["skipped: nothing but a name"] += 1; continue
        jslug = locate(shapes, r["lat"], r["lon"])
        if not jslug: stats["skipped: outside every municipality"] += 1; continue
        k = (tslug, fold(name))
        if any(abs(la - r["lat"]) < 0.001 and abs(lo - r["lon"]) < 0.0013 for la, lo in seen[k]): stats["skipped: second map element of the same place"] += 1; continue
        seen[k].append((r["lat"], r["lon"]))
        items.append({"r": r, "type": tslug, "kind": kind, "name": name, "phones": phones[:2], "street": street, "number": number if street else None, "site": site, "hours": hours, "jls": jslug,
                      "brand": brand_key(r), "url": f"https://www.openstreetmap.org/{'node' if r['osm'][0] == 'n' else 'way'}/{r['osm'][1:]}"})
    per_brand = collections.Counter((x["type"], x["brand"]) for x in items if x["type"] in CHAIN_TYPES and x["brand"] and x["brand"] not in GENERIC)
    chains = {k for k, n in per_brand.items() if n >= CHAIN_MIN}
    brand_names = collections.defaultdict(collections.Counter)
    for x in items:
        if (x["type"], x["brand"]) in chains: brand_names[(x["type"], x["brand"])][cyr_to_lat(x["r"].get("brand") or x["r"].get("operator") or x["name"]).strip()] += 1
    name_uses = collections.Counter((x["type"], x["brand"], fold(x["name"])) for x in items)      # "EKO Petrol" on 44 stations names none of them
    made = {"organizations": [], "locations": []}; samples = collections.defaultdict(list)
    with db.conn() as c, c.cursor() as cur:
        if WRITE and not RENAME: cur.execute(open("db/seed_patch_023_map_service_types.sql", encoding="utf-8").read())
        cur.execute("select slug, id from org_types"); types = {r["slug"]: r["id"] for r in cur.fetchall()}
        missing = {x["type"] for x in items} - set(types)
        if missing and WRITE: raise SystemExit(f"org types missing: {missing}")
        cur.execute("select id, slug, name_lat from territorial_units where level = 'jls'"); jls = {r["slug"]: r for r in cur.fetchall()}
        cur.execute("select slug from organizations"); taken = {r["slug"] for r in cur.fetchall()}
        cur.execute("select p.source_url, p.entity_id from provenance p join data_sources s on s.id = p.source_id where s.code = 'osm' and p.entity_type = 'location'"); have = {r["source_url"]: r["entity_id"] for r in cur.fetchall()}
        chain_org: dict[tuple, int] = {}; unit_names = collections.defaultdict(set); unit_slugs = collections.defaultdict(set)
        if WRITE and not RENAME: db.stage_rows(cur, SOURCE, "https://download.geofabrik.de/europe/serbia-latest.osm.pbf", [(x["r"]["osm"], x["r"]) for x in items])

        def new_org(slug_base: str, tslug: str, name: str, jid: int | None, site: str | None, kind: str | None) -> int | None:
            slug = slugify(slug_base); n = 2
            while slug in taken: slug = f"{slugify(slug_base)}-{n}"; n += 1
            taken.add(slug)
            if not WRITE: return None
            cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form, website, description_md, status, verification, is_private, last_seen_at)
                           values (%s, %s, %s, %s, %s, 'ostalo', %s, %s, 'active', 'unverified', true, now()) returning id""",
                        (slug, types[tslug], "jls" if jid else "republika", jid, name[:160], site, f"- vrsta: {kind}" if kind else None))
            oid = cur.fetchone()["id"]; made["organizations"].append(oid); return oid

        for x in items:
            if x["url"] in have and not (RENAME and (x["type"], x["brand"]) in chains): stats["already imported"] += 1; continue
            if x["jls"] not in jls: stats["skipped: municipality not in the directory"] += 1; continue
            j = jls[x["jls"]]; tslug = x["type"]; ck = (tslug, x["brand"])
            where = f'{x["street"]} {x["number"] or ""}'.strip() if x["street"] else (settlement(x["r"]["lon"], x["r"]["lat"]) or j["name_lat"])
            if ck in chains:
                display = brand_names[ck].most_common(1)[0][0]
                if ck not in chain_org and not RENAME:
                    chain_org[ck] = new_org(f"{tslug} {x['brand']}" if not slugify(x["brand"]).startswith(slugify(tslug).split("-")[0]) else x["brand"], tslug, display, None, None, None) or -1; stats["organisations: brands"] += 1
                unit = x["name"] if fold(x["name"]) not in (x["brand"], fold(display)) and len(x["name"]) > 3 and name_uses[(tslug, x["brand"], fold(x["name"]))] == 1 else f"{display} – {where}"
                n = 2; base_unit = unit
                while unit in unit_names[ck]: unit = f"{base_unit} ({n})"; n += 1          # two shops of one brand in the same mall or town
                unit_names[ck].add(unit)
                slug = slugify(f'{where} {j["slug"]}' if x["street"] else where) or f"osm-{x['r']['osm']}"; n = 2; base_slug = slug
                while slug in unit_slugs[ck]: slug = f"{base_slug}-{n}"; n += 1
                unit_slugs[ck].add(slug)
                if RENAME:
                    if x["url"] in have:
                        cur.execute("update locations set unit_name_lat = %s, updated_at = now() where id = %s and unit_name_lat <> %s", (unit[:120], have[x["url"]], unit[:120])); stats["units renamed"] += cur.rowcount
                    continue
                oid, primary, kind = chain_org[ck], False, UNIT_KIND.get(tslug, "ogranak")
            elif RENAME: continue
            else:
                generic = fold(x["name"]) in GENERIC
                name = f'{x["name"]} – {where}' if generic else x["name"]
                base = name if slugify(name).endswith(x["jls"]) else f'{name} {x["jls"]}'
                oid = new_org(base, tslug, name, j["id"], x["site"], x["kind"]) or -1; stats["organisations: single places"] += 1
                unit, slug, primary, kind = "Sedište", "sediste", True, "sediste"
            stats["locations"] += 1; stats[f"  {tslug}"] += 1
            stats["  with a phone"] += bool(x["phones"]); stats["  with a street"] += bool(x["street"]); stats["  with hours"] += bool(x["hours"]); stats["  with a website"] += bool(x["site"])
            if len(samples[tslug]) < 400: samples[tslug].append(f'{(unit if not primary else name)[:46]:46s} | {where[:30]:30s} | {x["jls"]:14s} | {", ".join(p.display for p in x["phones"])[:28]:28s} | {x["hours"] or ""}')
            if not WRITE: continue
            loc = upsert_location(cur, org_id=oid, slug=slug, unit_name_lat=unit[:120], unit_kind=kind, territorial_unit_id=j["id"], street=x["street"], street_number=x["number"], is_primary=primary)
            cur.execute("update locations set lat = %s, lng = %s where id = %s", (x["r"]["lat"], x["r"]["lon"], loc))
            for p in x["phones"]: add_contact(cur, loc, p.kind, p.e164, p.display, "OpenStreetMap")
            if x["site"]: add_contact(cur, loc, "website", x["site"], None)
            if x["hours"]:
                add_hours(cur, loc, [] if x["hours"].startswith("Non-stop") else parse_hours(x["hours"]), x["hours"])
                cur.execute("update opening_hours set note = 'OpenStreetMap' where location_id = %s and department_id is null", (loc,))
            add_coverage(cur, loc, j["id"], SOURCE)
            db.provenance(cur, "location", loc, None, SOURCE, x["url"], 0.6, {k: v for k, v in x["r"].items() if k not in ("email", "contact:email")})
            made["locations"].append(loc)
        if WRITE: cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    for k, v in stats.items(): print(f"  {v:6d} {k}")
    for t, s in samples.items():
        print(" ", t)
        for line in s[:: max(1, len(s) // 9)][:9]: print("     ", line)
    print("  brands:", *sorted(((t, brand_names[(t, b)].most_common(1)[0][0], n) for (t, b), n in per_brand.items() if (t, b) in chains), key=lambda z: -z[2]), sep="\n     ")
    if WRITE and not RENAME:
        path = f"db/fixes/osm_services_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
        json.dump(made, open(path, "x", encoding="utf-8")); print("written:", len(made["organizations"]), "organisations,", len(made["locations"]), "locations | ids in", path)
    elif not WRITE: print("dry run: nothing written (use --write)")

if __name__ == "__main__":
    main()
