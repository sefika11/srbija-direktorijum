"""Load exact visa instructions (db/imports/vizna_uputstva_*.json) into countries.from_rs_instructions and site_settings.visa_to_serbia.
  python -m importers.jobs.load_visa_instructions db/imports/vizna_uputstva_2026-11-10.json
"""
from __future__ import annotations
import argparse, json
from ..common import db

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("file"); a = ap.parse_args()
    doc = json.load(open(a.file, encoding="utf-8")); n = m = 0
    with db.conn() as c, c.cursor() as cur:
        gen = doc.get("to_serbia_general")
        if gen: cur.execute("insert into site_settings (key, value) values ('visa_to_serbia', %s::jsonb) on conflict (key) do update set value = excluded.value, updated_at = now()", (json.dumps(gen, ensure_ascii=False),))
        for r in doc.get("rows", []):
            iso = (r.get("iso2") or "").upper()
            if len(iso) != 2: continue
            cur.execute("update countries set from_rs_instructions = %s::jsonb, instructions_note = %s, updated_at = now() where iso2 = %s",
                        (json.dumps(r["instructions"], ensure_ascii=False) if r.get("instructions") else None, r.get("reason"), iso))
            n += 1; m += 1 if r.get("instructions") else 0
        c.commit()
    print(json.dumps({"countries": n, "with_instructions": m, "general": bool(gen)}))

if __name__ == "__main__":
    main()
