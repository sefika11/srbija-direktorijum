"""Public coverage: every police station and fire station in Serbia from OpenStreetMap (ODbL).

Why OSM: MUP publishes no list of stations with addresses or phones (checked 2026-11-10: mup.gov.rs
"direkcija-policije/ojdpp" lists 27 PU names only; no data.gov.rs dataset; Sektor za vanredne situacije page
names units without contacts). OSM carries amenity=police / amenity=fire_station with names, addresses,
coordinates and some phones; attribution "© OpenStreetMap contributors (ODbL)" is already in the footer.

Input: Geofabrik extract .cache/osm/serbia-latest.osm.pbf (download separately). Output:
 - 27 PU organizations (type mup-policijska-uprava, parent = MUP) and one "Odeljenje/Uprava za vanredne
   situacije" organization per PU area (type uprava-za-vanredne-situacije, parent = MUP);
 - one location per OSM station (unit_kind 'stanica'), assigned to the PU area of its municipality
   (point-in-polygon against the municipality shapes we already have), with address, lat/lng, phone,
   coverage = that municipality.
Provenance: data_sources.code = 'osm' (seeded). Re-runs are idempotent (slug = osm-<type>-<id>).
"""
from __future__ import annotations

import json, re, sys, os
import osmium

from ..common import db
from ..common.match import add_contact, add_coverage, upsert_location
from ..common.normalize import cyr_to_lat, phones_in

PBF = os.environ.get("OSM_PBF", ".cache/osm/serbia-latest.osm.pbf")
SOURCE = "osm"
SRC_URL = "https://download.geofabrik.de/europe/serbia-latest.osm.pbf"

# PU seat → municipalities (slugs) it covers. Default: every JLS of the okrug whose seat the PU shares.
# Overrides where PU areas differ from okruzi (verified against the MUP list of 27 PUs; boundaries approximate).
PU_SEATS = ["beograd", "bor", "cacak", "jagodina", "kikinda", "kragujevac", "kraljevo", "krusevac", "leskovac", "nis", "novi-pazar", "novi-sad",
            "pancevo", "pirot", "pozarevac", "prijepolje", "prokuplje", "smederevo", "sombor", "sremska-mitrovica", "subotica", "sabac", "uzice",
            "valjevo", "vranje", "zajecar", "zrenjanin"]
PU_OVERRIDES = {"prijepolje": ["prijepolje", "priboj", "nova-varos", "sjenica"], "novi-pazar": ["novi-pazar", "tutin"]}
PU_NAME = {"beograd": "Policijska uprava za grad Beograd"}


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rows = []
    def _take(self, kind, o, lat, lon):
        t = {k: v for k, v in o.tags}
        if t.get("amenity") not in ("police", "fire_station"): return
        self.rows.append({"osm": f"{kind}{o.id}", "amenity": t["amenity"], "name": t.get("name") or t.get("official_name") or t.get("name:sr-Latn"),
                          "street": t.get("addr:street"), "number": t.get("addr:housenumber"), "city": t.get("addr:city"),
                          "phone": t.get("phone") or t.get("contact:phone"), "email": t.get("email") or t.get("contact:email"),
                          "website": t.get("website") or t.get("contact:website"), "hours": t.get("opening_hours"), "operator": t.get("operator"),
                          "lat": lat, "lon": lon})
    def node(self, n):
        if n.location.valid(): self._take("n", n, n.location.lat, n.location.lon)
    def area(self, a):
        try:
            for ring in a.outer_rings():
                pts = [(p.lat, p.lon) for p in ring if p.location.valid()]
                if pts:
                    self._take("w" if a.from_way() else "r", a, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)); return
        except Exception:
            pass


ROWS_CACHE = os.environ.get("OSM_ROWS_CACHE", ".cache/osm/emergency_rows.json")


