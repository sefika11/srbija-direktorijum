"""Build the target files for the "reach" pass: every institution should have hours, a phone, a street address and a website.

  python tools/reach/build_targets.py <out_dir>

Three kinds of file, one per agent:
  net-*   one organisation (or one national system) with many locations: the agent reads the official branch list
  reg-*   a type whose institutions rarely have a site but sit in an official national register
  site-*  institutions whose own site is known and that still miss something
Natural persons (court experts, mediators, lawyers ...) are never targets. Read-only on the database.
"""
import json, os, re, sys, collections
import psycopg

OUT = sys.argv[1]
PERSONS = {"sudski-vestak", "medijator", "sudski-prevodilac", "procenitelj-nepokretnosti", "stecajni-upravnik", "javni-beleznik", "javni-izvrsitelj", "advokat"}
SKIP = PERSONS | {"mesna-zajednica", "menjacnica", "jp-posta-srbije", "telekom-prodavnica", "granicni-prelaz", "ambasada", "konzulat"}
NO_CHAIN = {"osnovna-skola", "srednja-skola", "predskolska-ustanova", "privatni-vrtic", "muzicka-skola"}
SYSTEMS = {  # every organisation of the type belongs to one national system with one official directory
    "mup-policijska-uprava": 10, "uprava-za-vanredne-situacije": 14, "carinarnica": 80, "ministarstvo": 30, "osnovno-javno-tuzilastvo": 60,
    "vise-javno-tuzilastvo": 40, "osnovni-sud": 35, "prekrsajni-sud": 45, "visi-sud": 40, "upravni-okrug": 30, "drzavni-organ": 36,
}
REGISTERS = {"hotel": 220, "geodetska-agencija": 310, "agencija-za-zaposljavanje": 250, "usluga-socijalne-zastite": 240, "dom-za-stare": 200,
             "auto-skola": 110, "veterinarska-stanica": 130}
# schools and kindergartens: one agent looks for the ministry's register with contact data and saves it raw; matching is done here by registry number
EDUCATION = ["osnovna-skola", "srednja-skola", "muzicka-skola", "privatna-skola", "skola-za-odrasle", "privatni-vrtic", "predskolska-ustanova"]

c = psycopg.connect(os.environ["DATABASE_URL"]); k = c.cursor()
k.execute("""
select l.id, o.id, o.slug, o.name_lat, t.slug, t.name_lat, coalesce(t.national_network, false), o.website,
  (select c.value from location_contacts c join locations l2 on l2.id = c.location_id where l2.org_id = o.id and c.kind = 'website' limit 1),
  l.unit_name_lat, l.is_primary, l.address_display, l.settlement_name_lat, u.name_lat, o.mb,
  (select string_agg(coalesce(c.value_display, c.value), '; ') from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')),
  coalesce(l.hours_text, (select 'ima' from opening_hours h where h.location_id = l.id limit 1))
from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
left join territorial_units u on u.id = l.territorial_unit_id where l.status = 'active' order by t.slug, o.slug, l.is_primary desc, l.id""")
orgs = collections.OrderedDict()
for (lid, oid, oslug, oname, ty, tyname, nn, w1, w2, unit, prim, addr, sett, place, mb, phones, hours) in k.fetchall():
    if ty in SKIP: continue
    o = orgs.setdefault(oid, {"org_slug": oslug, "name": oname, "type": ty, "type_name": tyname, "nn": nn, "website": w1 or w2, "mb": mb, "locs": []})
    need = [f for f, v in (("address", addr and re.search(r"\d", addr)), ("phones", phones), ("hours", hours)) if not v]
    o["locs"].append({"location_id": lid, "unit": unit, "place": place or sett, "settlement": sett, "address": addr, "phones": phones, "hours": hours, "need": need, "primary": prim})

def gaps(o): return sum(len(l["need"]) for l in o["locs"]) + (0 if o["website"] else 1)
def loc_row(l): return {k2: l[k2] for k2 in ("location_id", "unit", "place", "address", "phones", "hours", "need")}
def seat_row(o):
    l = o["locs"][0]
    return {"org_slug": o["org_slug"], "name": o["name"], "type": o["type_name"], "place": l["place"], "website": o["website"], "mb": o["mb"],
            "have": {"address": l["address"], "phones": l["phones"], "hours": l["hours"]}, "need": l["need"] + ([] if o["website"] else ["website"])}

