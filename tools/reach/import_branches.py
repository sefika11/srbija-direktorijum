"""Import official branches the reach pass found on organisations' own lists but that we did not hold.

  python -m tools.reach.import_branches <extra.json>            # dry run
  python -m tools.reach.import_branches <extra.json> --write

Rows: {org_slug, name, address, place, phones?, hours?, source_url}. A row is skipped when the organisation is unknown, the
place cannot be resolved to a municipality, or the organisation already has a location on that street (or with that name)
there. New units take the unit kind the organisation's other branches use. Written ids go to db/fixes/imported_branches_<stamp>.json.
"""
import json, re, sys, time, collections
from importers.common import db
from importers.common.match import add_contact, add_hours, add_coverage, upsert_location
from importers.common.normalize import clean_ws, parse_hours, phones_in, split_address
from importers.sources.rfzo_apoteke import LatinResolver, fold

WRITE = "--write" in sys.argv
rows = json.load(open(sys.argv[1], encoding="utf-8"))
def slugify(s): return re.sub(r"[^a-z0-9]+", "-", fold(s)).strip("-")[:70]
def street_key(a):
    st, no = split_address(clean_ws((a or "").split(",")[0]) or "")
    return (fold(st or ""), (no or "").lower())
# settlements the resolver does not know by themselves: the municipality they belong to
PLACE_OF = {"Padina": "Kovačica", "Petrovac": "Petrovac na Mlavi", "Ušće": "Kraljevo", "Brestovac": "Leskovac", "Starčevo": "Pančevo", "Grdelica": "Leskovac",
            "Vučje": "Leskovac", "Guča": "Lučani", "Donji Milanovac": "Majdanpek", "Vranjska Banja": "Vranje"}
stats = collections.Counter(); made = []; skipped = []; plan = []
with db.conn() as c, c.cursor() as cur:
    resolver = LatinResolver(cur)
    for r in rows:
        cur.execute("select id from organizations where slug = %s and status = 'active'", (r.get("org_slug"),)); o = cur.fetchone()
        if not o: stats["unknown organisation"] += 1; skipped.append((r.get("org_slug"), r.get("name"), "unknown organisation")); continue
        tail = (r.get("address") or "").split(",")[-1]
        tu = None
        for cand in (PLACE_OF.get(r.get("place") or ""), r.get("place"), re.sub(r"\b\d{5}\b", "", tail).strip()):
            if cand:
                tu = resolver.resolve(cand)
                if tu: break
        if not tu:
            cur.execute("select territorial_unit_id from locations where org_id = %s and settlement_name_lat ilike %s and status = 'active' limit 1", (o["id"], r.get("place") or "~")); x = cur.fetchone()
            tu = x["territorial_unit_id"] if x else None
        if not tu: stats["place not resolved"] += 1; skipped.append((r["org_slug"], r["name"], "place not resolved: " + str(r.get("place")))); continue
        cur.execute("select id, unit_name_lat, street, street_number, unit_kind from locations where org_id = %s and status = 'active'", (o["id"],)); have = cur.fetchall()
        sk = street_key(r.get("address"))
        if any(fold(h["unit_name_lat"] or "") == fold(r["name"]) or (sk[0] and (fold(h["street"] or ""), (h["street_number"] or "").lower()) == sk) for h in have):
            stats["already held"] += 1; skipped.append((r["org_slug"], r["name"], "already held")); continue
        kinds = collections.Counter(h["unit_kind"] for h in have if h["unit_kind"] and h["unit_kind"] != "sediste")
        kind = kinds.most_common(1)[0][0] if kinds else "ispostava"
        stats["to import"] += 1
        cur.execute("select name_lat from territorial_units where id = %s", (tu,)); plan.append((r["name"], r.get("place"), cur.fetchone()["name_lat"], kind))
        if not WRITE: continue
        street, number = split_address(clean_ws((r.get("address") or "").split(",")[0]) or "")
        postal = (re.search(r"\b(\d{5})\b", r.get("address") or "") or [None, None])[1]
        lid = upsert_location(cur, org_id=o["id"], slug=slugify(r["name"]), unit_name_lat=r["name"][:120], unit_kind=kind, territorial_unit_id=tu, street=street, street_number=number, postal_code=postal)
        cur.execute("update locations set settlement_name_lat = coalesce(settlement_name_lat, %s), verification = 'auto_verified', last_seen_at = now() where id = %s", (clean_ws(r.get("place") or "") or None, lid))
        for ptxt in (r.get("phones") or []):
            for p in phones_in(ptxt or ""): add_contact(cur, lid, p.kind, p.e164, p.display)
        if r.get("hours"): add_hours(cur, lid, parse_hours(r["hours"]), r["hours"])
        if "vanredne" in r["org_slug"]: add_coverage(cur, lid, tu, "institution_site")
        db.provenance(cur, "location", lid, None, "institution_site", (r.get("source_url") or "")[:500], 0.75, r)
        made.append({"location_id": lid, "org_slug": r["org_slug"], "name": r["name"]})
    if not WRITE: c.rollback()
print(dict(stats))
for x in plan:
    if not WRITE and fold(x[1] or "") != fold(x[2]): print("  place", x[1], "->", x[2], "|", x[0], "|", x[3])
print("  kinds:", dict(collections.Counter(x[3] for x in plan)))
for s in skipped: print("  skipped:", s)
if WRITE:
    path = f"db/fixes/imported_branches_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump(made, open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0); print("written", path, len(made))
