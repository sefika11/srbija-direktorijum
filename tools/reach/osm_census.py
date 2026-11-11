"""Count named OpenStreetMap places per sector and how many of them the site does not hold yet. Read-only.

  set -a && . apps/web/.env.local; set +a
  .venv/bin/python -m tools.reach.osm_census            # table per sector
  .venv/bin/python -m tools.reach.osm_census --dump     # also writes the unmatched places to .cache/osm/census_new_rows.json

Input: .cache/osm/all_named_rows.json (tools/reach/osm_census_extract.py) and the municipal boundaries. A map place counts as
held when the site has the same map element, the same street and number, a location of the same family within about 80 m, or
the same distinctive name words in the same municipality. Chain branches that the map lists without an address often stay
unmatched, so "new" in band A is an upper bound. First run 2026-11-12: docs/08 section 15.
"""
import json, re, sys, collections
from importers.common import db
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import Shape, fold

S = ".cache/osm/"

# sector -> (band, family used for matching or None, map categories)
#   band A = a kind the site already holds, B = a service kind it does not hold, C = retail and food
SECTORS = {
 "Apoteke": ("A", "apoteka", ["amenity:pharmacy", "healthcare:pharmacy"]),
 "Banke": ("A", "banka", ["amenity:bank"]),
 "Menjačnice": ("A", "menjacnica", ["amenity:bureau_de_change"]),
 "Osiguranje": ("A", "osig", ["office:insurance"]),
 "Ordinacije, klinike, bolnice": ("A", "zdr", ["amenity:clinic", "amenity:doctors", "amenity:hospital", "healthcare:clinic", "healthcare:doctor", "healthcare:hospital", "healthcare:centre",
        "healthcare:physiotherapist", "healthcare:psychotherapist", "healthcare:alternative", "healthcare:laboratory", "healthcare:optometrist", "healthcare:yes", "healthcare:rehabilitation",
        "healthcare:speech_therapist", "healthcare:nurse", "healthcare:midwife", "healthcare:podiatrist", "healthcare:blood_donation", "healthcare:dialysis", "healthcare:audiologist"]),
 "Stomatolozi": ("A", "stom", ["amenity:dentist", "healthcare:dentist"]),
 "Veterinari": ("A", "vet", ["amenity:veterinary"]),
 "Škole": ("A", "skola", ["amenity:school"]),
 "Vrtići": ("A", "vrtic", ["amenity:kindergarten", "amenity:childcare"]),
 "Fakulteti i visoke škole": ("A", "fak", ["amenity:university", "amenity:college"]),
 "Biblioteke": ("A", "bibl", ["amenity:library"]),
 "Domovi kulture, pozorišta, bioskopi, muzeji": ("A", "kult", ["amenity:community_centre", "amenity:arts_centre", "amenity:theatre", "amenity:cinema", "tourism:museum", "tourism:gallery"]),
 "Sudovi, uprave, policija, vatrogasci": ("A", "drz", ["amenity:courthouse", "amenity:townhall", "amenity:police", "amenity:fire_station", "office:government", "amenity:public_building", "amenity:customs", "office:diplomatic", "amenity:embassy", "amenity:prison"]),
 "Pošte": ("A", "posta", ["amenity:post_office"]),
 "Socijalna zaštita i domovi za stare": ("A", "soc", ["amenity:social_facility", "amenity:nursing_home", "amenity:social_centre"]),
 "Hoteli": ("A", "hotel", ["tourism:hotel"]),
 "Auto-škole": ("A", "auto", ["amenity:driving_school"]),
 "Tehnički pregled": ("A", "teh", ["amenity:vehicle_inspection"]),
 "Agencije za nekretnine": ("A", "nekr", ["office:estate_agent"]),
 "Računovodstvo i finansije": ("A", "rac", ["office:accountant", "office:tax_advisor", "office:financial", "office:financial_advisor"]),
 "Advokati": ("A", "adv", ["office:lawyer"]),
 "Notari i izvršitelji": ("A", "not", ["office:notary", "office:bailiff"]),
 "Prevodioci": ("A", "prev", ["office:translator"]),
 "Agencije za zapošljavanje": ("A", "zap", ["office:employment_agency"]),
 "Geodeti": ("A", "geo", ["office:surveyor"]),
 "Privatne škole (jezici, muzika, kursevi)": ("A", "pskola", ["amenity:language_school", "amenity:music_school", "amenity:dancing_school", "amenity:training", "amenity:prep_school", "education:*", "office:educational_institution", "amenity:research_institute"]),
 "Sportski centri i hale": ("A", "sport", ["leisure:sports_centre", "leisure:sports_hall", "leisure:stadium", "leisure:swimming_pool", "leisure:ice_rink", "leisure:water_park"]),
 "Udruženja i organizacije": ("A", "udr", ["office:ngo", "office:association", "office:foundation", "office:political_party", "office:union", "club:*", "office:religion", "office:charity"]),
 "Prihvatilišta za životinje": ("A", "azil", ["amenity:animal_shelter", "amenity:animal_boarding"]),
 "Telekom prodavnice": ("A", "tel", ["shop:mobile_phone", "shop:telecommunication", "office:telecommunication"]),
 "Javna preduzeća i komunalne službe": ("A", "jp", ["office:water_utility", "office:energy_supplier", "office:utility", "amenity:marketplace", "amenity:bus_station", "office:public_transport", "amenity:waste_transfer_station", "office:transport"]),
 "Turističke organizacije": ("A", "to", ["office:tourism"]),

 "Benzinske stanice": ("B", None, ["amenity:fuel"]),
 "Auto-servisi, vulkanizeri, perionice": ("B", None, ["shop:car_repair", "shop:tyres", "amenity:car_wash", "craft:car_repair", "shop:motorcycle_repair", "craft:tyres"]),
 "Auto-saloni, delovi, rent-a-car": ("B", None, ["shop:car", "shop:car_parts", "amenity:car_rental", "shop:motorcycle", "amenity:taxi", "shop:truck", "shop:trailer", "shop:caravan", "amenity:vehicle_ramp"]),
 "Frizeri, kozmetičari, saloni lepote": ("B", None, ["shop:hairdresser", "shop:beauty", "shop:massage", "shop:tattoo", "leisure:sauna", "amenity:spa", "shop:cosmetics_studio", "leisure:tanning_salon"]),
 "Optike i slušni aparati": ("B", None, ["shop:optician", "shop:hearing_aids", "shop:medical_supply"]),
 "Turističke agencije": ("B", None, ["shop:travel_agency", "office:travel_agent"]),
 "Teretane i fitnes": ("B", None, ["leisure:fitness_centre", "leisure:fitness_station", "leisure:dance", "leisure:bowling_alley", "leisure:escape_game", "leisure:amusement_arcade", "leisure:horse_riding", "leisure:golf_course", "leisure:marina", "leisure:miniature_golf", "leisure:trampoline_park", "leisure:indoor_play", "leisure:adult_gaming_centre", "leisure:resort", "leisure:beach_resort", "leisure:hackerspace", "leisure:club"]),
 "Smeštaj osim hotela": ("B", None, ["tourism:guest_house", "tourism:hostel", "tourism:apartment", "tourism:motel", "tourism:camp_site", "tourism:chalet", "tourism:alpine_hut", "tourism:caravan_site", "tourism:wilderness_hut", "tourism:resort"]),
 "Zanatlije (majstori)": ("B", None, ["craft:*"]),
 "Pogrebne usluge": ("B", None, ["shop:funeral_directors", "amenity:funeral_hall", "amenity:crematorium", "office:funeral_directors"]),
 "Hemijsko čišćenje, krojači, obućari, ključari, kopirnice, foto": ("B", None, ["shop:laundry", "shop:dry_cleaning", "shop:tailor", "shop:shoe_repair", "shop:locksmith", "shop:copyshop", "shop:photo", "shop:photo_studio", "shop:repair", "shop:electronics_repair", "shop:computer_repair", "shop:rental", "shop:pawnbroker", "shop:storage_rental", "amenity:internet_cafe", "shop:money_lender", "amenity:money_transfer", "amenity:payment_centre", "amenity:post_depot", "amenity:parcel_locker", "shop:printer_ink", "shop:printing", "shop:watch_repair"]),
 "Kladionice i igre na sreću": ("B", None, ["shop:bookmaker", "shop:lottery", "amenity:casino", "amenity:gambling", "leisure:gambling"]),
 "Firme i kancelarije (ostalo)": ("B", None, ["office:*"]),
 "Ostale javne lokacije": ("B", None, ["amenity:*", "emergency:*", "tourism:*", "leisure:*", "healthcare:*"]),

 "Restorani, kafići, barovi, brza hrana": ("C", None, ["amenity:restaurant", "amenity:cafe", "amenity:bar", "amenity:pub", "amenity:fast_food", "amenity:nightclub", "amenity:ice_cream", "amenity:biergarten", "amenity:food_court", "amenity:hookah_lounge", "amenity:stripclub", "amenity:events_venue", "amenity:conference_centre"]),
 "Prodavnice": ("C", None, ["shop:*"]),
}
EXACT, WILD = {}, {}
for name, (band, fam, cats) in SECTORS.items():
    for c in cats:
        if c.endswith(":*"): WILD.setdefault(c[:-2], name)
        else: EXACT.setdefault(c, name)
