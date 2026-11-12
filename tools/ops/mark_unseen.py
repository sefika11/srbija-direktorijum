"""After a register has been pulled and loaded again: retire the entries the register no longer lists.

  .venv/bin/python tools/ops/mark_unseen.py <source_code> <YYYY-MM-DD of the new pull>            # dry run
  .venv/bin/python tools/ops/mark_unseen.py <source_code> <YYYY-MM-DD of the new pull> --write

The loaders stamp `last_seen_at` on every organisation they meet. An organisation whose ONLY register source is
<source_code> and which was not seen on or after the given day has left the register (a lawyer struck off, an agency
deleted): it becomes `inactive`, so its page answers "not found" and it leaves lists, search and the sitemap. Nothing is
deleted; set status back to 'active' to undo (ids in db/fixes/unseen_<source>_<stamp>.json).
Refuses to write when more than 8% of the source's entries would go: that means the pull was incomplete, not that the
register shrank. An entry confirmed by its owner (human_verified) is never retired by this job.
Monthly routine per register: pull -> prepare -> tools/reach/load_in_batches.py -> this job -> tools/reach/after_import.sh.
"""
import json, os, sys, time
import psycopg

src, day = sys.argv[1], sys.argv[2]; WRITE = "--write" in sys.argv
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""select o.id, o.name_lat, o.last_seen_at::date from organizations o
  where o.status = 'active' and o.verification <> 'human_verified'
    and exists (select 1 from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id and s.code = %s)
    and not exists (select 1 from provenance p join data_sources s on s.id = p.source_id where p.entity_type = 'organization' and p.entity_id = o.id
                    and s.code not in (%s, 'osm', 'user_submission', 'wikidata', 'manual', 'institution_site', 'municipal_site', 'municipal_crawler'))""", (src, src))
rows = k.fetchall(); gone = [r for r in rows if r[2] is None or str(r[2]) < day]
print(f"{len(rows)} active entries from {src}; {len(gone)} not seen since {day} ({100 * len(gone) / max(len(rows), 1):.1f}%)")
for r in gone[:10]: print("   ", r[1], "| last seen", r[2])
if not rows or len(gone) == len(rows): print("nothing was seen on or after that day: has the new pull been loaded?"); sys.exit(1)
if len(gone) > 0.08 * len(rows): print("more than 8% would be retired: the pull looks incomplete, nothing written"); sys.exit(1)
if WRITE and gone:
    path = f"db/fixes/unseen_{src}_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump({"note": "set status back to 'active' to undo", "organisations": [r[0] for r in gone]}, open(path, "w"))
    k.execute("update organizations set status = 'inactive', updated_at = now() where id = any(%s)", ([r[0] for r in gone],))
    k.execute("update locations set status = 'inactive', updated_at = now() where org_id = any(%s) and status = 'active'", ([r[0] for r in gone],))
    c.commit(); print("written;", path)
