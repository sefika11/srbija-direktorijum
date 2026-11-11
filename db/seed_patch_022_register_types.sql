-- Patch 022 (2026-11-11): two types read from official registers, and the Veterinary Directorate as a source.
-- Already applied to Neon by hand; kept here so a rebuild has them. Idempotent.
insert into data_sources (code, name, base_url, license, notes)
select 'uprava_veterina', 'Uprava za veterinu – registri objekata za životinje', 'https://www.vet.minpolj.gov.rs/registri/', 'public-sector information', 'official register (docs/08 §14)'
where not exists (select 1 from data_sources where code = 'uprava_veterina');

insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order, is_active, name_en, name_ru, name_de)
values
  ('prihvatiliste-za-zivotinje', 'javna_preduzeca', 'Prihvatilište za životinje', 'Прихватилиште за животиње', 'Prihvatilišta za životinje', 'jls', 'jkp', false, false, 'paw', 218, true,
   'Animal shelters', 'Приюты для животных', 'Tierheime'),
  ('cpc-centar', 'privatne_usluge', 'Centar za obuku profesionalnih vozača (CPC)', 'Центар за обуку професионалних возача (CPC)', 'Centri za obuku profesionalnih vozača (CPC)', 'jls', 'ostalo', false, false, 'truck', 392, true,
   'Professional driver training centres (CPC)', 'Центры подготовки профессиональных водителей (CPC)', 'Schulungszentren für Berufskraftfahrer (CPC)')
on conflict (slug) do nothing;
