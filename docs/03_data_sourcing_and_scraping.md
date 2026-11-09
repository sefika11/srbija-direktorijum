# Srbija Direktorijum javne uprave
## Blueprint, Part 3: Data sourcing and scraping methodology

Version 0.1, 2026-11-09. Covers brief item 4. Every source below was probed on 2026-11-09 (HTTP status, robots.txt, page structure); findings are marked **verified** or **to confirm**. Companion code: `importers/` (Python 3.12 package, skeleton with the politeness layer, normalizers, matcher, loader and the first four source importers). Schema additions: `db/schema_patch_003_staging.sql`; one schema change in `db/schema.sql` (JBKJS becomes alphanumeric, see 2.1).

---

## 0. Strategy in one paragraph

Do not crawl 145 municipal websites first. Start from the one register that already enumerates the entire universe of public bodies with stable identifiers (the Treasury's KJS register), attach national branch networks from the handful of organs that publish their own lists, pull the professions from their chambers, geocode everything against the open address register, and only then point a crawler at municipal sites to fill in phones and hours. Each stage writes provenance, each record carries a confidence, nothing is published as verified until a human or a second source agrees. The crawler is the last mile, not the foundation.

---

## 1. Legal and terms-of-service posture

| Question | Position | Basis |
|---|---|---|
| Can we republish names, addresses, phones and hours of public bodies? | Yes. These are facts about public authorities, published by them for the purpose of being found. | Zakon o slobodnom pristupu informacijama od javnog značaja; Zakon o autorskom i srodnim pravima excludes official acts and does not protect bare facts. Attribute the source on every page (we already do, in the correction block). |
| Open-data portal licence | data.gov.rs datasets are tagged with the portal's open licence (`sodl`); attribution required, redistribution allowed. **verified** on the dataset records. | Portal metadata. Keep the licence string in `data_sources.license`. |
| RGZ address register | Opened as open data in December 2022 (fee exemption, tariff item 215i); weekly updates; anonymous CSV/GPKG via the data.gov.rs link. **verified** that the download-api URL is published on the portal; file size not tested. | RGZ page + OSM community notes. Attribute "Izvor: RGZ, Adresni registar". |
| Treasury KJS register | Public web service with monthly XLS snapshots and a documented REST interface. Personal-data notice applies to natural persons that appear as KJS (none relevant to us). **verified** | trezor.gov.rs/sr/services/kjs |
| Scraping municipal portals | Allowed where robots.txt allows, at low rate, identified user agent, no login-walled content, no bulk download of documents. Where a site's robots disallows the paths we need, use the sitemap plus manual entry, not evasion. | robots.txt is advisory in law but the operative ethical and ToS standard. Belgrade disallows its API and data paths; Niš allows all but admin; RGZ allows all. **verified** |
| APR bulk data | Per-record lookups are free on the APR site; bulk feeds are a paid service. We do not scrape APR search. JKP legal data comes from KJS (which already carries MB and PIB) and the companies' own sites. | APR terms. |
| Personal data | Notaries and enforcement agents are natural persons acting under public authority; their office name, address, phone and email are published by their chambers for professional contact. We store office contact data, never personal identifiers, and honour removal requests. | ZZPL legitimate interest for a public directory of public-authority offices; the chambers publish the same data. |

Operational rules in code (`importers/common/http.py`): identified user agent with a contact URL, robots.txt honoured per host, one request per second per host (configurable), conditional GETs with ETag/Last-Modified, 30-day on-disk cache, crawl window 22:00 to 06:00 Belgrade time for municipal sites, exponential backoff on 429/503, hard stop after 20 consecutive errors on a host.

---

## 2. Source inventory

### 2.1 Tier 0: the universe. Uprava za trezor, Evidencija KJS **verified and imported**

First import run 2026-11-09 against the 2026-10-31 snapshot (local Postgres 16): 10,363 rows → 10,162 organizations (201 budget rows skipped), 9,642 seat locations, 6,014 with a founding JLS, 1,702 parent links, 134 Treasury branch locations with coverage. 520 rows (5.0%) have a seat that did not resolve: Kosovo places (not seeded), plus six villages whose name exists in more than one municipality (Jabuka, Barič, Donja Trnava, Lipovac, Turija, Dolovo); those organizations exist without a seat location until an editor or the municipal crawler supplies the address.

Verified layout of the XLS (sheet 'Списак КЈС', header on row 5, 9 columns): treasury code · JBKJS · name (uppercase Cyrillic) · place · MB · PIB · type code · parent direct budget user ('code-NAME') · Treasury branch ('code-NAME'). Section rows ('ГРАДОВИ', 'ОПШТИНЕ', 'Трезор 581', 'II ОСТАЛИ ...') separate republic, Vojvodina, local and outside-treasury blocks. Type codes seen: 0 budget itself, 1 direct budget user, 2 indirect budget user, 6 agencies, 7 companies, 9 social-insurance organizations, 10 RFZO-funded health institutions.

Three facts that changed the design:

- **MB and PIB are not unique per KJS.** Indirect users often carry the parent's numbers (the National Assembly carries the Republic's MB). The importer matches on JBKJS only and stores MB/PIB only when unique within the snapshot (about 91% of rows).
- **The local treasury code is the founder.** Every JLS and gradska opština budget has its own treasury code, and every body it funds carries that code, including the 670 public enterprises outside the treasury system. That is how `founder_unit_id` is filled without any name matching.
- **The Treasury branch column is coverage.** 146 distinct branch codes, each serving the KJS in a set of places, become `uprava-za-trezor` locations with `location_coverage` rows.

