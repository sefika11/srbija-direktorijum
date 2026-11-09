"""Load organisations from a registry JSON file produced by a research agent (docs/08 §4.3).

  python -m importers.jobs.load_orgs_json db/imports/<file>.json --source <data_sources.code> [--confidence 0.85]

File shape: {"source": {"name","url","fetched_at"}, "rows": [{name, type_slug, town, municipality, address, phones[], emails[],
website, hours, extra{}, source_url}]}. One organisation per row with a primary location in the resolved municipality.
Idempotent: the org slug is derived from type + name + town; contacts are de-duplicated by value. Writes provenance per row.
"""
from __future__ import annotations
import argparse, json, re, unicodedata
from ..common import db
from ..common.match import add_contact, add_hours, upsert_location
from ..common.normalize import clean_ws, parse_hours, phones_in, split_address
from ..sources.rfzo_apoteke import LatinResolver, fold

CYR = str.maketrans({"а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","ш":"š",
                      "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Ш":"Š"})
def lat(s: str | None) -> str | None:
    if not s: return s
    return s.replace("Љ","Lj").replace("љ","lj").replace("Њ","Nj").replace("њ","nj").replace("Џ","Dž").replace("џ","dž").translate(CYR)
def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", fold(lat(s) or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")
    if len(s) > 80: s = s[:80].rsplit("-", 1)[0]
    return s.strip("-")
ABBR = {"pr", "doo", "d.o.o.", "d.o.o", "ad", "a.d.", "jkp", "jp", "ltd", "od", "o.d.", "sz", "szr", "str", "pu", "ou", "ztr", "sztr", "spr", "stbr", "kd"}
def nice_case(name: str) -> str:
    """Registry names arrive in ALL CAPS; title-case them but keep legal-form abbreviations upper."""
    if name != name.upper() or not any(ch.isalpha() for ch in name): return name
    out = []
    for w in name.split():
        core = w.strip("(),.;\"'").lower()
        out.append(w.upper() if core in ABBR or (len(core) <= 2 and core.isalpha()) else w[:1].upper() + w[1:].lower())
    return " ".join(out)

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("file"); ap.add_argument("--source", required=True); ap.add_argument("--confidence", type=float, default=0.85)
    ap.add_argument("--private", action="store_true", help="mark organisations as private (default: by type group)")
    a = ap.parse_args()
    doc = json.load(open(a.file, encoding="utf-8")); rows = doc["rows"]; src_url = doc.get("source", {}).get("url") or a.source
    stats = {"orgs": 0, "new": 0, "locations": 0, "phones": 0, "emails": 0, "sites": 0, "hours": 0, "unresolved": 0, "no_type": 0}
    with db.conn() as c, c.cursor() as cur:
        resolver = LatinResolver(cur)
        cur.execute('select id, slug, "group"::text as grp from org_types'); types = {r["slug"]: r for r in cur.fetchall()}
        db.stage_rows(cur, a.source, src_url, [(f"{r.get('type_slug')}|{r.get('name')}|{r.get('town')}", r) for r in rows])
        for r in rows:
            t = types.get(r.get("type_slug"))
            if not t: stats["no_type"] += 1; continue
            name = nice_case(clean_ws(lat(r.get("name")) or "")); town = clean_ws(lat(r.get("town")) or ""); muni = clean_ws(lat(r.get("municipality")) or "")
            if not name: continue
            jid = None
            for cand in (muni, town):
                if cand: jid = resolver.resolve(cand) if hasattr(resolver, "resolve") else db.jls_id_by_name(cur, cand)
                if jid: break
            if not jid: jid = db.jls_id_by_name(cur, town) or (db.jls_id_by_name(cur, muni) if muni else None)
            if not jid: stats["unresolved"] += 1; continue
            is_private = a.private or t["grp"] == "privatne_usluge"
            slug = slugify(f"{t['slug']}-{name}-{town}")
            cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form, website, status, verification, is_private, last_seen_at)
                           values (%s, %s, 'jls', %s, %s, 'ostalo', %s, 'active', 'unverified', %s, now())
                           on conflict (slug) do update set website = coalesce(organizations.website, excluded.website), last_seen_at = now()
                           returning id, (xmax = 0) as inserted""", (slug, t["id"], jid, name[:200], (r.get("website") or None), is_private))
            row = cur.fetchone(); oid = row["id"]; stats["orgs"] += 1; stats["new"] += 1 if row["inserted"] else 0
            street, number = (None, None)
            if r.get("address"):
                try: street, number, *_ = split_address(lat(r["address"]))
                except Exception: street = lat(r["address"])
            loc = upsert_location(cur, org_id=oid, slug="sediste", unit_name_lat="Sedište", unit_kind="sediste", territorial_unit_id=jid, street=street, street_number=number, is_primary=True)
            stats["locations"] += 1
            if town: cur.execute("update locations set settlement_name_lat = coalesce(settlement_name_lat, %s) where id = %s", (town[:120], loc))
            for ph in r.get("phones") or []:
                for p in phones_in(ph): add_contact(cur, loc, p.kind, p.e164, p.display); stats["phones"] += 1
            for em in r.get("emails") or []:
                em = em.strip().lower()
                if em and "@" in em: add_contact(cur, loc, "email", em, None); stats["emails"] += 1
            if r.get("website"): add_contact(cur, loc, "website", r["website"].strip(), None); stats["sites"] += 1
            if r.get("hours"):
                try:
                    parsed = parse_hours(r["hours"])
                    if parsed: add_hours(cur, loc, parsed, r["hours"]); stats["hours"] += 1
                except Exception: pass
            if r.get("extra"):
                cur.execute("update organizations set description_md = coalesce(description_md, %s) where id = %s",
                            ("\n".join(f"- {k}: {', '.join(map(str, v)) if isinstance(v, list) else v}" for k, v in r["extra"].items() if v and k not in {"founder_director", "registry_id", "map_url", "licence_types"}) or None, oid))
            db.provenance(cur, "organization", oid, None, a.source, r.get("source_url") or src_url, a.confidence, r)
        c.commit()
    print(json.dumps(stats, ensure_ascii=False))

if __name__ == "__main__":
    main()
