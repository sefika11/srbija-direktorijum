"""Load translated visa texts (db/i18n/visa_tr_*.json) into countries.i18n and site_settings 'visa_to_serbia_i18n'.
  python -m importers.jobs.visa_i18n_load
Each file: {"sr"|"en"|"ru"|"de": {"countries": {ISO2: {...fields}}, "general"?: {...}}}. Idempotent (jsonb merge per locale)."""
from __future__ import annotations
import glob, json
from psycopg.types.json import Jsonb
from ..common import db

def main() -> None:
    files = sorted(glob.glob("db/i18n/visa_tr_*.json")); per_iso: dict[str, dict] = {}; general: dict = {}
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        for loc, blk in d.items():
            for iso, fields in (blk.get("countries") or {}).items(): per_iso.setdefault(iso, {})[loc] = fields
            if blk.get("general"): general[loc] = blk["general"]
    with db.conn() as c, c.cursor() as cur:
        for iso, locs in per_iso.items():
            cur.execute("update countries set i18n = coalesce(i18n, '{}'::jsonb) || %s::jsonb, updated_at = now() where iso2 = %s", (Jsonb(locs), iso))
        if general:
            cur.execute("insert into site_settings (key, value) values ('visa_to_serbia_i18n', %s::jsonb) on conflict (key) do update set value = excluded.value", (Jsonb(general),))
        c.commit()
    print({"files": len(files), "countries": len(per_iso), "general_locales": sorted(general)})

if __name__ == "__main__": main()
