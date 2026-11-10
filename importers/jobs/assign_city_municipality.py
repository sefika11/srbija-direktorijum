"""Move locations that are filed under a CITY to the city municipality (gradska opština) they really sit in.

Six cities have city municipalities (Beograd, Niš, Novi Sad, Požarevac, Užice, Vranje). Importers file most
locations under the city, so "banka Zemun" or the Zemun page cannot show them. This job assigns the municipality from
what the row already holds, in this order of trust:

  1. coordinates  -> point in the municipality's boundary polygon (OSM admin boundaries, .cache/osm/admin_7_9.geojson)
  2. settlement   -> the settlement name names the municipality ("Beograd, Zemun", "Beograd (Zvezdara)", "Lazarevac"),
                     or is a settlement whose own boundary lies inside one municipality ("Borča" -> Palilula)
  3. address tail -> the address ends with the municipality name after a comma or a postal code

Rows with none of these stay under the city (nothing is guessed). Re-run after every import; it only touches rows
that are still filed under a city. Every change is written to db/fixes/go_assignment_<date>.json (old and new unit),
so it can be undone.

    set -a && . apps/web/.env.local; set +a
    .venv/bin/python -m importers.jobs.assign_city_municipality            # dry run: counts only
    .venv/bin/python -m importers.jobs.assign_city_municipality --write
"""
import argparse, datetime, json, os, re, sys, unicodedata
import psycopg

BOUNDS = ".cache/osm/admin_7_9.geojson"

def fold(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "").replace("đ", "dj").replace("Đ", "dj")
    return re.sub(r"[^a-z0-9]+", " ", "".join(ch for ch in s if not unicodedata.combining(ch)).lower()).strip()

def rings(geom):
    """-> list of polygons, each a list of rings (first = outer), each ring a list of (lng, lat)."""
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []

def in_ring(x, y, ring):
    inside = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]; xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside

