"""Validate guide JSON files: structure, locale parity, banned wording, allowed source hosts, URL liveness."""
import json, sys, re, glob, os, urllib.request, urllib.parse, ssl, concurrent.futures as cf
ALLOWED = re.compile(r"(\.gov\.rs|\.ac\.rs|pravno-informacioni-sistem\.rs|beograd\.rs|novisad\.rs|\.edu\.rs|\.org\.rs|ni\.rs|kragujevac\.rs)$")
BANNED = re.compile(r"\b(najbolji\b|najbolja\b|jednostavno|brzo|lako|garant|sigurno ćete|easily|quickly|guarantee|best)\b|!", re.I)
LOC_KEYS = ["title", "summary", "where_note", "who", "documents", "steps", "tips", "faq", "for_foreigners"]
def check_url(u):
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (compatible; link-check)"})
        with urllib.request.urlopen(req, timeout=20, context=ssl._create_unverified_context()) as r: return r.status
    except Exception as e: return str(e)[:60]
def main(folder, live=True):
    ok = True
    for f in sorted(glob.glob(os.path.join(folder, "*.json"))):
        if f.endswith(".evidence.json"): continue
        g = json.load(open(f, encoding="utf-8")); probs = []
        for k in ["slug", "category", "org_types", "status", "sort_order", "name_lat", "summary", "typical_duration", "legal_basis", "fees", "sources", "checked_at", "guide"]:
            if k not in g: probs.append(f"missing {k}")
        if os.path.basename(f) != g.get("slug", "") + ".json": probs.append("slug != filename")
        for loc, c in g.get("guide", {}).items():
            for k in LOC_KEYS:
                if not c.get(k): probs.append(f"{loc}: empty {k}")
            text = json.dumps(c, ensure_ascii=False)
            for m in BANNED.finditer(text): probs.append(f"{loc}: banned wording '{m.group(0)}' …{text[max(0,m.start()-30):m.end()+20]}…")
            for d in c.get("documents", []):
                if not isinstance(d, dict) or "name" not in d: probs.append(f"{loc}: bad document entry")
            for q in c.get("faq", []):
                if not isinstance(q, dict) or not q.get("q") or not q.get("a"): probs.append(f"{loc}: bad faq entry")
        sr, en = g["guide"].get("sr", {}), g["guide"].get("en", {})
        for k in ["who", "documents", "steps", "tips", "faq"]:
            if len(sr.get(k, [])) != len(en.get(k, [])): probs.append(f"sr/en length differs for {k}: {len(sr.get(k, []))} vs {len(en.get(k, []))}")
        urls = [s["url"] for s in g.get("sources", [])] + [x.get("source_url") for x in g.get("fees", []) if x.get("source_url")] + ([g["euprava_url"]] if g.get("euprava_url") else [])
        for u in urls:
            host = urllib.parse.urlparse(u).hostname or ""
            if not ALLOWED.search(host): probs.append(f"non-official host: {u}")
        if live:
            with cf.ThreadPoolExecutor(8) as ex:
                for u, st in zip(urls, ex.map(check_url, urls)):
                    if st != 200: probs.append(f"URL {st}: {u}")
        for x in g.get("fees", []):
            if x.get("amount_rsd") is not None and not x.get("source_url"): probs.append(f"fee amount without source: {x.get('item')}")
        n = {k: len(sr.get(k, [])) for k in ["who", "documents", "steps", "tips", "faq"]}
        print(("OK  " if not probs else "FAIL"), os.path.basename(f), n, f"sources={len(g.get('sources', []))} fees={len(g.get('fees', []))}")
        for p in probs: print("     -", p); ok = False
    return ok
if __name__ == "__main__":
    sys.exit(0 if main(sys.argv[1], live="--offline" not in sys.argv) else 1)
