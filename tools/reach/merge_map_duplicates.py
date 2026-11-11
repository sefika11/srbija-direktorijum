"""Merge map-sourced branch rows into the official branch they duplicate.

  python tools/reach/merge_map_duplicates.py            # dry run: prints what would merge
  python tools/reach/merge_map_duplicates.py --write    # sets status = 'merged' + moved_to_location_id, writes an undo file

Banks and insurers were loaded twice: from OpenStreetMap (often no street, no phone) and from each company's own branch list.
A map row is a duplicate when the same organisation has an official row within 30 m, within 150 m unless the map row names\na different street, or on the same street and number in the same municipality.
Only organisations with at least 10 official rows are touched. What the map row knows and the official one lacks (hours) is carried over.
Undo: for each entry of db/fixes/merged_map_rows_<stamp>.json (the first day is one file, merged_map_rows_2026-11-11.json) set status back to 'active' and moved_to_location_id to null.
"""
import json, math, os, re, sys, time, unicodedata, collections
import psycopg

WRITE = "--write" in sys.argv
def fold(s):
    s = unicodedata.normalize("NFD", (s or "").lower().replace("đ", "dj"))
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(ch for ch in s if not unicodedata.combining(ch)))
STOP = {"ulica", "ul", "bb", "br", "bulevar", "bul", "trg", "i", "lokal", "tc"}
def street(a): return frozenset(w for w in fold((a or "").split(",")[0]).split() if len(w) > 2 and not w.isdigit() and w not in STOP)
def number(a): m = re.search(r"\b(\d+)", (a or "").split(",")[0]); return m.group(1) if m else None
def dist(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    return 6371000 * 2 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))

c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""
select l.id, o.id, o.slug, l.unit_name_lat, l.address_display, l.territorial_unit_id, l.lat::float8, l.lng::float8, l.hours_text,
  exists (select 1 from opening_hours h where h.location_id = l.id),
  exists (select 1 from provenance pr where pr.entity_type = 'location' and pr.entity_id = l.id and pr.source_url like '%%openstreetmap%%'),
  exists (select 1 from provenance pr where pr.entity_type = 'location' and pr.entity_id = l.id and pr.source_url not like '%%openstreetmap%%')
from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
where l.status = 'active' and t.slug in ('banka', 'osiguravajuce-drustvo')""")
by_org = collections.defaultdict(lambda: {"map": [], "off": []})
for (lid, oid, oslug, unit, addr, tu, lat, lng, htxt, hrows, osm, other) in k.fetchall():
    row = {"id": lid, "org": oslug, "unit": unit, "addr": addr, "tu": tu, "geo": (lat, lng) if lat is not None and lng is not None else None, "hours": bool(htxt or hrows), "htxt": htxt}
    # a map row stays a map row after it was enriched from an official page: it still duplicates the official branch it matched
    if osm: by_org[oid]["map"].append(row)
    elif other: by_org[oid]["off"].append(row)

merges = []; per = collections.Counter(); kept = collections.Counter()
for oid, g in by_org.items():
    if len(g["off"]) < 10: continue
    for m in g["map"]:
        best = None
        for o in g["off"]:
            d = dist(m["geo"], o["geo"]) if m["geo"] and o["geo"] else None
            same_street = bool(street(m["addr"]) and street(m["addr"]) == street(o["addr"]) and m["tu"] == o["tu"] and (not number(m["addr"]) or number(m["addr"]) == number(o["addr"])))
            # a map row that carries its own street is only merged on that street: two branches can sit 100 m apart
            other_street = bool(street(m["addr"]) and street(o["addr"]) and not (street(m["addr"]) & street(o["addr"])))
            if (d is not None and (d <= 30 or (d <= 150 and not other_street))) or same_street:   # within 30 m it is the same door, whatever the corner is called
                score = d if d is not None else 75
                if best is None or score < best[0]: best = (score, o, "street" if same_street and (d is None or d > 150) else "distance")
        if best: merges.append({"location_id": m["id"], "into": best[1]["id"], "org": m["org"], "by": best[2], "m": round(best[0]), "from": f"{m['unit']} | {m['addr']}", "to": f"{best[1]['unit']} | {best[1]['addr']}", "carry_hours": bool(m["hours"] and not best[1]["hours"])}); per[m["org"]] += 1
        else: kept[m["org"]] += 1
print("map rows merged:", len(merges), "| map rows left (no official twin):", sum(kept.values()))
for org, n in per.most_common(): print(f"  {org:52s} merge {n:4d}  keep {kept[org]:4d}")
for x in merges[:: max(1, len(merges) // 12)][:12]: print("   e.g.", x["by"], x["m"], "m:", x["from"], "=>", x["to"])
if WRITE:
    for x in merges:
        if x["carry_hours"]:
            k.execute("update opening_hours set location_id = %s where location_id = %s", (x["into"], x["location_id"]))
            k.execute("update locations t set hours_text = coalesce(t.hours_text, s.hours_text) from locations s where t.id = %s and s.id = %s", (x["into"], x["location_id"]))
        k.execute("update locations set status = 'merged', moved_to_location_id = %s, updated_at = now() where id = %s and status = 'active'", (x["into"], x["location_id"]))
    path = f"db/fixes/merged_map_rows_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump(merges, open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0); print("written", path)   # "x": an undo file is never overwritten
    c.commit()   # only after the undo file is on disk
