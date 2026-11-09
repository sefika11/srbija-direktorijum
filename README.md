# Srbija Direktorijum javne uprave

Directory of every government institution, ministry, local organ, public utility and public institution across all 145 Serbian cities and municipalities. Monetized through local sponsorships, B2B lead forms, affiliate links and programmatic ads.

## Layout

- `docs/01_blueprint_schema_and_stack.md` – Part 1: taxonomy, data model, URL architecture, tech stack.
- `docs/02_monetization_placement_and_page_template.md` – Part 2: ad/lead-form placement map, policy rules, lead form and sponsor card design.
- `docs/03_data_sourcing_and_scraping.md` – Part 3: verified source inventory, legal posture, pipeline, quality gates, schedule.
- `db/schema.sql` – PostgreSQL 16+ DDL, v0.2 (extensions: pgcrypto, pg_trgm, unaccent, ltree).
- `db/seed_core.sql` – Republika, 2 AP, 30 okrug rows, 145 JLS, 27 gradske opštine, org types, service categories, lead verticals, ad slots, data sources.
- `db/seed_patch_002_slots.sql` – two extra ad slots from Part 2.
- `db/schema_patch_003_staging.sql` – `staging` schema for importers and the crawler, plus the exact geocoder over the RGZ address register.
- `db/seed_patch_004_generic_types.sql` – generic fallback org types + codebook staging tables.
- `db/dumps/srbdir_2026-11-09_kjs.sql.gz` – full dump after the first Treasury KJS import (schema + seeds + 10,162 organizations). Restore with `gunzip -c db/dumps/srbdir_2026-11-09_kjs.sql.gz | psql "$DATABASE_URL"`.
- `templates/` – location page template, filled Niš example, labelled wireframe (HTML).
- `apps/web/` – the website (Next.js 15, App Router, Tailwind v4): home with interactive district map, hubs, institution pages, search, 4-language UI. See `apps/web/README.md`.
- `importers/` – Python 3.12 package: polite HTTP client, normalizers, matcher, Trezor KJS / RFZO / izvršitelji / beležnici / RGZ importers, municipal crawler (discover + LLM extract), link checker. See `importers/README.md`.

## Run

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

```bash
psql "$DATABASE_URL" -f db/seed_core.sql
```

```bash
psql "$DATABASE_URL" -f db/seed_patch_002_slots.sql
```

```bash
psql "$DATABASE_URL" -f db/schema_patch_003_staging.sql
```

```bash
psql "$DATABASE_URL" -f db/seed_patch_004_generic_types.sql
```

Or restore everything including the first KJS import in one step:

```bash
gunzip -c db/dumps/srbdir_2026-11-09_kjs.sql.gz | psql "$DATABASE_URL"
```

Expected after seed:

```sql
select level, count(*) from territorial_units group by 1 order by 1;
-- gradska_opstina 27 | jls 145 | okrug 30 | pokrajina 2 | republika 1
```
