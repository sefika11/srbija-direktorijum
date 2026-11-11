"""Streets and address points of the six cities that have city municipalities, from the Serbia map extract.

  .venv/bin/python -m tools.reach.city_streets_extract .cache/osm/serbia-latest.osm.pbf .cache/osm/city_streets.json

Input for tools/reach/assign_go_by_street.py. "addr": every element with addr:street and addr:housenumber (street, number,
lat, lon). "ways": every named road, with its first, middle and last node. Only inside a box around each city.
"""
import json, sys
import osmium

BOX = {"beograd": (20.46, 44.80), "nis": (21.90, 43.32), "novi-sad": (19.84, 45.25), "pozarevac": (21.19, 44.62), "uzice": (19.84, 43.86), "vranje": (21.90, 42.55)}
def near(lat, lon): return any(abs(lon - x) < 0.6 and abs(lat - y) < 0.5 for x, y in BOX.values())

class H(osmium.SimpleHandler):
    def __init__(self): super().__init__(); self.addr = []; self.ways = []
    def node(self, n):
        if len(n.tags) and "addr:housenumber" in n.tags and "addr:street" in n.tags and n.location.valid() and near(n.location.lat, n.location.lon):
            self.addr.append([n.tags["addr:street"], n.tags["addr:housenumber"], round(n.location.lat, 6), round(n.location.lon, 6)])
    def way(self, w):
        t = w.tags
        if not len(t): return
        is_addr = "addr:housenumber" in t and "addr:street" in t; is_road = "highway" in t and "name" in t
        if not (is_addr or is_road): return
        pts = [(x.location.lat, x.location.lon) for x in w.nodes if x.location.valid()]
        if not pts or not near(*pts[0]): return
        if is_addr: self.addr.append([t["addr:street"], t["addr:housenumber"], round(sum(p[0] for p in pts) / len(pts), 6), round(sum(p[1] for p in pts) / len(pts), 6)])
        if is_road: self.ways.append([t.get("name:sr-Latn") or t["name"], [[round(a, 6), round(b, 6)] for a, b in (pts[0], pts[len(pts) // 2], pts[-1])]])

h = H(); h.apply_file(sys.argv[1], locations=True)
json.dump({"addr": h.addr, "ways": h.ways}, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
print("address points", len(h.addr), "| named road ways", len(h.ways))
