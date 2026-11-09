-- =============================================================================
--  Srbija Direktorijum javne uprave — PostgreSQL schema (v0.2, 2026-11-09)
--  v0.2: JBKJS is text + alphanumeric check (Trezor switches JBKJS to alphanumeric by 2026-04-01)
--  Target: PostgreSQL 16+ (Neon / Supabase / self-hosted). No PostGIS needed.
--
--  Conventions
--  * Identifiers in English; Serbian domain terms kept as enum values where
--    an English word would lose meaning (okrug, jls, jkp, filijala ...).
--  * Every public-facing entity carries: slug, name_lat + name_cyr, status,
--    verification block, provenance, timestamps, generated search vector.
--  * "Organization" = legal entity / organ (Poreska uprava, JKP Vodovod Niš).
--    "Location"     = a physical, addressable unit of it (Filijala Niš).
--    Users search for locations; SEO hubs aggregate by organization, by
--    territorial unit and by service.
--  * Coverage (location_coverage) answers the hardest question in Serbian
--    administration: "which office serves MY municipality?"
-- =============================================================================

begin;

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fuzzy / typo-tolerant search
create extension if not exists unaccent;   -- š→s, ć→c for slugs and search
create extension if not exists ltree;      -- territorial hierarchy paths

-- -----------------------------------------------------------------------------
-- 0. Helpers
-- -----------------------------------------------------------------------------

-- unaccent() is STABLE, generated columns need IMMUTABLE → thin wrapper.
create or replace function f_unaccent(text)
returns text language sql immutable parallel safe strict as
$$ select public.unaccent('public.unaccent', $1) $$;

-- Serbian-aware slugify: đ→dj (what Serbs actually type), then unaccent.
--   slugify_sr('Inđija')          → 'indjija'
--   slugify_sr('Grad Niš')        → 'grad-nis'
--   slugify_sr('Novi Beograd')    → 'novi-beograd'
create or replace function slugify_sr(text)
returns text language sql immutable parallel safe strict as
$$
  select trim(both '-' from
           regexp_replace(
             lower(f_unaccent(replace(replace($1, 'đ', 'dj'), 'Đ', 'Dj'))),
             '[^a-z0-9]+', '-', 'g'))
$$;

-- Deterministic Cyrillic → Latin transliteration (Serbian). Used when a
-- source only gives the Cyrillic name. Latin → Cyrillic is NOT deterministic
-- (lj / nj / dž digraph ambiguity) and is done in app code with a dictionary.
create or replace function cyr_to_lat(text)
returns text language sql immutable parallel safe strict as
$$
  select translate(
    replace(replace(replace(replace(replace(replace(
      $1, 'Љ','Lj'), 'Њ','Nj'), 'Џ','Dž'), 'љ','lj'), 'њ','nj'), 'џ','dž'),
    'АБВГДЂЕЖЗИЈКЛМНОПРСТЋУФХЦЧШабвгдђежзијклмнопрстћуфхцчш',
    'ABVGDĐEŽZIJKLMNOPRSTĆUFHCČŠabvgdđežzijklmnoprstćufhcčš')
$$;

create or replace function set_updated_at()
returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------

create type territorial_level as enum (
  'republika',        -- Republika Srbija (root, 1 row)
  'pokrajina',        -- AP Vojvodina, AP Kosovo i Metohija
  'okrug',            -- 29 upravnih okruga + Grad Beograd pseudo-okrug
  'jls',              -- jedinica lokalne samouprave: grad ili opština (174 by law, 145 administered)
  'gradska_opstina',  -- Beograd 17, Niš 5, Novi Sad 2, Požarevac 1, Vranje 1, Užice 1
  'naselje'           -- naseljeno mesto (~6,150). Loaded lazily, only where a location sits there.
);

create type jls_kind as enum ('grad', 'opstina');

create type jurisdiction_level as enum (
  'republika', 'pokrajina', 'okrug', 'jls', 'gradska_opstina'
);

-- The four layers from the product brief, plus a fifth for courts and
-- public-authority professions (javni beležnici, izvršitelji) which are the
-- most monetizable pages on the site and do not fit "javne ustanove".
create type org_group as enum (
  'republicki_organi',              -- ministarstva, Poreska uprava, APR, PIO, RGZ, MUP, RFZO, NSZ
  'lokalna_samouprava',             -- gradska/opštinska uprava, LPA, sekretarijati, mesne zajednice
  'javna_preduzeca',                -- JKP (vodovod, čistoća, parking, toplana) + JP (Pošta, EPS, Putevi)
  'javne_ustanove',                 -- dom zdravlja, CSR, škole, biblioteke, kulturni centri
  'pravosudje_i_javna_ovlascenja'   -- sudovi, tužilaštva, javni beležnici, javni izvršitelji
);

create type legal_form as enum (
  'organ_drzavne_uprave', 'organ_pokrajine', 'organ_jls',
  'javno_preduzece', 'jkp', 'javna_ustanova', 'agencija', 'fond', 'zavod',
  'direkcija', 'sud', 'tuzilastvo', 'nezavisno_telo',
  'javni_beleznik', 'javni_izvrsitelj', 'ostalo'
);

create type entity_status as enum ('active', 'inactive', 'merged', 'dissolved', 'unverified');

create type unit_kind as enum (
  'sediste', 'filijala', 'ispostava', 'ekspozitura', 'sluzba', 'odeljenje',
  'odsek', 'stanica', 'salter_sala', 'sudska_jedinica', 'ogranak',
  'mesna_kancelarija', 'punkt', 'ambulanta', 'ostalo'
);