def sector(cat): return EXACT.get(cat) or WILD.get(cat.split(":")[0])

# our org types -> the same families
TYPES = {"apoteka": "apoteka", "banka": "banka", "menjacnica": "menjacnica", "osiguravajuce-drustvo": "osig", "lizing": "rac", "platna-institucija": "rac", "penzijski-fond": "osig",
 "dom-zdravlja": "zdr", "privatna-ordinacija": "zdr", "opsta-bolnica": "zdr", "specijalna-bolnica": "zdr", "klinika-institut": "zdr", "privatna-laboratorija": "zdr", "zavod-za-javno-zdravlje": "zdr",
 "stomatoloska-ordinacija": "stom", "veterinarska-stanica": "vet", "osnovna-skola": "skola", "srednja-skola": "skola", "privatna-skola": "skola", "muzicka-skola": "skola", "skola-za-odrasle": "skola",
 "predskolska-ustanova": "vrtic", "privatni-vrtic": "vrtic", "fakultet": "fak", "visoka-skola": "fak", "univerzitet": "fak", "narodna-biblioteka": "bibl",
 "kulturni-centar": "kult", "pozoriste": "kult", "bioskop": "kult", "muzej": "kult", "arhiv": "kult",
 "hotel": "hotel", "auto-skola": "auto", "cpc-centar": "auto", "tehnicki-pregled": "teh", "agencija-za-nekretnine": "nekr", "racunovodstvena-agencija": "rac", "revizorska-kuca": "rac",
 "advokat": "adv", "javni-beleznik": "not", "javni-izvrsitelj": "not", "prevodilacka-agencija": "prev", "sudski-prevodilac": "prev", "agencija-za-zaposljavanje": "zap", "geodetska-agencija": "geo",
 "centar-za-socijalni-rad": "soc", "dom-za-stare": "soc", "gerontoloski-centar": "soc", "usluga-socijalne-zastite": "soc", "dom-ucenika": "soc", "studentski-dom": "soc",
 "sportski-centar": "sport", "omladinsko-udruzenje": "udr", "prihvatiliste-za-zivotinje": "azil", "telekom-prodavnica": "tel", "jp-posta-srbije": "posta", "turisticka-organizacija": "to"}
