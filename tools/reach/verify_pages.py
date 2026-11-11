"""Check agent rows against the page they cite, so a cheap model cannot invent a phone, an address or a site.

  python tools/reach/verify_pages.py <targets_dir> <contacts_dir> <out_dir> [--trust id1,id2]

For every row the cited source_url is fetched once (cached under .cache/reach_pages/) and each field is kept only if the
page really carries it:
  phone    its national digits appear in the page
  address  the street words and the house number appear in the page
  hours    the opening and the closing time of the first range appear in the page
  e-mail   the address appears in the page source
  website  it is the cited page's own site (or linked from it) and the page names the institution
A row whose page cannot be read is dropped, unless its file is listed in --trust (output of the stronger model).
<id>.partial.json files (an interrupted earlier run) are merged in; their rows win over a later row for the same institution.
"""
import concurrent.futures, glob, hashlib, html, json, os, re, sys, unicodedata, urllib.request, urllib.parse, ssl, collections

TARGETS, CONTACTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TRUST = set(sys.argv[sys.argv.index("--trust") + 1].split(",")) if "--trust" in sys.argv else set()
CACHE = ".cache/reach_pages"; os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
GENERIC = set("""osnovna srednja skola skole gimnazija ustanova predskolska javno preduzece preduzeca drustvo komunalno opstina opstine grad grada centar
dom zdravlja apoteka apotekarska agencija privatna ordinacija stomatoloska doktor hotel srbija srbije beograd novi narodna biblioteka kulturni kulture
tehnicka ekonomska medicinska muzicka visoka fakultet univerzitet strukovnih studija obrazovanje odraslih zaposljavanje privremeno usluga socijalne zastite
sveti jovan jovanovic petar petrovic vuk karadzic dositej obradovic branko radicevic desanka maksimovic svetozar markovic nikola tesla""".split())
CYR = dict(zip("абвгдђежзијклљмнњопрстћуфхцчџш", ["a", "b", "v", "g", "d", "dj", "e", "z", "z", "i", "j", "k", "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "t", "c", "u", "f", "h", "c", "c", "dz", "s"]))

def fold(s):
    s = "".join(CYR.get(ch, ch) for ch in (s or "").lower().replace("đ", "dj"))
    s = unicodedata.normalize("NFD", s)
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(ch for ch in s if not unicodedata.combining(ch)))
def domain(u):
    h = urllib.parse.urlparse(u if "//" in u else "//" + u).netloc.lower().split(":")[0]
    h = re.sub(r"^www\d?\.", "", h); p = h.split(".")
    return ".".join(p[-3:]) if len(p) >= 3 and p[-2] in ("edu", "org", "co", "gov", "ac", "in") else ".".join(p[-2:])

def fetch(url):
    key = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".html")
    if os.path.exists(key): return open(key, encoding="utf-8", errors="ignore").read()
    body = ""
    for verify in (True, False):
        try:
            ctx = ssl.create_default_context()
            if not verify: ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(urllib.parse.quote(url, safe=":/?&=%#+,;@~!$'()*"), headers={"User-Agent": UA, "Accept-Language": "sr,en;q=0.8"})
            with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
                raw = r.read(3_000_000); enc = r.headers.get_content_charset() or "utf-8"
                body = raw.decode(enc, errors="ignore"); break
        except Exception:
            continue
    open(key, "w", encoding="utf-8").write(body)
    return body

def page_views(src):
    text = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", src)))
    return {"html": src.lower(), "text": text, "fold": " " + re.sub(r"\s+", " ", fold(text)) + " ", "digits": re.sub(r"\D", "", text)}

def ok_phone(p, v):
    d = re.sub(r"\D", "", p); d = d[3:] if d.startswith("381") else d.lstrip("0")
    return len(d) >= 7 and d in v["digits"]
def ok_address(a, v):
    head = a.split(",")[0]
    words = [w for w in fold(head).split() if len(w) > 3 and not w.isdigit()]
    num = re.search(r"\b(\d+)\s?[a-zA-Z]?\b", head)
    if not words or not all(w[:6] in v["fold"] for w in words): return False
    return (not num) or re.search(rf"\b{num.group(1)}\b", v["text"]) is not None
def ok_hours(h, v):
    m = re.search(r"(\d{1,2})[:.](\d{2})\s?[-–]\s?(\d{1,2})[:.](\d{2})", h)
    if not m: return "00-24" in h and re.search(r"\b(0?0\s?[-–]\s?24|24\s?(h|sata|časa|casa))", v["text"].lower()) is not None
    def seen(hh, mm): return re.search(rf"(?<!\d)0?{int(hh)}(\s?[:.,]\s?{mm}|\s?(h|č|c)\b|\s?[-–]|\s+do\b|\s?sati|\s?časova)", v["text"].lower()) is not None or re.search(rf"[-–]\s?0?{int(hh)}(?!\d)", v["text"]) is not None
    return seen(m.group(1), m.group(2)) and seen(m.group(3), m.group(4))
def names_it(o, v):
    toks = [w for w in fold(o["name"]).split() if len(w) >= 5 and w not in GENERIC]
    return (not toks) or any(w[:6] in v["fold"] for w in toks)

stats = collections.Counter(); jobs = []
for tf in sorted(glob.glob(os.path.join(TARGETS, "find-*.json"))):
    fid = os.path.basename(tf)[:-5]; ours = {r["org_slug"]: r for r in json.load(open(tf, encoding="utf-8"))["rows"]}
    rows = {}
    for path, strong in ((os.path.join(CONTACTS, fid + ".partial.json"), True), (os.path.join(CONTACTS, fid + ".json"), fid in TRUST)):
        if not os.path.exists(path): continue
        try: data = json.load(open(path, encoding="utf-8"))
        except Exception: stats["unreadable_files"] += 1; continue
        for r in data if isinstance(data, list) else []:
            if isinstance(r, dict) and r.get("org_slug") in ours and r["org_slug"] not in rows and isinstance(r.get("source_url"), str): rows[r["org_slug"]] = (r, strong)
    jobs.append((fid, ours, rows))
urls = sorted({r["source_url"] for _, _, rows in jobs for r, _ in rows.values() if r["source_url"].startswith("http")})
with concurrent.futures.ThreadPoolExecutor(12) as ex: pages = dict(zip(urls, ex.map(fetch, urls)))
views = {u: page_views(b) for u, b in pages.items() if len(b) > 300}
stats["pages"] = len(urls); stats["pages_read"] = len(views)

for fid, ours, rows in jobs:
    out = []
    for slug, (r, strong) in rows.items():
        stats["rows"] += 1
        v = views.get(r["source_url"])
        if not v:
            if strong: out.append(r); stats["kept_unread_trusted"] += 1
            else: stats["dropped_page_unreadable"] += 1
            continue
        if not names_it(ours[slug], v): stats["dropped_page_does_not_name_it"] += 1; continue
        row = {"org_slug": slug, "source_url": r["source_url"]}
        ph = [p for p in (r.get("phones") or []) if isinstance(p, str) and ok_phone(p, v)]
        stats["phones_ok"] += len(ph); stats["phones_dropped"] += len(r.get("phones") or []) - len(ph)
        if ph: row["phones"] = ph
        for f, check in (("address", ok_address), ("hours", ok_hours)):
            if isinstance(r.get(f), str):
                good = check(r[f], v); stats[f + ("_ok" if good else "_dropped")] += 1
                if good: row[f] = r[f]
        if isinstance(r.get("email"), str):
            good = r["email"].lower() in v["html"] or r["email"].lower() in v["text"].lower(); stats["email_" + ("ok" if good else "dropped")] += 1
            if good: row["email"] = r["email"]
        if isinstance(r.get("website"), str) and r["website"].startswith("http"):
            good = domain(r["website"]) == domain(r["source_url"]) or domain(r["website"]) in v["html"]; stats["website_" + ("ok" if good else "dropped")] += 1
            if good: row["website"] = r["website"]
        if len(row) > 2: out.append(row); stats["rows_kept"] += 1
        else: stats["rows_emptied"] += 1
    json.dump(out, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(json.dumps(dict(stats), indent=1))