def main() -> None:
    if os.path.exists(ROWS_CACHE) and "--reparse" not in sys.argv:
        rows = json.load(open(ROWS_CACHE, encoding="utf-8"))
        print("using cached rows:", ROWS_CACHE)
    else:
        h = Handler(); h.apply_file(PBF, locations=True); rows = h.rows
        os.makedirs(os.path.dirname(ROWS_CACHE), exist_ok=True); json.dump(rows, open(ROWS_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    lat_ = lambda v: cyr_to_lat(v) if v else v
    for r in rows:
        r["name"], r["street"], r["city"] = lat_(r.get("name")), lat_(r.get("street")), lat_(r.get("city"))
    print("osm rows:", len(rows), "police:", sum(r["amenity"] == "police" for r in rows), "fire:", sum(r["amenity"] == "fire_station" for r in rows))
    with db.conn() as c, c.cursor() as cur:
        db.stage_rows(cur, SOURCE, SRC_URL, [(r["osm"], r) for r in rows])
        cur.execute("select id from organizations where slug like 'ministarstvo-unutrasnjih-poslova%' order by id limit 1"); mup = cur.fetchone()["id"]
        cur.execute("select id, slug from org_types where slug in ('mup-policijska-uprava','uprava-za-vanredne-situacije')"); types = {r["slug"]: r["id"] for r in cur.fetchall()}
        # JLS → PU seat mapping
        cur.execute("""select j.id, j.slug, j.name_lat, o.seat_name_lat as okrug_seat, o.slug as okrug_slug from territorial_units j
                       join territorial_units o on o.id = j.parent_id where j.level = 'jls' and not j.in_kosovo""")
        jls = cur.fetchall()
        seat_slug = lambda name: re.sub(r"[^a-z0-9]+", "-", (name or "").lower().replace("đ", "dj").replace("š", "s").replace("č", "c").replace("ć", "c").replace("ž", "z")).strip("-")
        jls_pu = {}
        for j in jls:
            s = seat_slug(j["okrug_seat"]); s = "beograd" if j["okrug_slug"] == "grad-beograd" else s
            jls_pu[j["slug"]] = s if s in PU_SEATS else None
        for pu, slugs in PU_OVERRIDES.items():
            for s in slugs: jls_pu[s] = pu
        for j in jls:
            if jls_pu.get(j["slug"]) is None: print("no PU for", j["slug"], j["okrug_seat"])
        name_by_slug = {j["slug"]: j["name_lat"] for j in jls}
        # PU + fire organizations
        orgs = {}
        for pu in PU_SEATS:
            seat = name_by_slug.get(pu, pu.title())
            for tslug, label in (("mup-policijska-uprava", PU_NAME.get(pu, f"Policijska uprava {seat}")), ("uprava-za-vanredne-situacije", f"Odeljenje za vanredne situacije {seat}" if pu not in ("beograd", "novi-sad", "nis", "kragujevac") else f"Uprava za vanredne situacije u {seat}u" if seat.endswith(("d", "š", "c")) else f"Uprava za vanredne situacije u {seat}")):
                cur.execute("select id from territorial_units where slug = %s and level = 'jls'", (pu,)); jid = (cur.fetchone() or {}).get("id")
                cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, parent_org_id, name_lat, legal_form, status, verification, last_seen_at)
                               values (slugify_sr(%s), %s, 'okrug', null, %s, %s, 'organ_drzavne_uprave', 'active', 'auto_verified', now())
                               on conflict (slug) do update set last_seen_at = now(), parent_org_id = excluded.parent_org_id returning id""",
                            (label, types[tslug], mup, label))
                orgs[(pu, tslug)] = cur.fetchone()["id"]
                # a seat location so the org page has a place even before OSM rows attach
                if jid: upsert_location(cur, org_id=orgs[(pu, tslug)], slug="sediste", unit_name_lat="Sedište", unit_kind="sediste", territorial_unit_id=jid, street=None, street_number=None, is_primary=True)
        # point-in-polygon: municipality for each station
        cur.execute("select id, slug from territorial_units where level = 'jls'"); id_by_slug = {r["slug"]: r["id"] for r in cur.fetchall()}
        shapes = load_shapes()
        made = unplaced = 0
        for r in rows:
            jslug = locate(shapes, r["lat"], r["lon"])
            if not jslug or jslug not in id_by_slug: unplaced += 1; continue
            pu = jls_pu.get(jslug)
            if not pu: unplaced += 1; continue
            tslug = "mup-policijska-uprava" if r["amenity"] == "police" else "uprava-za-vanredne-situacije"
            org_id = orgs[(pu, tslug)]
            name = r["name"] or ("Policijska stanica" if r["amenity"] == "police" else "Vatrogasno-spasilačka jedinica")
            loc_id = upsert_location(cur, org_id=org_id, slug=f"osm-{r['osm']}", unit_name_lat=name[:120], unit_kind="stanica", territorial_unit_id=id_by_slug[jslug],
                                     street=r["street"], street_number=r["number"], is_primary=False)
            cur.execute("update locations set lat = %s, lng = %s, hours_text = coalesce(%s, hours_text), unit_name_lat = %s where id = %s", (r["lat"], r["lon"], r["hours"], name[:120], loc_id))
            for p in phones_in(r["phone"] or ""): add_contact(cur, loc_id, p.kind, p.e164, p.display)
            if r["email"]: add_contact(cur, loc_id, "email", r["email"].split(";")[0].strip(), None)
            if r["website"]: add_contact(cur, loc_id, "website", r["website"].split(";")[0].strip(), None)
            add_coverage(cur, loc_id, id_by_slug[jslug], SOURCE)
            db.provenance(cur, "location", loc_id, None, SOURCE, f"https://www.openstreetmap.org/{'node' if r['osm'][0]=='n' else 'way' if r['osm'][0]=='w' else 'relation'}/{r['osm'][1:]}", 0.7, r)
            made += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"stations_loaded": made, "unplaced": unplaced, "pu_orgs": len(PU_SEATS)}))


# --- geometry: municipality polygons from the web app's generated shapes (projected units) -----------------
def load_shapes():
    """Use the geoBoundaries ADM2 GeoJSON (lon/lat) cached by scripts/build_map.py."""
    path = os.environ.get("ADM2_GEOJSON", ".cache/osm/srb_adm2.geojson")
    g = json.load(open(path, encoding="utf-8"))
    import unicodedata
    def fold(s): s = s.replace("đ", "dj"); s = unicodedata.normalize("NFKD", s); return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in s if not unicodedata.combining(c)).lower()).strip("-")
    alias = {"belgrade": "beograd", "smederevska-palanka-municipal": "smederevska-palanka"}
    out = []
    for f in g["features"]:
        n = re.sub(r"\s+(Municipality|City|Municipal\*?)$", "", f["properties"]["shapeName"]); slug = alias.get(fold(n), fold(n))
        geom = f["geometry"]; polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        out.append((slug, [p[0] for p in polys]))
    return out


def _inside(x, y, ring):
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1: inside = not inside
    return inside


def locate(shapes, lat, lon):
    for slug, rings in shapes:
        for ring in rings:
            if _inside(lon, lat, ring): return slug
    return None


if __name__ == "__main__":
    main()
