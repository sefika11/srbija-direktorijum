"""One-pass extraction of private-sector and service POIs from the Serbia PBF → JSON rows.
Usage: .venv/bin/python apps/web/scripts/extract_private_pois.py .cache/osm/serbia-latest.osm.pbf .cache/osm/private_rows.json"""
import json, sys
import osmium

AMENITY = {"bank", "atm", "dentist", "doctors", "clinic", "hospital", "driving_school", "veterinary", "post_office", "courthouse", "townhall", "library", "kindergarten", "school", "university", "college", "social_facility", "community_centre", "fuel"}
OFFICE = {"lawyer", "notary", "insurance", "accountant", "estate_agent", "translator", "tax_advisor", "financial", "employment_agency", "travel_agent"}
HEALTH = {"pharmacy", "laboratory", "optometrist", "physiotherapist", "psychotherapist", "dentist", "doctor", "clinic", "hospital", "centre", "alternative"}
KEEP = ("name", "name:sr-Latn", "official_name", "brand", "brand:wikidata", "operator", "addr:street", "addr:housenumber", "addr:city", "addr:postcode", "phone", "contact:phone", "mobile", "contact:mobile", "email", "contact:email", "website", "contact:website", "opening_hours", "healthcare", "healthcare:speciality", "amenity", "office", "shop", "atm", "wheelchair", "description")

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rows = []
    def _take(self, kind, o, lat, lon):
        t = {k: v for k, v in o.tags}
        cat = None
        if t.get("amenity") in AMENITY: cat = "amenity:" + t["amenity"]
        elif t.get("office") in OFFICE: cat = "office:" + t["office"]
        elif t.get("healthcare") in HEALTH: cat = "healthcare:" + t["healthcare"]
        if not cat: return
        self.rows.append({"osm": f"{kind}{o.id}", "cat": cat, "lat": lat, "lon": lon, **{k: t[k] for k in KEEP if k in t}})
    def node(self, n):
        if n.location.valid(): self._take("n", n, n.location.lat, n.location.lon)
    def area(self, a):
        try:
            for ring in a.outer_rings():
                pts = [(p.lat, p.lon) for p in ring if p.location.valid()]
                if pts: self._take("w" if a.from_way() else "r", a, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)); return
        except Exception: pass

h = H(); h.apply_file(sys.argv[1], locations=True)
json.dump(h.rows, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
from collections import Counter
c = Counter(r["cat"] for r in h.rows); print("rows:", len(h.rows)); print(json.dumps(c.most_common(), ensure_ascii=False))
