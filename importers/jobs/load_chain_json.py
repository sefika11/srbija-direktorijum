"""Load BRAND NETWORKS (bank branches, insurer offices, telecom shops) from an agent file: one organisation per brand,
one location per row. Idempotent: brand org slug = type + brand; location slug = stable hash of (town, address, name).

  python -m importers.jobs.load_chain_json db/imports/banke_ekspoziture_2026-11-10.json --source institution_site
Rows: {brand, brand_website, type_slug, name, town, municipality, address, phones[], emails[], website, hours, lat, lng, extra{}, source_url}
Existing OSM branches of the same brand are kept; duplicates by (org, normalised address) are skipped.
"""
from __future__ import annotations
import argparse, hashlib, json, re, unicodedata
from ..common import db
from ..common.match import add_contact, add_hours, upsert_location
from ..common.normalize import clean_ws, parse_hours, phones_in, split_address
from ..sources.rfzo_apoteke import LatinResolver, fold
from .load_orgs_json import lat as to_lat, nice_case, slugify

BRAND_ALIASES = {  # registry name → how the OSM import named the chain org, so branches attach to the same organisation
    "banca intesa": "Banca Intesa", "intesa": "Banca Intesa", "otp banka srbija": "OTP banka", "otp": "OTP banka", "unicredit bank srbija": "UniCredit Bank", "unicredit": "UniCredit Bank",
    "nlb komercijalna banka": "NLB Komercijalna banka", "nlb banka": "NLB Komercijalna banka", "raiffeisen banka": "Raiffeisen banka", "raiffeisen bank": "Raiffeisen banka", "erste bank": "Erste Bank", "erste banka": "Erste Bank",
    "banka postanska stedionica": "Banka Poštanska štedionica", "postanska stedionica": "Banka Poštanska štedionica", "eurobank direktna": "Eurobank Direktna", "addiko bank": "Addiko Bank", "procredit bank": "ProCredit banka", "procredit banka": "ProCredit banka",
    "aik banka": "AIK banka", "halkbank": "Halkbank", "mobi banka": "Mobi Banka", "yettel bank": "Yettel Bank", "3 banka": "3 Banka", "dunav osiguranje": "Dunav osiguranje", "generali osiguranje srbija": "Generali Osiguranje", "generali": "Generali Osiguranje",
    "ddor novi sad": "DDOR Novi Sad", "wiener stadtische": "Wiener Städtische", "triglav osiguranje": "Triglav osiguranje", "uniqa": "UNIQA osiguranje", "sava osiguranje": "Sava osiguranje", "grawe": "Grawe osiguranje", "milenijum osiguranje": "Milenijum osiguranje",
}