create type contact_kind as enum (
  'phone', 'mobile', 'fax', 'email', 'website', 'viber', 'whatsapp',
  'facebook', 'instagram', 'other'
);

-- Serbian offices publish two schedules: when staff work, and when counters
-- are open to the public. Users only care about the second one.
create type hours_type as enum ('radno_vreme', 'rad_sa_strankama');

create type verification_state as enum (
  'unverified', 'auto_verified', 'human_verified', 'disputed', 'stale'
);

create type edit_kind   as enum ('correction', 'closed', 'moved', 'new_entity', 'hours', 'contact', 'other');
create type edit_status as enum ('pending', 'approved', 'rejected', 'duplicate', 'needs_info');

create type page_template as enum (
  'home', 'okrug_hub', 'jls_hub', 'gradska_opstina_hub', 'org_type_hub',
  'org_hub', 'location', 'service', 'service_jls', 'search'
);

create type slot_kind         as enum ('programmatic', 'sponsor', 'lead_form', 'affiliate', 'house');
create type partner_kind      as enum ('sponsor', 'lead_buyer', 'affiliate_network');
create type sponsorship_status as enum ('draft', 'pending_payment', 'active', 'paused', 'ended', 'cancelled');
create type lead_status       as enum ('new', 'routed', 'accepted', 'rejected', 'duplicate', 'spam', 'billed');
create type ad_event_type     as enum ('impression', 'viewable', 'click', 'lead_view', 'lead_submit');

-- -----------------------------------------------------------------------------
-- 2. Territorial hierarchy
-- -----------------------------------------------------------------------------

