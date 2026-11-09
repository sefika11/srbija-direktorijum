"""data.gov.rs runs udata (not CKAN). API root: https://data.gov.rs/api/1/  (verified 2026-11-09).

Search wants Cyrillic queries ('адресни регистар' hits, 'adresni registar' returns 0).
"""
from __future__ import annotations

from ..common.http import PoliteClient

API = "https://data.gov.rs/api/1"


def dataset(client: PoliteClient, slug: str) -> dict:
    """Dataset metadata by slug, e.g. 'adresni-registar', 'tsentri-za-sotsijalni-rad', 'naselja'."""
    return client.get(f"{API}/datasets/{slug}/").json()


def latest_resource_url(client: PoliteClient, slug: str, fmt: str) -> str:
    """URL of the newest resource of a given format ('csv', 'xlsx', 'geojson', 'json')."""
    res = [r for r in dataset(client, slug)["resources"] if (r.get("format") or "").lower() == fmt.lower()]
    if not res:
        raise LookupError(f"{slug}: no {fmt} resource")
    res.sort(key=lambda r: r.get("last_modified") or r.get("created_at") or "", reverse=True)
    return res[0]["url"]


def search(client: PoliteClient, query_cyrillic: str, page_size: int = 20) -> list[dict]:
    r = client.get(f"{API}/datasets/?q={query_cyrillic}&page_size={page_size}")
    return r.json().get("data", [])
