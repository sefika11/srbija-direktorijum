# importers

Python 3.12 package. Every importer is idempotent: it stages raw rows, matches by registry key
(JBKJS > PIB > MB > name+JLS trigram), upserts, and writes provenance.

```bash
# from the repo root (modules run as python -m importers.<module>)
python3.12 -m venv .venv && . .venv/bin/activate
pip install httpx pydantic 'psycopg[binary]' beautifulsoup4 lxml xlrd openpyxl phonenumbers tenacity pyyaml anthropic
export DATABASE_URL=postgres://...   # Neon
export CRAWLER_CONTACT_URL=https://<domain>/o-sajtu   # goes into the User-Agent
export ANTHROPIC_API_KEY=...         # only for crawler/extract.py
```

Apply `db/seed_patch_006_sources.sql`, `schema_patch_007_guides.sql`, `schema_patch_008_search.sql`, `seed_patch_009_partner_vertical.sql`, `seed_patch_010_emergency_types.sql`, `schema_patch_011_private.sql` once per database (adds the `data_sources` rows the importers write provenance against).

Run order (see docs/03_data_sourcing_and_scraping.md §6):

```bash
python -m importers.sources.rzs_codebooks                 # RZS opštine + naselja codebooks → staging + rzs/nuts3 codes
python -m importers.sources.trezor_kjs --inspect          # print header + samples from the Treasury XLS
python -m importers.sources.trezor_kjs                    # stage + load organizations
python -m importers.sources.rfzo_filijale                 # locations + coverage for RFZO
python -m importers.sources.kji_imenik                    # javni izvršitelji
python -m importers.sources.beleznik_kancelarije          # javni beležnici
python -m importers.sources.rfzo_apoteke                  # private layer: 3,400 contracted private pharmacies (XLSX)
python -m importers.sources.osm_emergency                 # police + fire stations from the Geofabrik Serbia PBF (needs .cache/osm/serbia-latest.osm.pbf + srb_adm2.geojson)
python -m importers.sources.rgz_adresni_registar          # address register → staging.ar_addresses
python -m importers.crawler.discover nis                  # build/refresh a JLS crawl profile
python -m importers.crawler.extract nis                   # LLM extraction of classified pages
python -m importers.jobs.link_check                       # weekly
```
