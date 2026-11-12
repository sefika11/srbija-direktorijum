"""Check the kindergarten-building rows the agents wrote against the page each row cites, and split them into held and new.

  .venv/bin/python -m tools.reach.check_kindergartens db/targets/kindergartens_2026-11-12 .cache/kindergartens_raw_2026-11-12 db/contacts/kindergartens_2026-11-12

A row survives only on the institution's own site and on a page that carries the building's own name ("Leptirić", not
"vrtić"). Each value is kept only when the fetched page carries it BESIDE that name (from 200 characters before the name to
700 after it), or anywhere on a page that is about that one building (its name is in the address of the page):
  phone    its digits (a local number gets the seat's area code and must then be a valid number); mobiles are dropped; a number the institution's seat uses, or one the agents gave to more than
           three buildings of one institution, is the switchboard and is dropped
  address  a word of the street and the house number. Left out: a street without a number or cut short, a Hungarian form
           ("Széles utca 68."), a street that is only the building's own name, and the seat's own address
  hours    the opening and the closing hour, anywhere on the page
The building we hold is the one whose location_id the agent named when the names share a word, else the single held building
with the same name words. Output in <out_dir>: _held.json (for importers.jobs.apply_contacts: only the fields a held
building lacks) and _new.json (for tools/reach/import_branches.py: buildings we do not hold, kept only with a checked street).
Read-only on the database.
"""
import collections, glob, json, os, re, sys
import psycopg
from importers.common.normalize import cyr_to_lat, phones_in, split_address
from importers.jobs.assign_city_municipality import fold
from tools.reach.pagecheck import labels, fetch, page_text, flat, digits, is_mobile, phone_spots, has_address, has_hours

TARGETS, RAW, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(OUT, exist_ok=True)
GEN = set("""vrtic vrtica vrtici decji deciji objekat objekti jaslice jasle jaslena pu oj rj radna organizaciona jedinica predskolska predskolske ustanova ustanove
odeljenje izdvojeno grupa vaspitna vaspitne centralni novi stari sprat prvi drugi depandans depandas uprava kuhinja celodnevni boravak ppp ppg pripremni program
dv do za na sa od ul ulica broj""".split())
def words(name, drop=()):
    w = [x for x in re.split(r"[^a-z0-9]+", fold(cyr_to_lat(name or "") or "")) if len(x) >= 3 and x not in GEN and not x.isdigit()]
    return [x for x in w if x not in drop] or w
orgs = {}
for f in glob.glob(os.path.join(TARGETS, "pu-*.json")):
    for r in json.load(open(f, encoding="utf-8"))["rows"]: orgs[r["org_slug"]] = r
rows = []
for f in sorted(glob.glob(os.path.join(RAW, "pu-*.json"))):
    try: rows += [r for r in json.load(open(f, encoding="utf-8")) if isinstance(r, dict)]
    except Exception as e: print("unreadable file", f, e)
c = psycopg.connect(os.environ["DATABASE_URL"])
seat = collections.defaultdict(set)
for slug, v in c.execute("""select o.slug, k.value from organizations o join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
    join location_contacts k on k.location_id = l.id and k.kind in ('phone', 'mobile') where o.slug = any(%s)""", (list(orgs),)): seat[slug].add(digits(v))
seat_street = {}
for slug, st, no in c.execute("""select o.slug, l.street, l.street_number from organizations o join locations l on l.org_id = o.id and l.is_primary and l.status = 'active' where o.slug = any(%s)""", (list(orgs),)):
    seat_street[slug] = (fold(st or ""), (no or "").lower())
def area(slug):
    """The area code of the institution's seat ("024"), for a number the page prints without one."""
    for d in seat[slug]:
        if len(d) >= 8 and not d.startswith("6"): return "0" + d[:2]
    return None
BIG = {"beograd", "novi sad", "nis", "kragujevac"}
shared = collections.Counter((r.get("org_slug"), digits(p)) for r in rows for p in (r.get("phones") or []) if isinstance(p, str))

