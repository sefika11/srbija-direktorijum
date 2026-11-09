"""Private layer + service points from OpenStreetMap (ODbL): banks and branches, insurers, lawyers,
accountants, estate agents, translators, driving schools, private clinics and dentists, vets, and two public
wins — post offices attached to JP Pošta Srbije and health-centre ambulante attached to the dom zdravlja of
their municipality.

Input: .cache/osm/private_rows.json from apps/web/scripts/extract_private_pois.py. Idempotent (location slug
= osm-<id>). Chains (banks, insurers) become one organization per brand with a location per POI; everything
else is one organization per POI. Private rows get is_private = true.
"""
from __future__ import annotations
import json, os, re, unicodedata
from ..common import db
from ..common.match import add_contact, add_coverage, add_hours, upsert_location
from ..common.normalize import cyr_to_lat, parse_hours, phones_in
from .osm_emergency import load_shapes, locate

ROWS = os.environ.get("OSM_PRIVATE_ROWS", ".cache/osm/private_rows.json")
SOURCE = "osm"

def fold(s: str) -> str:
    s = (s or "").replace("đ", "dj").replace("Đ", "Dj"); s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in s if not unicodedata.combining(c)).lower()).strip()

CHAIN_TYPES = {"amenity:bank": "banka", "office:insurance": "osiguravajuce-drustvo"}
POI_TYPES = {"office:lawyer": "advokat", "office:accountant": "racunovodstvena-agencija", "office:tax_advisor": "racunovodstvena-agencija", "office:financial": "racunovodstvena-agencija",
             "office:estate_agent": "agencija-za-nekretnine", "office:translator": "prevodilacka-agencija", "amenity:driving_school": "auto-skola",
             "amenity:dentist": "stomatoloska-ordinacija", "healthcare:dentist": "stomatoloska-ordinacija", "amenity:veterinary": "veterinarska-stanica",
             "amenity:doctors": "privatna-ordinacija", "amenity:clinic": "privatna-ordinacija", "healthcare:clinic": "privatna-ordinacija", "healthcare:doctor": "privatna-ordinacija",
             "healthcare:laboratory": "privatna-ordinacija", "healthcare:physiotherapist": "privatna-ordinacija", "healthcare:optometrist": "privatna-ordinacija", "healthcare:psychotherapist": "privatna-ordinacija", "healthcare:centre": "privatna-ordinacija"}
PUBLIC_HEALTH = re.compile(r"dom zdravlja|zdravstvena stanica|ambulant|klini[čc]ki|institut|zavod|op[šs]ta bolnica|bolnica|hitna", re.I)
BANK_NOISE = re.compile(r"\b(ekspozitura|filijala|poslovnica|expozitura|branch|a\.?d\.?|ad|banka|bank|beograd|novi sad)\b|[\"„“”']", re.I)


def chain_key(r: dict) -> str:
    base = r.get("brand") or r.get("operator") or r.get("name") or ""
    base = cyr_to_lat(base)
    k = fold(BANK_NOISE.sub(" ", base))
    return re.sub(r"\s+", " ", k).strip() or fold(base)


