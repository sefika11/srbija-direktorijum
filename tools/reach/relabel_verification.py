"""Set the trust badge from where an entry came from. Run after every import (dry run by default).

  python tools/reach/relabel_verification.py            # counts only
  python tools/reach/relabel_verification.py --write

The page shows "Iz zvaničnog registra" for `auto_verified` and "Nepotvrđeno" for `unverified`. The loaders write `unverified`
for every new row, so entries read from a ministry's register carried the same badge as entries read from the open map.
Rule (only ever raises a badge; entries confirmed by a person are not touched):
  organisation  auto_verified when one of its provenance rows names an official register (any source except the open map,
                user submissions, Wikidata, manual entry and websites read by agents)
  location      auto_verified when it has a provenance row from an official register or an official site, or when it is the
                seat of a register organisation, or when it has no provenance of its own under a register organisation;
                a location known only from the open map stays unverified
The before-state goes to db/fixes/relabel_verification_<stamp>.json.
"""
import json, os, sys, time, collections
import psycopg

WRITE = "--write" in sys.argv
NOT_REGISTER = ("osm", "user_submission", "wikidata", "manual", "institution_site", "municipal_site", "municipal_crawler")
SOFT = ("osm", "user_submission", "wikidata", "manual")   # a location needs more than these to count as official
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""select distinct p.entity_id from provenance p join data_sources s on s.id = p.source_id
             where p.entity_type = 'organization' and s.code <> all(%s)""", (list(NOT_REGISTER),))
reg_orgs = {r[0] for r in k.fetchall()}
k.execute("""select p.entity_id, array_agg(distinct s.code) from provenance p join data_sources s on s.id = p.source_id
             where p.entity_type = 'location' group by 1""")
loc_src = {r[0]: set(r[1]) for r in k.fetchall()}
k.execute("select o.id, t.slug from organizations o join org_types t on t.id = o.org_type_id where o.status = 'active' and o.verification = 'unverified'")
org_up = [(oid, ty) for oid, ty in k.fetchall() if oid in reg_orgs]
k.execute("select l.id, l.org_id, l.is_primary, t.slug from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id where l.status = 'active' and l.verification = 'unverified'")
loc_up = []
for lid, oid, primary, ty in k.fetchall():
    src = loc_src.get(lid, set())
    official = bool(src - set(SOFT))
    if official or (oid in reg_orgs and (primary or not src)): loc_up.append((lid, ty))
print(len(org_up), "organisations and", len(loc_up), "locations to raise to auto_verified")
by = collections.Counter(ty for _, ty in org_up)
print("  organisations by kind:", ", ".join(f"{t} {n}" for t, n in by.most_common(12)))
by = collections.Counter(ty for _, ty in loc_up)
print("  locations by kind:", ", ".join(f"{t} {n}" for t, n in by.most_common(12)))
if WRITE:
    stamp = time.strftime("%Y-%m-%d_%H%M%S")
    path = f"db/fixes/relabel_verification_{stamp}.json"
    json.dump({"note": "set back to 'unverified' to undo", "organisations": [o for o, _ in org_up], "locations": [l for l, _ in loc_up]}, open(path, "w"))
    k.execute("update organizations set verification = 'auto_verified', updated_at = now() where id = any(%s)", ([o for o, _ in org_up],))
    k.execute("update locations set verification = 'auto_verified', updated_at = now() where id = any(%s)", ([l for l, _ in loc_up],))
    c.commit(); print("written;", path)
