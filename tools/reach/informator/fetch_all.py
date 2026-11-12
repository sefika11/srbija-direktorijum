"""Read every published information booklet (Informator o radu) from informator.poverenik.rs: the body's own data only.

  .venv/bin/python tools/reach/informator/fetch_all.py [limit]

Input: .cache/informator/bodies_list.json (crawl_list.py). Output: .cache/informator/bodies.jsonl, one line per body with
id, name, category, address, postal_code, city, mb, pib, email, website, hours, published_at. Names, phones and e-mails
of the people a booklet lists (officers, heads of units) are NOT kept.
One call a second (ddp.py throttles), anonymous, the same calls the public page makes. Resumable: a body already in the
output is skipped; the socket is reopened when the server drops it. Errors go to .cache/informator/errors.jsonl.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ddp
from fetch_one import structure

BASE = ".cache/informator"; OUT = os.path.join(BASE, "bodies.jsonl"); ERR = os.path.join(BASE, "errors.jsonl")
KEEP = ("id", "name", "address", "postal_code", "city", "mb", "pib", "email", "website", "hours", "published_at")
bodies = json.load(open(os.path.join(BASE, "bodies_list.json"), encoding="utf-8"))
done = set()
if os.path.exists(OUT):
    for line in open(OUT, encoding="utf-8"):
        try: done.add(json.loads(line)["id"])
        except Exception: pass
todo = [b for b in bodies if b["org_id"] not in done]
if len(sys.argv) > 1: todo = todo[:int(sys.argv[1])]
print(len(bodies), "bodies,", len(done), "done,", len(todo), "to read", flush=True)
client = None; t0 = time.time(); n = 0
with open(OUT, "a", encoding="utf-8") as out, open(ERR, "a", encoding="utf-8") as err:
    for b in todo:
        for attempt in range(4):
            try:
                if client is None: client = ddp.DDP()
                org = client.call("org.one", b["org_id"])
                if not org: raise ValueError("no such body")
                d = structure(org, client.call("chaptersPubAll", {"org_id": b["org_id"], "publishedAt": org["publishedAt"]}))
                row = {k: d.get(k) for k in KEEP}; row["category"] = b.get("categories_label"); row["published_at"] = str(row.get("published_at"))
                out.write(json.dumps(row, ensure_ascii=False) + "\n"); out.flush(); n += 1
                break
            except ValueError as e:
                err.write(json.dumps({"id": b["org_id"], "error": str(e)}) + "\n"); err.flush(); break
            except Exception as e:   # dropped socket, timeout, server error: reopen and try this body again
                try: client.s.close()
                except Exception: pass
                client = None; time.sleep(5 + 10 * attempt)
                if attempt == 3: err.write(json.dumps({"id": b["org_id"], "error": repr(e)[:200]}) + "\n"); err.flush()
        if n and n % 200 == 0: print(n, "read,", round((time.time() - t0) / 60), "min", flush=True)
print("finished:", n, "read in", round((time.time() - t0) / 60), "min", flush=True)
