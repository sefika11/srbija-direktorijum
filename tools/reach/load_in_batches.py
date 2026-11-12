"""Run importers.jobs.load_orgs_json over a large register file in small transactions.

  .venv/bin/python -m tools.reach.load_in_batches <file.json> --source <code> [--confidence 0.85] [--size 300] [--workers 4]

load_orgs_json commits once, at the end. A register of thousands of rows then holds one transaction open for an hour, and
any schema change queued behind it blocks every reader of the table (this happened on 2026-11-12 and held the site's
dynamic pages for about five minutes). Here the file is cut into parts of --size rows, each part is its own run and its
own commit, and --workers parts run side by side. Parts live in .cache/load_batches/ and a finished part is not run twice.
"""
import concurrent.futures, json, os, subprocess, sys

args = sys.argv[1:]; path = args[0]
def opt(name, default): return args[args.index(name) + 1] if name in args else default
source, conf, size, workers = opt("--source", None), opt("--confidence", "0.85"), int(opt("--size", "300")), int(opt("--workers", "4"))
d = json.load(open(path, encoding="utf-8")); rows = d["rows"]
base = os.path.join(".cache", "load_batches", os.path.basename(path).replace(".json", "")); os.makedirs(base, exist_ok=True)
parts = []
for i in range(0, len(rows), size):
    p = os.path.join(base, f"part-{i // size:03d}.json")
    if not os.path.exists(p): json.dump({"source": d.get("source"), "rows": rows[i:i + size]}, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    parts.append(p)
def run(p):
    if os.path.exists(p + ".done"): return p, "done earlier"
    r = subprocess.run([sys.executable, "-m", "importers.jobs.load_orgs_json", p, "--source", source, "--confidence", conf], capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or [""])[-1]
    if r.returncode == 0: open(p + ".done", "w").write(last)
    return p, last if r.returncode == 0 else "FAILED " + r.stderr.strip()[-300:]
total = {}
with concurrent.futures.ThreadPoolExecutor(workers) as ex:
    for p, out in ex.map(run, parts):
        print(os.path.basename(p), out[:200], flush=True)
        try:
            for k, v in json.loads(out).items(): total[k] = total.get(k, 0) + v
        except Exception: pass
print("TOTAL", json.dumps(total, ensure_ascii=False))
