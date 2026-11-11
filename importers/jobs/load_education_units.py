"""Buildings of preschools and branch units of schools, from the Ministry of Education open data.

Our directory holds one row per INSTITUTION (171 state preschool institutions, 1,247 primary schools). People look for
the kindergarten or the branch school in their street or village, and the ministry publishes exactly that:
  https://opendata.mpn.gov.rs/srv/{PO,Oo,So}/PodaciOLOPJSON      one row per building: institution, municipality,
                                                                   place, street, name of the location, seat flag
  https://opendata.mpn.gov.rs/srv/{PO,Oo,So}/kontaktPodaciJSON   one row per institution with its registration number

This job attaches every building that is not the seat as a location of the institution we already have:
  1. institution -> ours by registration number (maticni broj); private ones (no number on our side) by name + municipality,
     and their number is filled in
  2. one location per NAMED location of the institution (a kindergarten building, a branch school). The file repeats
     the seat's street on every row, so a unit never gets a street from it; a branch school gets its village from its name
  3. the seat keeps its row; if our seat row has no street yet, the registry's seat street is filled in
Nothing is created for institutions we do not hold: they are written to db/imports/education_unmatched_<date>.json.
Idempotent (location slug is a hash of place + street + name).

    set -a && . apps/web/.env.local; set +a
    .venv/bin/python -m importers.jobs.load_education_units            # dry run
    .venv/bin/python -m importers.jobs.load_education_units --write
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, re, urllib.request
from ..common import db
from ..common.match import upsert_location
from ..common.normalize import clean_ws, split_address
from ..sources.rfzo_apoteke import fold
from .load_orgs_json import lat as to_lat, nice_case

BASE = "https://opendata.mpn.gov.rs/srv"
LEVELS = {"PO": ["predskolska-ustanova", "privatni-vrtic"], "Oo": ["osnovna-skola", "privatna-skola", "muzicka-skola"], "So": ["srednja-skola", "privatna-skola", "muzicka-skola"]}
CACHE = ".cache/mpn"
GENERIC = re.compile(r"\b(predskolska ustanova|predskolske ustanove|ustanova|pu|osnovna skola|os|srednja skola|ss|skola|gimnazija|privatna|privatni|vrtic|decji vrtic|djeciji vrtic|za decu|sa domom ucenika)\b")

def fetch(level: str, what: str) -> list[dict]:
    os.makedirs(CACHE, exist_ok=True); path = f"{CACHE}/{what}_{level}.json"
    if not os.path.exists(path):
        req = urllib.request.Request(f"{BASE}/{level}/{what}", headers={"User-Agent": "Mozilla/5.0 (directory import)"})
        open(path, "wb").write(urllib.request.urlopen(req, timeout=120).read())
    doc = json.load(open(path, encoding="utf-8-sig"))
    return doc if isinstance(doc, list) else next((v for v in doc.values() if isinstance(v, list)), [])

def key(s: str | None) -> str: return re.sub(r"\s+", " ", fold(to_lat(s or "") or "")).strip()
def name_key(s: str | None) -> str: return re.sub(r"\s+", " ", GENERIC.sub(" ", key(s))).strip()
def pretty(s: str | None) -> str | None:
    s = clean_ws(to_lat(s or "") or "")
    if not s: return None
    up = s.replace("Lj", "LJ").replace("Nj", "NJ").replace("Dž", "DŽ")      # transliteration leaves "NEDELjKOVIĆ": still an all-caps name
    return nice_case(up) if up == up.upper() else s
def mbn(s) -> str: return re.sub(r"\D", "", str(s or "")).lstrip("0")

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--write", action="store_true"); a = ap.parse_args()
    stats = {"registry_institutions": 0, "matched_mb": 0, "matched_name": 0, "unmatched": 0, "units_seen": 0, "units_new": 0, "units_existing": 0, "seat_street_filled": 0, "place_unresolved": 0, "mb_filled": 0}
    unmatched: list[dict] = []
    with db.conn() as c, c.cursor() as cur:
        # municipalities and city municipalities, with the district they belong to (two cities have a Palilula)
        cur.execute("""select u.id, u.level::text as level, u.name_lat, u.path::text as path, (select o.name_lat from territorial_units o where o.level = 'okrug' and u.path <@ o.path limit 1) as okrug,
                              (select p.name_lat from territorial_units p where p.id = u.parent_id) as parent
                       from territorial_units u where u.level in ('jls', 'gradska_opstina') and u.status = 'active'""")
        by_name: dict[str, list[dict]] = {}
        for r in cur.fetchall(): by_name.setdefault(key(r["name_lat"]), []).append(r)
        def place(opstina: str | None, okrug: str | None) -> int | None:
            hint = key((re.search(r"\((.*?)\)", to_lat(opstina or "") or "") or [None, ""])[1])     # "Палилула (Ниш)"
            base = key(re.sub(r"\(.*?\)", "", to_lat(opstina or "") or ""))
            cand = by_name.get(base) or by_name.get(key(re.sub(r"^(grad|opstina|gradska opstina)\s+", "", base)))
            if not cand: return None
            if len(cand) == 1: return cand[0]["id"]
            if hint:
                h = [x for x in cand if x["parent"] and key(x["parent"])[:4] == hint[:4]]
                if h: return h[0]["id"]
            ok = key(okrug); jls = [x for x in cand if x["level"] == "jls"]
            near = [x for x in cand if (x["okrug"] and key(x["okrug"]).split(" ")[0][:6] in ok) or (x["parent"] and key(x["parent"])[:5] in ok)]
            pick = (jls and [x for x in jls if x in near]) or near or jls or cand
            return pick[0]["id"]

        for level, type_slugs in LEVELS.items():
            inst = fetch(level, "kontaktPodaciJSON"); olop = fetch(level, "PodaciOLOPJSON")
            cur.execute("""select o.id, o.name_lat, o.mb, o.is_private, t.slug as type_slug,
                                  (select j.name_lat from locations l join territorial_units tu on tu.id = l.territorial_unit_id join territorial_units j on j.level = 'jls' and tu.path <@ j.path where l.org_id = o.id order by l.is_primary desc limit 1) as jls,
                                  (select tu.name_lat from locations l join territorial_units tu on tu.id = l.territorial_unit_id where l.org_id = o.id order by l.is_primary desc limit 1) as unit
                           from organizations o join org_types t on t.id = o.org_type_id where o.status = 'active' and t.slug = any(%s)""", (type_slugs,))
            ours = cur.fetchall(); by_mb = {mbn(o["mb"]): o for o in ours if mbn(o["mb"])}
            by_nm: dict[tuple[str, str], list[dict]] = {}
            for o in ours:
                for pl in {key(o["jls"]), key(o["unit"])} - {""}: by_nm.setdefault((name_key(o["name_lat"]), pl), []).append(o)
            # registry institution -> ours
            link: dict[tuple[str, str], dict] = {}; seat_rows: dict[int, dict] = {}
            for r in inst:
                stats["registry_institutions"] += 1; k = (key(r.get("nazivUstanove")), key(r.get("opstina")))
                o = by_mb.get(mbn(r.get("maticniBroj")))
                if o: stats["matched_mb"] += 1
                else:
                    cand = by_nm.get((name_key(r.get("nazivUstanove")), key(r.get("opstina")))) or by_nm.get((name_key(r.get("nazivUstanove")), key(re.sub(r"\(.*?\)", "", to_lat(r.get("mesto") or "") or ""))))
                    if cand and len({x["id"] for x in cand}) == 1:
                        o = cand[0]; stats["matched_name"] += 1
                        if not mbn(o["mb"]) and mbn(r.get("maticniBroj")):
                            stats["mb_filled"] += 1
                            # the registration number only, and only when no other row holds it (the file carries placeholder tax numbers)
                            if a.write: cur.execute("update organizations set mb = %s where id = %s and mb is null and not exists (select 1 from organizations x where x.mb = %s)", (str(r.get("maticniBroj")), o["id"], str(r.get("maticniBroj"))))
                if o: link[k] = o
                else:
                    stats["unmatched"] += 1
                    unmatched.append({"level": level, "name": pretty(r.get("nazivUstanove")), "opstina": pretty(r.get("opstina")), "mesto": pretty(r.get("mesto")), "mb": r.get("maticniBroj"), "pib": r.get("PIB"), "private": "Приватна" in (r.get("vrstaOsnivacaPoUstanovi") or "")})
            # units -> one location per named location of the institution. The file repeats the SEAT's street on every
            # row, so a unit gets its name (and, for a branch school, the village in its name) but never a street.
            units: dict[tuple[int, str], dict] = {}
            for r in olop:
                o = link.get((key(r.get("nazivUstanove")), key(r.get("opstina"))))
                if not o: continue
                if r.get("sedisteRadnaJedinica") == "Да":
                    seat_rows.setdefault(o["id"], r); continue
                nm = r.get("nazivLokacije") or r.get("nazivObjekta") or ""
                if not key(nm) or name_key(nm) == name_key(o["name_lat"]): continue          # the seat under another flag
                u = units.setdefault((o["id"], key(nm)), {"org": o, "rows": []}); u["rows"].append(r)
            for org_id, r in seat_rows.items():                                                # seat street where ours is empty
                street, number = split_address(pretty(r.get("ulica")) or "")
                cur.execute("select id, street from locations where org_id = %s and is_primary and status = 'active' limit 1", (org_id,)); seat = cur.fetchone()
                if seat and not seat["street"] and street:
                    stats["seat_street_filled"] += 1
                    if a.write: cur.execute("update locations set street = %s, street_number = %s, settlement_name_lat = coalesce(settlement_name_lat, %s), last_seen_at = now() where id = %s", (street, number, pretty(re.sub(r"\s*\(.*?\)\s*", "", r.get("mesto") or "")), seat["id"]))
            seat_rows.clear()
            existing_names: dict[int, set[str]] = {}
            for (org_id, nk), u in units.items():
                stats["units_seen"] += 1; r = u["rows"][0]
                if org_id not in existing_names:
                    cur.execute("select unit_name_lat from locations where org_id = %s and status = 'active'", (org_id,)); existing_names[org_id] = {key(x["unit_name_lat"]) for x in cur.fetchall()}
                raw = re.sub(r"\s+", " ", r.get("nazivLokacije") or r.get("nazivObjekta") or "").strip(" ,")
                name = (pretty(raw) or "")[:140]
                if key(name) in existing_names[org_id]: stats["units_existing"] += 1; continue
                tu = place(r.get("opstina"), r.get("okrug"))
                if not tu: stats["place_unresolved"] += 1; continue
                # 'Издвојено одељење "Белут"' / 'ИО у Доњој Мутници' name the village the unit is in
                # the village only when it is given as a name (in quotes or after a dash), never from "у Липовцу" (a declined form)
                m = re.search(r"(?:издвојено одељење|издвојено одјељење|ИО|подручно одељење|подручна школа)\s*[-–:]?\s*[\"„“”,']*\s*([^\"„“”,']{3,40})", raw, flags=re.I)
                village = m.group(1).strip(" -–:") if m else ""
                settlement = pretty(village) if village and level != "PO" and not re.search(r"\d|^(у|u)\s", village, flags=re.I) else None
                # a preschool group that sits in a school or a community hall is named after its host: say what it is
                if level == "PO" and re.match(r"^(ош|основна школа|мз|месна заједница|дом културе|средња школа)\b", raw, flags=re.I): name = f"Predškolska grupa – {name}"[:140]
                slug = "u-" + hashlib.sha1(f"{key(raw)}".encode()).hexdigest()[:10]
                stats["units_new"] += 1; existing_names[org_id].add(key(name))
                if a.write:
                    loc = upsert_location(cur, org_id=org_id, slug=slug, unit_name_lat=name, unit_kind="odeljenje", territorial_unit_id=tu, street=None, street_number=None, is_primary=False)
                    cur.execute("update locations set settlement_name_lat = coalesce(settlement_name_lat, %s), verification = 'auto_verified' where id = %s", (settlement, loc))
                    db.provenance(cur, "location", loc, None, "mpntr_registar", f"{BASE}/{level}/PodaciOLOPJSON", 0.9, {"nazivLokacije": r.get("nazivLokacije"), "nazivObjekta": r.get("nazivObjekta"), "opstina": r.get("opstina"), "buildings": len(u["rows"])})
            print(level, {k: v for k, v in stats.items()})
        if not a.write: c.rollback()
    out = f"db/imports/education_unmatched_{datetime.date.today().isoformat()}.json"
    json.dump(unmatched, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("TOTAL", stats, "| unmatched institutions written to", out, "" if a.write else "| dry run: nothing written")

if __name__ == "__main__":
    main()
