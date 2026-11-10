"""What people searched for and did not find: the queue for the lexicon.

    set -a && . apps/web/.env.local; set +a
    .venv/bin/python tools/search/misses.py [days=30]

Lists queries from search_log that had no results, no best answer on the results page, or rested in the search box
without a best match ("miss"), most frequent first. For each real need, add the words to
apps/web/lib/search-lexicon-extra.json under the right guide, type, roadmap or section, and add the query to a case
file in tools/search/ so it stays fixed.
"""
import os, sys, re, unicodedata, collections
import psycopg

days = int(sys.argv[1]) if len(sys.argv) > 1 else 30
fold = lambda s: re.sub(r"\s+", " ", "".join(c for c in unicodedata.normalize("NFD", s.lower()) if not unicodedata.combining(c))).strip()
con = psycopg.connect(os.environ["DATABASE_URL"]); cur = con.cursor()
cur.execute("select column_name from information_schema.columns where table_name = 'search_log'"); cols = {r[0] for r in cur.fetchall()}
ts = "created_at" if "created_at" in cols else "at" if "at" in cols else None
cur.execute(f"select q, locale, n_results, best_kind{', ' + ts if ts else ''} from search_log where (n_results = 0 or best_kind is null or best_kind = 'miss')" + (f" and {ts} > now() - interval '{days} days'" if ts else ""))
seen = collections.Counter(); kind = {}; loc = collections.defaultdict(set)
for row in cur.fetchall():
    k = fold(row[0]); seen[k] += 1; loc[k].add(row[1]); kind[k] = "no results" if row[2] == 0 and row[3] != "miss" else "no best match"
# a query that is only the beginning of a longer logged one is typing in progress, not a need of its own
keys = sorted(seen, key=len, reverse=True); full = []
for k in keys:
    if not any(o != k and o.startswith(k) for o in full): full.append(k)
print(f"{len(full)} distinct missed queries in the last {days} days" if ts else f"{len(full)} distinct missed queries")
for k in sorted(full, key=lambda x: -seen[x])[:80]: print(f"{seen[k]:4d}  {k:48s} {','.join(sorted(loc[k]))}  {kind[k]}")
