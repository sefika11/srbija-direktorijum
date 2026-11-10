"""Load the per-country visa regime file collected from the MFA (db/imports/vizni_rezim_*.json) into `countries`.

  python -m importers.jobs.load_countries db/imports/vizni_rezim_2026-11-10.json
Idempotent (upsert by iso2). Slug is the Serbian-Latin name slugified.
"""
from __future__ import annotations
import argparse, json, re, unicodedata
from ..common import db
from ..sources.rfzo_apoteke import fold

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", fold(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("file"); a = ap.parse_args()
    doc = json.load(open(a.file, encoding="utf-8")); rows = doc["rows"]; fetched = (doc.get("source") or {}).get("fetched_at", "")[:10] or None
    n = 0
    with db.conn() as c, c.cursor() as cur:
        for r in rows:
            iso = (r.get("iso2") or "").upper().strip()
            if len(iso) != 2 or not r.get("name_sr"): continue
            t = r.get("to_serbia") or {}; f = r.get("from_serbia") or {}; m = r.get("serbian_mission") or {}
            cur.execute("""insert into countries (iso2, name_sr, name_en, slug, to_rs_regime, to_rs_stay, to_rs_conditions, to_rs_url, from_rs_regime, from_rs_stay, from_rs_passport, from_rs_requirements, from_rs_url, rs_mission_name, rs_mission_city, source_fetched_at)
                           values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s)
                           on conflict (iso2) do update set name_sr=excluded.name_sr, name_en=excluded.name_en, slug=excluded.slug, to_rs_regime=excluded.to_rs_regime, to_rs_stay=excluded.to_rs_stay, to_rs_conditions=excluded.to_rs_conditions, to_rs_url=excluded.to_rs_url,
                             from_rs_regime=excluded.from_rs_regime, from_rs_stay=excluded.from_rs_stay, from_rs_passport=excluded.from_rs_passport, from_rs_requirements=excluded.from_rs_requirements, from_rs_url=excluded.from_rs_url,
                             rs_mission_name=excluded.rs_mission_name, rs_mission_city=excluded.rs_mission_city, source_fetched_at=excluded.source_fetched_at, updated_at=now()""",
                        (iso, r["name_sr"], r.get("name_en") or r["name_sr"], slugify(r["name_sr"]), t.get("regime"), t.get("stay"), t.get("conditions"), t.get("source_url"),
                         f.get("regime"), f.get("stay"), f.get("passport_validity"), json.dumps(f.get("requirements") or [], ensure_ascii=False), f.get("source_url"), m.get("name"), m.get("city"), fetched))
            n += 1
        c.commit()
    print(json.dumps({"countries": n}))

if __name__ == "__main__":
    main()
