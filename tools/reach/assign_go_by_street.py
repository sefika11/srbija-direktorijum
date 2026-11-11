"""File locations that sit under a CITY into the city municipality their street address lies in.

  set -a && . apps/web/.env.local; set +a
  .venv/bin/python -m tools.reach.assign_go_by_street                 # dry run: counts and a sample
  .venv/bin/python -m tools.reach.assign_go_by_street --write

importers.jobs.assign_city_municipality places a location by its coordinates, its settlement name or the tail of its
address. Registers of pharmacies, exchange offices and private kindergartens give only "street number, Beograd", so those
rows stayed under the city and "apoteka Zemun" found one pharmacy. This job reads the street.

Input: .cache/osm/city_streets.json (tools/reach/city_streets_extract.py: named roads and address points of the six cities,
OpenStreetMap, ODbL) and the boundaries in .cache/osm/admin_7_9.geojson. Each map point falls into a zone: one of the city's
municipalities, or "rest" (city territory outside every city municipality, as in Požarevac, Užice and Vranje). A location is
moved only when the answer is the same on every piece of evidence:

  street   every road and every address point with that street name in the city lies in one municipality, and the
           street's mapped numbers reach the row's number
  number   the street runs through several zones (or the name exists twice in the city), and the map has this house number
           on this street in exactly one municipality
  between  the same, from the nearest lower and the nearest higher mapped number on that side of the street (both within 30)

For `number` and `between`, every other zone that has the street must have mapped numbers on that side, and this number must
lie outside their range; otherwise the row stays under the city. Nothing is guessed from a street name alone when the name
occurs in two zones. A row also stays when a look-alike street name (see `lookalikes`) lies in another zone and has this
number, or no mapped numbers. `--check` runs the same rules on locations whose municipality is already known and lists
every disagreement. A street renamed since the register was written ("Goce Delčeva" in Novi Beograd is now "Aleksinačkih
rudara") cannot be told from a namesake elsewhere, which is the known residual error.

Belgrade alone has some 150 settlements, and most street names of the centre exist again in Lazarevac, Obrenovac or a
village. When the row names a settlement other than the city itself ("Beograd, Borča", "Kaluđerica"; from the location or from
the register row kept in provenance), only map evidence inside that settlement's boundary is read (admin level 9).
Two shortcuts come first: the register's place names a city municipality ("Obrenovac"), or its address ends with one
("Požeška 138a, Beograd, Čukarica"). Changes go to db/fixes/go_by_street_<stamp>.json (location id, old unit, new unit, method); undo = set
territorial_unit_id back to "from".
"""
import collections, json, re, sys, time
from importers.common import db
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold, rings

WRITE = "--write" in sys.argv
CITY_AT = {"beograd": (20.46, 44.80), "nis": (21.90, 43.32), "novi-sad": (19.84, 45.25), "pozarevac": (21.19, 44.62), "uzice": (19.84, 43.86), "vranje": (21.90, 42.55)}
REST = "rest"

class Fast:
    """Point in polygon with the edges bucketed by latitude band (even-odd over all rings, so holes and multipolygons work)."""
    H = 0.002
    def __init__(self, geom):
        self.bands = collections.defaultdict(list); xs, ys = [], []
        for poly in rings(geom):
            for ring in poly:
                for i in range(len(ring)):
                    x1, y1 = ring[i][0], ring[i][1]; x2, y2 = ring[i - 1][0], ring[i - 1][1]; xs.append(x1); ys.append(y1)
                    if y1 == y2: continue
                    for b in range(int(min(y1, y2) / self.H), int(max(y1, y2) / self.H) + 1): self.bands[b].append((x1, y1, x2, y2))
        self.bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0)
        self.cx = sum(xs) / len(xs) if xs else 0; self.cy = sum(ys) / len(ys) if ys else 0
    def has(self, x, y):
        b = self.bbox
        if not (b[0] <= x <= b[2] and b[1] <= y <= b[3]): return False
        inside = False
        for x1, y1, x2, y2 in self.bands.get(int(y / self.H), ()):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: inside = not inside
        return inside

