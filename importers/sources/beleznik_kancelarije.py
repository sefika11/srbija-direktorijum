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
from ..common.match import add_contact, add_coverage, add_hours, upsert_location
from ..common.normalize import clean_ws, cyr_to_lat, parse_hours, phones_in, split_address

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


LABELS = {"Javni beležnik": "name", "email": "email", "Telefon": "phone", "Adresa": "address",
          "Grad/Gradska opština/Opština": "city", "Područje osnovnog suda": "court", "Radno vreme": "hours"}


def parse_detail(html: str) -> dict:
    """Detail page is a flat 'Label: | value | value' list; split on the separator and bucket values under
    the last label seen. Phones are parsed per segment so '037 35 55 771 | 037 35 55 772' stays two numbers."""
    soup = BeautifulSoup(html, "lxml")
    root = soup.find("main") or soup.body or soup
    parts = [clean_ws(x) for x in root.get_text(" | ").split("|")]
    parts = [x for x in parts if x]
    out: dict = {k: [] for k in LABELS.values()}
    key = None
    for seg in parts:
        label = seg.rstrip(":").strip()
        if label in LABELS:
            key = LABELS[label]
            continue
        if seg in ("Vrati se nazad",) or key is None:
            continue
        out[key].append(seg)
    phones = []
    for seg in out["phone"]:
        phones += phones_in(seg)
    name = clean_ws(" ".join(out["name"])) or None
    emails = [m for seg in out["email"] for m in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", seg)]
    hours_text = clean_ws(" ".join(out["hours"])) or None
    return {"name": name, "emails": emails, "phones": [p.__dict__ for p in phones],
            "address": clean_ws(" ".join(out["address"])) or None, "city": clean_ws(" ".join(out["city"])) or None,
            "court": clean_ws(" ".join(out["court"])) or None, "hours_text": hours_text,
            "hours": [h.__dict__ for h in parse_hours(hours_text)] if hours_text else []}


def _belgrade_if_go(cur, name: str) -> int | None:
    cur.execute("""select p.id from territorial_units g join territorial_units p on p.id = g.parent_id
                   where g.level = 'gradska_opstina' and (f_unaccent(lower(g.name_lat)) = f_unaccent(lower(%s)) or g.name_cyr = %s) limit 1""",
                (name, name))
    r = cur.fetchone()
    return r["id"] if r else None


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
            city = d.get("city")
            # Belgrade list entries name the gradska opština (Zemun, Palilula...) - resolve to the city of Belgrade
            jls = (db.jls_id_by_name(cur, city) or _belgrade_if_go(cur, city)) if city else None
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
            street, number = split_address(d["address"]) if d.get("address") else (None, None)
            loc_id = upsert_location(cur, org_id=org_id, slug="kancelarija", unit_name_lat="Javnobeležnička kancelarija",
                                     unit_kind="sediste", territorial_unit_id=jls, street=street, street_number=number,
                                     is_primary=True)
            for p in d["phones"]:
                add_contact(cur, loc_id, p["kind"], p["e164"], p["display"])
            for em in d["emails"][:2]:
                add_contact(cur, loc_id, "email", em, None)
            if d.get("hours_text"):
                from ..common.normalize import HoursRow
                add_hours(cur, loc_id, [HoursRow(**h) for h in d["hours"]], d["hours_text"])
            add_coverage(cur, loc_id, jls, SOURCE)
            db.provenance(cur, "location", loc_id, None, SOURCE, e["url"], 0.85, {"list": e, "detail": d})
            made += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"entries": len(entries), "locations": made}))


if __name__ == "__main__":
    main()
