"""Extract administrative boundaries (admin_level 7-9) from the Geofabrik Serbia PBF into GeoJSON.
Usage: .venv/bin/python apps/web/scripts/extract_admin.py .cache/osm/serbia-latest.osm.pbf .cache/osm/admin_7_9.geojson"""
import json, sys
import osmium
from osmium import geom

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.f = geom.GeoJSONFactory(); self.features = []
    def area(self, a):
        t = {k: v for k, v in a.tags}
        if t.get("boundary") != "administrative" or t.get("admin_level") not in ("7", "8", "9"): return
        try:
            g = json.loads(self.f.create_multipolygon(a))
        except Exception:
            return
        self.features.append({"type": "Feature", "properties": {"id": a.orig_id(), "admin_level": t["admin_level"], "name": t.get("name"), "name_lat": t.get("name:sr-Latn"), "name_en": t.get("name:en"), "ref": t.get("ref")}, "geometry": g})

h = H(); h.apply_file(sys.argv[1], locations=True)
json.dump({"type": "FeatureCollection", "features": h.features}, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
print("features:", len(h.features)); from collections import Counter; print(Counter(f["properties"]["admin_level"] for f in h.features))
