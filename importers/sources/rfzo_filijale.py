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
    r"(?P<n>\d{1,2})\.\s*(?P<name>Филијала[^;.]*?)\s+са седиштем у\s+(?P<seat>.+?)"
    r"(?:\s+(?:са|и)\s+испостав(?:ама|ом)\s+у:?\s*(?P<isp>[^;.]+))?\s*(?:[;.]|$)",
    re.S,
)


def parse(html: str) -> list[dict]:
    text = clean_ws(BeautifulSoup(html, "lxml").get_text(" ")) or ""
    out = []
    for m in ENTRY.finditer(text):
        isp = m.group("isp") or ""
        ispostave = [clean_ws(x) for x in re.split(r",|\s+и\s+", isp) if clean_ws(x) and len(clean_ws(x)) > 2]
        out.append({"n": int(m.group("n")), "name": clean_ws(m.group("name")),
                    "seat": clean_ws(m.group("seat")), "ispostave": ispostave})
    return out


_UNITS: list[tuple[int, list[str]]] | None = None


def _fold(s: str) -> str:
    lat = cyr_to_lat(s).lower()
    for a, b in (("č", "c"), ("ć", "c"), ("š", "s"), ("ž", "z"), ("đ", "dj")):
        lat = lat.replace(a, b)
    return lat


def _common_prefix(a: str, b: str) -> int:
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def resolve_jls(cur, name_locative_cyr: str) -> int | None:
    """'Суботици' → Subotica, 'Новом Пазару' → Novi Pazar, 'Чукарици' → Čukarica (gradska opština).

    pg_trgm yields 0 for Cyrillic under the C locale, so this runs in Python: transliterate, fold
    diacritics, then compare word prefixes. Serbian locative changes only the last 1-3 letters of a
    word, so every word must share a prefix that reaches within 3 letters of BOTH forms' ends; the
    candidate with the longest total shared prefix wins, ties broken by closest length.
    Units: JLS first, then gradske opštine (Belgrade's RFZO ispostave are districts).
    """
    global _UNITS
    if _UNITS is None:
        cur.execute("""select id, name_lat from territorial_units
                       where level in ('jls', 'gradska_opstina') order by level = 'jls' desc, id""")
        _UNITS = [(r["id"], _fold(r["name_lat"]).split()) for r in cur.fetchall()]
    words = _fold(name_locative_cyr).split()
    best, best_key = None, (-1, 0)
    for uid, cand in _UNITS:
        if len(cand) != len(words):
            continue
        total, diff = 0, 0
        for w, c in zip(words, cand):
            cp = _common_prefix(w, c)
            # a locative form always ends in a case vowel, so it is never a plain prefix of a longer
            # nominative ('Peći' must not match 'Pećinci'); otherwise prefixes must reach within 3
            # letters of both ends.
            if cp < max(2, len(w) - 3) or cp < len(c) - 3 or (cp == len(w) and len(c) > len(w)):
                total = -1
                break
            total += cp
            diff += abs(len(w) - len(c))
        if total < 0:
            continue
        key = (total, -diff)
        if key > best_key:
            best, best_key = uid, key
    return best


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
