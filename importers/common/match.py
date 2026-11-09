"""Entity matching: registry keys first, fuzzy name within the founding JLS last.

Never creates a duplicate organization when any registry key already exists (docs/03 §4).
"""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

from .normalize import cyr_to_lat


@dataclass(frozen=True)
class Match:
    organization_id: int | None
    method: str   # jbkjs | pib | mb | trgm | new
    score: float


def match_organization(cur: psycopg.Cursor, *, jbkjs: str | None = None, pib: str | None = None,
                       mb: str | None = None, name: str | None = None, founder_unit_id: int | None = None,
                       org_type_slug: str | None = None) -> Match:
    for key, col in ((jbkjs, "jbkjs"), (pib, "pib"), (mb, "mb")):
        if key:
            cur.execute(f"select id from organizations where {col} = %s", (key.strip(),))
            row = cur.fetchone()
            if row:
                return Match(row["id"], col, 1.0)
    if name:
        lat = cyr_to_lat(name)
        cur.execute(
            """select o.id, similarity(f_unaccent(lower(o.name_lat)), f_unaccent(lower(%(n)s))) as s
               from organizations o
               join org_types t on t.id = o.org_type_id
               where (%(f)s::bigint is null or o.founder_unit_id = %(f)s)
                 and (%(t)s::text is null or t.slug = %(t)s)
               order by s desc limit 1""",
            {"n": lat, "f": founder_unit_id, "t": org_type_slug},
        )
        row = cur.fetchone()
        if row and row["s"] >= 0.6:
            return Match(row["id"], "trgm", float(row["s"]))
    return Match(None, "new", 0.0)


def upsert_location(cur: psycopg.Cursor, *, org_id: int, slug: str, unit_name_lat: str, unit_kind: str,
                    territorial_unit_id: int, street: str | None, street_number: str | None,
                    postal_code: str | None = None, is_primary: bool = False) -> int:
    cur.execute(
        """insert into locations (org_id, slug, unit_name_lat, unit_kind, territorial_unit_id, street,
                                  street_number, postal_code, is_primary, status, verification)
           values (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', 'unverified')
           on conflict (org_id, slug) do update
             set street = coalesce(excluded.street, locations.street),
                 street_number = coalesce(excluded.street_number, locations.street_number),
                 postal_code = coalesce(excluded.postal_code, locations.postal_code),
                 last_seen_at = now()
           returning id""",
        (org_id, slug, unit_name_lat, unit_kind, territorial_unit_id, street, street_number, postal_code, is_primary),
    )
    return cur.fetchone()["id"]


def add_coverage(cur: psycopg.Cursor, location_id: int, territorial_unit_id: int, source_code: str) -> None:
    cur.execute(
        """insert into location_coverage (location_id, territorial_unit_id, source_id)
           values (%s, %s, (select id from data_sources where code = %s))
           on conflict do nothing""",
        (location_id, territorial_unit_id, source_code),
    )


def add_contact(cur: psycopg.Cursor, location_id: int, kind: str, value: str, display: str | None,
                label: str | None = None) -> None:
    cur.execute(
        """insert into location_contacts (location_id, kind, value, value_display, label)
           select %s, %s::contact_kind, %s, %s, %s
           where not exists (select 1 from location_contacts where location_id = %s and value = %s)""",
        (location_id, kind, value, display, label, location_id, value),
    )
