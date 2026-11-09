"""Tier 4: RGZ Adresni registar (open data) → staging.ar_addresses for exact geocoding.

Dataset (verified 2026-11-09 on data.gov.rs, slug 'adresni-registar', RGZ, updated 2026-10-22):
  CSV  https://download.geosrbija.rs/download-api/opendata-proxy/export?category=ar&layer=kucni_broj_ar&geometry=true&fileName=kucni_br_csv&format=csv
Expect a large file (hundreds of MB). Streamed to disk, then COPYed. Column names are read from the
header and mapped in AR_COLUMNS after a first --inspect run (the layer carries municipality, settlement,
street, house number, unique address code and point geometry).
"""
from __future__ import annotations

import argparse
import csv
import io
import re
import sys
from pathlib import Path

import httpx

from ..common import db
from ..common.http import UA
from .data_gov_rs import latest_resource_url
from ..common.http import PoliteClient

SOURCE = "rgz_adresni_registar"
OUT = Path(".cache/rgz_adresni_registar.csv")

AR_COLUMNS = {  # csv header → staging column; confirm with --inspect
    "adresni_kod": "adresni_kod",
    "opstina_maticni_broj": "opstina_mb",
    "opstina_naziv": "opstina_naziv",
    "naselje_naziv": "naselje_naziv",
    "ulica_maticni_broj": "ulica_mb",
    "ulica_naziv": "ulica_naziv",
    "kucni_broj": "kucni_broj",
    "geometry": "geometry",  # WKT 'POINT (lng lat)' or 'POINT (x y)' in a projected CRS → see parse_point
}
POINT = re.compile(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", re.I)


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, headers={"User-Agent": UA}, timeout=None, follow_redirects=True) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)
    return dest


def parse_point(wkt: str) -> tuple[float, float] | None:
    m = POINT.search(wkt or "")
    if not m:
        return None
    x, y = float(m.group(1)), float(m.group(2))
    # WGS84 if it looks like lon/lat for Serbia; otherwise it is projected (EPSG:32634 / 8682) and needs pyproj.
    if 18 < x < 24 and 41 < y < 47:
        return (y, x)
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--file", help="already downloaded CSV")
    a = ap.parse_args()
    path = Path(a.file) if a.file else download(latest_resource_url(PoliteClient(), "adresni-registar", "csv"), OUT)
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";" if ";" in f.readline() else ",")
        f.seek(0)
        reader = csv.DictReader(f, delimiter=reader.dialect.delimiter if hasattr(reader, "dialect") else ",")
        header = reader.fieldnames or []
        if a.inspect:
            print("HEADER:", header)
            for i, row in enumerate(reader):
                print(row)
                if i >= 2:
                    break
            return
        missing = [h for h in AR_COLUMNS if h not in header]
        if missing:
            sys.exit(f"Header mismatch {missing}; run --inspect and fix AR_COLUMNS")
        buf = io.StringIO()
        w = csv.writer(buf)
        n = 0
        for row in reader:
            pt = parse_point(row.get("geometry", ""))
            w.writerow([row["adresni_kod"], row["opstina_maticni_broj"], row["opstina_naziv"], row["naselje_naziv"],
                        row["ulica_maticni_broj"], row["ulica_naziv"], row["kucni_broj"],
                        pt[0] if pt else "", pt[1] if pt else ""])
            n += 1
        buf.seek(0)
        with db.conn() as c, c.cursor() as cur:
            cur.execute("truncate staging.ar_addresses")
            with cur.copy("copy staging.ar_addresses (adresni_kod, opstina_mb, opstina_naziv, naselje_naziv, ulica_mb, "
                          "ulica_naziv, kucni_broj, lat, lng) from stdin with (format csv, null '')") as cp:
                cp.write(buf.getvalue())
            cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
        print(f"loaded {n} addresses")


if __name__ == "__main__":
    main()
