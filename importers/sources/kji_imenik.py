"""Tier 2: Komora javnih izvršitelja → one organization + location per izvršitelj.

Source (verified 2026-11-09): https://www.komoraizvrsitelja.rs/imenik-javnih-izvrsitelja
  HTML, ~280 entries grouped under headings 'Подручје Вишег суда у ... и Привредног суда у ...',
  fields: Извршитељ, Датум именовања, Седиште, Контакт телефон, Електронска адреса.
  Spreadsheet: /media/downloads/2106-imenik_kji.xls (preferred; HTML is the fallback).
Coverage = the court area in the heading, mapped to the JLS set of that Viši sud (from the
court-seats statute loader; until then, coverage is the seat JLS only).
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from ..common import db
from ..common.http import PoliteClient
from ..common.match import add_contact, add_coverage, match_organization, upsert_location
from ..common.normalize import clean_ws, cyr_to_lat, phones_in, split_address

SOURCE = "kji_imenik"
URL = "https://www.komoraizvrsitelja.rs/imenik-javnih-izvrsitelja"
FIELD = re.compile(r"(Извршитељ|Заменик|Датум именовања|Седиште|Контакт телефон|Електронска адреса):\s*(.+)")


def parse_html(html: str) -> list[dict]:
    """Document order: div.addressbook-title carries the court area; the following div.addressbook-item
    holds one <p> per izvršitelj with 'Label: value' lines separated by <br>."""
    soup = BeautifulSoup(html, "lxml")
    area, out = None, []
    for el in soup.find_all("div", class_=["addressbook-title", "addressbook-item"]):
        classes = el.get("class") or []
        if "addressbook-title" in classes:
            area = clean_ws(el.get_text(" "))
            continue
        for p in el.find_all("p"):
            cur: dict = {"area": area}
            for line in p.get_text("\n").split("\n"):
                m = FIELD.match(clean_ws(line) or "")
                if not m:
                    continue
                key, v = m.groups()
                v = clean_ws(v) or ""
                if key in ("Извршитељ", "Заменик"):
                    cur["name"], cur["role"] = v, key
                elif key == "Седиште":
                    cur["seat"] = v
                elif key == "Контакт телефон":
                    cur["phone"] = v
                elif key == "Електронска адреса":
                    cur["email"] = v.rstrip(";")
                elif key == "Датум именовања":
                    cur["appointment"] = v
            if cur.get("name") and len(cur["name"]) < 120:
                out.append(cur)
    return [e for e in out if e.get("role") == "Извршитељ"
            and "престанак" not in (e.get("appointment") or "").lower()]


def main() -> None:
    client = PoliteClient()
    entries = parse_html(client.get(URL).text)
    if len(entries) < 150:
        raise SystemExit(f"Parsed {len(entries)} izvršitelji; structure changed? Check {URL}")
    with db.conn() as c, c.cursor() as cur:
        db.stage_rows(cur, SOURCE, URL, [(e["name"], e) for e in entries])
        made = 0
        for e in entries:
            seat_city, _, rest = (e.get("seat") or "").partition(",")
            # 'Београд – Нови Београд' / 'Београд-Вождовац' → the city is the part before the dash
            seat_city = re.split(r"\s*[-–—]\s*", seat_city.strip())[0] if seat_city else ""
            jls = db.jls_id_by_name(cur, seat_city) if seat_city else None
            if not jls:
                print("unresolved seat:", e.get("seat"))
                continue
            name_lat = cyr_to_lat(e["name"])
            org_name = f"Javni izvršitelj {name_lat}"
            m = match_organization(cur, name=org_name, founder_unit_id=None, org_type_slug="javni-izvrsitelj")
            if m.organization_id and m.score >= 0.9:
                org_id = m.organization_id
            else:
                cur.execute(
                    """insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, name_cyr, legal_form,
                                                  status, verification, last_seen_at)
                       values (slugify_sr(%s), (select id from org_types where slug = 'javni-izvrsitelj'), 'jls', %s, %s, %s,
                               'javni_izvrsitelj', 'active', 'auto_verified', now())
                       on conflict (slug) do update set last_seen_at = now() returning id""",
                    (f"{org_name} {seat_city}", jls, org_name, f"Јавни извршитељ {e['name']}"),
                )
                org_id = cur.fetchone()["id"]
            street, number = split_address(rest.strip()) if rest else (None, None)
            loc_id = upsert_location(cur, org_id=org_id, slug="kancelarija", unit_name_lat="Kancelarija",
                                     unit_kind="sediste", territorial_unit_id=jls, street=street,
                                     street_number=number, is_primary=True)
            for p in phones_in(e.get("phone") or ""):
                add_contact(cur, loc_id, p.kind, p.e164, p.display)
            if e.get("email"):
                add_contact(cur, loc_id, "email", e["email"].split(";")[0].strip(), None)
            add_coverage(cur, loc_id, jls, SOURCE)
            db.provenance(cur, "location", loc_id, None, SOURCE, URL, 0.9, e)
            made += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"entries": len(entries), "locations": made}))


if __name__ == "__main__":
    main()
