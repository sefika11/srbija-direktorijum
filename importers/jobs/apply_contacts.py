"""Apply contact look-ups to locations: phones, emails, website, address, hours.

Input JSON array (from an agent or the crawler): {org_id | location_id, website, phones[], email, address, hours, source_url}
  python -m importers.jobs.apply_contacts <file.json> --source institution_site [--confidence 0.8]
Targets the organization's primary location when only org_id is given. Idempotent (contacts are de-duplicated
by value; website also stored on the organization if empty). Writes provenance per touched location.
"""
from __future__ import annotations
import argparse, json
from ..common import db
from ..common.match import add_contact, add_hours
from ..common.normalize import clean_ws, parse_hours, phones_in, split_address
from ..common.match import add_coverage, upsert_location
from ..sources.rfzo_apoteke import LatinResolver, fold
import re


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("file"); ap.add_argument("--source", default="institution_site"); ap.add_argument("--confidence", type=float, default=0.8)
    a = ap.parse_args()
    rows = json.load(open(a.file, encoding="utf-8"))
    n_loc = n_phone = n_email = n_site = n_addr = n_hours = 0
    with db.conn() as c, c.cursor() as cur:
        resolver = LatinResolver(cur)
        for r in rows:
            loc_id = r.get("location_id")
            if r.get("org_slug") and not r.get("location_id"):
                cur.execute("select id from organizations where slug = %s", (r["org_slug"],)); row = cur.fetchone()
                if not row: print("unknown org_slug:", r["org_slug"]); continue
                r["org_id"] = row["id"]
            if not loc_id and r.get("org_id"):
                cur.execute("select id from locations where org_id = %s order by is_primary desc, id limit 1", (r["org_id"],))
                row = cur.fetchone(); loc_id = row["id"] if row else None
            if not loc_id: continue
            touched = False
            for ptxt in (r.get("phones") or []):
                for p in phones_in(ptxt or ""):
                    add_contact(cur, loc_id, p.kind, p.e164, p.display); n_phone += 1; touched = True
            if r.get("email"):
                add_contact(cur, loc_id, "email", r["email"].strip().strip(".,;"), None); n_email += 1; touched = True
            if r.get("website"):
                site = r["website"].strip()
                add_contact(cur, loc_id, "website", site, None)
                cur.execute("update organizations set website = coalesce(website, %s) where id = (select org_id from locations where id = %s)", (site, loc_id)); n_site += 1; touched = True
            if r.get("address"):
                street, number = split_address(clean_ws(r["address"]) or "")
                if street:
                    cur.execute("update locations set street = coalesce(street, %s), street_number = coalesce(street_number, %s) where id = %s", (street, number, loc_id)); n_addr += 1; touched = True
            if r.get("hours"):
                add_hours(cur, loc_id, parse_hours(r["hours"]), r["hours"]); n_hours += 1; touched = True
            if touched:
                cur.execute("update locations set last_seen_at = now(), verification = case when verification = 'unverified' then 'auto_verified' else verification end where id = %s", (loc_id,))
                db.provenance(cur, "location", loc_id, None, a.source, (r.get("source_url") or r.get("website") or "")[:500], a.confidence, r); n_loc += 1
            # nested stations / branches: attach to an existing unit in the same municipality, else create one
            for st in (r.get("stations") or r.get("branches") or []):
                if not (r.get("org_id") and st.get("name")): continue
                place = re.sub(r"^(saobraćajna policijska ispostava|policijska stanica|policijska ispostava|ps|vatrogasna stanica|ambulanta|zdravstvena stanica)\s+", "", st["name"], flags=re.I)
                place = re.split(r"\s+(u|–|-|,)\s+", place)[0].split(",")[0].strip()
                jls = resolver.resolve(place)
                if not jls: print("station place unresolved:", st["name"]); continue
                cur.execute("""select id from locations where org_id = %s and territorial_unit_id = %s and slug <> 'sediste'
                               and unit_name_lat ~* 'polic|stanica|ispostava|uprava|vatrogas|ambulant|zdravstven'
                               order by (unit_name_lat ilike %s) desc, (unit_name_lat ilike %s) desc, id limit 1""",
                            (r["org_id"], jls, f"%{fold(place)[:6]}%", f"{st['name'].split(' ')[0]}%"))
                row = cur.fetchone()
                if row: sid = row["id"]
                else:
                    sid = upsert_location(cur, org_id=r["org_id"], slug=f"stanica-{fold(place).replace(' ', '-')}", unit_name_lat=st["name"][:120], unit_kind="stanica", territorial_unit_id=jls, street=None, street_number=None)
                    add_coverage(cur, sid, jls, a.source)
                if st.get("address"):
                    street, number = split_address(clean_ws(st["address"]) or "")
                    if street: cur.execute("update locations set street = coalesce(street, %s), street_number = coalesce(street_number, %s) where id = %s", (street, number, sid))
                for ptxt in (st.get("phones") or []):
                    for p in phones_in(ptxt or ""): add_contact(cur, sid, p.kind, p.e164, p.display); n_phone += 1
                cur.execute("update locations set last_seen_at = now(), unit_name_lat = coalesce(nullif(unit_name_lat, 'Policijska stanica'), %s) where id = %s", (st["name"][:120], sid))
                db.provenance(cur, "location", sid, None, a.source, (st.get("source_url") or r.get("source_url") or "")[:500], a.confidence, st); n_loc += 1
    print(json.dumps({"locations": n_loc, "phones": n_phone, "emails": n_email, "websites": n_site, "addresses": n_addr, "hours": n_hours}))


if __name__ == "__main__":
    main()
