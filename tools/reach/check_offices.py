"""Check the registry-office and local-tax rows the agents wrote against the page each row cites.

  .venv/bin/python -m tools.reach.check_offices db/targets/offices_2026-11-12 db/contacts/offices_2026-11-12

A row survives only on the unit's own official site, on a page that names the office, and each value is kept only when the
fetched page carries it:
  site     the cited host shares its name with the unit's official site (sabac.rs, lpa.sabac.rs, sabac.ls.gov.rs)
  office   the page says "matič..." for a registry office, "poresk..." / "javnih prihoda" for local tax
  phone    its digits stand on the page; on a page with more than four numbers, within 600 characters of the office's name
  address  a word of the street and the house number stand on the page
  hours    the opening and the closing hour stand on the page
  e-mail   it stands in the page source and does not carry a person's name (ime.prezime@)
Mobile numbers are dropped. A page that cannot be read drops the row. Pages are cached in .cache/reach_pages/.
Output: <contacts_dir>/_checked.json (rows that kept a phone or an address) and a count of what was dropped and why.
"""
import collections, glob, hashlib, html, io, json, os, re, ssl, sys, urllib.parse, urllib.request
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold

TARGETS, CONTACTS = sys.argv[1], sys.argv[2]
CACHE = ".cache/reach_pages"; os.makedirs(CACHE, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
STEM = {"maticna": ("matic",), "lpa": ("poresk", "javnih prihoda", "lpa")}
GENERIC = {"www", "rs", "org", "gov", "ls", "co", "edu", "lpa", "portal", "e", "opstina", "grad", "so", "sajt", "arhiva", "stari", "novi", "uprava", "in"}

def labels(url):
    host = urllib.parse.urlsplit(url if "//" in url else "//" + url).netloc.lower().split(":")[0]
    return {x for x in host.split(".") if x not in GENERIC and len(x) > 2}
def fetch(url):
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())
    if os.path.exists(path): return open(path, "rb").read()
    data = b""
    try:
        parts = urllib.parse.urlsplit(url)
        safe = urllib.parse.urlunsplit((parts.scheme, parts.netloc.encode("idna").decode(), urllib.parse.quote(parts.path, safe="/%"), urllib.parse.quote(parts.query, safe="=&%"), ""))
        req = urllib.request.Request(safe, headers={"User-Agent": UA, "Accept-Language": "sr,en;q=0.8"})
        with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as r: data = r.read(6_000_000)
    except Exception: data = b""
    open(path, "wb").write(data); return data
