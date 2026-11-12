"""Tidy the two register files of 2026-11-12 before load_orgs_json reads them.

  python tools/reach/prepare_registers.py

advokati_2026-11-12.json (bar directories): street names arrive in capitals and are title-cased; a record listed twice
(same name, town and street) is kept once; lawyers who share a name in one town get the street added to the name, because
the loader's key is name plus town and would fold two people into one page.
posrednici_nekretnine_2026-11-12.json (ministry register of estate agents): only the street and number of the seat are kept
(floor, flat and unit notes are dropped).
Output: the same names with _clean before .json.
"""
import collections, json, re

def title(s):
    bare = re.sub(r"\d+\s?[a-z]\b", "", s or "")   # '49a' does not make a street lower-case
    if not s or bare != bare.upper(): return s
    small = {"i", "u", "na", "br", "bb", "od", "do", "za"}
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if (w in small and i) or re.fullmatch(r"[ivxlc]+\.?", w) and len(w) < 5 and i else re.sub(r"(^|\.)([^\W\d_])", lambda m: m.group(1) + m.group(2).upper(), w))
    return re.sub(r"\b([Ii][Ii]?[Ii]?|[Ii][Vv]|[Vv][Ii]{0,3})\b(?=\s|$)", lambda m: m.group(1).upper(), " ".join(out))

d = json.load(open("db/imports/advokati_2026-11-12.json", encoding="utf-8"))
rows = []; seen = set()
for r in d["rows"]:
    r["address"] = title((r.get("address") or "").strip()) or None
    k = (r["name"].lower(), (r.get("town") or "").lower(), (r.get("address") or "").lower())
    if k in seen: continue
    seen.add(k); rows.append(r)
count = collections.Counter((r["name"].lower(), (r.get("town") or "").lower()) for r in rows)
used = set(); renamed = 0
for r in rows:
    if count[(r["name"].lower(), (r.get("town") or "").lower())] > 1 and r.get("address"):
        street = re.sub(r"\s+\d.*$", "", r["address"]).strip() or r["address"]
        name = f"{r['name']} – {street}"
        if (name.lower(), (r.get("town") or "").lower()) in used: name = f"{r['name']} – {r['address']}"
        r["name"] = name; renamed += 1
    used.add((r["name"].lower(), (r.get("town") or "").lower()))
d["rows"] = rows
json.dump(d, open("db/imports/advokati_2026-11-12_clean.json", "w", encoding="utf-8"), ensure_ascii=False)
print("lawyers:", len(rows), "rows,", renamed, "namesakes told apart by street")

e = json.load(open("db/imports/posrednici_nekretnine_2026-11-12.json", encoding="utf-8"))
for r in e["rows"]:
    head = (r.get("address") or "").split(",")[0].strip()
    head = re.sub(r"\s+(lokal|lok\.|stan|sprat|ulaz|локал|стан|спрат)\b.*$", "", head, flags=re.I).strip()
    r["address"] = head or None
    r["extra"] = {k: v for k, v in (r.get("extra") or {}).items() if k in ("broj_u_registru", "datum_upisa", "oblik")}
json.dump(e, open("db/imports/posrednici_nekretnine_2026-11-12_clean.json", "w", encoding="utf-8"), ensure_ascii=False)
print("estate agents:", len(e["rows"]), "rows")
