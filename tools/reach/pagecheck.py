"""Shared pieces of the page checks: fetch a cited page once, read it as text, and test whether a value stands on it."""
import hashlib, html, io, os, re, ssl, urllib.parse, urllib.request
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold

CACHE = ".cache/reach_pages"; os.makedirs(CACHE, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
GENERIC = {"www", "rs", "org", "gov", "ls", "co", "edu", "lpa", "portal", "e", "opstina", "grad", "so", "sajt", "arhiva", "stari", "novi", "uprava", "in", "com", "net"}

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
    """-> (source, visible text). PDFs are read with pdfplumber."""
    if data[:5] == b"%PDF-":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf: raw = "\n".join((p.extract_text() or "") for p in pdf.pages[:400])
        except Exception: return "", ""
        return raw, raw
    src = data.decode("utf-8", "replace")
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", src, flags=re.S | re.I)
    return src, re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t)))
def flat(text):
    """Latin, lower case, no diacritics, same length as the input where possible (positions stay comparable)."""
    return (cyr_to_lat(text) or "").lower().replace("č", "c").replace("ć", "c").replace("š", "s").replace("ž", "z").replace("đ", "dj")
def digits(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("00381"): d = d[5:]
    elif d.startswith("381"): d = d[3:]
    return d.lstrip("0")
def is_mobile(p): d = digits(p); return d.startswith("6") and len(d) in (8, 9)
def phone_spots(p, text):
    d = digits(p)
    if len(d) < 6: return []
    return [m.start() for m in re.finditer(r"(?<!\d)(?:\+?381|0)?[\s/().-]*" + r"[\s/().-]*".join(d) + r"(?!\d)", text)]
def all_numbers(text): return set(re.findall(r"(?<!\d)0\d{2}[\s/().-]{0,3}\d{3}[\s.-]?\d{2,4}", text))
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
