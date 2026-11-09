"""Tier 2: Javnobeležnička komora → notary offices.

Source (verified 2026-11-09): https://beleznik.org/kancelarije?page=N (5 pages × 50 entries).
List fields: name, street address (Cyrillic), 'Osnovni sud u X', city/municipality, detail link
https://beleznik.org/kancelarije/{name-slug} (detail page carries phone/email/hours — fetched per office).
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from ..common import db
from ..common.http import PoliteClient
from ..common.match import add_contact, add_coverage, upsert_location
from ..common.normalize import clean_ws, cyr_to_lat, phones_in, split_address

SOURCE = "beleznik_kancelarije"
BASE = "https://beleznik.org"


def parse_list(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    out = []
    for a in soup.select('a[href*="/kancelarije/"]'):
        href = a.get("href", "")
        if href.rstrip("/").endswith("/kancelarije") or "?page=" in href:
            continue
        card = a.find_parent(["article", "li", "div"]) or a
        text = clean_ws(card.get_text(" | ")) or ""
        sud = re.search(r"Osnovni sud u ([^|]+)", text)
        out.append({"url": href if href.startswith("http") else BASE + href, "text": text,
                    "court": clean_ws(sud.group(0)) if sud else None})
    # de-dupe by url
    seen, uniq = set(), []
    for e in out:
        if e["url"] not in seen:
            seen.add(e["url"]); uniq.append(e)
    return uniq


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    text = clean_ws(soup.get_text(" ")) or ""
    h1 = soup.find("h1")
    emails = re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    addr = re.search(r"(?:Adresa|Адреса)[:\s]+([^|]+?)(?:Telefon|Телефон|E-mail|Емаил|$)", text)
    city = re.search(r"(?:Grad|Град|Opština|Општина)[:\s]+([^\s|]+)", text)
    return {"name": clean_ws(h1.get_text()) if h1 else None, "emails": emails,
            "phones": [p.__dict__ for p in phones_in(text)],
            "address": clean_ws(addr.group(1)) if addr else None,
            "city": clean_ws(city.group(1)) if city else None, "text": text[:2000]}


def main() -> None:
    client = PoliteClient()
    entries: list[dict] = []
    for page in range(1, 8):
        html = client.get(f"{BASE}/kancelarije?page={page}").text
        batch = parse_list(html)
        if not batch:
            break
        entries.extend(batch)
    with db.conn() as c, c.cursor() as cur:
        db.stage_rows(cur, SOURCE, BASE + "/kancelarije", [(e["url"], e) for e in entries])
        made = 0
        for e in entries:
            d = parse_detail(client.get(e["url"]).text)
            parts = [p for p in e["text"].split("|") if p.strip()]
            city = d.get("city") or (parts[-1].strip() if parts else None)
            jls = db.jls_id_by_name(cur, city) if city else None
            if not (d.get("name") and jls):
                print("skip:", e["url"], city)
                continue
            name_lat = cyr_to_lat(d["name"])
            cur.execute(
                """insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form,
                                              website, status, verification, last_seen_at)
                   values (slugify_sr(%s), (select id from org_types where slug = 'javni-beleznik'), 'jls', %s, %s,
                           'javni_beleznik', %s, 'active', 'auto_verified', now())
                   on conflict (slug) do update set last_seen_at = now(), website = excluded.website returning id""",
                (f"javni beleznik {name_lat} {city}", jls, f"Javni beležnik {name_lat}", e["url"]),
            )
            org_id = cur.fetchone()["id"]
            street, number = split_address(d["address"] or (parts[1] if len(parts) > 1 else "")) if (d.get("address") or len(parts) > 1) else (None, None)
            loc_id = upsert_location(cur, org_id=org_id, slug="kancelarija", unit_name_lat="Javnobeležnička kancelarija",
                                     unit_kind="sediste", territorial_unit_id=jls, street=street, street_number=number,
                                     is_primary=True)
            for p in d["phones"]:
                add_contact(cur, loc_id, p["kind"], p["e164"], p["display"])
            for em in d["emails"][:2]:
                add_contact(cur, loc_id, "email", em, None)
            add_coverage(cur, loc_id, jls, SOURCE)
            db.provenance(cur, "location", loc_id, None, SOURCE, e["url"], 0.85, {"list": e, "detail": d})
            made += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"entries": len(entries), "locations": made}))


if __name__ == "__main__":
    main()
