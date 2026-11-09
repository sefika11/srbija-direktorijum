#!/usr/bin/env python3
"""Generate lib/serbia-map.ts (okrug shapes) and lib/serbia-map-jls.ts (municipality shapes).

Source: geoBoundaries gbOpen SRB ADM1 + ADM2 (OpenStreetMap contributors, ODbL). Downloaded into
--cache if missing. Needs --jls (json: slug,name,kind,okrug) exported from the database:

  psql $DATABASE_URL -Atc "select json_agg(json_build_object('slug', j.slug, 'name', j.name_lat, 'kind', j.jls_kind,
     'okrug', o.slug)) from territorial_units j join territorial_units o on o.path @> j.path and o.level='okrug'
     where j.level='jls'" > jls.json
  python3 scripts/build_map.py --cache /path/geo --jls jls.json

Projection: equirectangular scaled by cos(mean latitude), fitted to a 600-unit-wide viewBox.
Rings are simplified (Douglas-Peucker) independently; at <=0.6 units the seams are invisible at any zoom.
"""
from __future__ import annotations

import argparse, json, math, os, re, unicodedata, urllib.request

API = "https://www.geoboundaries.org/api/current/gbOpen/SRB/{lvl}/"
ADM1_TO_SLUG = {
    "Belgrade": "grad-beograd", "Bor District": "borski", "Branicevo District": "branicevski",
    "Central Banat District": "srednjobanatski", "Jablanica District": "jablanicki", "Kolubara District": "kolubarski",
    "Macva District": "macvanski", "Moravica District": "moravicki", "Nisava District": "nisavski",
    "North Backa District": "severnobacki", "North Banat District": "severnobanatski", "Pcinja District": "pcinjski",
    "Pirot District": "pirotski", "Podunavlje District": "podunavski", "Pomoravlje District": "pomoravski",
    "Rasina District": "rasinski", "Raska District": "raski", "South Backa District": "juznobacki",
    "South Banat District": "juznobanatski", "Sumadija District": "sumadijski", "Syrmia District": "sremski",
    "Toplica District": "toplicki", "West Backa District": "zapadnobacki", "Zajecar District": "zajecarski",
    "Zlatibor District": "zlatiborski",
}
ADM2_ALIAS = {"belgrade": "beograd", "smederevska palanka municipal": "smederevska palanka"}
W = 600.0
PAD = 6.0


def fold(s: str) -> str:
    s = s.replace("đ", "dj").replace("Đ", "Dj")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def fetch(lvl: str, cache: str) -> dict:
    path = os.path.join(cache, f"srb_{lvl.lower()}.geojson")
    if not os.path.exists(path):
        meta = json.load(urllib.request.urlopen(API.format(lvl=lvl)))
        urllib.request.urlretrieve(meta["simplifiedGeometryGeoJSON"], path)
    return json.load(open(path, encoding="utf-8"))


def rings(geom: dict) -> list[list[list[float]]]:
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    return [poly[0] for poly in geom["coordinates"]]  # outer rings only


