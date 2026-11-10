"""Export the visa texts that need translating into batch files for the translation agents.
  python -m importers.jobs.visa_i18n_export [--per 25]
Writes db/i18n/visa_src_<n>.json: {"countries": {ISO2: {field: value}}, "general": {...} (first batch only)}.
Only human-readable fields are included; URLs, slugs, regimes and dates stay out."""
from __future__ import annotations
import argparse, json, pathlib
from ..common import db

FIELDS = ["to_rs_stay", "to_rs_conditions", "from_rs_stay", "from_rs_passport", "from_rs_requirements", "from_rs_instructions", "instructions_note"]

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--per", type=int, default=25); a = ap.parse_args()
    out = pathlib.Path("db/i18n"); out.mkdir(exist_ok=True)
    with db.conn() as c, c.cursor() as cur:
        cur.execute(f"select iso2, name_sr, name_en, {', '.join(FIELDS)} from countries order by iso2")
        rows = cur.fetchall()
        cur.execute("select value from site_settings where key = 'visa_to_serbia'"); g = cur.fetchone()
    general = g["value"] if g else None
    batches = [rows[i:i + a.per] for i in range(0, len(rows), a.per)]
    for n, b in enumerate(batches, 1):
        doc = {"countries": {}}
        for r in b:
            item = {k: r[k] for k in FIELDS if r[k] not in (None, "", [], {})}
            if item: doc["countries"][r["iso2"]] = {"name_sr": r["name_sr"], "name_en": r["name_en"], **item}
        if n == 1 and general: doc["general"] = general
        p = out / f"visa_src_{n}.json"; p.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
        print(p, len(doc["countries"]), "countries,", len(p.read_text(encoding='utf-8')), "chars")

if __name__ == "__main__": main()