DRZ = {"carinarnica", "drzavni-organ", "ambasada", "konzulat", "upravni-okrug", "mup-policijska-uprava", "ministarstvo", "uprava-za-vanredne-situacije", "pokrajinski-sekretarijat", "rfzo", "rgz-katastar",
       "uprava-za-trezor", "poreska-uprava", "apr", "pio-fond", "nsz", "mesna-zajednica", "organ-jls", "opstinska-uprava", "gradska-uprava", "sekretarijat", "uprava-gradske-opstine",
       "lokalna-poreska-administracija", "osnovni-sud", "osnovno-javno-tuzilastvo", "prekrsajni-sud", "visi-sud", "vise-javno-tuzilastvo", "privredni-sud", "pravosudni-organ", "apelacioni-sud", "upravni-sud", "granicni-prelaz"}
def fam_of(ty): return TYPES.get(ty) or ("drz" if ty in DRZ else "jp" if ty.startswith(("jkp-", "jp-", "javno-", "eps-")) else None)

STOP = {"ulica", "ul", "bulevar", "bul", "trg", "put"}
TYPE_WORDS = set("""osnovna osnovne skola skole os srednja srednje gimnazija tehnicka ekonomska medicinska muzicka predskolska ustanova ustanove pu vrtic decji decija dom doma zdravlja
apoteka apoteke apotekarska hotel garni biblioteka narodna gradska opstinska kulturni centar kulture muzej narodni pozoriste bioskop fakultet univerzitet visoka strukovnih studija
ordinacija stomatoloska specijalisticka privatna poliklinika bolnica opsta specijalna klinika veterinarska stanica ambulanta auto centar za stare lica doo sveti sveta
banka bank banke ekspozitura filijala poslovnica osiguranje menjacnica posta poste advokat advokatska kancelarija agencija nekretnine beograd novi sad srbija srbije the and""".split())
def skey(street): return " ".join(w for w in fold(cyr_to_lat(street) or "").split() if w not in STOP and len(w) > 1)
def nkey(no): return re.sub(r"[^0-9a-z]", "", fold(cyr_to_lat(no) or ""))
def words(name): return frozenset(w for w in fold(cyr_to_lat(name) or "").split() if len(w) >= 3 and w not in TYPE_WORDS)