files = {}; taken = set()
def emit(fid, body): files[fid] = body
def slugid(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:44]

# 1. national systems, grouped by type
for ty, size in SYSTEMS.items():
    group = [o for o in orgs.values() if o["type"] == ty and gaps(o)]
    for i in range(0, len(group), size):
        part = group[i:i + size]
        if not part: continue
        emit(f"net-{ty}-{i // size + 1}", {"kind": "network", "title": f"{part[0]['type_name']} ({len(part)} organizacija)", "type": ty,
             "orgs": [{"org_slug": o["org_slug"], "name": o["name"], "website": o["website"], "rows": [loc_row(l) for l in o["locs"]]} for o in part]})
    taken |= {o["org_slug"] for o in group}
# 2. chains and networks: one organisation with many locations
small = []
for o in orgs.values():
    if o["org_slug"] in taken or o["type"] in NO_CHAIN: continue
    if len(o["locs"]) >= 8 and gaps(o) >= 4:
        taken.add(o["org_slug"])
        body = {"org_slug": o["org_slug"], "name": o["name"], "website": o["website"], "rows": [loc_row(l) for l in o["locs"]]}
        if len(o["locs"]) >= 30: emit(f"net-{slugid(o['org_slug'])}", {"kind": "network", "title": o["name"], "type": o["type"], "orgs": [body]})
        else: small.append((o["type"], body))
small.sort(key=lambda x: x[0]); bucket = []; n = 0; bi = 1
for ty, body in small + [(None, None)]:
    if body is None or n + len(body["rows"]) > 60:
        if bucket: emit(f"net-small-{bi:02d}", {"kind": "network", "title": "Manje mreže", "type": "mixed", "orgs": bucket}); bi += 1
        bucket = []; n = 0
    if body: bucket.append(body); n += len(body["rows"])
# 3. registers
for ty, size in REGISTERS.items():
    group = [o for o in orgs.values() if o["type"] == ty and o["org_slug"] not in taken and not o["website"] and gaps(o) > 1]
    for i in range(0, len(group), size):
        part = group[i:i + size]
        if len(part) < 5: continue
        emit(f"reg-{ty}-{i // size + 1}", {"kind": "register", "title": part[0]["type_name"], "type": ty, "rows": [seat_row(o) for o in part]})
        taken |= {o["org_slug"] for o in part}
edu = [o for o in orgs.values() if o["type"] in EDUCATION and o["org_slug"] not in taken and not o["website"] and gaps(o) > 1]
emit("reg-education", {"kind": "register-raw", "title": "Škole i vrtići (registar ministarstva)", "types": EDUCATION, "missing_orgs": len(edu),
     "sample": [seat_row(o) for o in edu[::max(1, len(edu) // 25)][:25]], "rows": []})
taken |= {o["org_slug"] for o in edu}
# 4. institutions with a known site and a gap at the seat
rest = [o for o in orgs.values() if o["org_slug"] not in taken and o["website"] and o["locs"][0]["need"]]
rest.sort(key=lambda o: (o["type"], o["locs"][0]["place"] or ""))
for i in range(0, len(rest), 24): emit(f"site-{i // 24 + 1:03d}", {"kind": "sites", "title": "Institucije sa sopstvenim sajtom", "rows": [seat_row(o) for o in rest[i:i + 24]]})
left = [o for o in orgs.values() if o["org_slug"] not in taken and not o["website"] and gaps(o) > 1]

os.makedirs(OUT, exist_ok=True)
index = []
for fid, body in files.items():
    body["id"] = fid
    nrows = sum(len(o["rows"]) for o in body["orgs"]) if body["kind"] == "network" else body.get("missing_orgs", len(body["rows"]))
    json.dump(body, open(os.path.join(OUT, fid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    index.append({"id": fid, "kind": body["kind"], "title": body["title"], "n": nrows})
json.dump(index, open(os.path.join(OUT, "_index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
by = collections.Counter(); rows = collections.Counter()
for x in index: by[x["kind"]] += 1; rows[x["kind"]] += x["n"]
print("files", dict(by), "rows", dict(rows))
for x in index:
    if x["kind"] != "sites": print(f"  {x['id']:58s} {x['n']:5d}  {x['title'][:50]}")
lt = collections.Counter(o["type"] for o in left)
print("not targeted this pass (no site known, no register):", len(left), lt.most_common(14))
