-- Patch 018: exact visa application instructions (docs/08 visa layer): per-country outbound instructions and the general inbound procedure.
begin;
alter table countries add column if not exists from_rs_instructions jsonb;      -- {where, apply_url, appointment_url, documents[], fee, processing, validity, notes, source_url}
alter table countries add column if not exists instructions_note text;          -- why none, when null
create table if not exists site_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('telekom-prodavnica', 'privatne_usluge', 'Telekom prodavnica', 'Телеком продавница', 'Prodavnice mobilnih operatera', 'jls', 'ostalo', false, true, 'phone', 392)
on conflict (slug) do nothing;
insert into search_synonyms (term, kind, slug, weight) values ('mts','type','telekom-prodavnica',1), ('telekom','type','telekom-prodavnica',1), ('yettel','type','telekom-prodavnica',1), ('a1','type','telekom-prodavnica',.8), ('sbb','type','telekom-prodavnica',.9), ('mobilni operater','type','telekom-prodavnica',1), ('sim kartica','type','telekom-prodavnica',.8) on conflict (term) do nothing;
commit;
