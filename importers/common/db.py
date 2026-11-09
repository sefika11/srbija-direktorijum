"""Thin psycopg layer: connection, staging writes, provenance, change_log."""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row


@contextmanager
def conn() -> Iterator[psycopg.Connection]:
    c = psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def source_id(cur: psycopg.Cursor, code: str) -> int:
    cur.execute("select id from data_sources where code = %s", (code,))
    row = cur.fetchone()
    if not row:
        raise KeyError(f"data_sources.code {code!r} missing; add it in seed_core.sql")
    return row["id"]


def stage_rows(cur: psycopg.Cursor, source_code: str, source_url: str, rows: list[tuple[str, dict[str, Any]]]) -> int:
    """rows = [(row_key, payload), ...] → staging.source_rows. Returns count."""
    cur.executemany(
        """insert into staging.source_rows (source_code, source_url, row_key, payload)
           values (%s, %s, %s, %s::jsonb)
           on conflict do nothing""",
        [(source_code, source_url, k, json.dumps(p, ensure_ascii=False)) for k, p in rows],
    )
    return len(rows)


def provenance(cur: psycopg.Cursor, entity_type: str, entity_id: int, field: str | None,
               source_code: str, source_url: str, confidence: float, raw: dict | None = None) -> None:
    cur.execute(
        """insert into provenance (entity_type, entity_id, field, source_id, source_url, confidence, raw)
           values (%s, %s, %s, %s, %s, %s, %s::jsonb)""",
        (entity_type, entity_id, field, source_id(cur, source_code), source_url, confidence,
         json.dumps(raw, ensure_ascii=False) if raw is not None else None),
    )


def change_log(cur: psycopg.Cursor, entity_type: str, entity_id: int, action: str,
               before: dict | None, after: dict | None, actor: str) -> None:
    cur.execute(
        """insert into change_log (entity_type, entity_id, action, before, after, actor)
           values (%s, %s, %s, %s::jsonb, %s::jsonb, %s)""",
        (entity_type, entity_id, action,
         json.dumps(before, ensure_ascii=False, default=str) if before else None,
         json.dumps(after, ensure_ascii=False, default=str) if after else None, actor),
    )


def jls_id_by_name(cur: psycopg.Cursor, name_any_script: str) -> int | None:
    """Resolve 'Бабушница' / 'Babušnica' / 'babusnica' to the JLS id."""
    cur.execute(
        """select id from territorial_units
           where level = 'jls' and (name_cyr = %(n)s or f_unaccent(lower(name_lat)) = f_unaccent(lower(%(n)s))
                                    or slug = slugify_sr(%(n)s))
           limit 1""",
        {"n": name_any_script},
    )
    row = cur.fetchone()
    return row["id"] if row else None
