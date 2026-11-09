"""Tier 5, step 3: LLM extraction of classified municipal pages into a strict schema.

  python -m importers.crawler.extract nis [--limit 40]
Reads staging.crawl_pages rows without `extracted`, sends the cleaned text to Claude with a
Pydantic schema (structured outputs), stores the result on the row. Loading into public tables
is a separate, reviewable step (crawler/load.py, Part 3 §2.6 steps 4-6).

Model: claude-haiku-5-5 (bulk, mechanical extraction over pre-narrowed text; the project rule is
cheap models for pull/parse work). Effort 'low'. The stable system prompt is cache-marked.
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from ..common import db

MODEL = "claude-haiku-5-5"


class ExtractedContact(BaseModel):
    kind: Literal["phone", "mobile", "fax", "email", "website", "viber"]
    value: str
    label: str | None = Field(default=None, description="e.g. 'Centrala', 'Pisarnica', 'Šalter 3'")


class ExtractedUnit(BaseModel):
    """One organizational unit / office / institution mentioned on the page."""
    unit_name: str = Field(description="Name as written, e.g. 'Odeljenje za opštu upravu', 'JKP Naissus'")
    parent_organization: str | None = Field(default=None, description="The body it belongs to, if stated")
    unit_kind: Literal["sediste", "odeljenje", "odsek", "sluzba", "salter_sala", "mesna_kancelarija",
                       "jkp", "ustanova", "mesna_zajednica", "ostalo"]
    address: str | None = Field(default=None, description="Street and number exactly as written; null if absent")
    settlement: str | None = Field(default=None, description="Naselje/town if stated and different from the JLS seat")
    contacts: list[ExtractedContact] = Field(default_factory=list)
    hours_text: str | None = Field(default=None, description="Working hours verbatim, including 'rad sa strankama' if given")
    services: list[str] = Field(default_factory=list, description="Services/procedures explicitly handled here")
    head_title: str | None = Field(default=None, description="Title of the head of unit (not the person's name)")
    evidence: str = Field(description="Short verbatim quote from the page that supports this unit (max 200 chars)")


class ExtractedPage(BaseModel):
    page_is_relevant: bool = Field(description="False if the page has no institution/office contact data")
    units: list[ExtractedUnit] = Field(default_factory=list)
    identifiers: dict[str, str] = Field(default_factory=dict, description="Any MB / PIB / JBKJS found, keyed by type")


SYSTEM = """You extract structured directory data about Serbian public institutions from a web page of a city or municipality.
Rules:
- Only report facts present in the text. Never guess an address, phone or hours. Use null when absent.
- Keep names and addresses in the script they appear in; do not transliterate.
- Phones: copy as written (the pipeline normalizes them). Emails and websites verbatim.
- One unit per distinct office/department/company/institution. The municipality's own administration counts as a unit of kind 'sediste' when the page gives its address or hours.
- Do not include people's names anywhere; use head_title for the role only.
- 'evidence' must be a verbatim substring of the page text.
Return only the schema."""


def extract(client: anthropic.Anthropic, jls_name: str, url: str, title: str | None, text: str) -> ExtractedPage:
    resp = client.messages.parse(
        model=MODEL,
        max_tokens=8000,
        output_config={"effort": "low"},
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{
            "role": "user",
            "content": f"Municipality/city: {jls_name}\nURL: {url}\nTitle: {title or ''}\n\nPAGE TEXT:\n{text}",
        }],
        output_format=ExtractedPage,
    )
    if resp.stop_reason == "refusal":
        return ExtractedPage(page_is_relevant=False)
    return resp.parsed_output


def main(slug: str, limit: int) -> None:
    client = anthropic.Anthropic()
    with db.conn() as c, c.cursor() as cur:
        cur.execute(
            """select p.id, p.url, p.title, p.text_excerpt, t.name_lat
               from staging.crawl_pages p join territorial_units t on t.id = p.jls_id
               where t.slug = %s and p.extracted is null and p.page_class <> 'other' and p.text_excerpt is not null
               order by p.class_score desc limit %s""",
            (slug, limit),
        )
        rows = cur.fetchall()
        if not rows:
            sys.exit(f"{slug}: nothing to extract; run discover first")
        n_units = 0
        for row in rows:
            try:
                page = extract(client, row["name_lat"], row["url"], row["title"], row["text_excerpt"])
            except anthropic.RateLimitError:
                print("rate limited; stopping this run")
                break
            except anthropic.APIStatusError as e:
                print(f"{row['url']}: API error {e.status_code}; skipping")
                continue
            # evidence check: drop units whose quote is not in the text (hallucination guard)
            page.units = [u for u in page.units if u.evidence and u.evidence[:60] in row["text_excerpt"]]
            n_units += len(page.units)
            cur.execute(
                "update staging.crawl_pages set extracted = %s::jsonb, extracted_at = now(), model = %s where id = %s",
                (page.model_dump_json(), MODEL, row["id"]),
            )
        print(json.dumps({"slug": slug, "pages": len(rows), "units": n_units}))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--limit", type=int, default=40)
    a = ap.parse_args()
    main(a.slug, a.limit)
