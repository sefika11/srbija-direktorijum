"""Weekly: check every outbound official URL; detect dead links and soft-404s.

  python -m importers.jobs.link_check [--limit 500]
Three consecutive failures or a soft-404 → edit_suggestions kind 'closed' (pending review).
"""
from __future__ import annotations

import argparse
import hashlib
import re

from ..common import db
from ..common.http import HostBlocked, PoliteClient

HOMEPAGE_HINT = re.compile(r"<title>[^<]*(početna|pocetna|почетна|home)[^<]*</title>", re.I)


def main(limit: int) -> None:
    client = PoliteClient(delay=0.5)
    with db.conn() as c, c.cursor() as cur:
        # register URLs we don't track yet
        cur.execute(
            """insert into link_checks (url, entity_type, entity_id)
               select website, 'organization', id from organizations where website is not null
               on conflict (url) do nothing""")
        cur.execute(
            """insert into link_checks (url, entity_type, entity_id)
               select value, 'location', location_id from location_contacts where kind = 'website'
               on conflict (url) do nothing""")
        cur.execute("select * from link_checks where next_check_at <= now() order by next_check_at limit %s", (limit,))
        rows = cur.fetchall()
        for row in rows:
            status, final, soft, h = None, None, False, None
            try:
                r = client.get(row["url"], force=True)
                status, final = r.status_code, str(r.url)
                h = hashlib.sha256(r.content).hexdigest()[:32]
                path_changed = final.rstrip("/").count("/") <= 2 and row["url"].rstrip("/").count("/") > 2
                soft = status == 200 and (path_changed or bool(HOMEPAGE_HINT.search(r.text[:2000])) and path_changed)
            except HostBlocked:
                status = 999
            except Exception:
                status = 0
            failed = status is None or status == 0 or status >= 400 or soft
            fails = row["consecutive_failures"] + 1 if failed else 0
            cur.execute(
                """update link_checks set last_checked_at = now(), last_status_code = %s, final_url = %s,
                       consecutive_failures = %s, content_hash = %s, is_soft_404 = %s,
                       next_check_at = now() + (case when %s then interval '2 days' else interval '7 days' end)
                   where id = %s""",
                (status, final, fails, h, soft, failed, row["id"]))
            if fails == 3 and row["entity_type"] and row["entity_id"]:
                cur.execute(
                    """insert into edit_suggestions (entity_type, entity_id, kind, patch, message)
                       values (%s, %s, 'closed', %s::jsonb, %s)""",
                    (row["entity_type"], row["entity_id"],
                     '{"website": {"old": "%s", "new": null}}' % row["url"].replace('"', ''),
                     f"Link ne radi 3 puta zaredom (status {status}{', soft-404' if soft else ''})"))
        print(f"checked {len(rows)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=500)
    main(ap.parse_args().limit)
