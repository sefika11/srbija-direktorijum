"""Give a map point to locations that have a street and a house number but no coordinates.

  .venv/bin/python -m tools.reach.geocode_from_map            # dry run
  .venv/bin/python -m tools.reach.geocode_from_map --write
  .venv/bin/python -m tools.reach.geocode_from_map --check    # measure the rule on locations that already have a point

Source: the address points of the Serbia map extract (.cache/osm/serbia-latest.osm.pbf, OpenStreetMap, ODbL; the
addresses there come from the state address register) and the boundaries in .cache/osm/admin_7_9.geojson.
A location gets a point only when
  - its street and house number exist as an address point inside its own city or municipality, and
  - every such point lies within 250 m of the others (one place, not two streets of the same name), or the location names
    a settlement and the points inside that settlement do.
The exact number ("12a") is preferred; the plain number ("12") is the fallback. Listed persons are left out.
Nothing is guessed from a street alone. Written ids go to db/fixes/geocode_from_map_<stamp>.json (undo: set lat, lng and
geo_precision back to null).
"""
import collections, json, math, os, re, sys, time
import osmium, psycopg
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold, rings

WRITE, CHECK = "--write" in sys.argv, "--check" in sys.argv
PBF, ADMIN = ".cache/osm/serbia-latest.osm.pbf", ".cache/osm/admin_7_9.geojson"
PERSONS = ["sudski-vestak", "medijator", "stecajni-upravnik", "procenitelj-nepokretnosti", "sudski-prevodilac", "javni-beleznik", "javni-izvrsitelj", "advokat"]
DROP = {"ulica", "ul", "br", "broj", "bb", "blok", "lokal", "lok", "sprat", "stan", "tc"}
SAME = {"bul": "bulevar", "doktora": "dr", "generala": "gen", "profesora": "prof", "vojvode": "voj", "svetog": "sv", "svetoga": "sv", "svete": "sv", "sveti": "sv"}

def street_key(s):
    s = fold(re.sub(r",.*$", "", cyr_to_lat(s) or ""))
    return " ".join(SAME.get(x, x) for x in s.split() if x not in DROP)
def norm_no(n):
    """'12 A' -> ('12a', 12); 'bb' -> (None, None)."""
    m = re.match(r"\s*(\d{1,4})\s*([a-zA-Zа-яА-Я]?)\b", cyr_to_lat(n or "") or "")
    return ((m.group(1) + m.group(2).lower()), int(m.group(1))) if m else (None, None)
def split(street, number):
    s = re.sub(r",.*$", "", cyr_to_lat(street) or "").strip(); full, base = norm_no(number) if number else (None, None)
    if base is None:
        m = re.match(r"^(.*?\D)[\s.]*(\d{1,4}\s*[a-zA-Z]?)(?:\s*[-/]\s*\d+\w*)?\s*$", re.sub(r"\b(br|broj)\b\.?", " ", s, flags=re.I))
        if m and len(m.group(1).strip()) >= 3: s = m.group(1); full, base = norm_no(m.group(2))
    k = street_key(s)
    if base is not None: k = re.sub(r"(?<=[a-z])(?: \d{1,4}[a-z]?)+$", "", k)
    return k, full, base

class Area:
    """Point in polygon, edges bucketed by latitude band (even-odd over all rings)."""
    H = 0.004
    def __init__(self, geom):
        self.bands = collections.defaultdict(list); xs, ys = [], []
        for poly in rings(geom):
            for ring in poly:
                for i in range(len(ring)):
                    x1, y1 = ring[i][0], ring[i][1]; x2, y2 = ring[i - 1][0], ring[i - 1][1]; xs.append(x1); ys.append(y1)
                    if y1 == y2: continue
                    for b in range(int(min(y1, y2) / self.H), int(max(y1, y2) / self.H) + 1): self.bands[b].append((x1, y1, x2, y2))
        self.bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0)
    def has(self, x, y):
        b = self.bbox
        if not (b[0] <= x <= b[2] and b[1] <= y <= b[3]): return False
        inside = False
        for x1, y1, x2, y2 in self.bands.get(int(y / self.H), ()):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: inside = not inside
        return inside

def dist(a, b):
    return 111320 * math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(math.radians(a[0])))