class Shape:
    def __init__(self, geom):
        self.polys = rings(geom); xs = [p[0] for poly in self.polys for p in poly[0]]; ys = [p[1] for poly in self.polys for p in poly[0]]
        self.bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0)
        self.cx = sum(xs) / len(xs) if xs else 0; self.cy = sum(ys) / len(ys) if ys else 0
    def has(self, x, y):
        b = self.bbox
        if not (b[0] <= x <= b[2] and b[1] <= y <= b[3]): return False
        return any(in_ring(x, y, poly[0]) and not any(in_ring(x, y, h) for h in poly[1:]) for poly in self.polys)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--write", action="store_true"); a = ap.parse_args()
    con = psycopg.connect(os.environ["DATABASE_URL"]); cur = con.cursor()
    cur.execute("""select g.id, g.slug, g.name_lat, g.name_cyr, c.id, c.slug, c.name_lat, c.lat, c.lng from territorial_units g join territorial_units c on c.id = g.parent_id
                   where g.level = 'gradska_opstina' and g.status = 'active'""")
    gos = [dict(zip(["id", "slug", "name", "cyr", "city_id", "city", "city_name", "clat", "clng"], r)) for r in cur.fetchall()]
    cities = {g["city_id"]: g["city"] for g in gos}

    feats = json.load(open(BOUNDS))["features"]
    lvl8 = [f for f in feats if f["properties"].get("admin_level") == "8"]; lvl9 = [f for f in feats if f["properties"].get("admin_level") == "9"]
    # the boundary of each city municipality: OSM names it "Градска општина X"; two cities have a Palilula, so the nearer one to the city wins
    CITY_AT = {"beograd": (20.46, 44.80), "nis": (21.90, 43.32), "novi-sad": (19.84, 45.25), "pozarevac": (21.19, 44.62), "uzice": (19.84, 43.86), "vranje": (21.90, 42.55)}
    for g in gos:
        want = {fold("Gradska opština " + g["name"]), fold(g["name"])}     # matched on the Latin name (fold() drops Cyrillic)
        cand = [Shape(f["geometry"]) for f in lvl8 if fold(f["properties"].get("name_lat") or "") in want]
        cx, cy = CITY_AT[g["city"]]
        cand = [s for s in cand if abs(s.cx - cx) < 0.6 and abs(s.cy - cy) < 0.5]
        g["shape"] = min(cand, key=lambda s: (s.cx - cx) ** 2 + (s.cy - cy) ** 2) if cand else None
    missing = [f'{g["city"]}/{g["slug"]}' for g in gos if not g["shape"]]
    print("municipalities with a boundary:", len(gos) - len(missing), "of", len(gos), "| without:", missing)

    def go_at(city_id, lng, lat):
        for g in gos:
            if g["city_id"] == city_id and g["shape"] and g["shape"].has(lng, lat): return g
        return None

    # settlements (OSM level 9) inside a municipality: "Borča" -> Palilula. Only names that are unique within the city.
    settle = {}
    for f in lvl9:
        s = Shape(f["geometry"])
        for cid, cslug in cities.items():
            cx, cy = CITY_AT[cslug]
            if abs(s.cx - cx) > 0.6 or abs(s.cy - cy) > 0.5: continue
            g = go_at(cid, s.cx, s.cy)
            if not g: continue
            for nm in (f["properties"].get("name_lat"), f["properties"].get("name")):
                k = (cid, fold(re.sub(r"\(.*?\)", "", nm or "")))
                if k[1]: settle.setdefault(k, set()).add(g["id"])
    settle = {k: next(iter(v)) for k, v in settle.items() if len(v) == 1}
    by_id = {g["id"]: g for g in gos}

    cur.execute("""select l.id, l.territorial_unit_id, l.lat, l.lng, l.settlement_name_lat, l.address_display, l.postal_code from locations l
                   where l.status = 'active' and l.territorial_unit_id = any(%s)""", (list(cities),))
    rows = cur.fetchall(); changes = []; how = {}
    for lid, cid, lat, lng, settl, addr, _pc in rows:
        g = None; method = None
        if lat is not None and lng is not None:
            g = go_at(cid, float(lng), float(lat)); method = "coordinates" if g else None
        if not g and settl:
            f = fold(settl); city = fold(next(x["city_name"] for x in gos if x["city_id"] == cid))
            rest = re.sub(rf"^{re.escape(city)}\b", "", f).strip()            # "beograd zemun" -> "zemun"; "beograd" -> ""
            for x in gos:
                if x["city_id"] == cid and fold(x["name"]) != city and rest == fold(x["name"]): g, method = x, "settlement"; break
            if not g and rest and (cid, rest) in settle: g, method = by_id[settle[(cid, rest)]], "settlement"
        if not g and addr:
            tail = fold(addr.split(",")[-1]); tail = re.sub(r"^\d{5}\s+", "", tail)
            city = fold(next(x["city_name"] for x in gos if x["city_id"] == cid))
            for x in gos:
                if x["city_id"] == cid and fold(x["name"]) != city and tail == fold(x["name"]): g, method = x, "address"; break
        if g: changes.append({"location_id": lid, "from": cid, "to": g["id"], "to_slug": f'{g["city"]}/{g["slug"]}', "method": method}); how[method] = how.get(method, 0) + 1
    print("locations filed under a city:", len(rows), "| can be assigned:", len(changes), how)
    per = {}
    for c in changes: per[c["to_slug"]] = per.get(c["to_slug"], 0) + 1
    print(sorted(per.items(), key=lambda kv: -kv[1]))
    if not a.write: print("dry run: nothing written (use --write)"); return
    out = f"db/fixes/go_assignment_{datetime.date.today().isoformat()}.json"
    json.dump({"at": datetime.datetime.now().isoformat(timespec="seconds"), "changes": changes}, open(out, "w"), ensure_ascii=False)
    cur.executemany("update locations set territorial_unit_id = %s, updated_at = now() where id = %s and territorial_unit_id = %s", [(c["to"], c["location_id"], c["from"]) for c in changes])
    con.commit(); print("written:", len(changes), "| undo file:", out)

if __name__ == "__main__":
    sys.exit(main())
