"""Targets for the search-led pass: institutions with no known website, grouped by municipality, 40 per agent.

  python tools/reach/build_search_targets.py <out_dir>

Left out on purpose: natural persons; types read from a national list in the reach pass (police, courts, prosecutors, customs,
ministries); local bodies (they take the municipality's site); exchange offices and geodetic firms (the register is the only
official source); small pharmacies that already have a phone and an address. Read-only on the database.
"""
import json, os, re, sys, collections
import psycopg

OUT = sys.argv[1]
SKIP = {"sudski-vestak", "medijator", "sudski-prevodilac", "procenitelj-nepokretnosti", "stecajni-upravnik", "javni-beleznik", "javni-izvrsitelj", "advokat",
        "mesna-zajednica", "menjacnica", "jp-posta-srbije", "telekom-prodavnica", "granicni-prelaz", "ambasada", "konzulat", "geodetska-agencija",
        "carinarnica", "ministarstvo", "osnovno-javno-tuzilastvo", "vise-javno-tuzilastvo", "osnovni-sud", "prekrsajni-sud", "visi-sud", "upravni-okrug",
        "mup-policijska-uprava", "uprava-za-vanredne-situacije", "rfzo", "uprava-za-trezor", "banka", "osiguravajuce-drustvo",
        "organ-jls", "opstinska-uprava", "gradska-uprava", "uprava-gradske-opstine", "sekretarijat"}
c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""
select o.slug, o.name_lat, o.official_name_lat, t.slug, t.name_lat, o.mb, l.address_display, l.settlement_name_lat, u.name_lat,
  (select string_agg(coalesce(c.value_display, c.value), '; ') from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')),
  coalesce(l.hours_text, (select 'ima' from opening_hours h where h.location_id = l.id limit 1))
from organizations o join org_types t on t.id = o.org_type_id
join lateral (select * from locations l where l.org_id = o.id and l.status = 'active' order by l.is_primary desc, l.id limit 1) l on true
left join territorial_units u on u.id = l.territorial_unit_id
where o.status = 'active' and o.website is null
  and not exists (select 1 from location_contacts c join locations l2 on l2.id = c.location_id where l2.org_id = o.id and c.kind = 'website')""")
rows = []
for (slug, name, official, ty, tyname, mb, addr, sett, place, phones, hours) in k.fetchall():
    if ty in SKIP: continue
    has_addr = bool(addr and re.search(r"\d", addr))
    if ty == "apoteka" and has_addr and phones: continue
    need = [f for f, v in (("address", has_addr), ("phones", phones), ("hours", hours)) if not v] + ["website"]
    rows.append({"org_slug": slug, "name": name, "official_name": official if official and official.lower() != (name or "").lower() else None, "type": tyname, "type_slug": ty,
                 "place": place or sett, "settlement": sett if sett and sett != place else None, "mb": mb, "website": None,
                 "have": {"address": addr, "phones": phones, "hours": hours}, "need": need})
rows.sort(key=lambda r: (r["place"] or "~", r["type_slug"], r["name"]))
os.makedirs(OUT, exist_ok=True); index = []
for i in range(0, len(rows), 40):
    part = rows[i:i + 40]; fid = f"find-{i // 40 + 1:03d}"
    places = collections.Counter(r["place"] for r in part).most_common(3)
    json.dump({"id": fid, "kind": "sites", "title": ", ".join(p for p, _ in places if p), "rows": part}, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    index.append({"id": fid, "n": len(part)})
json.dump(index, open(os.path.join(OUT, "_index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(rows), "institutions in", len(index), "files")
print(collections.Counter(r["type_slug"] for r in rows).most_common(30))
print("missing phone or address:", sum(1 for r in rows if "phones" in r["need"] or "address" in r["need"]))
