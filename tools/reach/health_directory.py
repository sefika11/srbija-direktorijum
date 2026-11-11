"""The Ministry of Health's directory of public health institutions -> contacts for ours, and the ones we do not hold.

  python -m tools.reach.health_directory <page.html> <contacts_out.json> <new_out.json>

Source: https://zdravlje.gov.rs/tekst/333549/zdravstvene-ustanove.php (name, address, phone, official website per institution,
grouped by district). An entry is matched to one of our institutions of the same kind in the same place; health centres
and general hospitals are one per town, the rest also need a shared distinctive word. Unmatched entries of a known kind go
to <new_out.json> in the shape of importers.jobs.load_orgs_json.
"""
import html, json, re, sys, collections
from importers.common import db
from importers.common.normalize import cyr_to_lat
from importers.sources.rfzo_apoteke import fold

PAGE, OUT, NEW = sys.argv[1], sys.argv[2], sys.argv[3]
SRC = "https://zdravlje.gov.rs/tekst/333549/zdravstvene-ustanove.php"
h = open(PAGE, encoding="utf-8", errors="ignore").read()
t = html.unescape(re.sub(r"<[^>]+>", "|", re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", h)))
toks = [re.sub(r"\s+", " ", x).strip() for x in t.split("|")]; toks = [x for x in toks if x]
entries = []
for i, x in enumerate(toks):
    if not x.startswith("Адреса:") or i == 0: continue
    e = {"name": cyr_to_lat(toks[i - 1]), "address": cyr_to_lat(x.split(":", 1)[1].strip()), "phones": [], "website": None}
    for y in toks[i + 1:i + 5]:
        if y.startswith("Адреса:"): break
        if y.startswith("Број телефона:"): e["phones"] = [p.strip() for p in re.split(r"[,;]", y.split(":", 1)[1]) if re.search(r"\d{5,}", re.sub(r"\D", "", p))][:3]
        elif re.match(r"^(https?://)?(www\.)?[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$", y, re.I) and "@" not in y: e["website"] = (y if y.startswith("http") else "https://" + y).rstrip("/")
    m = re.search(r"\b\d{5}\s+(.+)$", e["address"]); e["place"] = (m.group(1) if m else e["address"].split(",")[-1]).strip(" .")
    entries.append(e)
def kind(name):
    f = " " + " ".join(fold(name).split()) + " "
    if " dom zdravlja " in f: return "dz"
    if " opsta bolnica " in f: return "ob"
    if " specijalna bolnica " in f: return "sb"
    if " zavod za javno zdravlje " in f or " institut za javno zdravlje " in f: return "zjz"
    if re.search(r" (apoteka|apotekarska ustanova) ", f): return "apo"
    if re.search(r" (klinicki centar|univerzitetski klinicki|klinika|institut|klinicko bolnicki|kbc) ", f): return "klin"
    if " zdravstveni centar " in f: return "zc"
    return "other"
TYPE = {"dz": "dom-zdravlja", "ob": "opsta-bolnica", "sb": "specijalna-bolnica", "zjz": "zavod-za-javno-zdravlje", "apo": "apoteka", "klin": "klinika-institut", "zc": "opsta-bolnica"}
STOP = set("dom zdravlja opsta bolnica specijalna za i u sa zavod javno zdravlje apoteka apotekarska ustanova klinika institut klinicki centar dr bolesti rehabilitaciju lecenje zdravstveni univerzitetski srbije".split())
def words(n): return {w[:5] for w in fold(n).split() if w not in STOP and len(w) > 2}
print(len(entries), "entries;", collections.Counter(kind(e["name"]) for e in entries).most_common())

with db.conn() as c, c.cursor() as cur:
    cur.execute("""
      select o.slug, o.name_lat, t.slug as ty, u.name_lat as jls, l.settlement_name_lat as sett, l.address_display as addr, o.website,
        exists (select 1 from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')) as has_phone
      from organizations o join org_types t on t.id = o.org_type_id
      join lateral (select * from locations l where l.org_id = o.id and l.status = 'active' order by l.is_primary desc, l.id limit 1) l on true
      left join territorial_units u on u.id = l.territorial_unit_id
      where o.status = 'active' and t.slug in ('dom-zdravlja', 'opsta-bolnica', 'specijalna-bolnica', 'klinika-institut', 'zavod-za-javno-zdravlje', 'apoteka', 'ustanova')""")
    ours = cur.fetchall()
rows, new, stats = [], [], collections.Counter(); taken = set()
for e in entries:
    k = kind(e["name"]); place = fold(e["place"]); w = words(e["name"]) - {place[:5]}
    cands = [o for o in ours if kind(o["name_lat"]) == k and o["slug"] not in taken]
    here = [o for o in cands if place and (fold(o["jls"] or "") == place or fold(o["sett"] or "") == place or place in fold(o["name_lat"]))]
    named = [o for o in cands if fold(e["name"]).replace(" ", "") == fold(o["name_lat"]).replace(" ", "")] or [o for o in cands if w and len(w & words(o["name_lat"])) / len(w | words(o["name_lat"]) or {1}) >= 0.6 and (o in here or len(w) >= 2)]
    pick = None
    if k in ("dz", "ob", "zjz", "zc") and len(here) == 1: pick = here[0]
    elif len(named) == 1: pick = named[0]
    elif len([o for o in named if o in here]) == 1: pick = [o for o in named if o in here][0]
    if not pick:
        stats["unmatched " + k] += 1
        if k in TYPE and not here: new.append({"name": e["name"], "type_slug": TYPE[k], "town": e["place"], "municipality": e["place"], "address": e["address"].split(",")[0], "phones": e["phones"], "website": e["website"], "source_url": SRC})
        continue
    taken.add(pick["slug"]); stats["matched"] += 1
    row = {"org_slug": pick["slug"], "source_url": SRC}
    if e["phones"] and not pick["has_phone"]: row["phones"] = e["phones"]; stats["phone"] += 1
    if e["website"] and not pick["website"]: row["website"] = e["website"]; stats["website"] += 1
    if re.search(r"\d", e["address"]) and not (pick["addr"] and re.search(r"\d", pick["addr"])): row["address"] = e["address"]; stats["address"] += 1
    if len(row) > 2: rows.append(row)
json.dump(rows, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump({"source": {"name": "Ministarstvo zdravlja – zdravstvene ustanove", "url": SRC, "fetched_at": "2026-11-11"}, "rows": new}, open(NEW, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(dict(stats), "| rows with something to add:", len(rows), "| not held, importable:", len(new))
for n in new[:40]: print("  new:", n["type_slug"], "|", n["name"][:60], "|", n["town"])
