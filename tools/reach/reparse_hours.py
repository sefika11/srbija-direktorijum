"""Re-parse opening hours after the parser learned weekend parts and day lists.

  python tools/reach/reparse_hours.py <old_normalize.py>            # dry run
  python tools/reach/reparse_hours.py <old_normalize.py> --write

Only locations whose stored rows are exactly what the OLD parser made of their hours_text are touched (so hours that came
structured from a source stay as they are), and only when the new parser reads the same text differently.
<old_normalize.py> is the previous importers/common/normalize.py (git show <rev>:importers/common/normalize.py).
"""
import importlib.util, json, os, sys, time, collections
import psycopg
sys.path.insert(0, os.getcwd())
from importers.common import normalize as new

spec = importlib.util.spec_from_file_location("importers.common.old_normalize", sys.argv[1], submodule_search_locations=None)
old = importlib.util.module_from_spec(spec); old.__package__ = "importers.common"; sys.modules[spec.name] = old; spec.loader.exec_module(old)

def expand(rows): return {(d, r.opens, r.closes) for r in rows if r.closes > r.opens for d in range(r.day_from, r.day_to + 1)}
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("select id, hours_text from locations where hours_text is not null")
texts = dict(k.fetchall())
k.execute("select location_id, day_of_week, to_char(opens, 'HH24:MI'), to_char(closes, 'HH24:MI'), hours_type::text from opening_hours where department_id is null")
have = collections.defaultdict(set); types = {}
for lid, d, o, cl, ht in k.fetchall(): have[lid].add((d, o, "24:00" if cl == "00:00" and o != "00:00" else cl)); types[lid] = ht
changes = []
for lid, text in texts.items():
    o_rows = old.parse_hours(text); n_rows = new.parse_hours(text)
    eo, en = expand(o_rows), expand(n_rows)
    cur = have.get(lid, set())
    norm = lambda s: {(d, a, "24:00" if b in ("24:00", "00:00") else b) for d, a, b in s}
    if eo != en and norm(cur) == norm(eo): changes.append((lid, text, sorted(cur), n_rows))
kinds = collections.Counter("more days" if len(expand(n)) > len(cur) else "cleared (shown as text)" if not n else "other" for _, _, cur, n in changes)
print(len(texts), "locations with hours text;", len(changes), "re-parsed:", dict(kinds))
for lid, text, cur, n in changes[:: max(1, len(changes) // 10)][:10]: print("  ", lid, "|", text[:70], "=>", [(r.day_from, r.day_to, r.opens, r.closes) for r in n])
if "--write" in sys.argv:
    path = f"db/fixes/reparsed_hours_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump([{"location_id": lid, "hours_text": text, "rows_before": cur} for lid, text, cur, _ in changes], open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0)
    for lid, text, cur, n in changes:
        k.execute("delete from opening_hours where location_id = %s and department_id is null", (lid,))
        for r in n:
            if r.closes <= r.opens: continue
            for d in range(r.day_from, r.day_to + 1):
                k.execute("insert into opening_hours (location_id, hours_type, day_of_week, opens, closes) values (%s, %s::hours_type, %s, %s::time, %s::time)", (lid, r.hours_type, d, r.opens, r.closes))
    c.commit(); print("written", path)
if "--samples" in sys.argv:
    import random; random.seed(7)
    for kind in ("cleared (shown as text)", "other"):
        pick = [(lid, t, cur, n) for lid, t, cur, n in changes if ("more days" if len(expand(n)) > len(cur) else "cleared (shown as text)" if not n else "other") == kind]
        tc = collections.Counter(t for _, t, _, _ in pick)
        print("\n==", kind, len(pick), "distinct texts", len(tc))
        for t, n in tc.most_common(14): print(f"  {n:4d} | {t[:110]} => {[(r.day_from, r.day_to, r.opens, r.closes) for r in new.parse_hours(t)]} | was {sorted(expand(old.parse_hours(t)))[:2]}..")