Classification runs on the uppercase Cyrillic name through an ordered rule list (54 rules) with generic fallbacks per type code and scope (`drzavni-organ`, `organ-jls`, `javno-preduzece`, `ustanova`, `pravosudni-organ`, seed patch 004). Display names are re-cased by a Serbian heuristic (first word and proper nouns capitalised, a vocabulary of institutional words lowercased, acronyms kept), so 'ОПШТИНСКА УПРАВА БАБУШНИЦА' renders as 'Opštinska uprava Babušnica'. Editors will still find exceptions; the original uppercase name is kept in `official_name_lat`.

**Locale lesson:** SQL `upper()`/`lower()` do nothing to Cyrillic under a C locale (local dev, and some hosted defaults), so every importer folds case in Python and never relies on SQL case functions for Cyrillic.


- Web app: `https://kjs.trezor.gov.rs` (ASP.NET, Bootstrap grid loaded by XHR; search criteria live in the URL: `/search?Naziv=osnovna%20škola`, `/search?MB=17862146`, single record `/10523`).
- Monthly snapshot: `https://www.trezor.gov.rs/files/services/kjs/arhiva/{YYYY}/Spisak KJS_{YYYY}_{MM}_{DD}.xls` (last day of month). Latest seen: `Spisak KJS_2026_10_31.xls`, 2.8 MB, `application/vnd.ms-excel`, modified 2026-11-06. Archive index at `/sr/services/kjs/arhiva`.
- REST interface for machine use, documented in `Evidencija KJS - Uputstvo za mašinsku upotrebu.zip` on the same page. Export formats XML, JSON, CSV through the web interface.
- **Schema impact:** the Treasury announced that JBKJS changes from numeric to alphanumeric, with integrators required to adjust by 1 April 2026. `organizations.jbkjs` and `territorial_units.jbkjs` are therefore changed from `char(5)` with a digit check to `text` with an alphanumeric check. Applied in `db/schema.sql` v0.2.
- What it gives: every direct and indirect budget user and every public-sector KJS: name, JBKJS, MB, PIB, type code, parent KJS, and (to confirm from the XLS columns) seat municipality. This fills `organizations` for groups 1, 2, 4 and most of 3, plus the parent links (Ispostava → Filijala → Poreska uprava → Ministarstvo finansija).
- What it does not give: street addresses of branches, phones, hours, websites. Those come from tiers 1 to 4.
- Importer: `importers/sources/trezor_kjs.py` (run `rzs_codebooks.py` first so villages resolve to municipalities). Monthly cron diffs the new snapshot against the previous one: new rows → `organizations`; disappeared rows → `edit_suggestions` kind `closed` for review.

### 2.2 Tier 1: national networks (locations + coverage for group 1)

