"""Check the health-centre branch rows the agents wrote against the page each row cites, and split them into new and held.

  .venv/bin/python -m tools.reach.check_units db/targets/health_units_2026-11-12 .cache/health_units_raw_2026-11-12 db/contacts/health_units_2026-11-12

A row survives only on the centre's own site and on a page that names the branch's village; a branch must be called an
ambulanta, stanica, ogranak or punkt. Each value is kept only when the fetched page carries it: a phone's digits (on a page
with more than four numbers, within 500 characters after the village's name), a word of the street with the house number,
the opening and closing hour. Mobile numbers are dropped. A row may survive with nothing but its name and village.
Output in <out_dir>: _new.json (rows for tools/reach/import_branches.py) and _held.json (rows for
importers.jobs.apply_contacts: only the fields a branch we already hold lacks).
"""
import collections, glob, json, os, re, sys
from importers.common.normalize import cyr_to_lat
from importers.jobs.assign_city_municipality import fold
from tools.reach.pagecheck import labels, fetch, page_text, flat, is_mobile, phone_spots, all_numbers, has_address, has_hours

TARGETS, RAW, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(OUT, exist_ok=True)
BRANCH = ("ambulant", "stanic", "ogranak", "ogranc", "punkt", "zdravstvena")
orgs = {}
for f in glob.glob(os.path.join(TARGETS, "dz-*.json")):
    for r in json.load(open(f, encoding="utf-8"))["rows"]: orgs[r["org_slug"]] = r
rows = []
for f in sorted(glob.glob(os.path.join(RAW, "dz-*.json"))):
    try: rows += [r for r in json.load(open(f, encoding="utf-8")) if isinstance(r, dict)]
    except Exception as e: print("unreadable file", f, e)
stats = collections.Counter(); new = []; held = []; seen = set()
for r in rows:
    stats["rows"] += 1
    o = orgs.get(r.get("org_slug")); name = (r.get("name") or "").strip(); place = (r.get("place") or "").strip()
    if not o or not name or not place: stats["no centre, name or village"] += 1; continue
    if not any(w in fold(name) for w in BRANCH): stats["not a branch by its name"] += 1; continue
    key = (r["org_slug"], fold(place), fold(name))
    if key in seen: stats["listed twice"] += 1; continue
    url = (r.get("source_url") or "").strip()
    if not url.startswith("http") or not (labels(url) & labels(o["website"])): stats["not the centre's own site"] += 1; continue
    src, text = page_text(fetch(url))
    if len(text) < 200: stats["page could not be read"] += 1; continue
    low = fold(cyr_to_lat(text) or ""); pos_text = flat(text); pkey = fold(place)
    if len(pkey) < 3 or pkey not in low: stats["page does not name the village"] += 1; continue
    seen.add(key)
    spots_place = [m.start() for m in re.finditer(re.escape(flat(place)), pos_text)]
    many = len(all_numbers(text)) > 4
    phones = []
    for p in (r.get("phones") or []):
        if not isinstance(p, str): continue
        if is_mobile(p): stats["mobile dropped"] += 1; continue
        sp = phone_spots(p, text)
        if not sp: stats["phone not on the page"] += 1; continue
        if many and not any(0 <= s - q <= 500 for s in sp for q in spots_place): stats["phone not beside the village"] += 1; continue
        phones.append(p)
    addr = r.get("address") if r.get("address") and has_address(r["address"], low) else None
    if r.get("address") and not addr: stats["address not on the page"] += 1
    hours = r.get("hours") if r.get("hours") and has_hours(r["hours"], text) else None
    if r.get("hours") and not hours: stats["hours not on the page"] += 1
    mine = [h for h in o["held_branches"] if pkey in fold((h.get("name") or "") + " " + (h.get("settlement") or ""))]
    if len(mine) == 1:
        h = mine[0]; add = {"location_id": h["location_id"], "source_url": url}
        if addr and not h.get("address"): add["address"] = addr
        if phones and not h.get("phones"): add["phones"] = phones[:3]
        if hours and not h.get("has_hours"): add["hours"] = hours
        if len(add) > 2: held.append(add); stats["held branch gains a field"] += 1
        else: stats["held branch, nothing to add"] += 1
    elif len(mine) > 1: stats["several held branches in that village"] += 1
    else:
        new.append({"org_slug": r["org_slug"], "name": name[:120], "address": (addr + ", " + place) if addr else place, "place": place, "phones": phones[:3], "hours": hours, "source_url": url})
        stats["new branch"] += 1
json.dump(new, open(os.path.join(OUT, "_new.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(held, open(os.path.join(OUT, "_held.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in stats.most_common(): print(f"{v:5d}  {k}")
print("new:", len(new), "| with phone", sum(1 for x in new if x["phones"]), "| with street", sum(1 for x in new if x["address"] != x["place"]), "| with hours", sum(1 for x in new if x["hours"]))