DROP = {"ulica", "ul", "br", "broj", "bb", "blok", "lokal", "lok", "sprat", "stan", "tc"}
SAME = {"bul": "bulevar", "doktora": "dr", "generala": "gen", "profesora": "prof", "vojvode": "voj", "svetog": "sv", "svetoga": "sv", "svete": "sv", "sveti": "sv", "kraljice": "kraljice"}
def street_key(s):
    """'Bulevar kralja Aleksandra br.' and 'Булевар краља Александра' -> 'bulevar kralja aleksandra'."""
    s = fold(re.sub(r",.*$", "", cyr_to_lat(s) or ""))
    w = [SAME.get(x, x) for x in s.split() if x not in DROP]
    return " ".join(w)
def base_no(n):
    m = re.match(r"\s*(\d{1,4})", cyr_to_lat(n) or ""); return int(m.group(1)) if m else None
def split_street(street, number):
    """-> (street key, house number or None). A number written into the street field ('Nemanjina 4, Beograd') is taken from there."""
    s = re.sub(r",.*$", "", cyr_to_lat(street) or "").strip(); n = base_no(number) if number else None
    if n is None:
        m = re.match(r"^(.*?\D)[\s.]*(\d{1,4})\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\w*)?\s*$", re.sub(r"\b(br|broj)\b\.?", " ", s, flags=re.I))
        if m and len(m.group(1).strip()) >= 3: s, n = m.group(1), int(m.group(2))
    k = street_key(s)
    k = re.sub(r"(?<=[a-z])(?: \d{1,4}[a-z]?)+$", "", k) if n is not None else k   # numbers left at the end of the name ("27 marta 43 45")
    return k, n

t0 = time.time()
feats = json.load(open(".cache/osm/admin_7_9.geojson"))["features"]
lvl7 = [f for f in feats if f["properties"].get("admin_level") == "7"]; lvl8 = [f for f in feats if f["properties"].get("admin_level") == "8"]
def sett_key(name): return fold(re.sub(r"\(.*?\)", "", cyr_to_lat(name) or ""))
SETT = collections.defaultdict(list)                                 # 0.02 degree cells -> settlement shapes (admin level 9) near the six cities
for f in feats:
    if f["properties"].get("admin_level") != "9": continue
    k9 = sett_key(f["properties"].get("name_lat") or f["properties"].get("name"))
    if not k9: continue
    sh = Fast(f["geometry"]); b = sh.bbox
    if not any(abs(sh.cx - x) < 0.7 and abs(sh.cy - y) < 0.6 for x, y in CITY_AT.values()): continue
    for gx in range(int(b[0] * 50), int(b[2] * 50) + 1):
        for gy in range(int(b[1] * 50), int(b[3] * 50) + 1): SETT[(gx, gy)].append((k9, sh))
def settlement(lng, lat):
    for k9, sh in SETT.get((int(lng * 50), int(lat * 50)), ()):
        if sh.has(lng, lat): return k9
    return None