| Organ | Source | Status | What it yields |
|---|---|---|---|
| Poreska uprava | `purs.gov.rs/adresar/nadleznosti-pu-po-opstinama.html` (municipality → nadležna filijala/ispostava) plus `/adresar/` pages per branch | page exists in nav, **to confirm** structure | `location_coverage` for every JLS; branch addresses |
| RFZO | `rfzo.rs/index.php/filijale` | **verified**: 34 filijale as numbered text "Филијала за Севернобачки округ са седиштем у Суботици са испоставама у: Бачкој Тополи и Малом Иђошу;" | filijala + ispostave as locations, coverage by seat and ispostave; no addresses (take from KJS seat + municipal crawler) |
| RGZ službe za katastar | `rgz.gov.rs` (robots allow all, sitemap present); kontakt page URL changed, **to confirm** | | one Služba per JLS; addresses |
| PIO | `pio.rs` (Drupal); filijale URL **to confirm** | | filijale + ispostave |
| NSZ | `nsz.gov.rs`; filijale URL **to confirm** | | filijale + ispostave |
| MUP | `mup.gov.rs` WebSphere portal; PU list under "Организационе јединице Дирекције полиције и полицијске управе" loads client-side, **verified** that the static fetch returns no content | needs a headless fetch (Playwright) or the Latin-script site | 27 PU + policijske stanice |
| Uprava za trezor filijale | KJS register itself lists them as KJS | **verified** via KJS | |
| APR organizacione jedinice | `apr.gov.rs` (registri page redirected to an error page during probe) | **to confirm** | 13 OJ |

Pattern for all of these: one small importer per organ in `importers/sources/`, each ≤150 lines, each writing `locations`, `location_coverage` and `provenance`. They run quarterly; these lists change rarely.

### 2.3 Tier 2: judiciary and public-authority professions (group 5)

| Body | Source | Status | Notes |
|---|---|---|---|
| Javni izvršitelji | `komoraizvrsitelja.rs/imenik-javnih-izvrsitelja` (HTML, ~280 entries grouped by Viši/Privredni sud area) and `/media/downloads/2106-imenik_kji.xls` | **verified** | Fields: name, appointment decision, seat address, phone, email; coverage = court area heading. Importer `kji_imenik.py` parses the XLS, falls back to HTML. |
| Javni beležnici | `beleznik.org/kancelarije` | link **verified**, structure **to confirm** | One org row per notary office, location = office, coverage = osnovni sud area. |
| Sudovi | `portal.sud.rs` is navigation only. Individual courts publish on `{grad}.{os|vi|pr|pk|ap}.sud.rs` subdomains (**to confirm** the pattern on three courts before coding) | | Seats, sudske jedinice and territorial jurisdiction come from Zakon o sedištima i područjima sudova i javnih tužilaštava, a single statute that is itself the authoritative coverage table: parse once, store as `location_coverage` with `source = 'zakon_sedista_sudova'`. |
| Tužilaštva | same statute + `rjt.gov.rs` | **to confirm** | |
| Sudski prevodioci | Ministarstvo pravde registry (`mpravde.gov.rs`) | **to confirm** | |

### 2.4 Tier 3: public institutions (group 4)

| Type | Source | Status |
|---|---|---|
| Centri za socijalni rad | data.gov.rs dataset `tsentri-za-sotsijalni-rad` (Ministry, xlsx, 2025-03-12) | **verified** on portal |
| Škole, vrtići | `opendata.mpn.gov.rs/otvoreni-podaci/{predskolsko,osnovno,srednje}-obrazovanje.html`, data for 2025/2026 | **verified** pages exist; file formats **to confirm** |
| Domovi zdravlja, bolnice, apoteke | RFZO list of contracted institutions (preferred) or `zdravlje.gov.rs/tekst/338440/zdravstvene-ustanove.php` (page serves 200 but its TLS chain fails strict verification: pin the intermediate or fetch via RFZO instead) | **verified** behaviour |
| Biblioteke, kulturni centri, muzeji, sportski centri, turističke organizacije | KJS (they are all KJS with the founding JLS as parent) + municipal crawler | **verified** via KJS model |
| City-level open data | data.gov.rs has per-city datasets (Zrenjanin health institutions with coordinates, Sombor and Šabac schools, Subotica and Kraljevo mesne zajednice as GeoJSON). ~30 cities publish something. | **verified** examples |

