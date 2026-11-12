"""Apply the bodies read from the Informator portal to the organisations we hold, matched by registry number (MB).

  .venv/bin/python -m tools.reach.informator.apply_bodies [file.jsonl|file.json]            # dry run
  .venv/bin/python -m tools.reach.informator.apply_bodies [file] --write

Each body published its own booklet, so the values are the body's own. Only gaps are filled, on the organisation's seat:
  website   when we hold none and the value is a plain ASCII domain
  e-mail    when the seat has none; an address in a person's name (ime.prezime@) is left out
  hours     when the seat has none. A short text with one time range ("07.30-15.30") becomes Monday to Friday with the note
            "Informator o radu" (the page says where the hours come from); a longer text up to 220 characters is shown as
            text; "24 hours", shift descriptions and anything longer are left out
  street    when the seat has none and the booklet gives a street with a number
Nothing we already hold is overwritten. Commits every 200 organisations. Ids go to db/fixes/informator_applied_<stamp>.json.
"""
import collections, json, os, re, sys, time
from importers.common import db
from importers.common.match import add_contact
from importers.common.normalize import clean_ws, cyr_to_lat, split_address

args = [a for a in sys.argv[1:] if not a.startswith("--")]; WRITE = "--write" in sys.argv
PATH = args[0] if args else ".cache/informator/bodies.jsonl"
rows = json.load(open(PATH, encoding="utf-8")) if PATH.endswith(".json") else [json.loads(l) for l in open(PATH, encoding="utf-8") if l.strip()]
NONE = re.compile(r"^(nema|nema podataka\.?|/|-|–|x|n/a)$", re.I)
def val(s):
    s = clean_ws(cyr_to_lat(s or "") or "") or ""
    return "" if NONE.match(s) else s
def site(s):
    s = (s or "").strip()
    if not s or not s.isascii() or " " in s or "." not in s or "@" in s: return None
    s = s if re.match(r"^https?://", s, re.I) else "http://" + s
    return s if re.match(r"^https?://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$", s, re.I) else None
def mail(s):
    s = (s or "").strip().lower()
    if not re.match(r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$", s): return None
    if re.match(r"^[a-z]+\.[a-z]+@", s) and not re.match(r"^(info|office|kontakt|opstina|grad|uprava|skola|os|dz|mz|jkp|jp|pu)\b", s): return None
    return s
def hours(s):
    """-> ("rows", opens, closes) | ("text", latin text) | None"""
    t = val(s)
    if not t or re.search(r"24|smen|neprekid", t, re.I): return None
    m = re.findall(r"(?<!\d)(\d{1,2})(?:\s?[:.,]\s?(\d{2}))?\s*(?:h|č|časova|sati)?\s*(?:-|–|—|do)\s*(\d{1,2})(?:\s?[:.,]\s?(\d{2}))?", t)
    if len(t) <= 45 and len(m) == 1:
        h1, m1, h2, m2 = m[0]; h1, h2 = int(h1), int(h2); m1, m2 = int(m1 or 0), int(m2 or 0)
        if 5 <= h1 <= 12 and 12 <= h2 <= 22 and m1 < 60 and m2 < 60 and not re.search(r"subot|nedelj|vikend", t, re.I): return ("rows", f"{h1:02d}:{m1:02d}", f"{h2:02d}:{m2:02d}")
    return ("text", t) if 8 <= len(t) <= 220 and re.search(r"\d", t) else None
def street(s, city):
    t = val(s)
    if not t or re.match(r"^nema ", t, re.I) or t.lower() == (val(city) or "").lower(): return None
    t = t.split(",")[0].strip()
    if t == t.upper(): t = " ".join(w[:1] + w[1:].lower() for w in t.split())
    return t if re.search(r"\d|\bbb\b", t) and re.search(r"[A-Za-zČĆŠŽĐčćšžđ]{3}", t) else None

stats = collections.Counter(); log = []
with db.conn() as c, c.cursor() as cur:
    cur.execute("select mb, id, website from organizations where status = 'active' and mb is not null"); by_mb = collections.defaultdict(list)
    for r in cur.fetchall(): by_mb[re.sub(r"\D", "", r["mb"]).zfill(8)].append(r)
    n = 0
    for b in rows:
        mb = re.sub(r"\D", "", b.get("mb") or "")
        if len(mb) < 7: stats["booklet without a registry number"] += 1; continue
        hit = by_mb.get(mb.zfill(8), [])
        if len(hit) != 1: stats["not held" if not hit else "registry number held twice"] += 1; continue
        o = hit[0]; stats["matched"] += 1
        cur.execute("""select l.id, coalesce(l.street, '') <> '' as has_street, coalesce(l.hours_text, '') <> '' or exists (select 1 from opening_hours h where h.location_id = l.id) as has_hours,
                         exists (select 1 from location_contacts k where k.location_id = l.id and k.kind = 'email') as has_mail
                       from locations l where l.org_id = %s and l.status = 'active' order by l.is_primary desc, l.id limit 1""", (o["id"],)); l = cur.fetchone()
        if not l: stats["matched, no seat"] += 1; continue
        w = site(b.get("website")) if not (o["website"] or "").strip() else None
        e = mail(b.get("email")) if not l["has_mail"] else None
        h = hours(b.get("hours")) if not l["has_hours"] else None
        s = street(b.get("address"), b.get("city")) if not l["has_street"] else None
        if not (w or e or h or s): stats["matched, nothing to add"] += 1; continue
        for k, v in (("website", w), ("e-mail", e), ("hours as rows", h and h[0] == "rows"), ("hours as text", h and h[0] == "text"), ("street", s)):
            if v: stats["adds " + k] += 1
        log.append({"org": o["id"], "location": l["id"], "website": w, "email": e, "hours": h, "street": s})
        if not WRITE: continue
        if w: cur.execute("update organizations set website = %s, updated_at = now() where id = %s and coalesce(website, '') = ''", (w, o["id"]))
        if e: add_contact(cur, l["id"], "email", e, None)
        if h and h[0] == "rows":
            for day in range(1, 6): cur.execute("insert into opening_hours (location_id, hours_type, day_of_week, opens, closes, note) values (%s, 'radno_vreme', %s, %s, %s, 'Informator o radu')", (l["id"], day, h[1], h[2]))
        elif h: cur.execute("update locations set hours_text = %s where id = %s and coalesce(hours_text, '') = ''", (h[1], l["id"]))
        if s:
            st, no = split_address(s)
            cur.execute("update locations set street = %s, street_number = %s, updated_at = now() where id = %s and coalesce(street, '') = ''", (st, no, l["id"]))
        db.provenance(cur, "location", l["id"], None, "informator_poverenik", f"https://informator.poverenik.rs/informator?org={b['id']}", 0.9, {k: b.get(k) for k in ("name", "address", "city", "mb", "email", "website", "hours")})
        n += 1
        if n % 200 == 0: c.commit()
    for k, v in stats.most_common(): print(f"{v:6d}  {k}")
    if WRITE:
        p = f"db/fixes/informator_applied_{time.strftime('%Y-%m-%d_%H%M%S')}.json"; json.dump(log, open(p, "w", encoding="utf-8"), ensure_ascii=False); c.commit(); print("written;", p)
    else:
        for x in log[:6]: print("  ", x)
        c.rollback()
