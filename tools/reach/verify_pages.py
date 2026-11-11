"""Check agent rows against the page they cite, so a cheap model cannot invent a phone, an address or a site.

  python tools/reach/verify_pages.py <targets_dir> <contacts_dir> <out_dir> [--trust id1,id2]

For every row the cited source_url is fetched once (cached under .cache/reach_pages/) and each field is kept only if the
page really carries it:
  phone    its national digits appear in the page
  address  the street words and the house number appear in the page
  hours    the opening and the closing time of the first range appear in the page
  e-mail   the address appears in the page source
  website  it is the cited page's own site (or linked from it) and the page names the institution
Identity: the page must name the institution by a distinctive word, or by its name words together with its place (many
schools share a name across towns). On a page that lists several institutions (a site cited for three or more of them,
on a page cited more than once or carrying many phone numbers) a value is kept only when it stands right after this
institution's name and no other institution of the same file is named closer to it.
A row whose page cannot be read is dropped, unless its file is listed in --trust (output of the stronger model).
<id>.partial.json files (an interrupted earlier run) are merged in; their rows win over a later row for the same institution.
"""
import concurrent.futures, glob, hashlib, html, json, os, re, sys, unicodedata, urllib.request, urllib.parse, ssl, collections

TARGETS, CONTACTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TRUST = set(sys.argv[sys.argv.index("--trust") + 1].split(",")) if "--trust" in sys.argv else set()
CACHE = ".cache/reach_pages"; os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
TYPE_WORDS = set("""osnovna osnovne srednja srednje skola skole gimnazija ustanova ustanove predskolska javno javna preduzece preduzeca drustvo komunalno
opstina opstine grad grada centar dom doma zdravlja apoteka apotekarska agencija privatna privatni ordinacija stomatoloska doktor hotel srbija srbije
narodna biblioteka kulturni kulture kulturu tehnicka ekonomska medicinska muzicka visoka fakultet univerzitet strukovnih studija obrazovanje odraslih
zaposljavanje privremeno usluga usluge socijalne zastite vrtic decji decija turisticka organizacija sportski sport sporta veterinarska stanica
ambulanta auto beograd beogradu novi sad jkp doo""".split())
COMMON_NAMES = set("""sveti sava jovan jovanovic zmaj petar petrovic njegos vuk karadzic dositej obradovic branko radicevic desanka maksimovic svetozar
markovic nikola tesla mihajlo pupin stevan sremac dusan radovic ivo andric milos crnjanski djura jaksic kralj kralja aleksandar prvi stefan nemanja
bratstvo jedinstvo mladost radost poletarac pcelica bambi neven sunce 1 maj""".split())
GENERIC = TYPE_WORDS | COMMON_NAMES
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
    f = " " + re.sub(r"\s+", " ", fold(text)) + " "
    dpos = [i for i, ch in enumerate(f) if ch.isdigit()]
    return {"html": src.lower(), "text": text, "fold": f, "digits": re.sub(r"\D", "", text), "fdigits": "".join(f[i] for i in dpos), "fdpos": dpos}

def anchors(o):
    """Marks of where a page talks about this institution: its name words (type words left out), else the whole name."""
    words = [w for w in fold(o["name"]).split() if len(w) >= 3 and w not in TYPE_WORDS and not w.isdigit()]
    marks = [" " + w[:6] if len(w) >= 6 else " " + w + " " for w in words]
    return marks or [" " + " ".join(fold(o["name"]).split()) + " "]
def positions(tok, v):
    out, i = [], v["fold"].find(tok)
    while i >= 0 and len(out) < 60: out.append(i); i = v["fold"].find(tok, i + 1)
    return out
def phone_pos(p, v):
    d = re.sub(r"\D", "", p); d = d[3:] if d.startswith("381") else d.lstrip("0")
    i = v["fdigits"].find(d)
    return v["fdpos"][i] if i >= 0 and len(d) >= 7 else None
def address_pos(a, v):
    words = [w[:6] for w in fold(a.split(",")[0]).split() if len(w) > 3 and not w.isdigit()]
    return (positions(words[0], v) or [None])[0] if words else None
def stands_with(pos, o, others, v):
    """True when the value at `pos` follows this institution's name more closely than any other institution's of the same file."""
    if pos is None: return False
    def back(toks):   # distance from the nearest name word before the value (a little after it also counts)
        best = 10 ** 9
        for t in toks:
            for q in positions(t, v):
                if -120 <= pos - q < best: best = max(0, pos - q)
        return best
    mine = back(anchors(o))
    if mine > 450: return False
    mine_set = set(anchors(o))
    for other in others:
        theirs = [t for t in anchors(other) if t not in mine_set]
        if theirs and back(theirs) < mine: return False
    return True