def main() -> None:
    rows = json.load(open(ROWS, encoding="utf-8"))
    shapes = load_shapes()
    with db.conn() as c, c.cursor() as cur:
        cur.execute("select slug, id from org_types"); types = {r["slug"]: r["id"] for r in cur.fetchall()}
        cur.execute("select id, slug from territorial_units where level = 'jls'"); jls_id = {r["slug"]: r["id"] for r in cur.fetchall()}
        cur.execute("select id, slug, path::text from territorial_units where level = 'jls'"); jls_path = {r["id"]: r["path"] for r in cur.fetchall()}
        cur.execute("select o.id from organizations o join org_types t on t.id = o.org_type_id where t.slug = 'jp-posta-srbije' order by o.id limit 1"); posta = (cur.fetchone() or {}).get("id")
        # dom zdravlja per JLS (by founder or by primary location)
        cur.execute("""select distinct on (j.id) j.id as jls, o.id as org from organizations o join org_types t on t.id = o.org_type_id
                       join locations l on l.org_id = o.id and l.is_primary join territorial_units tu on tu.id = l.territorial_unit_id
                       join territorial_units j on j.level = 'jls' and j.path @> tu.path where t.slug = 'dom-zdravlja' order by j.id, o.id""")
        dz_by_jls = {r["jls"]: r["org"] for r in cur.fetchall()}
        stats = {"chain_orgs": 0, "poi_orgs": 0, "locations": 0, "post_offices": 0, "ambulante": 0, "skipped": 0, "unplaced": 0}
        chain_orgs: dict[tuple, int] = {}
        db.stage_rows(cur, SOURCE, "https://download.geofabrik.de/europe/serbia-latest.osm.pbf", [(r["osm"], r) for r in rows])
        for r in rows:
            cat = r["cat"]
            name = cyr_to_lat(r.get("name") or r.get("official_name") or r.get("brand") or "") or ""
            jslug = locate(shapes, r["lat"], r["lon"])
            if not jslug or jslug not in jls_id: stats["unplaced"] += 1; continue
            jid = jls_id[jslug]
            street = cyr_to_lat(r.get("addr:street")) if r.get("addr:street") else None
            number = r.get("addr:housenumber")
            phones = [p for k in ("phone", "contact:phone", "mobile", "contact:mobile") if r.get(k) for p in phones_in(r[k])]
            email = (r.get("email") or r.get("contact:email") or "").split(";")[0].strip() or None
            site = (r.get("website") or r.get("contact:website") or "").split(";")[0].strip() or None
            hours = r.get("opening_hours")
            osm_url = f"https://www.openstreetmap.org/{'node' if r['osm'][0]=='n' else 'way' if r['osm'][0]=='w' else 'relation'}/{r['osm'][1:]}"

            def finish(loc_id: int) -> None:
                cur.execute("update locations set lat = %s, lng = %s where id = %s", (r["lat"], r["lon"], loc_id))
                for p in phones: add_contact(cur, loc_id, p.kind, p.e164, p.display)
                if email: add_contact(cur, loc_id, "email", email, None)
                if site: add_contact(cur, loc_id, "website", site, None)
                if hours: add_hours(cur, loc_id, parse_hours(hours), hours)
                add_coverage(cur, loc_id, jid, SOURCE)
                db.provenance(cur, "location", loc_id, None, SOURCE, osm_url, 0.7, r); stats["locations"] += 1

            if cat == "amenity:post_office":
                if not posta: continue
                loc = upsert_location(cur, org_id=posta, slug=f"osm-{r['osm']}", unit_name_lat=(name or "Pošta")[:120], unit_kind="ispostava", territorial_unit_id=jid, street=street, street_number=number)
                finish(loc); stats["post_offices"] += 1; continue
            if cat in ("amenity:clinic", "amenity:doctors", "healthcare:clinic", "healthcare:centre") and name and PUBLIC_HEALTH.search(name):
                dz = dz_by_jls.get(jid)
                if dz:
                    loc = upsert_location(cur, org_id=dz, slug=f"osm-{r['osm']}", unit_name_lat=name[:120], unit_kind="ambulanta", territorial_unit_id=jid, street=street, street_number=number)
                    finish(loc); stats["ambulante"] += 1
                else: stats["skipped"] += 1
                continue
            if cat == "amenity:atm": stats["skipped"] += 1; continue
            if cat in CHAIN_TYPES:
                key = chain_key(r)
                if not key: stats["skipped"] += 1; continue
                tslug = CHAIN_TYPES[cat]; ck = (tslug, key)
                if ck not in chain_orgs:
                    display = cyr_to_lat(r.get("brand") or r.get("operator") or r.get("name") or key.title())
                    cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, name_lat, legal_form, status, verification, is_private, last_seen_at)
                                   values (slugify_sr(%s), %s, 'republika', %s, 'ostalo', 'active', 'auto_verified', true, now())
                                   on conflict (slug) do update set last_seen_at = now(), is_private = true returning id""", (f"{tslug} {key}", types[tslug], display))
                    chain_orgs[ck] = cur.fetchone()["id"]; stats["chain_orgs"] += 1
                unit = name if name and fold(name) != key else (("Ekspozitura" if tslug == "banka" else "Poslovnica") + (f" {street} {number or ''}".rstrip() if street else ""))
                loc = upsert_location(cur, org_id=chain_orgs[ck], slug=f"osm-{r['osm']}", unit_name_lat=unit[:120], unit_kind="ekspozitura", territorial_unit_id=jid, street=street, street_number=number)
                finish(loc); continue
            if cat in POI_TYPES:
                if not name: stats["skipped"] += 1; continue
                tslug = POI_TYPES[cat]
                cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form, website, status, verification, is_private, last_seen_at)
                               values (slugify_sr(%s), %s, 'jls', %s, %s, 'ostalo', %s, 'active', 'auto_verified', true, now())
                               on conflict (slug) do update set last_seen_at = now(), website = coalesce(organizations.website, excluded.website) returning id""",
                            (f"{name} {jslug} {r['osm']}", types[tslug], jid, name[:160], site))
                oid = cur.fetchone()["id"]; stats["poi_orgs"] += 1
                loc = upsert_location(cur, org_id=oid, slug="sediste", unit_name_lat="Sedište", unit_kind="sediste", territorial_unit_id=jid, street=street, street_number=number, is_primary=True)
                finish(loc); continue
            stats["skipped"] += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
