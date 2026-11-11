"""Vojvodina's provincial register of schools and kindergartens -> contacts for the institutions we hold.

  python -m tools.reach.vojvodina_schools <pages_dir> <out.json> [--unmatched <file.json>]

<pages_dir> holds the register's entry pages saved as <id>.html (https://skolevojvodine.vojvodina.gov.rs/sve_view.php?ustanova=<id>,
publisher: Pokrajinski sekretarijat za obrazovanje). Each entry gives name, place, street, e-mail, phone and website.
An entry is matched to one of our institutions by the quoted name (or the whole name), the kind of school and the place;
an entry that fits several or none is left out and listed. Output rows are for importers.jobs.apply_contacts.
"""
import glob, html, json, os, re, sys, collections
from importers.common import db
from importers.common.normalize import cyr_to_lat
from importers.sources.rfzo_apoteke import fold

PAGES, OUT = sys.argv[1], sys.argv[2]
UNM = sys.argv[sys.argv.index("--unmatched") + 1] if "--unmatched" in sys.argv else None
def text(x): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x or ""))).strip()
def key(s): return " ".join(fold(s).split())
def quoted(name):
    m = re.search(r"[\"„“”'«»]\s*([^\"„“”'«»]{2,})\s*[\"„“”'«»]", name)
    return key(m.group(1)) if m else None
def family(s):
    f = " " + key(s) + " "
    if re.search(r" (pu|predskolska|vrtic|decji|jpu) ", f): return "pu"
    if re.search(r" (muzicka|baletska|oms|sms) ", f): return "muz"
    if re.search(r" (dom ucenika|internat|dom) ", f): return "dom"
    if re.search(r" (os|osnovna|oo) ", f): return "os"
    return "ss"
entries = []
for p in sorted(glob.glob(os.path.join(PAGES, "*.html")), key=lambda x: int(os.path.basename(x)[:-5])):
    h = open(p, encoding="utf-8", errors="ignore").read()
    m3 = re.search(r"inr_banner_heading\">\s*<h3>(.*?)</h3>", h, re.S); m5 = re.search(r"blog-detl_heading\">\s*<h5>(.*?)</h5>", h, re.S)
    if not m3 or not m5: continue
    head, full = cyr_to_lat(text(m3.group(1))), cyr_to_lat(text(m5.group(1)))
    name, _, place = head.rpartition(", ")
    if not name: name, place = head, ""
    street = full[len(head):].strip(" ,") if full.lower().startswith(head.lower()) else full.split(",")[-1].strip()
    meta = re.search(r"blog_detail_meta\">(.*?)</ul>", h, re.S); meta = meta.group(1) if meta else ""
    email = re.search(r"fa-envelope\"></i>\s*([^<\s]+@[^<\s]+)", meta); phone = re.search(r"fa-phone\"></i>\s*([^<]+)", meta); web = re.search(r"fa-globe\"></i>.*?href=\"([^\"]+)\"", meta, re.S)
    kind = re.search(r"<figcaption>(.*?)</figcaption>", h, re.S)
    site = web.group(1).strip() if web else None
    if site: site = ("https:" + site if site.startswith("//") else site if site.startswith("http") else "https://" + site).rstrip("/")
    entries.append({"id": int(os.path.basename(p)[:-5]), "name": name.strip(), "place": place.strip(), "street": street or None, "email": email.group(1).strip().lower() if email else None,
                    "phone": text(phone.group(1)) if phone else None, "website": site if site and "." in site[8:] else None, "kind": cyr_to_lat(text(kind.group(1))) if kind else ""})
print(len(entries), "register entries;", sum(1 for e in entries if e["phone"]), "with phone,", sum(1 for e in entries if e["website"]), "with website,", sum(1 for e in entries if e["street"]), "with street")

with db.conn() as c, c.cursor() as cur:
    cur.execute("""
      select o.slug, o.name_lat, t.slug as ty, l.settlement_name_lat as sett, u.name_lat as jls, l.address_display as addr, o.website,
        exists (select 1 from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')) as has_phone
      from organizations o join org_types t on t.id = o.org_type_id
      join lateral (select * from locations l where l.org_id = o.id and l.status = 'active' order by l.is_primary desc, l.id limit 1) l on true
      left join territorial_units u on u.id = l.territorial_unit_id
      where o.status = 'active' and t.slug in ('osnovna-skola', 'srednja-skola', 'muzicka-skola', 'predskolska-ustanova', 'privatni-vrtic', 'privatna-skola', 'skola-za-odrasle', 'dom-ucenika')
        and u.path <@ (select path from territorial_units where slug = 'vojvodina' limit 1)""")
    ours = cur.fetchall()
    if not ours:   # no province node: fall back to every institution of these types
        cur.execute("""select o.slug, o.name_lat, t.slug as ty, l.settlement_name_lat as sett, u.name_lat as jls, l.address_display as addr, o.website,
            exists (select 1 from location_contacts c where c.location_id = l.id and c.kind in ('phone', 'mobile')) as has_phone
          from organizations o join org_types t on t.id = o.org_type_id
          join lateral (select * from locations l where l.org_id = o.id and l.status = 'active' order by l.is_primary desc, l.id limit 1) l on true
          left join territorial_units u on u.id = l.territorial_unit_id
          where o.status = 'active' and t.slug in ('osnovna-skola', 'srednja-skola', 'muzicka-skola', 'predskolska-ustanova', 'privatni-vrtic', 'privatna-skola', 'skola-za-odrasle', 'dom-ucenika')""")
        ours = cur.fetchall()