stats = collections.Counter(); held = []; new = []; seen = set()
for r in rows:
    stats["rows"] += 1
    o = orgs.get(r.get("org_slug")); name = (r.get("name") or "").strip()
    if not o or not name: stats["no institution or name"] += 1; continue
    inst = set(words(o["name"])); w = words(name, inst)
    if not w: stats["name has no word of its own"] += 1; continue
    url = (r.get("source_url") or "").strip()
    if not url.startswith("http") or not (labels(url) & labels(o["website"])): stats["not the institution's own site"] += 1; continue
    src, text = page_text(fetch(url))
    if len(text) < 200: stats["page could not be read"] += 1; continue
    low = fold(cyr_to_lat(text) or ""); pos = flat(text); key = max(w, key=len)
    spots = [m.start() for m in re.finditer(re.escape(key), pos)]
    if not spots: stats["page does not carry the building's name"] += 1; continue
    own_page = key in fold(re.sub(r"[-_/]+", " ", url))
    def beside(p): return own_page or any(-200 <= p - s <= 700 for s in spots)
    phones = []
    for p in (r.get("phones") or []):
        if not isinstance(p, str): continue
        d = digits(p)
        if is_mobile(p): stats["mobile dropped"] += 1; continue
        if d in seat[r["org_slug"]] or shared[(r["org_slug"], d)] > 3: stats["switchboard number dropped"] += 1; continue
        sp = phone_spots(p, text)
        if not sp: stats["phone not on the page"] += 1; continue
        if not any(beside(x) for x in sp): stats["phone not beside the building's name"] += 1; continue
        if not re.match(r"\s*[(+0]", p) and 5 <= len(d) <= 7 and area(r["org_slug"]): p = area(r["org_slug"]) + " " + p.strip()     # a local number: the seat's area code
        if not phones_in(p): stats["not a valid number"] += 1; continue
        phones.append(p)
    addr = None
    if r.get("address") and has_address(r["address"], low):
        head = fold(cyr_to_lat(r["address"].split(",")[0]) or ""); sw = [x for x in head.split() if len(x) > 3 and not x.isdigit() and x not in ("ulica", "broj")] or [x for x in head.split() if len(x) > 2 and not x.isdigit()]
        cand = (cyr_to_lat(r["address"].split(",")[0]) or "").strip(); st, no = split_address(cand)
        if not any(beside(m.start()) for x in sw for m in re.finditer(re.escape(x), pos)): stats["address not beside the building's name"] += 1
        elif not no or not re.match(r"[A-ZČĆŠŽĐ0-9]", cand): stats["address without a house number or cut short"] += 1
        elif re.search(r"\bu\.|\butca\b|\but\b", cand, re.I): stats["address in Hungarian form: left out"] += 1
        elif set(sw) <= set(words(name)): stats["street is the building's own name: left out"] += 1          # the check above proves nothing then
        elif (fold(st or ""), (no or "").lower()) == seat_street.get(r["org_slug"]): stats["address is the seat's: left out"] += 1
        else: addr = cand
    elif r.get("address"): stats["address not on the page"] += 1
    hours = r.get("hours") if r.get("hours") and has_hours(r["hours"], text) else None
    if r.get("hours") and not hours: stats["hours not on the page"] += 1
    if not phones and not addr: stats["nothing left after the check"] += 1; continue
    by_id = {h["location_id"]: h for h in o["held_buildings"]}; h = by_id.get(r.get("location_id"))
    if h and not (set(words(h["name"], inst)) & set(w)): h = None; stats["agent's match refused (names share no word)"] += 1
    if not h:
        same = [x for x in o["held_buildings"] if set(words(x["name"], inst)) == set(w)]
        h = same[0] if len(same) == 1 else None
    place = (cyr_to_lat(r.get("place") or "") or "").strip(); muni = o.get("municipality") or ""
    village = place if place and "," not in place and fold(place) != fold(muni) and fold(place) not in BIG else ""     # a held building keeps its municipality
    if h:
        if h["location_id"] in seen: stats["second row for one building"] += 1; continue
        seen.add(h["location_id"]); add = {"location_id": h["location_id"], "source_url": url}
        if addr and not h.get("address"): add["address"] = addr + (", " + village if village else "")
        if phones and not h.get("phones"): add["phones"] = phones[:2]
        if hours and not h.get("has_hours"): add["hours"] = hours
        if len(add) > 2: held.append(add); stats["held building gains a field"] += 1
        else: stats["held building, nothing to add"] += 1
    elif addr:
        k2 = (r["org_slug"], fold(addr))
        if k2 in seen: stats["second row for one building"] += 1; continue
        seen.add(k2)
        if re.search(r"óvoda|ovoda", name, re.I): stats["name in Hungarian form: left out"] += 1; continue
        new.append({"org_slug": r["org_slug"], "name": name[:120], "address": addr + (", " + (village or muni)), "place": village or muni, "phones": phones[:2], "hours": hours,
                    "source_url": url, "in_own_municipality": True, "kind": "odeljenje"})
        stats["new building"] += 1
    else: stats["not held, no street: left out"] += 1
json.dump(held, open(os.path.join(OUT, "_held.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(new, open(os.path.join(OUT, "_new.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in stats.most_common(): print(f"{v:5d}  {k}")
print("held rows:", len(held), "| street", sum(1 for x in held if x.get("address")), "| phone", sum(1 for x in held if x.get("phones")), "| hours", sum(1 for x in held if x.get("hours")), "|| new:", len(new))