def ok_phone(p, v):
    d = re.sub(r"\D", "", p); d = d[3:] if d.startswith("381") else d.lstrip("0")
    return len(d) >= 7 and d in v["digits"]
def ok_address(a, v):
    head = a.split(",")[0]
    words = [w for w in fold(head).split() if len(w) > 3 and not w.isdigit()]
    num = re.search(r"\b(\d+)\s?[a-zA-Z]?\b", head)
    if not words or not all(w[:6] in v["fold"] for w in words): return False
    return (not num) or re.search(rf"(?<!\d){num.group(1)}(?!\d)", v["fold"]) is not None   # "2a", "37 b" and "44/3" all carry the number
def ok_hours(h, v):
    m = re.search(r"(\d{1,2})[:.](\d{2})\s?[-–]\s?(\d{1,2})[:.](\d{2})", h)
    if not m: return "00-24" in h and re.search(r"\b(0?0\s?[-–]\s?24|24\s?(h|sata|časa|casa))", v["text"].lower()) is not None
    def seen(hh, mm): return re.search(rf"(?<!\d)0?{int(hh)}(\s?[:.,]\s?{mm}|\s?(h|č|c)\b|\s?[-–]|\s+do\b|\s?sati|\s?časova)", v["text"].lower()) is not None or re.search(rf"[-–]\s?0?{int(hh)}(?!\d)", v["text"]) is not None
    return seen(m.group(1), m.group(2)) and seen(m.group(3), m.group(4))
def names_it(o, v):
    """A distinctive name word on the page, or the name words together with the place (same-named schools in other towns)."""
    distinctive = [w for w in fold(o["name"]).split() if len(w) >= 5 and w not in GENERIC]
    if any(" " + w[:6] in v["fold"] for w in distinctive): return True
    named = any(t in v["fold"] for t in anchors(o))
    places = [fold(x).strip()[:7] for x in (o.get("place"), o.get("settlement")) if x and len(fold(x).strip()) >= 3]
    placed = any(x in v["fold"] or (x == "beograd" and "belgrad" in v["fold"]) for x in places)
    if named and placed: return True
    # the site's own address carries the name ("hotelmint.rs", "vrtickiki.com") and the page is in the right town
    host = re.sub(r"[^a-z0-9]", "", domain(v.get("url", "")).split(".")[0])
    words = [w for w in fold(o["name"]).split() if len(w) >= 4 and w not in TYPE_WORDS] + ["".join(w for w in fold(o["name"]).split() if w not in TYPE_WORDS)]
    return placed and any(len(w) >= 3 and w in host for w in words)
def phone_count(v):
    return len({re.sub(r"\D", "", m)[-8:] for m in re.findall(r"(?:\+?381|\b0)[\s/.-]?\d{2}[\s/.-]?\d{3}[\s/.-]?\d{2,4}", v["text"])})

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
views = {u: dict(page_views(b), url=u) for u, b in pages.items() if len(b) > 300}
stats["pages"] = len(urls); stats["pages_read"] = len(views)
cited = collections.Counter(r["source_url"] for _, _, rows in jobs for r, _ in rows.values())
dom_use = collections.Counter(domain(r["source_url"]) for _, _, rows in jobs for r, _ in rows.values())   # institutions a domain is cited for

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
        # a page about several institutions (a directory on a site cited for many of them): values must stand with this one's name
        shared = dom_use[domain(r["source_url"])] >= 3 and (cited[r["source_url"]] > 1 or phone_count(v) > 6)
        others = [ours[s2] for s2 in ours if s2 != slug] if shared else []
        if shared:
            stats["rows_on_list_pages"] += 1
            for p in list(r.get("phones") or []):
                if isinstance(p, str) and ok_phone(p, v) and not stands_with(phone_pos(p, v), ours[slug], others, v):
                    r["phones"] = [x for x in r["phones"] if x != p]; stats["phones_not_with_name"] += 1
            if isinstance(r.get("address"), str) and ok_address(r["address"], v) and not stands_with(address_pos(r["address"], v), ours[slug], others, v):
                r.pop("address"); stats["address_not_with_name"] += 1
            if isinstance(r.get("email"), str):
                i = v["fold"].find(fold(r["email"]).strip())
                if not stands_with(i if i >= 0 else None, ours[slug], others, v): r.pop("email"); stats["email_not_with_name"] += 1
            if isinstance(r.get("hours"), str): r.pop("hours"); stats["hours_on_list_page_dropped"] += 1   # a list page's hours are rarely this institution's
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
