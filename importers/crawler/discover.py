"""Tier 5, step 1-2: discover a municipal site's pages and classify candidates.

  python -m importers.crawler.discover nis
Writes/updates crawler/profiles/{slug}.yaml and stages classified pages into staging.crawl_pages.

Verified 2026-11-09: ni.rs is WordPress (robots allows all but /wp-admin/, sitemap at /wp-sitemap.xml);
beograd.rs is bespoke and disallows /api/, /data, /content/ (HTML pages are allowed).
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import yaml
from bs4 import BeautifulSoup

from ..common import db
from ..common.http import HostBlocked, PoliteClient
from ..common.normalize import clean_ws, cyr_to_lat

PROFILES = Path(__file__).parent / "profiles"

# keyword → page_class; matched against URL path + title (Latin, lowercased)
CLASSES: list[tuple[str, re.Pattern]] = [
    ("kontakt", re.compile(r"kontakt|adresar|telefon|imenik")),
    ("uprava", re.compile(r"uprava|odeljenj|odsek|sekretarijat|sluzb|pisarnic|maticar|matic|lpa|poresk")),
    ("jkp", re.compile(r"jkp|javna-?preduzec|komunaln|vodovod|cistoc|parking|toplan|zelenil|pijac|pogreb")),
    ("ustanove", re.compile(r"ustanov|dom-?zdravlj|centar-za-socijaln|biblioteka|kulturn|vrtic|predskolsk|skol")),
    ("mesne_zajednice", re.compile(r"mesn[ae]-?zajednic|mz-")),
    ("radno_vreme", re.compile(r"radno-?vreme|rad-sa-strankama")),
]
MAX_CANDIDATES = 40


def load_profile(slug: str) -> dict:
    p = PROFILES / f"{slug}.yaml"
    return yaml.safe_load(p.read_text()) if p.exists() else {"slug": slug}


def save_profile(prof: dict) -> None:
    PROFILES.mkdir(exist_ok=True)
    (PROFILES / f"{prof['slug']}.yaml").write_text(yaml.safe_dump(prof, allow_unicode=True, sort_keys=False))


def sitemap_urls(client: PoliteClient, base: str) -> list[str]:
    urls: list[str] = []
    for cand in ("/wp-sitemap.xml", "/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"):
        try:
            r = client.get(urljoin(base, cand))
        except HostBlocked:
            break
        if r.status_code != 200 or "<urlset" not in r.text and "<sitemapindex" not in r.text:
            continue
        soup = BeautifulSoup(r.text, "xml")
        if soup.find("sitemapindex"):
            for sm in soup.find_all("loc")[:30]:
                try:
                    rr = client.get(sm.text.strip())
                except HostBlocked:
                    continue
                if rr.status_code == 200:
                    urls += [l.text.strip() for l in BeautifulSoup(rr.text, "xml").find_all("loc")]
        else:
            urls += [l.text.strip() for l in soup.find_all("loc")]
        if urls:
            break
    return urls


def wp_pages(client: PoliteClient, base: str) -> list[dict]:
    """WordPress REST index: structured titles + rendered content, no HTML scraping."""
    out = []
    for page in range(1, 6):
        try:
            r = client.get(urljoin(base, f"/wp-json/wp/v2/pages?per_page=100&page={page}&_fields=link,title,content"))
        except HostBlocked:
            break
        if r.status_code != 200 or not r.headers.get("content-type", "").startswith("application/json"):
            break
        batch = r.json()
        if not batch:
            break
        out += batch
    return out


def classify(url: str, title: str | None) -> tuple[str, float]:
    hay = cyr_to_lat((urlsplit(url).path + " " + (title or "")).lower())
    hay = hay.replace("š", "s").replace("č", "c").replace("ć", "c").replace("ž", "z").replace("đ", "dj")
    for cls, rx in CLASSES:
        m = rx.search(hay)
        if m:
            return cls, 0.9 if m.start() < 40 else 0.6
    return "other", 0.0


def main(slug: str) -> None:
    prof = load_profile(slug)
    client = PoliteClient()
    with db.conn() as c, c.cursor() as cur:
        cur.execute("select id, name_lat, website from territorial_units where level = 'jls' and slug = %s", (slug,))
        tu = cur.fetchone()
        if not tu:
            sys.exit(f"unknown JLS slug {slug}")
        base = prof.get("site") or tu["website"]
        if not base:
            sys.exit(f"{slug}: no website on territorial_units; set 'site' in the profile")
        prof["site"] = base
        urls = sitemap_urls(client, base)
        prof["cms"] = "wordpress" if urls and "wp-sitemap" in " ".join(urls[:3]) or wp_pages(client, base) else prof.get("cms", "unknown")
        cands = []
        for u in urls:
            cls, score = classify(u, None)
            if cls != "other":
                cands.append((score, u, cls))
        cands.sort(reverse=True)
        cands = cands[:MAX_CANDIDATES]
        prof["candidates"] = [{"url": u, "class": cls, "score": s} for s, u, cls in cands]
        staged = 0
        for s, u, cls in cands:
            try:
                r = client.get(u)
            except HostBlocked as e:
                print("blocked:", e)
                break
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "lxml")
            for t in soup(["script", "style", "nav", "footer", "header"]):
                t.decompose()
            title = clean_ws(soup.title.get_text()) if soup.title else None
            text = clean_ws(soup.get_text(" ")) or ""
            cls2, score2 = classify(u, title)
            cur.execute(
                """insert into staging.crawl_pages (jls_id, url, status_code, content_hash, title, page_class, class_score, text_excerpt)
                   values (%s, %s, %s, %s, %s, %s, %s, %s) on conflict (url, content_hash) do nothing""",
                (tu["id"], u, r.status_code, hashlib.sha256(r.content).hexdigest()[:32], title,
                 cls2 if cls2 != "other" else cls, max(score2, s), text[:12000]),
            )
            staged += 1
        save_profile(prof)
    print(f"{slug}: {len(urls)} sitemap urls, {len(cands)} candidates, {staged} pages staged, cms={prof['cms']}")


if __name__ == "__main__":
    main(sys.argv[1])