def page_text(data):
    if data[:5] == b"%PDF-":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf: raw = "\n".join((p.extract_text() or "") for p in pdf.pages[:400])
        except Exception: return "", ""
        return raw, raw
    src = data.decode("utf-8", "replace")
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", src, flags=re.S | re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return src, re.sub(r"\s+", " ", t)
def digits(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("00381"): d = d[5:]
    elif d.startswith("381"): d = d[3:]
    return d.lstrip("0")
def phone_spots(p, text):
    d = digits(p)
    if len(d) < 6: return []
    rx = r"(?<!\d)(?:\+?381|0)?[\s/().-]*" + r"[\s/().-]*".join(d) + r"(?!\d)"
    return [m.start() for m in re.finditer(rx, text)]
def all_numbers(text): return set(re.findall(r"(?<!\d)0\d{2}[\s/().-]{0,3}\d{3}[\s.-]?\d{2,4}", text))
def near_office(pos, office, low):
    return any(0 <= pos - m.start() <= 600 or 0 <= m.start() - pos <= 150 for s in STEM[office] for m in re.finditer(re.escape(s), low))
def has_address(addr, low):
    head = (addr or "").split(",")[0]; f = fold(cyr_to_lat(head) or "")
    words = [w for w in f.split() if len(w) > 3 and not w.isdigit() and w not in ("ulica", "broj", "trg")] or [w for w in f.split() if len(w) > 2 and not w.isdigit()]
    no = re.search(r"\d{1,4}", head)
    return bool(words) and bool(no) and any(w in low for w in words) and re.search(rf"(?<!\d){no.group(0)}(?!\d)", low) is not None
def has_hours(h, text):
    m = re.search(r"(\d{1,2})[:.,h]?\s?(\d{2})?\s*(?:-|–|do)\s*(\d{1,2})[:.,h]?\s?(\d{2})?", h or "")
    if not m: return False
    def seen(hh, mm):
        mm = mm or "00"
        return re.search(rf"(?<!\d)0?{int(hh)}\s?[:.,h]\s?{mm}(?!\d)", text) is not None or (mm == "00" and re.search(rf"(?<!\d)0?{int(hh)}\s?(h|č|časova|sati|-|–|do)", text) is not None)
    return seen(m.group(1), m.group(2)) and seen(m.group(3), m.group(4))

official = {}
for f in glob.glob(os.path.join(TARGETS, "of-*.json")):
    for r in json.load(open(f, encoding="utf-8"))["rows"]:
        official[r["unit_slug"]] = {"labels": set().union(*[labels(s) for s in r["official_sites"]]) if r["official_sites"] else set(), "unit": r["unit"], "unit_id": r["unit_id"], "level": r["level"], "name_label": fold(r["unit"]).replace(" ", "")}
rows = []
for f in sorted(glob.glob(os.path.join(CONTACTS, "of-*.json"))):
    try: rows += [dict(r, _file=os.path.basename(f)) for r in json.load(open(f, encoding="utf-8")) if isinstance(r, dict)]
    except Exception as e: print("unreadable file", f, e)
stats = collections.Counter(); kept = []; seen_key = set()
for r in rows:
    office, slug = r.get("office"), r.get("unit_slug")
    if office not in STEM: continue
    stats["rows"] += 1
    u = official.get(slug)
    if not u: stats["unit not in the targets"] += 1; continue
    if (slug, office) in seen_key: stats["second row for the same office"] += 1; continue
    url = (r.get("source_url") or "").strip(); host = labels(url)
    if not url.startswith("http") or not (host & (u["labels"] | {u["name_label"], u["name_label"].replace("dj", "d")})):
        stats["not the unit's official site"] += 1; continue
    src, text = page_text(fetch(url))
    if len(text) < 200: stats["page could not be read"] += 1; continue
    low = fold(cyr_to_lat(text) or "")
    if not any(s in low for s in STEM[office]): stats["page does not name the office"] += 1; continue
    many = len(all_numbers(text)) > 4
    lowpos = (cyr_to_lat(text) or "").lower().replace("č", "c").replace("ć", "c").replace("š", "s").replace("ž", "z")
    phones = []
    for p in (r.get("phones") or []):
        if not isinstance(p, str): continue
        d = digits(p)
        if d.startswith("6") and len(d) in (8, 9): stats["mobile dropped"] += 1; continue
        spots = phone_spots(p, text)
        if not spots: stats["phone not on the page"] += 1; continue
        if many and not any(near_office(s, office, lowpos) for s in spots): stats["phone not beside the office"] += 1; continue
        phones.append(p)
    addr = r.get("address") if r.get("address") and has_address(r["address"], low) else None
    if r.get("address") and not addr: stats["address not on the page"] += 1
    hours = r.get("hours") if r.get("hours") and has_hours(r["hours"], text) else None
    if r.get("hours") and not hours: stats["hours not on the page"] += 1
    email = r.get("email") if isinstance(r.get("email"), str) and r["email"].lower() in src.lower() else None
    if email and re.match(r"^[a-z]+\.[a-z]+@", email.lower()) and not re.match(r"^(maticna|maticar|poreska|lpa|lokalna|opstina|grad|uprava|info|office|kontakt)", email.lower()): email = None; stats["personal e-mail dropped"] += 1
    if not phones and not addr: stats["nothing left after the check"] += 1; continue
    seen_key.add((slug, office)); stats["kept"] += 1; stats["kept " + office] += 1
    kept.append({"unit_slug": slug, "unit_id": u["unit_id"], "unit": u["unit"], "office": office, "name": r.get("name"), "address": addr, "phones": phones, "email": email, "hours": hours, "source_url": url})
json.dump(kept, open(os.path.join(CONTACTS, "_checked.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in stats.most_common(): print(f"{v:5d}  {k}")
print("with phone", sum(1 for k in kept if k["phones"]), "| with address", sum(1 for k in kept if k["address"]), "| with hours", sum(1 for k in kept if k["hours"]))
