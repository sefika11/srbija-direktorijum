-- Seed patch 004 (2026-11-09): generic fallback org types so the KJS importer never guesses.
-- A KJS row whose name matches no specific rule lands in the generic type of its group; editors reclassify.
begin;
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('drzavni-organ',  'republicki_organi',  'Državni organ / služba',        'Државни орган / служба',        'Državni organi i službe',          'republika', 'organ_drzavne_uprave', false, false, 'landmark', 25),
  ('organ-jls',      'lokalna_samouprava', 'Organ lokalne samouprave',      'Орган локалне самоуправе',      'Organi lokalne samouprave',         'jls',       'organ_jls',            false, false, 'building', 37),
  ('javno-preduzece','javna_preduzeca',    'Javno preduzeće / društvo',     'Јавно предузеће / друштво',     'Javna preduzeća i društva',         'jls',       'javno_preduzece',      false, false, 'factory', 55),
  ('ustanova',       'javne_ustanove',     'Javna ustanova',                'Јавна установа',                'Javne ustanove',                    'jls',       'javna_ustanova',       false, false, 'building-2', 75),
  ('pravosudni-organ','pravosudje_i_javna_ovlascenja', 'Pravosudni organ',  'Правосудни орган',              'Pravosudni organi',                 'okrug',     'ostalo',               false, false, 'scale', 91)
on conflict (slug) do nothing;

-- Treasury organisational units (filijale/ekspoziture) are listed per KJS in the Treasury register.
-- A staging map from the Treasury's local-treasury code to our JLS id, filled by the importer.
create table if not exists staging.kjs_local_treasury (
  treasury_code  text primary key,       -- 'Ознака трезора' for JLS budgets (e.g. '501' = Grad Beograd)
  jls_id         bigint references territorial_units(id),
  budget_name    text
);
create table if not exists staging.rzs_naselja (
  sifra          text primary key,
  naziv_cyr      text,
  naziv_lat      text,
  opstina_sifra  text,
  opstina_naziv  text,
  jls_id         bigint references territorial_units(id)
);
create index if not exists rzs_naselja_name on staging.rzs_naselja (upper(naziv_cyr));
commit;
