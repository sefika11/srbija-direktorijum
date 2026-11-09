-- Seed patch 005 (2026-11-09): higher education + student housing types (the KJS register lists every
-- public university, faculty, visoka škola and student dormitory; the first import filed them as schools).
begin;
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('univerzitet',     'javne_ustanove', 'Univerzitet',                  'Универзитет',                 'Univerziteti',                 'republika', 'javna_ustanova', false, false, 'graduation-cap', 73),
  ('fakultet',        'javne_ustanove', 'Fakultet',                     'Факултет',                    'Fakulteti',                    'republika', 'javna_ustanova', false, false, 'graduation-cap', 74),
  ('visoka-skola',    'javne_ustanove', 'Visoka škola / akademija strukovnih studija', 'Висока школа / академија струковних студија', 'Visoke škole i akademije', 'republika', 'javna_ustanova', false, false, 'graduation-cap', 76),
  ('studentski-dom',  'javne_ustanove', 'Studentski centar / dom učenika', 'Студентски центар / дом ученика', 'Studentski i učenički domovi', 'republika', 'javna_ustanova', false, false, 'bed', 77)
on conflict (slug) do nothing;
commit;
