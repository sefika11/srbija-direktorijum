"""Every named map element in the Serbia extract that carries a service tag -> JSON rows (nodes and ways; way = mean of its nodes).

  .venv/bin/python -m tools.reach.osm_census_extract .cache/osm/serbia-latest.osm.pbf .cache/osm/all_named_rows.json

Input for tools/reach/osm_census.py. Elements without a name, brand or operator are only counted (key "unnamed").
"""
import json, sys, collections
import osmium

KEYS = ("amenity", "office", "shop", "craft", "healthcare", "tourism", "leisure", "emergency", "club", "education")
SKIP_AMENITY = {"parking", "parking_space", "bench", "waste_basket", "fountain", "drinking_water", "shelter", "toilets", "bicycle_parking", "parking_entrance", "recycling", "waste_disposal",
                "hunting_stand", "grave_yard", "telephone", "post_box", "vending_machine", "bbq", "water_point", "watering_place", "clock", "place_of_worship", "atm", "charging_station"}
SKIP_TOURISM = {"information", "viewpoint", "artwork", "attraction", "picnic_site", "camp_pitch"}
SKIP_LEISURE = {"pitch", "park", "playground", "garden", "nature_reserve", "track", "picnic_table", "common", "firepit", "slipway", "outdoor_seating", "bleachers", "bird_hide"}
KEEP = ("name", "name:sr-Latn", "official_name", "brand", "operator", "addr:street", "addr:housenumber", "addr:city", "addr:postcode", "phone", "contact:phone", "mobile", "contact:mobile",
        "email", "contact:email", "website", "contact:website", "opening_hours", "healthcare:speciality", "social_facility", "sport", "cuisine") + KEYS

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rows = []; self.unnamed = collections.Counter()
    def take(self, kind, o, lat, lon):
        t = {k: v for k, v in o.tags}
        cats = [(k, t[k]) for k in KEYS if k in t and t[k] not in ("no", "yes")]
        if t.get("amenity") in SKIP_AMENITY: cats = [c for c in cats if c[0] != "amenity"]
        if t.get("tourism") in SKIP_TOURISM: cats = [c for c in cats if c[0] != "tourism"]
        if t.get("leisure") in SKIP_LEISURE: cats = [c for c in cats if c[0] != "leisure"]
        if not cats: return
        cat = f"{cats[0][0]}:{cats[0][1]}"
        if not (t.get("name") or t.get("brand") or t.get("operator")): self.unnamed[cat] += 1; return
        self.rows.append({"osm": f"{kind}{o.id}", "cat": cat, "lat": round(lat, 6), "lon": round(lon, 6), **{k: t[k] for k in KEEP if k in t}})
    def node(self, n):
        if len(n.tags) and n.location.valid(): self.take("n", n, n.location.lat, n.location.lon)
    def way(self, w):
        if not len(w.tags): return
        pts = [(x.location.lat, x.location.lon) for x in w.nodes if x.location.valid()]
        if pts: self.take("w", w, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

h = H(); h.apply_file(sys.argv[1], locations=True)
json.dump({"rows": h.rows, "unnamed": h.unnamed}, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
print("named rows", len(h.rows), "unnamed", sum(h.unnamed.values()))
