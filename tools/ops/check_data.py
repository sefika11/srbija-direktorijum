"""Rules the data must keep. Run after every import (tools/reach/after_import.sh does) and before a push that follows one.

  .venv/bin/python tools/ops/check_data.py            # exit code 1 when a hard rule is broken

Hard rules (a broken one is a bug to fix before anything else):
  - no active organisation without a kind; no active location under an organisation that is not active
  - at most one primary location per organisation
  - a location marked merged points at the location it moved to; a merged organisation at its successor
  - no listed person (court expert, mediator, administrator, appraiser, interpreter) with a street: by rule only lawyers,
    notaries and enforcement officers show an office address
  - no contact row with an empty value; no opening hours that close before they open
  - a map point lies inside Serbia's bounding box
Counts to watch (printed, never fail): organisations without any place, entries with the map-only badge, kinds with no
organisation, forms waiting for the editor, websites the daily job found dead.
Read-only.
"""
import os, sys
import psycopg

c = psycopg.connect(os.environ["DATABASE_URL"]); q = lambda s: c.execute(s).fetchone()[0]
HARD = {
    "active organisation without a kind": "select count(*) from organizations o where o.status = 'active' and not exists (select 1 from org_types t where t.id = o.org_type_id)",
    "active location under an organisation that is not active": "select count(*) from locations l join organizations o on o.id = l.org_id where l.status = 'active' and o.status <> 'active'",
    "organisation with two primary locations": "select count(*) from (select org_id from locations where status = 'active' and is_primary group by 1 having count(*) > 1) x",
    "merged location that points nowhere": "select count(*) from locations where status = 'merged' and moved_to_location_id is null",
    "merged organisation that points nowhere": "select count(*) from organizations where status = 'merged' and merged_into_org_id is null",
    "listed person with a street (experts, mediators, administrators, appraisers, interpreters)": """select count(*) from locations l join organizations o on o.id = l.org_id and o.status = 'active'
        join org_types t on t.id = o.org_type_id where l.status = 'active' and coalesce(l.street, '') <> ''
        and t.slug in ('sudski-vestak', 'medijator', 'stecajni-upravnik', 'sudski-prevodilac', 'procenitelj-nepokretnosti')""",
    "contact with an empty value": "select count(*) from location_contacts where coalesce(trim(value), '') = ''",
    "opening hours that close before they open": "select count(*) from opening_hours where closes <= opens",
    "map point outside Serbia": "select count(*) from locations where status = 'active' and lat is not null and not (lat between 41.8 and 46.3 and lng between 18.7 and 23.1)",
}
WATCH = {
    "organisations without any place (Kosovo rows)": "select count(*) from organizations o where o.status = 'active' and not exists (select 1 from locations l where l.org_id = o.id and l.status = 'active')",
    "locations with the map-only badge": "select count(*) from locations where status = 'active' and verification = 'unverified'",
    "kinds with no organisation": "select count(*) from org_types t where t.is_active and not exists (select 1 from organizations o where o.org_type_id = t.id and o.status = 'active')",
    "forms waiting for the editor": "select (select count(*) from edit_suggestions where status = 'pending') + (select count(*) from listing_claims where status = 'pending') + (select count(*) from leads where status = 'new' and not honeypot_tripped)",
    "websites the daily job found not answering": "select count(*) from organizations where status = 'active' and website_checked_at is not null and (website_status = 0 or website_status >= 400)",
    "active organisations": "select count(*) from organizations where status = 'active'",
    "active locations": "select count(*) from locations where status = 'active'",
}
bad = 0
for name, sql in HARD.items():
    n = q(sql); bad += 1 if n else 0
    print(f"{'FAIL' if n else 'ok  '}  {n:6d}  {name}")
for name, sql in WATCH.items(): print(f"watch {q(sql):6d}  {name}")
sys.exit(1 if bad else 0)
