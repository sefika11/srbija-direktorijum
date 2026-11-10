-- Patch 017: countries and the visa regime in both directions (MSP), for /vize and the embassy pages (docs/08 §2 row 9).
begin;
create table if not exists countries (
  iso2 char(2) primary key,
  name_sr text not null,
  name_en text not null,
  slug text not null unique,
  to_rs_regime text,               -- 'bez vize' | 'viza' | 'eviza' | null  (their citizens entering Serbia)
  to_rs_stay text,
  to_rs_conditions text,
  to_rs_url text,
  from_rs_regime text,             -- 'bez vize' | 'viza' | 'eviza' | 'eta' | null (Serbian citizens travelling there)
  from_rs_stay text,
  from_rs_passport text,
  from_rs_requirements jsonb not null default '[]'::jsonb,
  from_rs_url text,
  rs_mission_name text,
  rs_mission_city text,
  source_fetched_at date,
  updated_at timestamptz not null default now()
);
create index if not exists countries_to_rs_idx on countries (to_rs_regime);
insert into data_sources (code, name, base_url, license, notes) values
  ('mfa_vizni_rezim', 'MSP – vizni režim i uslovi ulaska', 'https://www.mfa.gov.rs', 'public-sector information', 'both directions of the visa regime, per country')
on conflict (code) do nothing;
insert into search_synonyms (term, kind, slug, weight) values
  ('viza','type','ambasada',.7), ('vize','type','ambasada',.7), ('visa','type','ambasada',.7), ('pasos','type','ambasada',.4), ('putovanje','type','ambasada',.5)
on conflict (term) do nothing;
commit;
