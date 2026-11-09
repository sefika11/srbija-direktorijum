-- Schema patch 003 (2026-11-09): staging area for importers and the crawler.
-- Raw data lands here untouched; matching/loading into public tables is a second step.
begin;

create schema if not exists staging;

-- One row per KJS record per snapshot. Keeps history so monthly diffs are a query.
create table if not exists staging.kjs_snapshot (
  snapshot_date  date not null,
  jbkjs          text not null,
  naziv          text,
  mb             text,
  pib            text,
  tip            text,            -- KJS type code as published
  nadredjeni     text,            -- parent JBKJS
  opstina        text,            -- seat municipality as published (Cyrillic)
  adresa         text,
  raw            jsonb not null,  -- entire source row
  fetched_at     timestamptz not null default now(),
  primary key (snapshot_date, jbkjs)
);

-- Generic landing table for every list-type source (RFZO filijale, KJI imenik, notaries, CSR xlsx ...).
create table if not exists staging.source_rows (
  id           bigint generated always as identity primary key,
  source_code  text not null,         -- data_sources.code
  source_url   text not null,
  row_key      text not null,         -- stable key inside the source (row index, slug, MB ...)
  fetched_at   timestamptz not null default now(),
  payload      jsonb not null,
  processed_at timestamptz,
  match_result jsonb,                 -- {"organization_id":..., "location_id":..., "method":"jbkjs|pib|mb|trgm|new", "score":0.93}
  unique (source_code, row_key, fetched_at)
);
create index if not exists source_rows_pending on staging.source_rows (source_code) where processed_at is null;

-- Fetched municipal pages, after classification, before extraction.
create table if not exists staging.crawl_pages (
  id            bigint generated always as identity primary key,
  jls_id        bigint references territorial_units(id),
  url           text not null,
  fetched_at    timestamptz not null default now(),
  status_code   smallint,
  content_hash  text,
  title         text,
  page_class    text,                 -- kontakt | uprava | jkp | ustanove | mesne_zajednice | radno_vreme | other
  class_score   real,
  text_excerpt  text,                 -- cleaned main text, capped (what the extractor sees)
  extracted     jsonb,                -- ExtractedPage JSON from crawler/extract.py
  extracted_at  timestamptz,
  model         text,                 -- model id used for extraction
  unique (url, content_hash)
);
create index if not exists crawl_pages_jls on staging.crawl_pages (jls_id, page_class);

-- RGZ address register (house numbers with coordinates). Loaded from the open-data CSV.
create table if not exists staging.ar_addresses (
  adresni_kod     text primary key,   -- jedinstveni adresni kod
  opstina_mb      text,               -- RGZ municipality code
  opstina_naziv   text,
  naselje_naziv   text,
  ulica_mb        text,
  ulica_naziv     text,
  kucni_broj      text,
  lat             double precision,
  lng             double precision,
  loaded_at       timestamptz not null default now()
);
create index if not exists ar_lookup on staging.ar_addresses (opstina_naziv, ulica_naziv, kucni_broj);
create index if not exists ar_ulica_trgm on staging.ar_addresses using gin (f_unaccent(ulica_naziv) gin_trgm_ops);

-- Exact-match geocoder over the register. Returns NULL when no match; the caller then
-- tries a trigram-relaxed street match, then falls back to Nominatim.
create or replace function staging.geocode_exact(p_opstina text, p_ulica text, p_broj text)
returns table (lat double precision, lng double precision, adresni_kod text)
language sql stable as
$$
  select a.lat, a.lng, a.adresni_kod
  from staging.ar_addresses a
  where f_unaccent(lower(a.opstina_naziv)) = f_unaccent(lower(p_opstina))
    and f_unaccent(lower(a.ulica_naziv))   = f_unaccent(lower(p_ulica))
    and lower(regexp_replace(a.kucni_broj, '\s', '', 'g')) = lower(regexp_replace(p_broj, '\s', '', 'g'))
  limit 1
$$;

commit;