def norm_addr(a: str | None) -> str: return re.sub(r"[^a-z0-9]+", "", fold(to_lat(a) or ""))

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("file"); ap.add_argument("--source", default="institution_site"); ap.add_argument("--confidence", type=float, default=0.9)
    a = ap.parse_args()
    doc = json.load(open(a.file, encoding="utf-8")); rows = doc["rows"]; src_url = (doc.get("source") or {}).get("urls", [a.source])[0] if isinstance((doc.get("source") or {}).get("urls"), list) else a.source
    stats = {"brands": 0, "new_orgs": 0, "locations": 0, "skipped_dupe": 0, "unresolved": 0, "phones": 0, "hours": 0, "no_type": 0}
    with db.conn() as c, c.cursor() as cur:
        resolver = LatinResolver(cur)
        cur.execute('select id, slug, "group"::text as grp from org_types'); types = {r["slug"]: r for r in cur.fetchall()}
        db.stage_rows(cur, a.source, src_url, [(f"{r.get('brand')}|{r.get('town')}|{r.get('address')}|{r.get('name')}", r) for r in rows])
        by_brand: dict[tuple[str, str], list[dict]] = {}
        for r in rows:
            b = clean_ws(to_lat(r.get("brand")) or ""); t = r.get("type_slug") or ""
            if not b or t not in types: stats["no_type"] += 1; continue
            by_brand.setdefault((t, b), []).append(r)
        for (tslug, brand), brs in by_brand.items():
            t = types[tslug]; canonical = BRAND_ALIASES.get(fold(brand), brand)
            # find the chain organisation: by canonical name within the type, else create
            cur.execute("select id, slug from organizations where org_type_id = %s and status = 'active' and (f_unaccent(lower(name_lat)) = f_unaccent(lower(%s)) or f_unaccent(lower(name_lat)) = f_unaccent(lower(%s))) order by id limit 1", (t["id"], canonical, brand))
            row = cur.fetchone()
            if row: oid = row["id"]
            else:
                slug = slugify(f"{tslug}-{canonical}")
                cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, name_lat, legal_form, website, status, verification, is_private, last_seen_at)
                               values (%s, %s, 'republika', %s, 'ostalo', %s, 'active', 'unverified', %s, now())
                               on conflict (slug) do update set last_seen_at = now() returning id""", (slug, t["id"], nice_case(canonical)[:200], brs[0].get("brand_website") or None, t["grp"] == "privatne_usluge"))
                oid = cur.fetchone()["id"]; stats["new_orgs"] += 1
            if brs[0].get("brand_website"): cur.execute("update organizations set website = coalesce(website, %s) where id = %s", (brs[0]["brand_website"], oid))
            stats["brands"] += 1
            cur.execute("select id, slug, street, street_number, address_display from locations where org_id = %s", (oid,))
            existing = {norm_addr(f"{x['street'] or ''} {x['street_number'] or ''}") or norm_addr(x["address_display"]): x["id"] for x in cur.fetchall()}
            for r in brs:
                town = clean_ws(to_lat(r.get("town")) or ""); muni = clean_ws(to_lat(r.get("municipality")) or "")
                jid = None
                for cand in (muni, town):
                    if cand: jid = resolver.resolve(cand)
                    if jid: break
                if not jid: stats["unresolved"] += 1; continue
                addr = to_lat(r.get("address")); na = norm_addr(addr)
                if na and na in existing: stats["skipped_dupe"] += 1; loc = existing[na]
                else:
                    street, number = (None, None)
                    if addr:
                        try: street, number = split_address(addr)
                        except Exception: street = addr
                    key = hashlib.sha1(f"{town}|{addr}|{r.get('name')}".encode()).hexdigest()[:10]
                    unit = nice_case(clean_ws(to_lat(r.get("name")) or "") or f"Ekspozitura {town}")
                    loc = upsert_location(cur, org_id=oid, slug=f"br-{key}", unit_name_lat=unit[:120], unit_kind="ekspozitura", territorial_unit_id=jid, street=street, street_number=number)
                    if na: existing[na] = loc
                    stats["locations"] += 1
                    if r.get("lat") and r.get("lng"): cur.execute("update locations set lat = %s, lng = %s, geo_precision = 'rooftop' where id = %s and lat is null", (r["lat"], r["lng"], loc))
                    if town: cur.execute("update locations set settlement_name_lat = coalesce(settlement_name_lat, %s) where id = %s", (town[:120], loc))
                for ph in r.get("phones") or []:
                    for p in phones_in(ph): add_contact(cur, loc, p.kind, p.e164, p.display); stats["phones"] += 1
                for em in r.get("emails") or []:
                    em = (em or "").strip().lower()
                    if "@" in em: add_contact(cur, loc, "email", em, None)
                if r.get("website"): add_contact(cur, loc, "website", r["website"].strip(), None)
                if r.get("hours"):
                    try:
                        parsed = parse_hours(r["hours"])
                        if parsed: add_hours(cur, loc, parsed, r["hours"]); stats["hours"] += 1
                        else: cur.execute("update locations set hours_text = coalesce(hours_text, %s) where id = %s", (r["hours"][:300], loc))
                    except Exception: pass
                db.provenance(cur, "location", loc, None, a.source, r.get("source_url") or src_url, a.confidence, r)
        c.commit()
    print(json.dumps(stats, ensure_ascii=False))

if __name__ == "__main__":
    main()