def one_place(pts):
    """-> the middle point when all points lie within 250 m of it, else None."""
    if not pts: return None
    mid = (sorted(p[0] for p in pts)[len(pts) // 2], sorted(p[1] for p in pts)[len(pts) // 2])
    return mid if all(dist(mid, p) <= 250 for p in pts) else None

t0 = time.time()
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("select id, level, path::text, name_lat from territorial_units")
units = {r[0]: r for r in k.fetchall()}; jls_by_path = {r[2]: r for r in units.values() if r[1] == "jls"}
def jls_of(uid):
    u = units.get(uid)
    if not u: return None
    parts = u[2].split(".")
    for i in range(len(parts), 0, -1):
        j = jls_by_path.get(".".join(parts[:i]))
        if j: return j[3]
    return None
k.execute(f"""select l.id, l.street, l.street_number, l.address_display, l.settlement_name_lat, l.territorial_unit_id, l.lat, l.lng
from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
where l.status = 'active' and t.slug <> all(%s) and (l.lat is {'not null' if CHECK else 'null'})
  and coalesce(l.street, l.address_display, '') <> ''""", (PERSONS,))
todo = []; need = collections.defaultdict(set)
for lid, street, number, disp, sett, uid, lat, lng in k.fetchall():
    key, full, base = split(street or disp, number)
    if not key or base is None: continue
    go = units[uid][3] if uid in units and units[uid][1] == 'gradska_opstina' else None
    todo.append((lid, key, full, base, sett, jls_of(uid), lat, lng, go)); need[key].add(base)
print(len(todo), "locations with a street and a number,", len(need), "street names", f"({time.time() - t0:.0f}s)", flush=True)

class H(osmium.SimpleHandler):
    def __init__(self): super().__init__(); self.pts = collections.defaultdict(list)
    def take(self, t, lat, lon):
        key = street_key(t["addr:street"]); nums = need.get(key)
        if not nums: return
        full, base = norm_no(t["addr:housenumber"])
        if base in nums: self.pts[(key, base)].append((round(lat, 6), round(lon, 6), full))
    def node(self, n):
        t = n.tags
        if len(t) and "addr:housenumber" in t and "addr:street" in t and n.location.valid(): self.take(t, n.location.lat, n.location.lon)
    def way(self, w):
        t = w.tags
        if not len(t) or "addr:housenumber" not in t or "addr:street" not in t: return
        ps = [(x.location.lat, x.location.lon) for x in w.nodes if x.location.valid()]
        if ps: self.take(t, sum(p[0] for p in ps) / len(ps), sum(p[1] for p in ps) / len(ps))
h = H(); h.apply_file(PBF, locations=True)
print(sum(len(v) for v in h.pts.values()), "address points on those streets", f"({time.time() - t0:.0f}s)", flush=True)

feats = json.load(open(ADMIN))["features"]
def unit_key(name): return re.sub(r"^(grad|gradska opstina|opstina) ", "", fold(cyr_to_lat(name) or ""))
muni = collections.defaultdict(list); sett_feats = collections.defaultdict(list)
for f in feats:
    lv = f["properties"].get("admin_level"); nm = f["properties"].get("name") or ""
    if lv in ("7", "8"): muni[unit_key(nm)].append(f)
    elif lv == "9": sett_feats[fold(re.sub(r"\(.*?\)", "", cyr_to_lat(nm) or ""))].append(f)
cache = {}
def areas(kind, name):
    if (kind, name) not in cache:
        cache[(kind, name)] = [Area(f["geometry"]) for f in (muni if kind == "m" else sett_feats).get(name, [])]
    return cache[(kind, name)]

stats = collections.Counter(); out = []; errs = []
for lid, key, full, base, sett, jls, lat, lng, go in todo:
    pts = h.pts.get((key, base))
    if not pts: stats["no such address point"] += 1; continue
    ms = (areas("m", unit_key(go)) if go else []) or areas("m", unit_key(jls or ""))   # the city municipality when it is known and has a shape
    if not ms: stats["municipality has no boundary"] += 1; continue
    inside = [p for p in pts if any(a.has(p[1], p[0]) for a in ms)]
    if not inside: stats["address not in this municipality"] += 1; continue
    # a named settlement narrows it further: the same street name often exists in two villages of one municipality
    ss = areas("s", fold(cyr_to_lat(sett) or "")) if sett else []
    if ss:
        inside = [p for p in inside if any(a.has(p[1], p[0]) for a in ss)]
        if not inside: stats["address not in the named settlement"] += 1; continue
    exact = [p for p in inside if p[2] == full]
    pick = one_place(exact) if exact else None
    if pick is None: pick = one_place(inside)
    if pick is None: stats["same address in two places"] += 1; continue
    stats["placed"] += 1
    if CHECK:
        e = dist(pick, (float(lat), float(lng))); errs.append(e)
        if e > 1000 and '--far' in sys.argv: print('FAR', lid, key, full, '| sett:', sett, '| jls:', jls, '| pts:', len(inside), len(exact), round(e))
    else: out.append((lid, pick[0], pick[1]))
for kk, v in stats.most_common(): print(f"{v:7d}  {kk}")
if CHECK and errs:
    errs.sort(); n = len(errs)
    print(f"check on {n} locations that already have a point: median {errs[n // 2]:.0f} m, within 100 m {sum(e <= 100 for e in errs) * 100 // n}%, "
          f"within 300 m {sum(e <= 300 for e in errs) * 100 // n}%, over 1 km {sum(e > 1000 for e in errs)}")
if WRITE and out:
    stamp = time.strftime("%Y-%m-%d_%H%M%S"); path = f"db/fixes/geocode_from_map_{stamp}.json"
    json.dump({"note": "set lat, lng, geo_precision to null to undo", "locations": [o[0] for o in out]}, open(path, "w"))
    k.executemany("update locations set lat = %s, lng = %s, geo_precision = 'rooftop', updated_at = now() where id = %s and lat is null", [(o[1], o[2], o[0]) for o in out])
    c.commit(); print("written;", path)