stats = collections.Counter(); changes = []; samples = collections.defaultdict(list)
with db.conn() as c, c.cursor() as cur:
    cur.execute("""select g.id, g.slug, g.name_lat as name, c.id as city_id, c.slug as city, c.name_lat as city_name from territorial_units g join territorial_units c on c.id = g.parent_id
                   where g.level = 'gradska_opstina' and g.status = 'active'""")
    gos = cur.fetchall(); cities = {g["city_id"]: g["city"] for g in gos}; city_name = {g["city_id"]: g["city_name"] for g in gos}
    for g in gos:                                                    # the same boundary choice as assign_city_municipality
        want = {fold("Gradska opština " + g["name"]), fold(g["name"])}; cx, cy = CITY_AT[g["city"]]
        cand = [Fast(f["geometry"]) for f in lvl8 if fold(f["properties"].get("name_lat") or "") in want]
        cand = [s for s in cand if abs(s.cx - cx) < 0.6 and abs(s.cy - cy) < 0.5]
        g["shape"] = min(cand, key=lambda s: (s.cx - cx) ** 2 + (s.cy - cy) ** 2) if cand else None
    city_shape = {}
    for cid, slug in cities.items():
        want = {fold("Grad " + city_name[cid]), fold(city_name[cid])}; cx, cy = CITY_AT[slug]
        cand = [Fast(f["geometry"]) for f in lvl7 if fold(f["properties"].get("name_lat") or "") in want]
        cand = [s for s in cand if abs(s.cx - cx) < 0.6 and abs(s.cy - cy) < 0.5]
        city_shape[cid] = min(cand, key=lambda s: (s.cx - cx) ** 2 + (s.cy - cy) ** 2) if cand else None
    print("municipality boundaries:", sum(1 for g in gos if g["shape"]), "of", len(gos), "| without:", [f'{g["city"]}/{g["slug"]}' for g in gos if not g["shape"]],
          "| city boundaries:", sum(1 for v in city_shape.values() if v), "of", len(city_shape))
    by_city = collections.defaultdict(list)
    for g in gos: by_city[g["city_id"]].append(g)
    def zone(lng, lat):
        """-> (city id, municipality id or REST), or None outside the six cities."""
        for cid, sh in city_shape.items():
            if sh and sh.has(lng, lat):
                for g in by_city[cid]:
                    if g["shape"] and g["shape"].has(lng, lat): return cid, g["id"]
                return cid, REST
        return None

    raw = json.load(open(".cache/osm/city_streets.json", encoding="utf-8"))
    roads = collections.defaultdict(set)                             # (city, street key) -> {(zone, settlement)}
    points = collections.defaultdict(list)                           # (city, street key) -> [(number, zone, settlement)]
    setts = collections.defaultdict(set)                             # city -> settlement keys seen on the map
    for name, pts in raw["ways"]:
        k = street_key(name)
        if not k: continue
        for la, lo in pts:
            z = zone(lo, la)
            if z: st = settlement(lo, la); roads[(z[0], k)].add((z[1], st)); setts[z[0]].add(st)
    for street, number, la, lo in raw["addr"]:
        k = street_key(street); n = base_no(number); z = zone(lo, la)
        if k and n is not None and z: st = settlement(lo, la); points[(z[0], k)].append((n, z[1], st)); setts[z[0]].add(st)
    print(f"map: {len(roads)} street names with roads, {sum(len(v) for v in points.values())} address points on {len(points)} street names ({time.time() - t0:.0f} s)")

    go_by_id = {g["id"]: g for g in gos}

    # Look-alike names. The map carries the official name ("Kneza Mihaila", "Pukovnika Milenka Pavlovića", "Palisadska 1. deo",
    # "7. juli"), registers the everyday one ("Knez Mihailova", "Milenka Pavlovića", "Palisadska", "7. jula"), and the everyday
    # spelling can be the official name of another street elsewhere in the city. Two names look alike when, ranks and words
    # like "bulevar" or "trg" aside, they have the same words up to the endings.
    GENERIC = set("""bulevar bul trg put kej venac ulica prilaz prolaz sokak naselje deo i prvog prvi drugog ii iii kralja kralj knez kneza kneginje cara car carice kraljice
        vojvode voj pukovnika pilota generala gen majora kapetana narednika dr prof akademika sv narodnog heroja brace sestara porodice""".split())
    def core(k):
        """The words that tell a street apart: 'pukovnika milenka pavlovica' -> milenka pavlovica, 'palisadska 1 deo' -> palisadska."""
        k = re.sub(r" \d+ deo$| prilaz \d+$", "", k)
        return [w for w in k.split() if w not in GENERIC]
    by_prefix = collections.defaultdict(set)
    for (cid0, k0) in set(roads) | set(points):
        for w in core(k0):
            if len(w) >= 3 and not w.isdigit(): by_prefix[(cid0, w[:3])].add(k0)
    def same_word(a, b):
        if a == b: return True
        if a.isdigit() or b.isdigit() or abs(len(a) - len(b)) > 3: return False
        common = 0
        for x, y in zip(a, b):
            if x != y: break
            common += 1
        short = min(len(a), len(b))
        # "mihaila" / "mihailova", "jula" / "juli", "knez" / "kneza"; not "petra" / "petrovic", "stepe" / "stevcina"
        return common >= (short - 1 if short >= 5 else 3) and max(len(a), len(b)) - common <= 3
    def lookalikes(cid, k):
        mine = core(k); out = set()
        for w in mine:
            for k2 in by_prefix.get((cid, w[:3]), ()):
                if k2 == k or k2 in out: continue
                theirs = core(k2)
                if len(theirs) == len(mine) and all(any(same_word(a, b) for b in theirs) for a in mine) and all(any(same_word(a, b) for a in mine) for b in theirs): out.add(k2)
        return out

    def alternatives(k):
        """Spellings a register uses for the same street: 'Kralja Petra I' / 'Kralja Petra Prvog' / 'Kralja Petra', 'Mihaila' / 'Mihajla'."""
        out = [k, k.replace("mihaila", "mihajla"), re.sub(r" (i|prvog|prvi)$", "", k), k.replace("dvadesetsedmog marta", "27 marta")]
        return [x for i2, x in enumerate(out) if x and x not in out[:i2]]

    # Read only the row's settlement when it names one the map knows ("Beograd, Borča" -> Borča). The city's own name counts as
    # a settlement only for three registers that are precise about it (pharmacies, exchange offices, private kindergartens:
    # they write "Kaluđerica, Beograd" or "Mladenovac" when they mean those; 417 of 419 such rows that the strict rules could
    # place landed inside the settlement). Bank and telecom locators write "Beograd" for Lazarevac too, so there it says nothing.
    CITY_NAME_IS_SETTLEMENT = {"apoteka", "menjacnica", "privatni-vrtic"}
    def sett_filter(cid, sett, ty):
        city = fold(city_name[cid]); parts = [x for x in (sett_key(part) for part in (sett or "").split(",")) if x and x in setts[cid]]
        return next((x for x in parts if x != city), None) or (city if city in parts and ty in CITY_NAME_IS_SETTLEMENT else None)   # "Ripanj, Beograd" -> Ripanj
    def elsewhere(cid, sett):
        """The row names a place, and nothing in it is this city, one of its municipalities or one of its settlements (a Niš hotel filed under Beograd)."""
        f = fold(cyr_to_lat(sett) or "")
        if not f: return False
        known = {fold(city_name[cid])} | {fold(g["name"]) for g in by_city[cid]} | {x for x in setts[cid] if x}
        return not any(re.search(rf"\b{re.escape(x)}\b", f) for x in known)

    def decide_by_name(cid, street, number, sett, ty):
        """-> (zone, method) or (None, reason). zone is a municipality id or REST."""
        k0, n = split_street(street, number)
        sk = sett_filter(cid, sett, ty)
        for k in alternatives(k0):
            rz = {zz for zz, st in roads.get((cid, k), ()) if not sk or st == sk}; pz = [(m, zz) for m, zz, st in points.get((cid, k), []) if not sk or st == sk]
            zones = set(rz) | {z for _, z in pz}
            if zones: break
        else: return None, "street not on the map"
        if len(zones) == 1:
            # the street's mapped numbers must reach this number: a register spelling that matches only a namesake street
            # elsewhere ("Bratstva jedinstva 93" against a short street in another municipality) fails here
            nums = [m for m, _ in pz]
            if n is not None and nums and not (min(nums) <= n <= max(nums) + 10): return None, "street found, but its numbers do not reach this one"
            if n is not None and not nums: return None, "street found, but it has no mapped numbers"
            return next(iter(zones)), "street"
        if n is None: return None, "street in several zones, no number"
        side = [(m, zz) for m, zz in pz if m % 2 == n % 2]
        exact = {zz for m, zz in side if m == n}
        if len(exact) == 1: z, how = next(iter(exact)), "number"
        elif len(exact) > 1: return None, "number mapped in two zones"
        else:
            lo = max((m for m, _ in side if m < n), default=None); hi = min((m for m, _ in side if m > n), default=None)
            zl = {zz for m, zz in side if m == lo}; zh = {zz for m, zz in side if m == hi}
            if lo is not None and hi is not None and len(zl) == 1 and zl == zh and n - lo <= 30 and hi - n <= 30: z, how = next(iter(zl)), "between"
            else: return None, "street in several zones, number not placed"
        for other in zones - {z}:
            theirs = [m for m, zz in pz if zz == other]; same_side = [m for m in theirs if m % 2 == n % 2]
            # address points cover these cities almost fully, so a zone with the road but no numbers has no addresses on it:
            # that settles an exact number, but not one placed between two neighbours
            if not theirs and how == "between": return None, "other zone has the street but no mapped numbers"
            if same_side and min(same_side) <= n <= max(same_side): return None, "number also within another zone's range"
        return z, how

    def decide(cid, street, number, sett, ty):
        if elsewhere(cid, sett): return None, "the row names a place outside this city"
        z, how = decide_by_name(cid, street, number, sett, ty)
        if z is None: return z, how
        k0, n = split_street(street, number)
        sk = sett_filter(cid, sett, ty)
        for k in alternatives(k0):
            for k2 in lookalikes(cid, k):
                other = {zz for zz, st in roads.get((cid, k2), ()) if not sk or st == sk} | {zz for m, zz, st in points.get((cid, k2), []) if not sk or st == sk}
                for zz in other - {z}:
                    nums = {m for m, z3, st in points.get((cid, k2), []) if z3 == zz and (not sk or st == sk)}
                    if n is None or not nums or n in nums:
                        if len(samples["look-alike"]) < 400: samples["look-alike"].append(f"{k} {n} ~ {k2}")
                        return None, "a look-alike street name lies in another zone"
        return z, how

    ROW_SQL = """select l.id, l.territorial_unit_id as cid, l.street, l.street_number, l.address_display, t.slug as ty, o.name_lat as org, l.settlement_name_lat as sett,
                     (select p.raw->>'mesto' from provenance p where p.entity_type = 'location' and p.entity_id = l.id and p.raw ? 'mesto' limit 1) as mesto,
                     (select p.raw->>'og_adresa' from provenance p where p.entity_type = 'location' and p.entity_id = l.id and p.raw ? 'og_adresa' limit 1) as og_adresa from locations l
                   join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
                   where l.status = 'active' and l.street is not null and l.territorial_unit_id = any(%s)"""

    if "--check" in sys.argv:
        # the same rules on locations whose municipality is already known (placed earlier by coordinates or by the register): how often do they agree?
        cur.execute(ROW_SQL, ([g["id"] for g in gos],)); known = cur.fetchall(); res = collections.Counter(); wrong = []; per_type = collections.defaultdict(collections.Counter)
        for r in known:
            g = go_by_id[r["cid"]]; sett = r["sett"] or r["mesto"]
            names_go = any(fold(x["name"]) in fold(cyr_to_lat(sett) or "").split(" ") or fold(x["name"]) in fold(cyr_to_lat(sett) or "") for x in by_city[g["city_id"]] if fold(x["name"]) != fold(g["city_name"]))
            if names_go: res["left out: the row itself names a municipality"] += 1; continue      # a real run files those by the name, not by the street
            z, how = decide(g["city_id"], r["street"], r["street_number"], sett, r["ty"])
            if z is None or z == REST: res["not placed: " + (how if z is None else "outside")] += 1; continue
            ok = z == r["cid"]; res[("agrees " if ok else "DISAGREES ") + how] += 1; per_type[r["ty"]]["ok" if ok else "bad"] += 1
            if not ok: wrong.append(f'{how:8s} {(r["address_display"] or r["street"])[:40]:40s} filed {g["slug"]:14s} tool says {go_by_id[z]["slug"]:14s} {r["ty"]} | {r["org"][:36]} | sett={r["sett"]} mesto={r["mesto"]}')
        print("check on", len(known), "locations already filed under a city municipality:")
        for k2, v in sorted(res.items(), key=lambda kv: -kv[1]): print(f"  {v:6d} {k2}")
        print("  per type (agree/disagree):", sorted(((t, v["ok"], v["bad"]) for t, v in per_type.items()), key=lambda x: -x[1] - x[2])[:25])
        for w in wrong[:70]: print("  ", w)
        sys.exit(0)

    cur.execute(ROW_SQL, (list(cities),))
    rows = cur.fetchall(); stats["rows under a city with a street"] = len(rows)
    def place(r, g, how):
        stats["placed by " + how] += 1; stats[f'-> {g["city"]}/{g["slug"]}'] += 1; stats["type " + r["ty"]] += 1
        changes.append({"location_id": r["id"], "from": r["cid"], "to": g["id"], "to_slug": f'{g["city"]}/{g["slug"]}', "method": how, "type": r["ty"], "place": r["sett"] or r["mesto"]})
        samples[how].append(f'{(r["address_display"] or r["street"])[:44]:44s} -> {g["city"]}/{g["slug"]:16s} {r["ty"]}')
    for r in rows:
        cid = r["cid"]; city = fold(city_name[cid]); named = None
        for text, how in ((r["sett"] or r["mesto"], "place name"), ((r["og_adresa"] or "").split(",")[-1] if "," in (r["og_adresa"] or "") else None, "address tail")):
            rest = re.sub(rf"^{re.escape(city)}\b", "", fold(cyr_to_lat(text) or "")).strip()
            named = next((g for g in by_city[cid] if rest and rest == fold(g["name"]) and fold(g["name"]) != city), None)
            if named: place(r, named, how); break
        if named: continue
        z, how = decide(cid, r["street"], r["street_number"], r["sett"] or r["mesto"], r["ty"])
        if z is None:
            stats[how] += 1
            if how == "street not on the map": samples[how].append(r["street"])
            continue
        if z == REST: stats["lies outside every city municipality"] += 1; continue
        place(r, go_by_id[z], how)
    for k2, v in sorted(stats.items(), key=lambda kv: (kv[0].startswith(("->", "type ")), -kv[1])): print(f"  {v:6d} {k2}")
    for how in ("place name", "address tail", "street", "number", "between"):
        s2 = samples[how]
        for x in s2[:: max(1, len(s2) // 12)][:12]: print(f"   {how:12s}", x)
    print("   look-alikes that kept a row under the city:", samples["look-alike"][::10])
    print("   not on the map, most common:", collections.Counter(samples["street not on the map"]).most_common(15))
    if WRITE and changes:
        path = f"db/fixes/go_by_street_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
        json.dump({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "changes": changes}, open(path, "x", encoding="utf-8"), ensure_ascii=False)
        cur.executemany("update locations set territorial_unit_id = %s, updated_at = now() where id = %s and territorial_unit_id = %s", [(ch["to"], ch["location_id"], ch["from"]) for ch in changes])
        print("written:", len(changes), "| undo file:", path)
    elif not WRITE:
        json.dump(changes, open(".cache/osm/go_by_street_dry.json", "w", encoding="utf-8"), ensure_ascii=False)
        print("dry run: nothing written (use --write); the proposed changes are in .cache/osm/go_by_street_dry.json")
