#!/usr/bin/env python3
"""Fetch one body's information booklet from informator.poverenik.rs and print structured JSON.

Usage:  python3 fetch_one.py <org_id>          e.g. gWH7wSzSea6tvjxLu
Needs only the stdlib (ddp.py next to this file: raw SockJS WebSocket DDP client).
Calls (anonymous, no login):  org.one(org_id)  and  chaptersPubAll({org_id, publishedAt})
"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ddp

def leaves(node, out):
    """Collect (label, value) of every text-like component in document order."""
    if isinstance(node, dict):
        lab = node.get("label_cir")
        val = node.get("value")
        if lab is not None and isinstance(val, (str, int, float)):
            out.append((lab.strip(), str(val).strip()))
        elif lab is not None and isinstance(val, dict) and "ops" in val:
            txt = "".join(o.get("insert", "") for o in val["ops"] if isinstance(o.get("insert"), str)).strip()
            out.append((lab.strip(), txt))
        for v in node.values():
            leaves(v, out)
    elif isinstance(node, list):
        for v in node:
            leaves(v, out)

def first(pairs, *needles, exclude=()):
    for lab, val in pairs:
        l = lab.lower()
        if any(n in l for n in needles) and not any(e in l for e in exclude) and val:
            return val
    return None

def structure(org, chapters):
    ch = {c["title_cir"]: c for c in chapters}
    basic = next((c for t, c in ch.items() if t.startswith("Основни подаци")), None)
    pairs = []
    if basic:
        for sec in basic.get("sections", []):
            if sec.get("heading", "").startswith("Основни подаци"):      # first card only = the body itself
                leaves(sec, pairs)
    # phones / e-mails of the people named in the whole basic-data chapter (information officer, FOI officer, ...)
    allp = []
    if basic: leaves(basic, allp)
    contacts, cur = [], None
    for lab, val in allp:
        l = lab.lower()
        if l.startswith("име и презиме") or "лица овлашћеног" in l:
            cur = {"person": val, "phone": None, "email": None, "role": lab[:60]}; contacts.append(cur)
        elif cur is not None and "телефон" in l and cur["phone"] is None: cur["phone"] = val
        elif cur is not None and "електронске поште" in l and cur["email"] is None and "одређене за пријем" not in l: cur["email"] = val
    d = {
        "id": org["_id"], "name": org.get("naziv"), "category": org.get("kategorija"),
        "class1": org.get("prvaKlasifikacija"), "class2": org.get("drugaKlasifikacija"),
        "address": first(pairs, "адреса (улица"), "postal_code": first(pairs, "поштански"),
        "city": first(pairs, "седиште") or org.get("sediste"),
        "mb": first(pairs, "матични"), "pib": first(pairs, "пиб"),
        "phones": [v for l, v in pairs if "телефон" in l.lower() and v],   # NOTE: no switchboard field exists in 'Основни подаци'
        "contacts": contacts,
        "email": first(pairs, "електронске поште"), "website": first(pairs, "интернет страница"),
        "hours": first(pairs, "радном времену"),
        "published_at": org.get("publishedAt"), "first_published_at": org.get("firstTimePublishedAt"),
        "basic_data_raw": pairs,
    }
    # organisational-unit heads / managers (name, phone, e-mail, function) - in the chapter on unit heads
    units, cur = [], None
    hc = next((c for t, c in ch.items() if t.startswith("Имена, подаци за контакт")), None)
    hp = []
    if hc: leaves(hc, hp)
    for lab, val in hp:
        l = lab.lower()
        if l.startswith("име и презиме"):
            cur = {"person": val, "phone": None, "email": None, "function": None}; units.append(cur)
        elif cur is not None:
            if "телефон" in l: cur["phone"] = val
            elif "електронске поште" in l: cur["email"] = val
            elif "назив функције" in l: cur["function"] = val
    d["unit_heads"] = units
    return d

def fetch(org_id, client=None):
    c = client or ddp.DDP()
    org = c.call("org.one", org_id)
    if not org: raise SystemExit("unknown org id")
    chapters = c.call("chaptersPubAll", {"org_id": org_id, "publishedAt": org["publishedAt"]})
    return structure(org, chapters)

if __name__ == "__main__":
    print(json.dumps(fetch(sys.argv[1]), ensure_ascii=False, indent=2))