print(len(ours), "of our institutions considered")
FAM = {"osnovna-skola": {"os"}, "srednja-skola": {"ss"}, "muzicka-skola": {"muz", "os", "ss"}, "predskolska-ustanova": {"pu"}, "privatni-vrtic": {"pu"}, "privatna-skola": {"os", "ss"}, "skola-za-odrasle": {"os", "ss"}, "dom-ucenika": {"dom", "ss"}}
by_q = collections.defaultdict(list); by_n = collections.defaultdict(list)
for o in ours:
    q = quoted(o["name_lat"])
    if q: by_q[q].append(o)
    by_n[key(re.sub(r"[\"„“”'«»]", " ", o["name_lat"]))].append(o)
def in_place(o, place):
    p = key(place)
    return bool(p) and (p == key(o["sett"] or "") or p == key(o["jls"] or "") or (" " + p + " ") in (" " + key(o["name_lat"]) + " ") or p.replace(" ", "-") in o["slug"])
rows, unmatched, stats = [], [], collections.Counter()
taken = set()
def fam_of(e):   # the name says what it is ("OŠ ..."); the register's kind line is only a fallback (it may list two kinds)
    return family(e["name"]) if re.search(r"^(oš|os|pu|jpu|sš|gimnazij|osnovna|srednja|predškolska|muzička|tehnička|ekonomsk|poljoprivredn|medicinska|dom )", e["name"].lower()) else family(e["name"] + " " + e["kind"])
def street_of(a): return {w for w in key((a or "").split(",")[0]).split() if len(w) > 3 and not w.isdigit()}
reg_count = collections.Counter((quoted(e["name"]) or key(e["name"]), fam_of(e)) for e in entries)
for e in entries:
    fam = fam_of(e); q = quoted(e["name"])
    cands = [o for o in (by_q.get(q, []) if q else by_n.get(key(e["name"]), [])) if fam in FAM[o["ty"]] or family(o["name_lat"]) == fam]
    here = [o for o in cands if in_place(o, e["place"])]
    pick = here[0] if len(here) == 1 else None
    if not pick and len({o["slug"] for o in here}) > 1:
        same = [o for o in here if family(o["name_lat"]) == fam]
        pick = same[0] if len(same) == 1 else None
    if not pick and not here:
        # we often hold no settlement for a village school: a name that exists once on both sides, or the same street, settles it
        if len(cands) == 1 and reg_count[(q or key(e["name"]), fam)] == 1: pick = cands[0]; stats["matched by unique name"] += 1
        else:
            st = [o for o in cands if street_of(e["street"]) and street_of(e["street"]) == street_of(o["addr"])]
            if len(st) == 1: pick = st[0]; stats["matched by street"] += 1
    if not pick or pick["slug"] in taken:
        stats["unmatched" if not here else "ambiguous"] += 1; unmatched.append(e); continue
    taken.add(pick["slug"]); stats["matched"] += 1
    row = {"org_slug": pick["slug"], "source_url": f"https://skolevojvodine.vojvodina.gov.rs/sve_view.php?ustanova={e['id']}"}
    if e["street"] and re.search(r"\d|\bbb\b", e["street"]) and not (pick["addr"] and re.search(r"\d", pick["addr"])): row["address"] = f"{e['street']}, {e['place']}"; stats["address"] += 1
    if e["phone"]: row["phones"] = [e["phone"]]; stats["phone" if not pick["has_phone"] else "phone (we had one)"] += 1
    if e["email"]: row["email"] = e["email"]
    if e["website"] and not pick["website"]: row["website"] = e["website"]; stats["website"] += 1
    if len(row) > 2: rows.append(row)
json.dump(rows, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
if UNM: json.dump(unmatched, open(UNM, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(dict(stats))
for e in unmatched[:12]: print("  not matched:", e["name"], "|", e["place"], "|", e["kind"][:40])
