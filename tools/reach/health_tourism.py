"""Ministry of Health health-tourism lists (dental; plastic and reconstructive surgery) -> clinics for the directory.

  python -m tools.reach.health_tourism <new_out.json> <contacts_out.json>

The ministry's lists (https://zdravlje.gov.rs/tekst/333545/lista-ustanova.php and .../333547/lista-ustanova.php) give only a
name and the clinic's own site. Address, phone and hours were read from each clinic's site by two Haiku agents
(db/contacts/registers_2026-11-11/ht-*.json) and then checked against the cited page by tools/reach/verify_pages.py
(db/contacts/registers_2026-11-11/verified/): a value not found on the page is gone before this script runs.
Kept here: clinics with a checked street address. A clinic we already hold (same site, or same street and number in the
same town) is not created again: what it lacks goes to <contacts_out.json> for importers.jobs.apply_contacts.
"""
import json, re, sys, glob
from importers.common import db
from importers.sources.rfzo_apoteke import fold

NEW, CONTACTS = sys.argv[1], sys.argv[2]
D = "db/contacts/registers_2026-11-11/"
T = {r["org_slug"]: r for f in sorted(glob.glob("db/targets/registers_2026-11-11/ht-*.json")) for r in json.load(open(f, encoding="utf-8"))["rows"]}
raw = {r["org_slug"]: r for f in sorted(glob.glob(D + "ht-*.json")) for r in json.load(open(f, encoding="utf-8"))}
ok = [r for f in sorted(glob.glob(D + "verified/find-*.json")) for r in json.load(open(f, encoding="utf-8"))]
def host(u): return re.sub(r"^www\.", "", re.sub(r"^https?://", "", (u or "").lower()).split("/")[0])
def skey(a): return (" ".join(w for w in fold(a.split(",")[0]).split() if not w.isdigit() and w not in ("ulica", "ul", "bul", "bulevar")), (re.search(r"\d+", a.split(",")[0]) or [""])[0])
BG = {"novi beograd", "zemun", "vozdovac", "vracar", "zvezdara", "palilula", "cukarica", "rakovica", "savski venac", "stari grad"}

with db.conn() as c, c.cursor() as cur:
    cur.execute("""select o.slug, o.name_lat, o.website, l.address_display as addr, u.name_lat as jls,
                     exists (select 1 from location_contacts x where x.location_id = l.id and x.kind in ('phone', 'mobile')) as has_phone,
                     (l.hours_text is not null) as has_hours
                   from organizations o join org_types t on t.id = o.org_type_id join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
                   left join territorial_units u on u.id = l.territorial_unit_id
                   where o.status = 'active' and t.slug in ('stomatoloska-ordinacija', 'privatna-ordinacija', 'specijalna-bolnica', 'opsta-bolnica')""")
    ours = cur.fetchall()
new, contacts, left = [], [], []
for r in ok:
    t = T[r["org_slug"]]; addr = r.get("address")
    if not addr: left.append((t["name"], "no checked street address")); continue
    tail = addr.split(",")[-1].strip(); town = raw[r["org_slug"]].get("town") or tail
    muni = tail if fold(tail) in BG else town
    town = "Beograd" if fold(town) in BG or fold(tail) in BG else town
    phones = [p for p in (r.get("phones") or [])][:2]
    if r["org_slug"] == "ht-021": phones = phones[:1]  # the second number stands under a named dentist on the page
    twin = [o for o in ours if (o["website"] and host(o["website"]) == host(t["website"])) or (o["addr"] and skey(o["addr"]) == skey(addr) and skey(addr)[1] and fold(o["jls"] or "") in (fold(town), fold(muni)))]
    if twin:
        o = twin[0]; row = {"org_slug": o["slug"], "source_url": r["source_url"]}
        if phones and not o["has_phone"]: row["phones"] = phones
        if r.get("hours") and not o["has_hours"]: row["hours"] = r["hours"]
        if not o["website"]: row["website"] = t["website"]
        if len(row) > 2: contacts.append(row)
        left.append((t["name"], f"already held as {o['slug']}")); continue
    new.append({"name": t["name"], "type_slug": t["type_slug"], "town": town, "municipality": muni, "address": addr.split(",")[0].strip(), "phones": phones,
                "emails": [r["email"]] if r.get("email") else [], "website": t["website"], "hours": r.get("hours"),
                "extra": {"Lista Ministarstva zdravlja": "zdravstveni turizam – " + ("stomatološke usluge" if t["type_slug"].startswith("stomat") else "plastična i rekonstruktivna hirurgija")},
                "source_url": r["source_url"]})
json.dump({"source": {"name": "Ministarstvo zdravlja – zdravstveni turizam, lista ustanova; kontakt sa sajta ustanove", "url": "https://zdravlje.gov.rs/tekst/333545/lista-ustanova.php", "fetched_at": "2026-11-11"}, "rows": new}, open(NEW, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(contacts, open(CONTACTS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(T), "on the ministry's lists;", len(raw), "read by the agents;", len(ok), "passed the page check;", len(new), "new;", len(contacts), "contact rows for ones we hold")
for n, why in left: print("  LEFT", n[:60], "|", why)
for x in new: print("  NEW", x["name"][:50].ljust(50), "|", x["town"], "|", x["municipality"], "|", x["address"], "|", x["phones"])
