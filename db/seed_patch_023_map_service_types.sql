-- Patch 023 (2026-11-12): five private service types read from OpenStreetMap (importers/sources/osm_services.py, docs/08 §16).
-- Not official registers: every organisation and location of these types is stored as 'unverified' and the page names the map
-- as its source. Applied to Neon by the importer run; kept here so a rebuild has them. Idempotent.
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order, is_active, name_en, name_ru, name_de)
values
  ('benzinska-stanica', 'privatne_usluge', 'Benzinska stanica', 'Бензинска станица', 'Benzinske stanice', 'jls', 'ostalo', false, false, 'droplets', 396, true,
   'Fuel stations', 'Автозаправочные станции', 'Tankstellen'),
  ('auto-servis', 'privatne_usluge', 'Auto-servis, vulkanizer ili perionica', 'Ауто-сервис, вулканизер или перионица', 'Auto-servisi, vulkanizeri i perionice', 'jls', 'ostalo', false, false, 'car', 397, true,
   'Car repair, tyre shops and car washes', 'Автосервисы, шиномонтаж и автомойки', 'Autowerkstätten, Reifendienste und Waschanlagen'),
  ('optika', 'privatne_usluge', 'Optika', 'Оптика', 'Optike', 'jls', 'ostalo', false, false, 'microscope', 398, true,
   'Opticians', 'Оптики', 'Optiker'),
  ('turisticka-agencija', 'privatne_usluge', 'Turistička agencija', 'Туристичка агенција', 'Turističke agencije', 'jls', 'ostalo', false, false, 'compass', 399, true,
   'Travel agencies', 'Туристические агентства', 'Reisebüros'),
  ('teretana', 'privatne_usluge', 'Teretana ili fitnes centar', 'Теретана или фитнес центар', 'Teretane i fitnes centri', 'jls', 'ostalo', false, false, 'dumbbell', 400, true,
   'Gyms and fitness centres', 'Тренажёрные залы и фитнес-центры', 'Fitnessstudios')
on conflict (slug) do nothing;