create table territorial_units (
  id                bigint generated always as identity primary key,
  level             territorial_level not null,
  parent_id         bigint references territorial_units(id) on delete restrict,
  path              ltree,                         -- e.g. '1.3.27.112' (ids), maintained by trigger
  slug              text not null,
  name_lat          text not null,                 -- 'Niš'
  name_cyr          text,                          -- 'Ниш'
  official_name_lat text,                          -- 'Grad Niš' / 'Opština Babušnica' / 'Gradska opština Palilula'
  jls_kind          jls_kind,                      -- only for level = 'jls'
  is_capital        boolean not null default false,-- Grad Beograd (sui generis: city + okrug-equivalent)
  in_kosovo         boolean not null default false,-- listed in law, not administered → hidden from nav
  seat_name_lat     text,                          -- sedište opštine (naselje), e.g. 'Babušnica'
  okrug_seat        boolean not null default false,-- this JLS is the seat of its okrug (hosts most filijale)
  -- codes (all nullable, all unique where present)
  rzs_code          text,                          -- RZS šifra opštine (statistics office)
  iso_3166_2        text,                          -- okrug: 'RS-20'; pokrajina: 'RS-VO', 'RS-KM'
  nuts3_code        text,                          -- okrug
  mb                char(8),                       -- matični broj of the JLS administration
  pib               char(9),
  jbkjs             text,                          -- Uprava za trezor KJS code of the JLS (alphanumeric since 2026)
  wikidata_id       text,                          -- 'Q3711'
  -- facts
  population_2022   integer,
  area_km2          numeric(8,2),
  postal_code_main  char(5),
  area_code         text,                          -- pozivni broj, '018'
  website           text,                          -- official portal, 'https://www.ni.rs'
  lat               double precision,
  lng               double precision,
  bbox              double precision[],            -- [minLng, minLat, maxLng, maxLat] for map framing
  -- editorial (SEO, hand-written or generated once then edited)
  intro_md          text,
  seo_title         text,
  seo_description   text,
  -- lifecycle
  status            entity_status not null default 'active',
  sort_order        integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  search            tsvector generated always as (
                      to_tsvector('simple',
                        coalesce(f_unaccent(name_lat), '') || ' ' ||
                        coalesce(name_cyr, '') || ' ' ||
                        coalesce(f_unaccent(official_name_lat), ''))
                    ) stored,
  constraint tu_jls_kind_only_for_jls check (
    (level = 'jls' and jls_kind is not null) or (level <> 'jls' and jls_kind is null)),
  constraint tu_root_has_no_parent check (
    (level = 'republika' and parent_id is null) or (level <> 'republika' and parent_id is not null)),
  constraint tu_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Slugs are unique among siblings ('palilula' exists under Beograd AND Niš)...
create unique index tu_parent_slug_uq on territorial_units (coalesce(parent_id, 0), slug);
-- ...and globally unique for JLS because they become top-level URL segments.
create unique index tu_jls_slug_uq on territorial_units (slug) where level = 'jls';
create unique index tu_iso_uq   on territorial_units (iso_3166_2) where iso_3166_2 is not null;
create unique index tu_rzs_uq   on territorial_units (rzs_code)   where rzs_code   is not null;
create index tu_parent_idx on territorial_units (parent_id);
create index tu_level_idx  on territorial_units (level) where status = 'active';
create index tu_path_gist  on territorial_units using gist (path);
create index tu_search_gin on territorial_units using gin (search);
create index tu_name_trgm  on territorial_units using gin (f_unaccent(name_lat) gin_trgm_ops);

create or replace function tu_set_path()
returns trigger language plpgsql as
$$
declare parent_path ltree;
begin
  if new.parent_id is null then
    new.path = new.id::text::ltree;
  else
    select path into parent_path from territorial_units where id = new.parent_id;
    new.path = parent_path || new.id::text::ltree;
  end if;
  return new;
end
$$;
create trigger tu_path_trg before insert or update of parent_id on territorial_units
  for each row execute function tu_set_path();
create trigger tu_updated_trg before update on territorial_units
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Organization taxonomy
-- -----------------------------------------------------------------------------

create table org_types (
  id                   smallint generated always as identity primary key,
  slug                 text not null unique,            -- 'poreska-uprava', 'jkp-vodovod', 'dom-zdravlja'
  "group"              org_group not null,
  name_lat             text not null,                    -- 'Poreska uprava'
  name_cyr             text,
  name_plural_lat      text,                             -- 'Filijale Poreske uprave' (hub H1)
  default_jurisdiction jurisdiction_level not null,      -- where instances of this type are founded
  default_legal_form   legal_form,
  one_per_jls          boolean not null default false,   -- e.g. Opštinska uprava, Dom zdravlja, CSR: exactly one per JLS
  national_network     boolean not null default false,   -- a single republic org with many locations (PU, RGZ, MUP, PIO)
  icon                 text,                             -- lucide icon name
  description_md       text,                             -- "Šta radi ova institucija" — reused on every page of the type
  faq_md               text,                             -- generic FAQ for the type (AdSense "sufficient content")
  seo_title_tpl        text,                             -- '{org} {jls} – adresa, telefon, radno vreme'
  seo_h1_tpl           text,
  lead_vertical_id     smallint,                         -- FK set after lead_verticals exists
  sort_order           integer not null default 100,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger org_types_updated_trg before update on org_types
  for each row execute function set_updated_at();

create table organizations (
  id                   bigint generated always as identity primary key,
  slug                 text not null unique,            -- 'poreska-uprava', 'jkp-naissus-nis', 'opstinska-uprava-babusnica'
  org_type_id          smallint not null references org_types(id),
  parent_org_id        bigint references organizations(id) on delete set null, -- Poreska uprava → Ministarstvo finansija
  jurisdiction         jurisdiction_level not null,
  founder_unit_id      bigint references territorial_units(id),  -- JLS that founded a JKP/ustanova; NULL for republic organs
  name_lat             text not null,                    -- 'JKP Naissus Niš'
  name_cyr             text,
  official_name_lat    text,                             -- 'Javno komunalno preduzeće za vodovod i kanalizaciju "Naissus" Niš'
  short_name           text,                             -- 'Naissus'
  legal_form           legal_form not null default 'ostalo',
  -- registry identifiers (the de-duplication keys across data sources)
  mb                   char(8),
  pib                  char(9),
  jbkjs                text,                             -- Uprava za trezor KJS code (alphanumeric since 2026) — seed key for the whole universe
  apr_registered       boolean,
  wikidata_id          text,
  -- contact at the legal-entity level (locations carry their own)
  website              text,
  email                text,
  logo_url             text,
  -- editorial
  description_md       text,
  seo_title            text,
  seo_description      text,
  -- lifecycle
  status               entity_status not null default 'active',
  merged_into_org_id   bigint references organizations(id),
  valid_from           date,
  valid_to             date,
  -- quality
  verification         verification_state not null default 'unverified',
  verified_at          timestamptz,
  verified_by          text,
  last_seen_at         timestamptz,                      -- last time a crawler confirmed the org still exists
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search               tsvector generated always as (
                         to_tsvector('simple',
                           coalesce(f_unaccent(name_lat), '') || ' ' ||
                           coalesce(name_cyr, '') || ' ' ||
                           coalesce(f_unaccent(official_name_lat), '') || ' ' ||
                           coalesce(f_unaccent(short_name), ''))
                       ) stored,
  constraint org_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint org_mb_format   check (mb  is null or mb  ~ '^[0-9]{8}$'),
  constraint org_pib_format  check (pib is null or pib ~ '^[0-9]{9}$'),
  constraint org_jbkjs_format check (jbkjs is null or jbkjs ~ '^[0-9A-Za-z]{3,12}$')
);
create unique index org_mb_uq    on organizations (mb)    where mb    is not null;
create unique index org_pib_uq   on organizations (pib)   where pib   is not null;
create unique index org_jbkjs_uq on organizations (jbkjs) where jbkjs is not null;
create index org_type_idx    on organizations (org_type_id) where status = 'active';
create index org_founder_idx on organizations (founder_unit_id);
create index org_parent_idx  on organizations (parent_org_id);
create index org_search_gin  on organizations using gin (search);
create index org_name_trgm   on organizations using gin (f_unaccent(name_lat) gin_trgm_ops);
create trigger org_updated_trg before update on organizations
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Locations (the pages users actually land on)
-- -----------------------------------------------------------------------------

create table locations (
  id                   bigint generated always as identity primary key,
  org_id               bigint not null references organizations(id) on delete cascade,
  parent_location_id   bigint references locations(id) on delete set null, -- ispostava → filijala
  slug                 text not null,                    -- unique per org: 'filijala-nis', 'ispostava-doljevac'
  unit_kind            unit_kind not null default 'sediste',
  unit_name_lat        text not null,                    -- 'Filijala Niš', 'Služba za katastar nepokretnosti Niš'
  unit_name_cyr        text,
  is_primary           boolean not null default false,   -- the organization's sedište
  -- where it physically sits (most granular unit known: gradska_opstina > jls)
  territorial_unit_id  bigint not null references territorial_units(id),
  settlement_name_lat  text,                             -- naselje if different from JLS seat ('Sevojno')
  street               text,                             -- 'Nikole Pašića'
  street_number        text,                             -- '24', '24a', 'bb'
  address_extra        text,                             -- 'II sprat, kancelarija 214'
  postal_code          char(5),
  address_display      text generated always as (
                         nullif(trim(coalesce(street, '') || ' ' || coalesce(street_number, '')), '')
                       ) stored,
  rgz_address_id       text,                             -- RGZ Adresni registar id, when matched
  lat                  double precision,
  lng                  double precision,
  geo_precision        text check (geo_precision in ('rooftop', 'street', 'settlement', 'jls', null)),
  google_place_id      text,                             -- for "Uputstva" deep link
  hours_text           text,                             -- raw fallback when structured hours unknown
  accessibility        jsonb not null default '{}'::jsonb, -- {"ramp":true,"elevator":false}
  notes_md             text,                             -- 'Šalter za lične karte je u dvorišnoj zgradi'
  -- lifecycle
  status               entity_status not null default 'active',
  moved_to_location_id bigint references locations(id),
  -- quality
  verification         verification_state not null default 'unverified',
  verified_at          timestamptz,
  verified_by          text,
  last_seen_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search               tsvector generated always as (
                         to_tsvector('simple',
                           coalesce(f_unaccent(unit_name_lat), '') || ' ' ||
                           coalesce(unit_name_cyr, '') || ' ' ||
                           coalesce(f_unaccent(street), '') || ' ' ||
                           coalesce(f_unaccent(settlement_name_lat), ''))
                       ) stored,
  constraint loc_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint loc_latlng_pair check ((lat is null) = (lng is null)),
  unique (org_id, slug)
);
create unique index loc_one_primary_per_org on locations (org_id) where is_primary;
create index loc_tu_idx     on locations (territorial_unit_id) where status = 'active';
create index loc_org_idx    on locations (org_id);
create index loc_parent_idx on locations (parent_location_id);
create index loc_search_gin on locations using gin (search);
create index loc_verif_idx  on locations (verification, verified_at);
create trigger loc_updated_trg before update on locations
  for each row execute function set_updated_at();

-- Odeljenja / šalteri inside a location (optional granularity; hours and
-- phones can attach here instead of to the whole location).
create table departments (
  id            bigint generated always as identity primary key,
  location_id   bigint not null references locations(id) on delete cascade,
  name_lat      text not null,                            -- 'Šalter za lična dokumenta', 'Pisarnica'
  name_cyr      text,
  room          text,                                     -- 'šalter 4', 'soba 12'
  sort_order    integer not null default 100,
  created_at    timestamptz not null default now()
);
create index dept_loc_idx on departments (location_id);

create table location_contacts (
  id             bigint generated always as identity primary key,
  location_id    bigint not null references locations(id) on delete cascade,
  department_id  bigint references departments(id) on delete cascade,
  kind           contact_kind not null,
  value          text not null,                           -- phones stored E.164: '+38118505111'
  value_display  text,                                    -- '018 505 111'
  label          text,                                    -- 'Centrala', 'Zakazivanje', 'Info za strance'
  is_primary     boolean not null default false,
  sort_order     integer not null default 100,
  verification   verification_state not null default 'unverified',
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contact_phone_e164 check (
    kind not in ('phone','mobile','fax','viber','whatsapp') or value ~ '^\+[1-9][0-9]{6,14}$')
);
create index contact_loc_idx on location_contacts (location_id);
create trigger contact_updated_trg before update on location_contacts
  for each row execute function set_updated_at();

create table opening_hours (
  id             bigint generated always as identity primary key,
  location_id    bigint not null references locations(id) on delete cascade,
  department_id  bigint references departments(id) on delete cascade,
  hours_type     hours_type not null default 'rad_sa_strankama',
  day_of_week    smallint not null check (day_of_week between 1 and 7),  -- 1 = ponedeljak
  opens          time not null,
  closes         time not null,
  break_start    time,
  break_end      time,
  valid_from     date,                                    -- seasonal schedules (letnje radno vreme)
  valid_to       date,
  note           text,                                    -- 'Sredom do 19h'
  created_at     timestamptz not null default now(),
  constraint hours_order check (closes > opens),
  constraint hours_break check ((break_start is null) = (break_end is null))
);
create index hours_loc_idx on opening_hours (location_id, hours_type);

-- Exceptions: state holidays, 'ne radi 14. i 15. februara', collective leave.
create table opening_exceptions (
  id           bigint generated always as identity primary key,
  location_id  bigint references locations(id) on delete cascade,   -- NULL = applies to every location (državni praznik)
  on_date      date not null,
  is_closed    boolean not null default true,
  opens        time,
  closes       time,
  reason       text,
  created_at   timestamptz not null default now()
);
create index exc_date_idx on opening_exceptions (on_date);

-- -----------------------------------------------------------------------------
-- 5. Coverage: which location serves which territory (and optionally for which service)
--    PU Filijala Pirot → Pirot, Babušnica, Bela Palanka, Dimitrovgrad
--    Osnovni sud Pirot → the same, but 'sudska jedinica Babušnica' covers Babušnica for some matters
-- -----------------------------------------------------------------------------

create table location_coverage (
  location_id          bigint not null references locations(id) on delete cascade,
  territorial_unit_id  bigint not null references territorial_units(id) on delete cascade,
  service_id           bigint,                             -- FK added after services table; NULL = all services
  note                 text,
  source_id            smallint,                           -- FK added after data_sources
  created_at           timestamptz not null default now(),
  unique nulls not distinct (location_id, territorial_unit_id, service_id)
);
create index cov_tu_idx on location_coverage (territorial_unit_id);

-- -----------------------------------------------------------------------------
-- 6. Services (usluge) — the high-intent SEO layer and the monetization trigger
-- -----------------------------------------------------------------------------

create table service_categories (
  id            smallint generated always as identity primary key,
  slug          text not null unique,                      -- 'licna-dokumenta', 'nekretnine-i-katastar'
  name_lat      text not null,
  name_cyr      text,
  icon          text,
  sort_order    integer not null default 100
);

create table services (
  id                   bigint generated always as identity primary key,
  slug                 text not null unique,               -- 'izvod-iz-maticne-knjige-rodjenih'
  category_id          smallint not null references service_categories(id),
  name_lat             text not null,                      -- 'Izvod iz matične knjige rođenih'
  name_cyr             text,
  summary              text,                               -- one sentence for cards
  description_md       text,                               -- "Kako da..." — the editorial body
  required_documents   jsonb not null default '[]'::jsonb, -- ["Lična karta na uvid", "Dokaz o uplati takse"]
  fees                 jsonb not null default '[]'::jsonb, -- [{"name":"Republička administrativna taksa","amount_rsd":1030,"account":"840-742221843-57","model":"97","reference":"<šifra opštine>"}]
  legal_basis          text,                               -- 'Zakon o matičnim knjigama, čl. 80'
  euprava_url          text,                               -- deep link to the eUprava service when it exists online
  online_available     boolean not null default false,
  typical_duration     text,                               -- 'odmah', '15 dana'
  faq_md               text,
  seo_title            text,
  seo_description      text,
  lead_vertical_id     smallint,                           -- FK set later: 'registracija-vozila' → 'osiguranje'
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search               tsvector generated always as (
                         to_tsvector('simple',
                           coalesce(f_unaccent(name_lat), '') || ' ' || coalesce(name_cyr, '') || ' ' ||
                           coalesce(f_unaccent(summary), ''))
                       ) stored
);
create index svc_cat_idx    on services (category_id);
create index svc_search_gin on services using gin (search);
create trigger svc_updated_trg before update on services
  for each row execute function set_updated_at();

-- Which TYPE of organization delivers a service (drives generated pages:
-- 'Izvod iz MKR' is delivered by every 'opstinska-uprava' → 145 pages).
create table org_type_services (
  org_type_id   smallint not null references org_types(id) on delete cascade,
  service_id    bigint   not null references services(id)  on delete cascade,
  is_primary    boolean  not null default true,              -- primary deliverer vs. 'also possible here'
  primary key (org_type_id, service_id)
);

-- Location-level overrides (a specific šalter, different hours, local fee note).
create table location_services (
  location_id   bigint not null references locations(id) on delete cascade,
  service_id    bigint not null references services(id)  on delete cascade,
  department_id bigint references departments(id) on delete set null,
  note          text,
  local_fee_rsd numeric(10,2),                                -- lokalna administrativna taksa differs per JLS
  is_available  boolean not null default true,
  primary key (location_id, service_id)
);

alter table location_coverage
  add constraint cov_service_fk foreign key (service_id) references services(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 7. Provenance, crowdsourcing, link health, audit
-- -----------------------------------------------------------------------------

create table data_sources (
  id            smallint generated always as identity primary key,
  code          text not null unique,     -- 'trezor_kjs', 'apr', 'euprava', 'rgz_adresni_registar', 'municipal_site', 'user_submission', 'manual'
  name          text not null,
  base_url      text,
  license       text,                     -- 'Otvoreni podaci (data.gov.rs)', 'Public record', 'ToS-restricted'
  refresh_cron  text,                     -- '0 4 1 * *'
  last_fetched_at timestamptz,
  notes         text
);

alter table location_coverage
  add constraint cov_source_fk foreign key (source_id) references data_sources(id);

-- Field-level provenance: where did THIS phone number come from, and when.
create table provenance (
  id           bigint generated always as identity primary key,
  entity_type  text not null check (entity_type in ('territorial_unit','organization','location','location_contact','opening_hours','service','coverage')),
  entity_id    bigint not null,
  field        text,                      -- NULL = whole record
  source_id    smallint not null references data_sources(id),
  source_url   text,
  fetched_at   timestamptz not null default now(),
  confidence   real check (confidence between 0 and 1),
  raw          jsonb                      -- the raw scraped fragment, for audit
);
create index prov_entity_idx on provenance (entity_type, entity_id);

-- "Prijavi grešku / Izmeni podatke" submissions. Applied by an admin, never directly.
create table edit_suggestions (
  id              bigint generated always as identity primary key,
  entity_type     text not null check (entity_type in ('organization','location','location_contact','opening_hours','service')),
  entity_id       bigint,                 -- NULL when kind = 'new_entity'
  kind            edit_kind not null,
  patch           jsonb not null,         -- {"street": {"old": "Nikole Pašića 24", "new": "Vožda Karađorđa 1"}, ...}
  message         text,                   -- free-text from the user
  evidence_url    text,                   -- link to the official notice, photo, etc.
  reporter_email  text,                   -- optional, for "obavesti me kad bude ispravljeno"
  reporter_ip_hash text,                  -- sha256(ip + daily salt): abuse control without storing IPs
  user_agent      text,
  page_path       text,                   -- where the form was submitted
  status          edit_status not null default 'pending',
  reviewer        text,
  review_note     text,
  reviewed_at     timestamptz,
  applied_at      timestamptz,
  duplicate_of    bigint references edit_suggestions(id),
  created_at      timestamptz not null default now()
);
create index edit_status_idx on edit_suggestions (status, created_at);
create index edit_entity_idx on edit_suggestions (entity_type, entity_id);

-- Every outbound official URL gets checked. Dead links are the #1 reason
-- directories rot; this table is what the weekly job and the admin queue read.
create table link_checks (
  id                   bigint generated always as identity primary key,
  url                  text not null unique,
  entity_type          text,
  entity_id            bigint,
  last_checked_at      timestamptz,
  last_status_code     smallint,
  final_url            text,              -- after redirects; if it changed, propose an edit
  consecutive_failures smallint not null default 0,
  content_hash         text,              -- detect "page replaced by homepage" soft-404s
  is_soft_404          boolean not null default false,
  next_check_at        timestamptz not null default now()
);
create index link_next_idx on link_checks (next_check_at);

create table change_log (
  id           bigint generated always as identity primary key,
  entity_type  text not null,
  entity_id    bigint not null,
  action       text not null check (action in ('insert','update','delete','merge')),
  before       jsonb,
  after        jsonb,
  actor        text not null default 'system',  -- admin email, 'importer:trezor_kjs', 'edit_suggestion:123'
  at           timestamptz not null default now()
);
create index chlog_entity_idx on change_log (entity_type, entity_id, at desc);

create table admin_users (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  display_name  text,
  role          text not null default 'editor' check (role in ('owner','admin','editor','sales')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. SEO plumbing
-- -----------------------------------------------------------------------------

-- Per-path overrides; the renderer merges these over template defaults.
create table seo_overrides (
  path             text primary key,       -- '/poreska-uprava/filijala-nis'
  title            text,
  description      text,
  h1               text,
  canonical_path   text,
  noindex          boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- Slug changes must never 404: write the old path here, middleware 301s.
create table redirects (
  from_path    text primary key,
  to_path      text not null,
  status_code  smallint not null default 301 check (status_code in (301, 302, 308)),
  created_at   timestamptz not null default now()
);

-- Daily aggregated views per path (from Plausible/Umami export or edge logs).
-- Drives (a) verification priority = traffic × staleness, (b) sponsor pricing tiers.
create table page_stats_daily (
  day          date not null,
  path         text not null,
  template     page_template,
  entity_type  text,
  entity_id    bigint,
  pageviews    integer not null default 0,
  visitors     integer not null default 0,
  primary key (day, path)
);
create index pstats_entity_idx on page_stats_daily (entity_type, entity_id, day desc);

-- -----------------------------------------------------------------------------
-- 9. Monetization
-- -----------------------------------------------------------------------------

-- A vertical = a type of local business that wants the user on a given page.
create table lead_verticals (
  id                     smallint generated always as identity primary key,
  slug                   text not null unique,     -- 'knjigovodstvo', 'advokat-nekretnine', 'javni-beleznik', 'geometar', 'osiguranje-vozila', 'selidbe', 'sudski-prevodilac'
  name_lat               text not null,
  pitch_lat              text,                     -- the one-liner shown above the form: 'Treba vam knjigovođa za novu firmu?'
  form_schema            jsonb not null default '[]'::jsonb, -- [{"name":"ime","label":"Ime i prezime","type":"text","required":true}, ...]
  default_price_rsd      numeric(10,2),            -- what we charge a lead buyer per accepted lead
  routing_mode           text not null default 'round_robin' check (routing_mode in ('round_robin','exclusive','auction','manual')),
  is_active              boolean not null default true,
  created_at             timestamptz not null default now()
);

alter table org_types add constraint org_types_vertical_fk
  foreign key (lead_vertical_id) references lead_verticals(id);
alter table services add constraint services_vertical_fk
  foreign key (lead_vertical_id) references lead_verticals(id);

-- Which pages show which vertical (most specific match wins: service > org_type > category).
create table vertical_triggers (
  id               smallint generated always as identity primary key,
  vertical_id      smallint not null references lead_verticals(id) on delete cascade,
  org_type_id      smallint references org_types(id) on delete cascade,
  service_id       bigint references services(id) on delete cascade,
  service_category_id smallint references service_categories(id) on delete cascade,
  priority         smallint not null default 100,
  check (num_nonnulls(org_type_id, service_id, service_category_id) = 1)
);

create table partners (
  id             bigint generated always as identity primary key,
  kind           partner_kind not null,
  name           text not null,                 -- brand name shown on site
  legal_name     text,
  pib            char(9),
  mb             char(8),
  website        text,
  contact_name   text,
  contact_email  text,
  contact_phone  text,
  billing_email  text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger partners_updated_trg before update on partners
  for each row execute function set_updated_at();

-- Where a partner operates and in which vertical (an accountant in Niš does
-- not want leads from Subotica).
create table partner_coverage (
  partner_id           bigint not null references partners(id) on delete cascade,
  vertical_id          smallint not null references lead_verticals(id) on delete cascade,
  territorial_unit_id  bigint not null references territorial_units(id) on delete cascade, -- subtree via ltree
  max_leads_per_month  integer,
  price_rsd            numeric(10,2),             -- negotiated per-lead price, overrides vertical default
  primary key (partner_id, vertical_id, territorial_unit_id)
);

-- Named placement zones in each page template. Dimensions reserved in CSS
-- so ads never shift layout (CLS) — the whole ad strategy depends on this.
create table ad_slots (
  id            smallint generated always as identity primary key,
  code          text not null unique,          -- 'loc_top_leaderboard', 'loc_sidebar_sponsor', 'loc_after_hours_native', 'loc_lead_form', 'jls_hub_inline_1'
  template      page_template not null,
  kind          slot_kind not null,
  width         smallint,
  height        smallint,
  position_note text,                          -- 'under address block, above opening hours'
  adsense_unit  text,                          -- fallback programmatic unit id when no sponsor
  is_active     boolean not null default true
);

create table creatives (
  id            bigint generated always as identity primary key,
  partner_id    bigint not null references partners(id) on delete cascade,
  kind          text not null check (kind in ('image','native_card','text_link')),
  headline      text,
  body          text,
  cta_text      text,                          -- 'Zakažite besplatne konsultacije'
  image_url     text,
  landing_url   text not null,
  width         smallint,
  height        smallint,
  is_approved   boolean not null default false,
  approved_by   text,
  created_at    timestamptz not null default now()
);

-- The fixed-fee monthly sponsorship: partner × slot × target.
-- Targeting columns are all optional; specificity = how many are set.
create table sponsorships (
  id                   bigint generated always as identity primary key,
  partner_id           bigint not null references partners(id) on delete cascade,
  slot_id              smallint not null references ad_slots(id),
  creative_id          bigint not null references creatives(id),
  territorial_unit_id  bigint references territorial_units(id),   -- subtree match via path
  org_type_id          smallint references org_types(id),
  org_id               bigint references organizations(id),
  service_id           bigint references services(id),
  location_id          bigint references locations(id),
  specificity          smallint generated always as (
                         num_nonnulls(territorial_unit_id, org_type_id, org_id, service_id, location_id)) stored,
  is_exclusive         boolean not null default true,              -- one sponsor per slot per target
  priority             smallint not null default 100,
  starts_at            date not null,
  ends_at              date not null,
  monthly_price_rsd    numeric(12,2) not null,
  max_impressions      integer,
  status               sponsorship_status not null default 'draft',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint spons_dates check (ends_at >= starts_at)
);
create index spons_active_idx on sponsorships (slot_id, status, starts_at, ends_at);
create trigger spons_updated_trg before update on sponsorships
  for each row execute function set_updated_at();

create table affiliate_programs (
  id             smallint generated always as identity primary key,
  slug           text not null unique,       -- 'osiguranje-online', 'knjigovodstveni-softver'
  name           text not null,
  network        text,                        -- direct / Awin / Impact / local
  url_template   text not null,               -- 'https://partner.rs/?ref=srbdir&sub={sub_id}'
  disclosure_lat text not null default 'Sponzorisani link',
  is_active      boolean not null default true
);

create table affiliate_links (
  id               bigint generated always as identity primary key,
  program_id       smallint not null references affiliate_programs(id) on delete cascade,
  service_id       bigint references services(id) on delete cascade,
  org_type_id      smallint references org_types(id) on delete cascade,
  anchor_lat       text not null,              -- 'Uporedite ponude za obavezno osiguranje'
  position         text not null default 'inline',  -- inline / sidebar / after_fees
  check (num_nonnulls(service_id, org_type_id) = 1)
);

create table leads (
  id                   bigint generated always as identity primary key,
  vertical_id          smallint not null references lead_verticals(id),
  partner_id           bigint references partners(id),             -- routed to (NULL until routed)
  -- page context at submission
  page_path            text not null,
  location_id          bigint references locations(id) on delete set null,
  service_id           bigint references services(id) on delete set null,
  territorial_unit_id  bigint references territorial_units(id) on delete set null,
  -- payload (schema per vertical.form_schema); PII lives ONLY here and is purged on schedule
  payload              jsonb not null,
  contact_email        text,
  contact_phone        text,
  dedupe_hash          text not null,                               -- sha256(vertical + lower(email|phone) + day)
  -- consent (Zakon o zaštiti podataka o ličnosti — Serbia's GDPR equivalent)
  consent_version      text not null,
  consent_at           timestamptz not null default now(),
  ip_hash              text,
  user_agent           text,
  honeypot_tripped     boolean not null default false,
  -- commercial
  status               lead_status not null default 'new',
  price_rsd            numeric(10,2),
  routed_at            timestamptz,
  partner_feedback     text,                                        -- why rejected
  purge_after          date generated always as (((consent_at at time zone 'UTC') + interval '180 days')::date) stored, -- UTC cast keeps the expression immutable
  created_at           timestamptz not null default now()
);
create unique index leads_dedupe_uq on leads (dedupe_hash);
create index leads_partner_idx on leads (partner_id, status, created_at desc);
create index leads_purge_idx   on leads (purge_after) where contact_email is not null or contact_phone is not null;

-- High-volume, append-only, partitioned by month. No PII. Powers sponsor
-- reports ("your banner: 12,430 views, 212 clicks in October").
create table ad_events (
  id              bigint generated always as identity,
  occurred_at     timestamptz not null default now(),
  event_type      ad_event_type not null,
  slot_id         smallint references ad_slots(id),
  sponsorship_id  bigint references sponsorships(id),
  creative_id     bigint references creatives(id),
  affiliate_link_id bigint references affiliate_links(id),
  page_path       text not null,
  template        page_template,
  territorial_unit_id bigint,
  session_hash    text,                      -- rotating daily hash, not a cookie id
  referrer_host   text,
  country         char(2),
  device          text check (device in ('mobile','desktop','tablet', null)),
  primary key (id, occurred_at)
) partition by range (occurred_at);

-- Create partitions ahead of time (cron job or pg_partman in production).
create table ad_events_2026_11 partition of ad_events for values from ('2026-11-01') to ('2026-12-01');
create table ad_events_2026_12 partition of ad_events for values from ('2026-12-01') to ('2027-01-01');
create table ad_events_2027_01 partition of ad_events for values from ('2027-01-01') to ('2027-02-01');
create index adev_spons_idx on ad_events (sponsorship_id, occurred_at);
create index adev_slot_idx  on ad_events (slot_id, occurred_at);

-- -----------------------------------------------------------------------------
-- 10. Serving helpers
-- -----------------------------------------------------------------------------

-- Pick the sponsorship for a slot given the page context. Most specific
-- active sponsorship wins; territorial targeting matches any ancestor
-- (a sponsor buying "Nišavski okrug" shows on every page inside it).
create or replace function pick_sponsorship(
  p_slot_code  text,
  p_tu_id      bigint,
  p_org_type_id smallint default null,
  p_org_id      bigint  default null,
  p_service_id  bigint  default null,
  p_location_id bigint  default null
) returns table (sponsorship_id bigint, creative_id bigint, partner_id bigint)
language sql stable as
$$
  with page_tu as (
    select path from territorial_units where id = p_tu_id
  )
  select s.id, s.creative_id, s.partner_id
  from sponsorships s
  join ad_slots sl on sl.id = s.slot_id
  left join territorial_units t on t.id = s.territorial_unit_id
  cross join page_tu
  where sl.code = p_slot_code
    and s.status = 'active'
    and current_date between s.starts_at and s.ends_at
    and (s.territorial_unit_id is null or t.path @> page_tu.path)
    and (s.org_type_id is null or s.org_type_id = p_org_type_id)
    and (s.org_id      is null or s.org_id      = p_org_id)
    and (s.service_id  is null or s.service_id  = p_service_id)
    and (s.location_id is null or s.location_id = p_location_id)
  order by s.specificity desc, s.priority asc, s.id
  limit 1
$$;

-- Everything a location page needs in one row (the renderer calls this,
-- then two small queries for contacts and hours).
create or replace view v_location_page as
select
  l.id                 as location_id,
  l.slug               as location_slug,
  l.unit_name_lat, l.unit_name_cyr, l.unit_kind, l.is_primary,
  l.address_display, l.address_extra, l.postal_code, l.settlement_name_lat,
  l.lat, l.lng, l.google_place_id, l.hours_text, l.notes_md, l.accessibility,
  l.status             as location_status,
  l.verification, l.verified_at, l.last_seen_at,
  o.id                 as org_id,
  o.slug               as org_slug,
  o.name_lat           as org_name_lat,
  o.name_cyr           as org_name_cyr,
  o.official_name_lat  as org_official_name_lat,
  o.website            as org_website,
  o.description_md     as org_description_md,
  ot.id                as org_type_id,
  ot.slug              as org_type_slug,
  ot.name_lat          as org_type_name_lat,
  ot."group"           as org_group,
  ot.lead_vertical_id,
  tu.id                as tu_id,
  tu.slug              as tu_slug,
  tu.name_lat          as tu_name_lat,
  tu.level             as tu_level,
  tu.path              as tu_path,
  jls.id               as jls_id,
  jls.slug             as jls_slug,
  jls.name_lat         as jls_name_lat,
  jls.official_name_lat as jls_official_name_lat,
  okr.id               as okrug_id,
  okr.name_lat         as okrug_name_lat
from locations l
join organizations o   on o.id = l.org_id
join org_types ot      on ot.id = o.org_type_id
join territorial_units tu on tu.id = l.territorial_unit_id
left join lateral (
  select * from territorial_units a
  where a.level = 'jls' and a.path @> tu.path
  limit 1) jls on true
left join lateral (
  select * from territorial_units a
  where a.level = 'okrug' and a.path @> tu.path
  limit 1) okr on true;

-- "Which office serves my municipality?" — the routing query behind the
-- JLS hub page and the search box. Falls back from explicit coverage to
-- locations physically inside the JLS, then to the okrug seat.
create or replace function locations_serving(p_jls_id bigint, p_org_type_slug text)
returns setof locations language sql stable as
$$
  with jls as (select path from territorial_units where id = p_jls_id),
  explicit as (
    select l.* from locations l
    join location_coverage c on c.location_id = l.id
    join organizations o on o.id = l.org_id
    join org_types ot on ot.id = o.org_type_id
    where ot.slug = p_org_type_slug and c.territorial_unit_id = p_jls_id and l.status = 'active'
  ),
  inside as (
    select l.* from locations l
    join organizations o on o.id = l.org_id
    join org_types ot on ot.id = o.org_type_id
    join territorial_units t on t.id = l.territorial_unit_id
    cross join jls
    where ot.slug = p_org_type_slug and l.status = 'active' and jls.path @> t.path
  )
  select * from explicit
  union
  select * from inside where not exists (select 1 from explicit)
$$;

-- Verification queue: most-visited stale records first.
create or replace view v_verification_queue as
select
  l.id as location_id, l.unit_name_lat, o.name_lat as org_name_lat,
  l.verification, l.verified_at,
  coalesce(sum(p.pageviews) filter (where p.day >= current_date - 30), 0) as views_30d,
  extract(day from now() - coalesce(l.verified_at, l.created_at))::int    as days_since_verified
from locations l
join organizations o on o.id = l.org_id
left join page_stats_daily p on p.entity_type = 'location' and p.entity_id = l.id
where l.status = 'active'
group by l.id, o.name_lat
order by (coalesce(sum(p.pageviews) filter (where p.day >= current_date - 30), 0) + 1)
       * greatest(extract(day from now() - coalesce(l.verified_at, l.created_at)), 1) desc;

commit;