print("loading boundaries", flush=True)
feats = json.load(open(".cache/osm/admin_7_9.geojson"))["features"]
shapes = [(fold(f["properties"].get("name_lat") or ""), Shape(f["geometry"])) for f in feats if f["properties"].get("admin_level") in ("7", "8")]
GRID = collections.defaultdict(list)                      # 0.1 degree cells -> shapes whose box touches them
for i, (_, sh) in enumerate(shapes):
    b = sh.bbox
    for gx in range(int(b[0] * 10), int(b[2] * 10) + 1):
        for gy in range(int(b[1] * 10), int(b[3] * 10) + 1): GRID[(gx, gy)].append(i)
def places(lng, lat):
    return {re.sub(r"^(gradska opstina|opstina|grad) ", "", shapes[i][0]) for i in GRID.get((int(lng * 10), int(lat * 10)), []) if shapes[i][1].has(lng, lat)}

with db.conn() as con, con.cursor() as cur:
    cur.execute("""select l.slug as lslug, o.slug as oslug, t.slug as ty, l.street, l.street_number, l.settlement_name_lat as sett, u.name_lat as jls, p.name_lat as parent, o.name_lat as org,
                   l.unit_name_lat as unit, l.lat, l.lng from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
                   left join territorial_units u on u.id = l.territorial_unit_id left join territorial_units p on p.id = u.parent_id where l.status = 'active'""")
    ours = {"rows": cur.fetchall()}
    cur.execute("select p.source_url from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'location' and s.code = 'osm' and p.source_url like '%openstreetmap.org/%'")
    ours["prov"] = cur.fetchall()
have_ids = set()
for p in ours["prov"]:
    m = re.search(r"openstreetmap\.org/(node|way|relation)/(\d+)", p["source_url"])
    if m: have_ids.add(m.group(1)[0] + m.group(2))
by_place = collections.defaultdict(list); by_addr = collections.defaultdict(list); by_cell = collections.defaultdict(list)
for r in ours["rows"]:
    m = re.match(r"osm-([nwr]\d+)$", r["lslug"] or "") or re.search(r"-([nwr]\d{6,})$", r["oslug"] or "")
    if m: have_ids.add(m.group(1))
    f = fam_of(r["ty"])
    if not f: continue
    r["fam"] = f; r["here"] = {fold(x) for x in (r["sett"], r["jls"], r["parent"]) if x}
    r["w"] = words(r["org"]) | (words(r["unit"]) if r["unit"] and not re.match(r"sedi[sš]te$", r["unit"], re.I) else frozenset())
    for h in r["here"]: by_place[(f, h)].append(r)
    if r["street"] and r["street_number"]: by_addr[(f, skey(r["street"]), nkey(r["street_number"]))].append(r)
    if r["lat"] and r["lng"]: by_cell[(f, round(r["lat"] * 500), round(r["lng"] * 500))].append(r)   # about 220 m cells