def dp(points: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    if len(points) < 4:
        return points
    def perp(p, a, b):
        (x, y), (x1, y1), (x2, y2) = p, a, b
        dx, dy = x2 - x1, y2 - y1
        if dx == dy == 0:
            return math.hypot(x - x1, y - y1)
        t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        k, dmax = -1, 0.0
        for m in range(i + 1, j):
            d = perp(points[m], points[i], points[j])
            if d > dmax:
                k, dmax = m, d
        if dmax > tol:
            keep[k] = True
            stack += [(i, k), (k, j)]
    return [p for p, k in zip(points, keep) if k]


def ring_area_centroid(r: list[tuple[float, float]]) -> tuple[float, float, float]:
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        f = x1 * y2 - x2 * y1
        a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    a *= 0.5
    if abs(a) < 1e-9:
        xs, ys = zip(*r)
        return 0.0, sum(xs) / len(xs), sum(ys) / len(ys)
    return abs(a), cx / (6 * a), cy / (6 * a)


def point_in_ring(x: float, y: float, r: list[tuple[float, float]]) -> bool:
    inside = False
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            inside = not inside
    return inside


def label_point(r: list[tuple[float, float]]) -> tuple[float, float]:
    """Centroid if inside, else the inside grid point farthest from the edge (cheap polylabel)."""
    _, cx, cy = ring_area_centroid(r)
    if point_in_ring(cx, cy, r):
        return cx, cy
    xs, ys = zip(*r)
    best, bd = (cx, cy), -1.0
    for gx in range(12):
        for gy in range(12):
            px = min(xs) + (max(xs) - min(xs)) * (gx + 0.5) / 12
            py = min(ys) + (max(ys) - min(ys)) * (gy + 0.5) / 12
            if point_in_ring(px, py, r):
                d = min(math.hypot(px - x, py - y) for x, y in r[:: max(1, len(r) // 60)])
                if d > bd:
                    best, bd = (px, py), d
    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--jls", required=True)
    ap.add_argument("--out", default="lib")
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    adm1, adm2 = fetch("ADM1", a.cache), fetch("ADM2", a.cache)
    jls = json.load(open(a.jls, encoding="utf-8"))
    jls_by_fold = {fold(j["name"]): j for j in jls}

    # projection from ADM1 bbox
    lons, lats = [], []
    for f in adm1["features"]:
        for r in rings(f["geometry"]):
            for lon, lat in r:
                lons.append(lon); lats.append(lat)
    lon0, lon1, lat0, lat1 = min(lons), max(lons), min(lats), max(lats)
    k = math.cos(math.radians((lat0 + lat1) / 2))
    scale = (W - 2 * PAD) / ((lon1 - lon0) * k)
    H = (lat1 - lat0) * scale + 2 * PAD
    def proj(lon: float, lat: float) -> tuple[float, float]:
        return PAD + (lon - lon0) * k * scale, PAD + (lat1 - lat) * scale

    def shape(geom: dict, tol: float) -> tuple[str, tuple[float, float], list[float]]:
        d_parts, best_ring, best_area, bx = [], None, -1.0, []
        for r in rings(geom):
            pr = dp([proj(lon, lat) for lon, lat in r], tol)
            if len(pr) < 4:
                continue
            d_parts.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pr) + "Z")
            area, _, _ = ring_area_centroid(pr)
            if area > best_area:
                best_area, best_ring = area, pr
            bx += pr
        xs, ys = zip(*bx)
        lx, ly = label_point(best_ring)
        return "".join(d_parts), (round(lx, 1), round(ly, 1)), [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)]

    okruzi = []
    for f in sorted(adm1["features"], key=lambda f: f["properties"]["shapeName"]):
        slug = ADM1_TO_SLUG[f["properties"]["shapeName"]]
        d, (cx, cy), bbox = shape(f["geometry"], 0.9)
        okruzi.append({"slug": slug, "d": d, "cx": cx, "cy": cy, "bbox": bbox})

    units, missing = [], []
    for f in adm2["features"]:
        n = f["properties"]["shapeName"]
        key = fold(re.sub(r"\s+(Municipality|City|Municipal\*?)$", "", n))
        j = jls_by_fold.get(ADM2_ALIAS.get(key, key))
        if not j:
            missing.append(n); continue
        d, (cx, cy), bbox = shape(f["geometry"], 0.7)
        units.append({"slug": j["slug"], "okrug": j["okrug"], "name": j["name"], "kind": j["kind"], "d": d, "cx": cx, "cy": cy, "bbox": bbox})
    units.sort(key=lambda u: u["slug"])
    if missing:
        raise SystemExit(f"unmatched ADM2 names: {missing}")

    hdr = "// Generated by scripts/build_map.py from geoBoundaries SRB ADM1/ADM2 (OpenStreetMap contributors, ODbL). Do not edit by hand.\n"
    with open(os.path.join(a.out, "serbia-map.ts"), "w", encoding="utf-8") as fh:
        fh.write(hdr)
        fh.write(f'export const MAP_VIEWBOX = "0 0 {W:.0f} {H:.0f}";\nexport const MAP_W = {W:.0f};\nexport const MAP_H = {H:.0f};\n')
        fh.write("export type OkrugShape = { slug: string; d: string; cx: number; cy: number; bbox: [number, number, number, number] };\n")
        fh.write("export const OKRUG_SHAPES: OkrugShape[] = " + json.dumps(okruzi, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(os.path.join(a.out, "serbia-map-jls.ts"), "w", encoding="utf-8") as fh:
        fh.write(hdr)
        fh.write("export type JlsShape = { slug: string; okrug: string; name: string; kind: string; d: string; cx: number; cy: number; bbox: [number, number, number, number] };\n")
        fh.write("export const JLS_SHAPES: JlsShape[] = " + json.dumps(units, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"viewBox": f"0 0 {W:.0f} {H:.0f}", "okruzi": len(okruzi), "jls": len(units),
                      "okrug_pts": sum(d["d"].count("L") for d in okruzi), "jls_pts": sum(u["d"].count("L") for u in units)}))


if __name__ == "__main__":
    main()
