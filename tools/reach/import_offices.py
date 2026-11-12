"""Import the checked registry offices and local tax offices (one organisation per municipality) and the cadastre offices.

  .venv/bin/python -m tools.reach.import_offices db/contacts/offices_2026-11-12            # dry run
  .venv/bin/python -m tools.reach.import_offices db/contacts/offices_2026-11-12 --write

Input: <dir>/_checked.json (output of tools/reach/check_offices.py) and <dir>/_rgz_katastar.json (office names only).
  registry office   "Matična služba <unit>", type maticna-sluzba, a unit of the municipality's administration
  local tax office  "Lokalna poreska administracija <unit>", type lokalna-poreska-administracija; skipped where one is held
  cadastre office   a unit of the Republic Geodetic Authority in its municipality, with no contact of its own: the page
                    shows the Authority's contact, said as such
At most three phones per office. Source municipal_site (cadastre: rgz_sluzbe). Idempotent by slug.
Written ids go to db/fixes/imported_offices_<stamp>.json.
"""
import json, os, re, sys, time, collections, urllib.parse
from importers.common import db
from importers.common.match import add_contact, add_hours, upsert_location
from importers.common.normalize import clean_ws, parse_hours, phones_in, split_address
from importers.sources.rfzo_apoteke import LatinResolver, fold

DIR = sys.argv[1]; WRITE = "--write" in sys.argv
TYPE = {"maticna": ("maticna-sluzba", "Matična služba"), "lpa": ("lokalna-poreska-administracija", "Lokalna poreska administracija")}
def slugify(s): return re.sub(r"[^a-z0-9]+", "-", fold(s)).strip("-")[:80]
stats = collections.Counter(); made = {"organisations": [], "locations": []}
with db.conn() as c, c.cursor() as cur:
    cur.execute("select id, slug from org_types where slug in ('maticna-sluzba', 'lokalna-poreska-administracija')"); type_id = {r["slug"]: r["id"] for r in cur.fetchall()}
    cur.execute("select id, level, name_lat from territorial_units"); units = {r["id"]: r for r in cur.fetchall()}
    cur.execute("""select t.slug, l.territorial_unit_id from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.status = 'active'
                   where o.status = 'active' and t.slug in ('maticna-sluzba', 'lokalna-poreska-administracija')""")
    held = {(r["slug"], r["territorial_unit_id"]) for r in cur.fetchall()}
    cur.execute("""select l.territorial_unit_id as tu, o.id, o.name_lat from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
                   where o.status = 'active' and t.slug in ('opstinska-uprava', 'gradska-uprava', 'uprava-gradske-opstine') order by length(o.name_lat), o.id""")
    parent = {}
    for r in cur.fetchall(): parent.setdefault(r["tu"], r["id"])
    for r in json.load(open(os.path.join(DIR, "_checked.json"), encoding="utf-8")):
        ty, label = TYPE[r["office"]]; u = units[r["unit_id"]]
        if (ty, r["unit_id"]) in held: stats[f"{ty}: already held"] += 1; continue
        stats[f"{ty}: to import"] += 1
        if not WRITE: continue
        name = f"{label} {u['name_lat']}"; slug = slugify(f"{ty}-{r['unit_slug']}")
        site = "{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(r["source_url"]))
        cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, parent_org_id, name_lat, legal_form, website, status, verification, is_private, last_seen_at)
                       values (%s, %s, %s, %s, %s, %s, 'ostalo', %s, 'active', 'auto_verified', false, now())
                       on conflict (slug) do update set last_seen_at = now() returning id""",
                    (slug, type_id[ty], "gradska_opstina" if u["level"] == "gradska_opstina" else "jls", r["unit_id"], parent.get(r["unit_id"]), name, site))
        oid = cur.fetchone()["id"]
        street, number = split_address(clean_ws((r.get("address") or "").split(",")[0]) or "") if r.get("address") else (None, None)
        lid = upsert_location(cur, org_id=oid, slug="sediste", unit_name_lat="Sedište", unit_kind="sediste", territorial_unit_id=r["unit_id"], street=street, street_number=number, is_primary=True)
        cur.execute("update locations set verification = 'auto_verified', last_seen_at = now() where id = %s", (lid,))
        n = 0
        for ptxt in (r.get("phones") or []):
            for p in phones_in(ptxt or ""):
                if n < 3: add_contact(cur, lid, p.kind, p.e164, p.display); n += 1
        if r.get("email"): add_contact(cur, lid, "email", r["email"].strip().lower(), None)
        if r.get("hours"): add_hours(cur, lid, parse_hours(r["hours"]), r["hours"])
        db.provenance(cur, "organization", oid, None, "municipal_site", r["source_url"][:500], 0.75, r)
        db.provenance(cur, "location", lid, None, "municipal_site", r["source_url"][:500], 0.75, r)
        made["organisations"].append(oid); made["locations"].append(lid)
    # cadastre offices: names only
    path = os.path.join(DIR, "_rgz_katastar.json")
    if os.path.exists(path):
        resolver = LatinResolver(cur)
        cur.execute("select id from organizations where slug = 'republicki-geodetski-zavod-beograd' and status = 'active'"); rgz = cur.fetchone()
        cur.execute("select slug from locations where org_id = %s", (rgz["id"],)); have = {r["slug"] for r in cur.fetchall()}
        for r in json.load(open(path, encoding="utf-8")):
            name = clean_ws(r.get("name") or ""); place = clean_ws(r.get("place") or "")
            tu = resolver.resolve({"Petrovac": "Petrovac na Mlavi"}.get(place, place))
            if not tu: stats["cadastre: place not resolved"] += 1; print("  not resolved:", name, "|", place); continue
            slug = slugify(name.replace("Služba za katastar nepokretnosti", "skn"))
            if slug in have: stats["cadastre: already held"] += 1; continue
            have.add(slug); stats["cadastre: to import"] += 1
            if not WRITE: continue
            lid = upsert_location(cur, org_id=rgz["id"], slug=slug, unit_name_lat=name[:120], unit_kind="sluzba", territorial_unit_id=tu, street=None, street_number=None)
            cur.execute("update locations set verification = 'auto_verified', last_seen_at = now() where id = %s", (lid,))
            db.provenance(cur, "location", lid, None, "rgz_sluzbe", (r.get("source_url") or "")[:500], 0.8, r)
            made["locations"].append(lid)
    for k, v in sorted(stats.items()): print(f"{v:5d}  {k}")
    if WRITE:
        p = f"db/fixes/imported_offices_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump(made, open(p, "w")); c.commit(); print("written;", p)
    else: c.rollback()