def held(e, fam):
    """-> how the site already holds this place, or None."""
    if e["osm"] in have_ids: return "isti zapis sa mape"
    if not fam: return None
    if e.get("addr:street") and e.get("addr:housenumber"):
        if any(m["here"] & e["places"] for m in by_addr.get((fam, skey(e["addr:street"]), nkey(e["addr:housenumber"])), [])): return "ista adresa"
    cx, cy = round(e["lat"] * 500), round(e["lon"] * 500)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for m in by_cell.get((fam, cx + dx, cy + dy), []):
                if abs(m["lat"] - e["lat"]) < 0.0007 and abs(m["lng"] - e["lon"]) < 0.001: return "ista tačka (do 80 m)"
    w = {x for x in e["w"] if len(x) >= 4}
    if w:
        for h in e["places"]:
            for m in by_place.get((fam, h), []):
                common = w & m["w"]
                if common and len(common) * 2 >= min(len(w), len({x for x in m["w"] if len(x) >= 4}) or 1) + 0.5: return "isto ime u mestu"
    return None

raw = json.load(open(S + "all_named_rows.json"))
stats = collections.defaultdict(collections.Counter); cats = collections.defaultdict(collections.Counter); outside = 0; seen = set(); new_rows = []
print("map rows", len(raw["rows"]), flush=True)
for e in raw["rows"]:
    sec = sector(e["cat"])
    if not sec: continue
    e["places"] = places(e["lon"], e["lat"])
    if not e["places"]: outside += 1; continue
    name = e.get("name") or e.get("brand") or e.get("operator")
    k = (sec, fold(cyr_to_lat(name) or ""), round(e["lat"], 3), round(e["lon"], 3))
    if k in seen: stats[sec]["dvaput na mapi"] += 1; continue
    seen.add(k)
    e["w"] = words(name)
    band, fam, _ = SECTORS[sec]
    st = stats[sec]; st["named"] += 1; cats[sec][e["cat"]] += 1
    how = held(e, fam)
    if how: st["held"] += 1; st["held: " + how] += 1; continue
    st["new"] += 1
    ph = any(e.get(x) for x in ("phone", "contact:phone", "mobile", "contact:mobile")); ad = bool(e.get("addr:street") and e.get("addr:housenumber"))
    hr = bool(e.get("opening_hours")); web = bool(e.get("website") or e.get("contact:website"))
    st["new phone"] += ph; st["new address"] += ad; st["new hours"] += hr; st["new web"] += web; st["new any contact"] += (ph or ad or web); st["new phone+address"] += (ph and ad)
    if "--dump" in sys.argv: new_rows.append({k2: v for k2, v in e.items() if k2 not in ("w", "places")} | {"sector": sec, "place": sorted(e["places"])})
json.dump({"stats": stats, "cats": {k: v.most_common(12) for k, v in cats.items()}, "outside": outside, "unnamed": raw["unnamed"]}, open(S + "census.json", "w"), ensure_ascii=False, indent=1)
if new_rows: json.dump(new_rows, open(S + "census_new_rows.json", "w"), ensure_ascii=False)
print("outside Serbia's municipal boundaries:", outside)
for band in "ABC":
    print(f"\n== band {band}")
    print(f"{'sector':58s} {'named':>6s} {'held':>6s} {'new':>6s} {'phone':>6s} {'addr':>6s} {'hours':>6s} {'web':>6s} {'any':>6s} {'ph+ad':>6s}")
    tot = collections.Counter()
    for sec, (b, fam, _) in SECTORS.items():
        if b != band or not stats[sec]["named"]: continue
        s = stats[sec]; tot.update(s)
        print(f"{sec[:58]:58s} {s['named']:6d} {s['held']:6d} {s['new']:6d} {s['new phone']:6d} {s['new address']:6d} {s['new hours']:6d} {s['new web']:6d} {s['new any contact']:6d} {s['new phone+address']:6d}")
    print(f"{'TOTAL':58s} {tot['named']:6d} {tot['held']:6d} {tot['new']:6d} {tot['new phone']:6d} {tot['new address']:6d} {tot['new hours']:6d} {tot['new web']:6d} {tot['new any contact']:6d} {tot['new phone+address']:6d}")
print("\nhow held:", dict(sum((collections.Counter({k: v for k, v in s.items() if k.startswith('held: ')}) for s in stats.values()), collections.Counter())))