### 2.5 Tier 4: territory, codes and geocoding

| Need | Source | Status |
|---|---|---|
| Šifarnik naselja + opština | RZS open data: `.../dataset/SIFNAS/1/json` (6,170 settlements with municipality code) and `.../dataset/SIFOPS/1/json` (206 municipality codes with NUTS3 district code) | **verified and imported**: 168 units coded, 25 districts got NUTS3, 4,697 settlements resolved (rest Kosovo) |
| Municipality codes, population 2022 | RZS; same REST service, dataset id **to confirm** | |
| Address register (streets, house numbers, coordinates) | `download.geosrbija.rs/download-api/opendata-proxy/export?category=ar&layer=kucni_broj_ar&geometry=true&fileName=kucni_br_csv&format=csv` (via data.gov.rs `adresni-registar`, updated 2026-10-22) | **verified** URL published; size **to confirm**, expect hundreds of MB |
| Registar prostornih jedinica (boundaries of JLS, naselja, mesne zajednice) | GeoSrbija open data (OSM community imported it in 2025) | **to confirm** current download path |
| Official websites and Wikidata ids of JLS | Wikidata SPARQL: items with P31 = municipality/city of Serbia, P856 official website, P625 coordinates, P1082 population | standard |
| Fallback coordinates and amenity tags | OSM Overpass (`office=government`, `amenity=townhall`) | standard; ODbL attribution |

Geocoding is a join, not an API call: normalize (opština, ulica, kućni broj) and look up in the loaded address register. Only unmatched addresses go to a self-hosted Nominatim. This keeps geocoding free and exact.

### 2.6 Tier 5: municipal portals (phones, hours, JKP, ustanove, mesne zajednice)

145 sites, roughly 40% WordPress, the rest Joomla, Drupal, or bespoke. Two patterns were confirmed: Belgrade (bespoke, API paths disallowed, HTML pages allowed) and Niš (WordPress with `wp-sitemap.xml`). Novi Sad and PIO run Drupal (default robots).

Process per JLS:

1. **Discover.** Site from Wikidata/KJS. Fetch `robots.txt` and sitemaps. For WordPress, use the public REST index `/wp-json/wp/v2/pages?per_page=100` where allowed (structured titles and content, no HTML scraping). Otherwise walk the sitemap.
2. **Classify pages** by URL and title with a keyword list (kontakt, uprava, odeljenja, sekretarijat, radno vreme, jkp, javna preduzeća, ustanove, mesne zajednice, pisarnica, matičar, lpa). Keep the top 40 candidate pages per site.
3. **Extract** with an LLM into a strict JSON schema (`crawler/extract.py`, Pydantic model `ExtractedUnit`): unit name, parent organization, address, phones, emails, hours text, services mentioned, source URL, text span. Use a small, cheap model; the page text is already narrowed. Expect 145 sites × 40 pages × about 3k tokens: under $20 for a full pass at small-model pricing.
4. **Normalize** (`common/normalize.py`): phones to E.164 with region RS, Cyrillic to Latin, hours text to `opening_hours` rows where the pattern is recognised (ponedeljak–petak 07:30–15:30; rad sa strankama 08–14), else keep `hours_text`.
5. **Match** (`common/match.py`): to an existing organization by JBKJS/PIB/MB if the page shows one, else by trigram similarity of name within the founding JLS, else create as `unverified`.
6. **Load** with provenance and a confidence score: 0.9 when two sources agree, 0.6 for a single LLM extraction, 0.3 when the match was fuzzy. Pages render data at ≥0.6; the index gate (Part 1) requires address + contact or hours regardless of confidence.
7. **Re-crawl** quarterly; diff; changes become `edit_suggestions` for review when confidence < 0.9, else auto-apply with `change_log`.

A YAML profile per JLS (`crawler/profiles/{slug}.yaml`) records the discovered CMS, sitemap URL, candidate pages and overrides. Profiles are the crawler's memory and are committed to the repo.

---

## 3. Pipeline architecture

