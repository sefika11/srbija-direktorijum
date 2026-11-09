"""Load guides from db/guides/*.json into services (+ org_type_services, lead vertical).

Each file: {"slug","category","org_types":[...],"lead_vertical":null|slug,"status":"short|full","sort_order":n,
            "name_lat","summary","typical_duration","legal_basis","euprava_url","online_available","checked_at",
            "fees":[...],"sources":[...],"guide":{"sr":{...},"en":{...}}}
Idempotent: upserts on slug. Unknown org types or verticals are reported and skipped.
Run: DATABASE_URL=... python -m importers.jobs.load_guides [db/guides]
"""
from __future__ import annotations

import json, os, sys, glob
from ..common import db


def main() -> None:
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "db", "guides")
    files = sorted(glob.glob(os.path.join(folder, "*.json")))
    with db.conn() as c, c.cursor() as cur:
        cur.execute("select slug, id from org_types"); types = {r["slug"]: r["id"] for r in cur.fetchall()}
        cur.execute("select slug, id from service_categories"); cats = {r["slug"]: r["id"] for r in cur.fetchall()}
        cur.execute("select slug, id for_id from lead_verticals"); verts = {r["slug"]: r["for_id"] for r in cur.fetchall()}
        loaded = 0
        for f in files:
            g = json.load(open(f, encoding="utf-8"))
            if g["category"] not in cats:
                print("unknown category", g["category"], "in", f); continue
            vid = verts.get(g.get("lead_vertical") or "") if g.get("lead_vertical") else None
            if g.get("lead_vertical") and vid is None:
                print("unknown lead vertical", g["lead_vertical"], "in", f)
            cur.execute(
                """insert into services (slug, category_id, name_lat, name_cyr, summary, fees, legal_basis, euprava_url, online_available, typical_duration,
                                         lead_vertical_id, guide, sources, checked_at, status, sort_order, is_active)
                   values (%(slug)s, %(cat)s, %(name)s, %(name_cyr)s, %(summary)s, %(fees)s::jsonb, %(legal)s, %(eu)s, %(online)s, %(dur)s,
                           %(vid)s, %(guide)s::jsonb, %(sources)s::jsonb, %(checked)s, %(status)s, %(sort)s, true)
                   on conflict (slug) do update set category_id = excluded.category_id, name_lat = excluded.name_lat, name_cyr = excluded.name_cyr,
                       summary = excluded.summary, fees = excluded.fees, legal_basis = excluded.legal_basis, euprava_url = excluded.euprava_url,
                       online_available = excluded.online_available, typical_duration = excluded.typical_duration, lead_vertical_id = excluded.lead_vertical_id,
                       guide = excluded.guide, sources = excluded.sources, checked_at = excluded.checked_at, status = excluded.status,
                       sort_order = excluded.sort_order, is_active = true, updated_at = now()
                   returning id""",
                {"slug": g["slug"], "cat": cats[g["category"]], "name": g["name_lat"], "name_cyr": g.get("name_cyr"), "summary": g.get("summary"),
                 "fees": json.dumps(g.get("fees", []), ensure_ascii=False), "legal": g.get("legal_basis"), "eu": g.get("euprava_url"),
                 "online": bool(g.get("online_available", False)), "dur": g.get("typical_duration"), "vid": vid,
                 "guide": json.dumps(g.get("guide", {}), ensure_ascii=False), "sources": json.dumps(g.get("sources", []), ensure_ascii=False),
                 "checked": g.get("checked_at"), "status": g.get("status", "short"), "sort": g.get("sort_order", 100)},
            )
            sid = cur.fetchone()["id"]
            cur.execute("delete from org_type_services where service_id = %s", (sid,))
            for i, ts in enumerate(g.get("org_types", [])):
                if ts not in types:
                    print("unknown org type", ts, "in", f); continue
                cur.execute("insert into org_type_services (org_type_id, service_id, is_primary) values (%s, %s, %s) on conflict do nothing", (types[ts], sid, i == 0))
            loaded += 1
    print(json.dumps({"files": len(files), "loaded": loaded}))


if __name__ == "__main__":
    main()
