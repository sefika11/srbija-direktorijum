"""Search quality check: runs every query of a case file against /api/suggest and reports how many have an expected
answer within the first N rows (the order the spotlight shows them).

    python3 tools/search/run.py https://srbija-direktorijum.vercel.app tools/search/cases_dev.py [show]

A case is (locale, query, [acceptable href fragments], N). cases_dev.py is the set the engine was tuned on;
cases_unseen_*.py were written afterwards and only measured. When you fix a miss, add the query to a case file and,
if a word was unknown, add it to apps/web/lib/search-lexicon-extra.json.
"""
import sys, json, time, urllib.request, urllib.parse, importlib.util, concurrent.futures as cf
base, path, show = sys.argv[1].rstrip("/"), sys.argv[2], len(sys.argv) > 3
spec = importlib.util.spec_from_file_location("cases", path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

def one(c):
    loc, q, exp, n = c; t = time.time()
    try: items = json.load(urllib.request.urlopen(urllib.request.Request(f"{base}/api/suggest?q={urllib.parse.quote(q)}&l={loc}", headers={"User-Agent": "search-check"}), timeout=60))
    except Exception as e: return (c, False, [], f"ERR {e}", 0)
    hrefs = [urllib.parse.unquote(x["href"]) for x in items]
    return (c, any(any(e in h for e in exp) for h in hrefs[:n]), hrefs, None, time.time() - t)

with cf.ThreadPoolExecutor(4) as ex: res = list(ex.map(one, m.C))
bad = [r for r in res if not r[1]]; by = {}
for r in res: by.setdefault(r[0][0], [0, 0]); by[r[0][0]][1] += 1; by[r[0][0]][0] += r[1]
print("pass", len(res) - len(bad), "/", len(res), {k: f"{v[0]}/{v[1]}" for k, v in by.items()}, "median s", round(sorted(r[4] for r in res)[len(res) // 2], 2))
if show:
    for c, ok, hrefs, err, dt in bad: print(f"- [{c[0]}] {c[1]!r} want {c[2]} top{c[3]} got {[h[-48:] for h in hrefs[:4]]} {err or ''}")