```
          ┌──────────────┐   monthly   ┌─────────────────────┐
 Tier 0   │ Trezor KJS   │ ──────────▶ │ staging.kjs_snapshot │──┐
          └──────────────┘             └─────────────────────┘  │
          ┌──────────────┐  quarterly  ┌─────────────────────┐  │   match      ┌───────────────┐
 Tier 1-3 │ organ lists, │ ──────────▶ │ staging.source_rows  │──┼───────────▶ │ organizations │
          │ chambers,    │             └─────────────────────┘  │  (jbkjs>pib  │ locations     │
          │ open data    │                                      │   >mb>trgm)  │ coverage      │
          └──────────────┘                                      │              │ contacts/hours│
          ┌──────────────┐  quarterly  ┌─────────────────────┐  │              │ provenance    │
 Tier 5   │ municipal    │ ──fetch───▶ │ staging.crawl_pages  │──┘              └───────┬───────┘
          │ crawler      │  extract    └─────────────────────┘                          │
          └──────────────┘                                                              │
          ┌──────────────┐  weekly     ┌─────────────────────┐    exact join            │
 Tier 4   │ RGZ address  │ ──────────▶ │ staging.ar_addresses │ ───────────────▶ lat/lng on locations
          └──────────────┘             └─────────────────────┘                          │
                                                                                        ▼
                                       weekly: link_checks · diffs → edit_suggestions · v_verification_queue
```

Everything lands in `staging.*` first (schema patch 003), raw and untouched, with `fetched_at` and `source_url`. Matching and loading are idempotent SQL plus a little Python; re-running an importer never duplicates a record because every write goes through the registry-key match.

---

## 4. Quality gates

| Gate | Rule | Where |
|---|---|---|
| Identity | Never insert an organization when any of JBKJS, PIB, MB already exists. | `common/match.py` |
| Phone | Must parse as a valid RS number; stored E.164; display form kept. Reject numbers that are the municipality's generic switchboard on a JKP page unless the page says so. | `normalize.phone` |
| Address | Street + number must match the RGZ register within the JLS, or the location gets `geo_precision = 'jls'` and no map pin. | `sources/rgz_adresni_registar.py` |
| Hours | Structured rows only from recognised patterns; everything else stays `hours_text`. | `normalize.hours` |
| Agreement | Two independent sources agreeing on a field → `auto_verified`. One source → `unverified`. Conflict → `disputed`, queued. | loader |
| Freshness | `last_seen_at` updated on every successful re-crawl; 2 missed crawls → `stale`. | loader + cron |
| Links | Weekly check; 3 consecutive failures or a soft-404 → suggestion of kind `closed`. | `jobs/link_check.py` |

---

## 5. Schedule and cost

| Job | Cadence | Runtime | Cost |
|---|---|---|---|
| KJS snapshot import + diff | monthly (2nd) | minutes | 0 |
| National networks, chambers, open-data xlsx | quarterly | minutes | 0 |
| RGZ address register refresh | monthly | ~30 min (large CSV) | 0; storage ~2 GB in Postgres |
| Municipal crawler, full pass | quarterly, nights | 3 to 5 nights at 1 req/s | ≈$20 LLM tokens |
| Municipal crawler, top-50 JLS | monthly | 1 night | ≈$5 |
| Link checks | weekly | minutes | 0 |
| Wikidata/OSM refresh | quarterly | minutes | 0 |

Runs as Vercel Cron or GitHub Actions calling the Python package against Neon; the crawler runs on a small VPS (the same one as Directus) so long nightly jobs are not bound by serverless limits.

---

## 6. Order of work

1. Apply `db/schema.sql` v0.2 and `db/schema_patch_003_staging.sql`.
2. `python -m importers.sources.trezor_kjs --inspect` to see the XLS columns; set `KJS_COLUMNS`; run the import. This alone fills `organizations` for the whole country.
3. `rfzo_filijale.py` and `kji_imenik.py` (both parse verified structures) to prove the location + coverage path end to end.
4. Load the RZS settlement codebook and the RGZ address register; geocode the KJS seats.
5. Confirm the PU nadležnosti page, RGZ, PIO, NSZ branch pages and the courts subdomain pattern; write those importers.
6. Build the crawler profile for Niš (WordPress, sitemap available) as the reference implementation, then Belgrade (bespoke), then roll out by okrug seat.
7. Only after 1 to 6: the remaining 120 small municipalities.
