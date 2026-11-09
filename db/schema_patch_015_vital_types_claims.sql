-- Patch 015: vital-layer institution types, listing claims, featured placements, completeness view (docs/08).
begin;
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('ambasada',               'republicki_organi',       'Ambasada',                         'Амбасада',                         'Ambasade',                              'republika', 'ostalo', false, false, 'globe',    95),
  ('konzulat',               'republicki_organi',       'Konzulat',                         'Конзулат',                         'Konzulati',                             'republika', 'ostalo', false, false, 'globe',    96),
  ('geodetska-agencija',     'privatne_usluge',         'Geodetska organizacija',           'Геодетска организација',           'Geodetske organizacije i geometri',     'jls',    'ostalo', false, false, 'map',      385),
  ('projektni-biro',         'privatne_usluge',         'Projektni biro / arhitekta',       'Пројектни биро / архитекта',       'Arhitekte i projektni biroi',           'jls',    'ostalo', false, false, 'building', 386),
  ('agencija-za-selidbe',    'privatne_usluge',         'Agencija za selidbe',              'Агенција за селидбе',              'Selidbe i transport',                   'jls',    'ostalo', false, false, 'truck',    387),
  ('privatni-vrtic',         'privatne_usluge',         'Privatni vrtić',                   'Приватни вртић',                   'Privatni vrtići',                       'jls',    'ostalo', false, false, 'child',    388),
  ('dom-za-stare',           'privatne_usluge',         'Dom za stare',                     'Дом за старе',                     'Domovi za stare i socijalna zaštita',   'jls',    'ostalo', false, false, 'heart',    389),
  ('tehnicki-pregled',       'privatne_usluge',         'Tehnički pregled vozila',          'Технички преглед возила',          'Tehnički pregledi vozila',              'jls',    'ostalo', false, false, 'car',      390),
  ('privatna-laboratorija',  'privatne_usluge',         'Privatna laboratorija',            'Приватна лабораторија',            'Privatne laboratorije',                 'jls',    'ostalo', false, false, 'hospital', 391),
  ('jkp-gas',                'javna_preduzeca',         'Distribucija gasa',                'Дистрибуција гаса',                'Distributeri gasa',                     'jls',    'jkp',     false, false, 'flame',    215),
  ('jp-putevi',              'javna_preduzeca',         'JP za puteve i izgradnju',         'ЈП за путеве и изградњу',          'Putevi i izgradnja',                    'jls',    'javno_preduzece',     false, false, 'road',     216),
  ('jp-stambeno',            'javna_preduzeca',         'JP gradsko stambeno',              'ЈП градско стамбено',              'Stambena preduzeća',                    'jls',    'javno_preduzece',     false, false, 'home',     217)
on conflict (slug) do nothing;
insert into search_synonyms (term, kind, slug, weight) values
  ('ambasada','type','ambasada',1), ('embassy','type','ambasada',1), ('konzulat','type','konzulat',1), ('consulate','type','konzulat',1), ('viza','type','ambasada',.6),
  ('geometar','type','geodetska-agencija',1), ('geodeta','type','geodetska-agencija',1), ('geodetska','type','geodetska-agencija',1), ('premer','type','geodetska-agencija',.7), ('surveyor','type','geodetska-agencija',1),
  ('arhitekta','type','projektni-biro',1), ('projektant','type','projektni-biro',1), ('projektni biro','type','projektni-biro',1), ('legalizacija','type','projektni-biro',.6), ('architect','type','projektni-biro',1),
  ('selidbe','type','agencija-za-selidbe',1), ('selidba','type','agencija-za-selidbe',1), ('movers','type','agencija-za-selidbe',1),
  ('privatni vrtic','type','privatni-vrtic',1), ('vrtic','type','privatni-vrtic',.6), ('jaslice','type','privatni-vrtic',.7), ('kindergarten','type','privatni-vrtic',.8),
  ('dom za stare','type','dom-za-stare',1), ('starački dom','type','dom-za-stare',1), ('staracki dom','type','dom-za-stare',1), ('nursing home','type','dom-za-stare',1),
  ('tehnicki pregled','type','tehnicki-pregled',1), ('tehnički pregled','type','tehnicki-pregled',1), ('registracija','type','tehnicki-pregled',.6), ('mot','type','tehnicki-pregled',.5),
  ('laboratorija','type','privatna-laboratorija',1), ('analize krvi','type','privatna-laboratorija',.9), ('lab','type','privatna-laboratorija',.8),
  ('gas','type','jkp-gas',.8), ('distribucija gasa','type','jkp-gas',1), ('putevi','type','jp-putevi',.8), ('stambeno','type','jp-stambeno',.8)
