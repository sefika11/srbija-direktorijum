"""Polite HTTP client shared by every importer and the crawler.

Rules (docs/03 §1): identified User-Agent with contact URL, robots.txt honoured per host,
per-host rate limit, conditional GETs, on-disk cache, backoff on 429/503, hard stop after
too many consecutive errors on one host.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.robotparser as robotparser
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

UA = "SrbijaDirektorijumBot/0.1 (+{contact}; data for a public directory of institutions)".format(
    contact=os.environ.get("CRAWLER_CONTACT_URL", "https://example.rs/o-sajtu")
)
CACHE_DIR = Path(os.environ.get("CRAWLER_CACHE_DIR", ".cache/http"))
DEFAULT_DELAY = float(os.environ.get("CRAWLER_DELAY_SECONDS", "1.0"))
MAX_CONSECUTIVE_ERRORS = 20


class HostBlocked(RuntimeError):
    """robots.txt disallows this URL, or the host hit the consecutive-error ceiling."""


class Retryable(RuntimeError):
    pass


@dataclass
class HostState:
    last_request_at: float = 0.0
    consecutive_errors: int = 0
    robots: robotparser.RobotFileParser | None = None
    robots_fetched: bool = False


@dataclass
class PoliteClient:
    delay: float = DEFAULT_DELAY
    cache_days: int = 30
    verify_tls: bool = True
    _client: httpx.Client = field(init=False)
    _hosts: dict[str, HostState] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self._client = httpx.Client(
            headers={"User-Agent": UA, "Accept-Language": "sr,sr-Latn;q=0.9,en;q=0.5"},
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0),
            verify=self.verify_tls,
        )
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # -- robots ------------------------------------------------------------
    def _host(self, url: str) -> HostState:
        host = urlsplit(url).netloc
        return self._hosts.setdefault(host, HostState())

    def allowed(self, url: str) -> bool:
        st = self._host(url)
        if not st.robots_fetched:
            parts = urlsplit(url)
            rp = robotparser.RobotFileParser()
            try:
                r = self._client.get(f"{parts.scheme}://{parts.netloc}/robots.txt")
                if r.status_code == 200 and "<html" not in r.text[:200].lower():
                    rp.parse(r.text.splitlines())
                else:
                    rp.parse([])  # missing or HTML-404 robots → everything allowed
            except httpx.HTTPError:
                rp.parse([])
            st.robots, st.robots_fetched = rp, True
        return st.robots.can_fetch(UA, url) if st.robots else True

    # -- cache -------------------------------------------------------------
    @staticmethod
    def _cache_path(url: str) -> Path:
        return CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest() + ".json")

    def _read_cache(self, url: str) -> dict | None:
        p = self._cache_path(url)
        if not p.exists():
            return None
        data = json.loads(p.read_text())
        if time.time() - data["fetched_at"] > self.cache_days * 86400:
            return data  # stale: still useful for ETag / If-Modified-Since
        data["fresh"] = True
        return data

    def _write_cache(self, url: str, resp: httpx.Response) -> None:
        self._cache_path(url).write_text(
            json.dumps(
                {
                    "url": url,
                    "final_url": str(resp.url),
                    "status": resp.status_code,
                    "etag": resp.headers.get("etag"),
                    "last_modified": resp.headers.get("last-modified"),
                    "content_type": resp.headers.get("content-type"),
                    "body_b64": resp.content.hex(),
                    "fetched_at": time.time(),
                }
            )
        )

    # -- fetch -------------------------------------------------------------
    @retry(
        retry=retry_if_exception_type(Retryable),
        wait=wait_exponential(multiplier=2, min=2, max=120),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    def get(self, url: str, *, force: bool = False) -> httpx.Response:
        """GET with robots check, rate limit, conditional request and cache."""
        st = self._host(url)
        if st.consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
            raise HostBlocked(f"{urlsplit(url).netloc}: too many consecutive errors, stopping")
        if not self.allowed(url):
            raise HostBlocked(f"robots.txt disallows {url}")

        cached = self._read_cache(url)
        if cached and cached.get("fresh") and not force:
            return self._from_cache(cached)

        headers = {}
        if cached:
            if cached.get("etag"):
                headers["If-None-Match"] = cached["etag"]
            if cached.get("last_modified"):
                headers["If-Modified-Since"] = cached["last_modified"]

        wait = self.delay - (time.time() - st.last_request_at)
        if wait > 0:
            time.sleep(wait)
        st.last_request_at = time.time()

        try:
            resp = self._client.get(url, headers=headers)
        except httpx.HTTPError as e:
            st.consecutive_errors += 1
            raise Retryable(str(e)) from e

        if resp.status_code in (429, 503):
            st.consecutive_errors += 1
            raise Retryable(f"{resp.status_code} from {url}")
        if resp.status_code == 304 and cached:
            st.consecutive_errors = 0
            return self._from_cache(cached)
        if resp.status_code >= 500:
            st.consecutive_errors += 1
            return resp
        st.consecutive_errors = 0
        self._write_cache(url, resp)
        return resp

    @staticmethod
    def _from_cache(c: dict) -> httpx.Response:
        return httpx.Response(
            status_code=c["status"],
            headers={"content-type": c.get("content_type") or "text/html", "x-from-cache": "1"},
            content=bytes.fromhex(c["body_b64"]),
            request=httpx.Request("GET", c["url"]),
        )

    def close(self) -> None:
        self._client.close()


# -- headless rendering (JS-driven pages: MUP portal, some JKP sites) -------------------------
RENDER_CACHE_DIR = CACHE_DIR / "rendered"


def get_rendered(client: "PoliteClient", url: str, *, wait_selector: str | None = None, wait_ms: int = 1500,
                 cache_days: int = 30, force: bool = False) -> str:
    """Fetch a page with headless Chromium (Playwright) and return the rendered HTML.

    Same rules as PoliteClient.get: robots.txt, per-host delay, on-disk cache. Use only when the plain GET
    does not contain the content (client-rendered portals). Requires `pip install playwright` and
    `python -m playwright install chromium`.
    """
    from playwright.sync_api import sync_playwright  # imported lazily: optional dependency

    if not client.allowed(url):
        raise HostBlocked(f"robots.txt disallows {url}")
    RENDER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(("render:" + url + (wait_selector or "")).encode()).hexdigest()
    p = RENDER_CACHE_DIR / f"{key}.html"
    if p.exists() and not force and time.time() - p.stat().st_mtime < cache_days * 86400:
        return p.read_text(encoding="utf-8")
    st = client._host(url)
    wait = client.delay - (time.time() - st.last_request_at)
    if wait > 0:
        time.sleep(wait)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(user_agent=UA, locale="sr-RS")
        try:
            page.goto(url, wait_until="networkidle", timeout=60000)
            if wait_selector:
                page.wait_for_selector(wait_selector, timeout=20000)
            page.wait_for_timeout(wait_ms)
            html = page.content()
        finally:
            browser.close()
    st.last_request_at = time.time()
    p.write_text(html, encoding="utf-8")
    return html
