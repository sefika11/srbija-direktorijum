"""Tier 1: RFZO filijale and ispostave → locations + coverage.

Source (verified 2026-11-09): https://rfzo.rs/index.php/filijale  — 34 numbered Cyrillic entries like
  "1. Филијала за Севернобачки округ са седиштем у Суботици са испоставама у: Бачкој Тополи и Малом Иђошу;"
  "32. Филијала Вршац са седиштем у Вршцу са испоставама у: Пландишту и Белој Цркви."
No addresses on this page: seats come from KJS, addresses from the municipal crawler later.
Note: place names are in locative case ('у Суботици', 'у Бачкој Тополи'); we resolve them by
trigram similarity against territorial_units.name_cyr, which copes with case endings.
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from ..common import db
from ..common.http import PoliteClient
from ..common.match import add_coverage, match_organization, upsert_location
from ..common.normalize import clean_ws, cyr_to_lat

SOURCE = "rfzo_filijale"
URL = "https://rfzo.rs/index.php/filijale"
ENTRY = re.compile(
    r"(?P<n>\d{1,2})\.\s*(?P<name>Филијала[^;.]*?)\s+са седиштем у\s+(?P<seat>[^,;]+?)"
    r"(?:\s+са испоставама у:\s*(?P<isp>[^;.]+))?[;.]",
    re.S,
)


def parse(html: str) -> list[dict]:
    text = clean_ws(BeautifulSoup(html, "lxml").get_text(" ")) or ""
    out = []
    for m in ENTRY.finditer(text):
        isp = m.group("isp") or ""
        ispostave = [clean_ws(x) for x in re.split(r",|\s+и\s+", isp) if clean_ws(x)]
        out.append({"n": int(m.group("n")), "name": clean_ws(m.group("name")),
                    "seat": clean_ws(m.group("seat")), "ispostave": ispostave})
    return out


def resolve_jls(cur, name_locative_cyr: str) -> int | None:
    """'Суботици' → Subotica. Trigram on Cyrillic names, threshold 0.45 (locative changes 1-3 letters)."""
    cur.execute(
        """select id, similarity(name_cyr, %(n)s) s from territorial_units
           where level = 'jls' and name_cyr is not null order by s desc limit 1""",
        {"n": name_locative_cyr},
    )
    row = cur.fetchone()
    return row["id"] if row and row["s"] >= 0.45 else None


def main() -> None:
    client = PoliteClient()
    html = client.get(URL).text
    entries = parse(html)
    if len(entries) < 30:
        raise SystemExit(f"Parsed only {len(entries)} entries; page structure changed? Check {URL}")
    with db.conn() as c, c.cursor() as cur:
        db.stage_rows(cur, SOURCE, URL, [(str(e["n"]), e) for e in entries])
        org = match_organization(cur, name="Републички фонд за здравствено осигурање", org_type_slug="rfzo")
        if not org.organization_id:
            raise SystemExit("RFZO organization not found; run trezor_kjs first or insert it manually")
        made = 0
        for e in entries:
            seat_id = resolve_jls(cur, e["seat"])
            if not seat_id:
                print("unresolved seat:", e["seat"])
                continue
            name_lat = cyr_to_lat(e["name"])
            fil_id = upsert_location(cur, org_id=org.organization_id, slug=f"filijala-{e['n']}",
                                     unit_name_lat=name_lat, unit_kind="filijala",
                                     territorial_unit_id=seat_id, street=None, street_number=None)
            add_coverage(cur, fil_id, seat_id, SOURCE)
            db.provenance(cur, "location", fil_id, None, SOURCE, URL, 0.9, e)
            made += 1
            for isp in e["ispostave"]:
                jls = resolve_jls(cur, isp)
                if not jls:
                    print("unresolved ispostava:", isp)
                    continue
                cur.execute("select name_lat, slug from territorial_units where id = %s", (jls,))
                tu = cur.fetchone()
                isp_id = upsert_location(cur, org_id=org.organization_id, slug=f"ispostava-{tu['slug']}",
                                         unit_name_lat=f"Ispostava {tu['name_lat']}", unit_kind="ispostava",
                                         territorial_unit_id=jls, street=None, street_number=None)
                cur.execute("update locations set parent_location_id = %s where id = %s", (fil_id, isp_id))
                add_coverage(cur, isp_id, jls, SOURCE)
                made += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"entries": len(entries), "locations": made}))


if __name__ == "__main__":
    main()
