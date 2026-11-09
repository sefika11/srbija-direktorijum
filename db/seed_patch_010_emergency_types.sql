-- Patch 010: fire & rescue under MUP Sektor za vanredne situacije; police stations stay locations of PU organizations.
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('uprava-za-vanredne-situacije', 'republicki_organi', 'MUP – Uprava za vanredne situacije (vatrogasci)', 'МУП – Управа за ванредне ситуације (ватрогасци)', 'Vatrogasno-spasilačke jedinice', 'republika', 'organ_drzavne_uprave', false, true, 'flame', 17)
on conflict (slug) do nothing;
insert into search_synonyms (term, kind, slug, weight) values
  ('vatrogasci','type','uprava-za-vanredne-situacije',1), ('vatrogasna','type','uprava-za-vanredne-situacije',1), ('vatrogasna stanica','type','uprava-za-vanredne-situacije',1), ('pozar','type','uprava-za-vanredne-situacije',.8), ('193','type','uprava-za-vanredne-situacije',.8), ('vanredne situacije','type','uprava-za-vanredne-situacije',1),
  ('policijska stanica','type','mup-policijska-uprava',1), ('stanica policije','type','mup-policijska-uprava',1), ('192','type','mup-policijska-uprava',.8)
on conflict (term) do nothing;