on conflict (term) do nothing;

insert into data_sources (code, name, base_url, license, notes) values
  ('mpravde_prevodioci', 'Ministarstvo pravde – registar stalnih sudskih prevodilaca', 'https://www.mpravde.gov.rs', 'public-sector information', 'official registry (docs/08)'),
  ('mfa_diplomatska_lista', 'MSP – strana diplomatsko-konzularna predstavništva', 'https://www.mfa.gov.rs', 'public-sector information', 'official registry (docs/08)'),
  ('rgz_geodetske', 'RGZ – registar geodetskih organizacija', 'https://www.rgz.gov.rs', 'public-sector information', 'official registry (docs/08)'),
  ('minrzs_licence', 'MRZS – licencirani pružaoci usluga socijalne zaštite', 'https://www.minrzs.gov.rs', 'public-sector information', 'official registry (docs/08)'),
  ('mpntr_registar', 'MPNTR – registar obrazovnih ustanova', 'https://prosveta.gov.rs', 'public-sector information', 'official registry (docs/08)'),
  ('abs_tehnicki', 'ABS/MUP – ovlašćeni tehnički pregledi', 'https://www.abs.gov.rs', 'public-sector information', 'official registry (docs/08)')
on conflict (code) do nothing;

-- Claims: a business asks to own its row. Verified claims unlock editing and the "Potvrđeno od institucije" chip.
create table if not exists listing_claims (
  id bigserial primary key,
  org_id bigint not null references organizations(id) on delete cascade,
  location_id bigint references locations(id) on delete set null,
  claimant_name text not null,
  claimant_role text,
  email text not null,
  phone text,
  message text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired')),
  verify_token text not null default encode(gen_random_bytes(16), 'hex'),
  verified_at timestamptz,
  reviewed_by text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists listing_claims_org_idx on listing_claims (org_id, status);

-- Featured placement: one paid slot per (territorial unit × type); shown first in that list with a "Sponzor" label.
create table if not exists featured_listings (
  id bigserial primary key,
  org_id bigint not null references organizations(id) on delete cascade,
  location_id bigint references locations(id) on delete set null,
  org_type_id smallint not null references org_types(id),
  territorial_unit_id bigint references territorial_units(id),   -- null = nationwide for that type
  partner_id bigint references partners(id),
  tier text not null default 'featured' check (tier in ('featured','highlight')),
  price_rsd integer,
  starts_at date not null default current_date,
  ends_at date not null,
  status text not null default 'active' check (status in ('active','paused','ended')),
  created_at timestamptz not null default now(),
  constraint featured_window check (ends_at > starts_at)
);
create unique index if not exists featured_one_per_slot on featured_listings (org_type_id, coalesce(territorial_unit_id, 0)) where status = 'active';

-- Completeness per municipality: the retention metric and the sales pitch in one view.
create or replace view v_jls_completeness as
select tu.id as jls_id, tu.slug, tu.name_lat,
       count(distinct o.id) as orgs,
       count(l.id) as locations,
       count(l.id) filter (where exists (select 1 from location_contacts c where c.location_id = l.id and c.kind = 'phone')) as with_phone,
       count(l.id) filter (where exists (select 1 from opening_hours h where h.location_id = l.id)) as with_hours,
       count(l.id) filter (where exists (select 1 from location_contacts c where c.location_id = l.id and c.kind = 'website')) as with_website,
       round(100.0 * count(l.id) filter (where exists (select 1 from location_contacts c where c.location_id = l.id and c.kind = 'phone')) / nullif(count(l.id), 0), 1) as phone_pct
from territorial_units tu
join territorial_units sub on sub.path <@ tu.path
join locations l on l.territorial_unit_id = sub.id and l.status = 'active'
join organizations o on o.id = l.org_id and o.status = 'active'
where tu.level = 'jls'
group by tu.id, tu.slug, tu.name_lat;
commit;
