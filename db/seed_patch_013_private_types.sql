-- Patch 013: the private layer — a sixth group and its institution types (docs/06 §3).
begin;
alter type org_group add value if not exists 'privatne_usluge';
commit;
begin;
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  ('banka',                      'privatne_usluge', 'Banka',                          'Банка',                          'Banke i ekspoziture',            'jls', 'ostalo', false, true,  'bank',      300),
  ('advokat',                    'privatne_usluge', 'Advokatska kancelarija',         'Адвокатска канцеларија',         'Advokati',                       'jls', 'ostalo', false, false, 'scale',     310),
  ('racunovodstvena-agencija',   'privatne_usluge', 'Računovodstvena agencija',       'Рачуноводствена агенција',       'Računovođe i knjigovođe',        'jls', 'ostalo', false, false, 'calc',      320),
  ('osiguravajuce-drustvo',      'privatne_usluge', 'Osiguranje',                     'Осигурање',                      'Osiguravajuća društva i agenti', 'jls', 'ostalo', false, false, 'shield',    330),
  ('auto-skola',                 'privatne_usluge', 'Auto-škola',                     'Ауто-школа',                     'Auto-škole',                     'jls', 'ostalo', false, false, 'car',       340),
  ('privatna-ordinacija',        'privatne_usluge', 'Privatna ordinacija / klinika',  'Приватна ординација / клиника',  'Privatne ordinacije i klinike',  'jls', 'ostalo', false, false, 'hospital',  350),
  ('stomatoloska-ordinacija',    'privatne_usluge', 'Stomatološka ordinacija',        'Стоматолошка ординација',        'Stomatolozi',                    'jls', 'ostalo', false, false, 'tooth',     355),
  ('agencija-za-nekretnine',     'privatne_usluge', 'Agencija za nekretnine',         'Агенција за некретнине',         'Agencije za nekretnine',         'jls', 'ostalo', false, false, 'home',      360),
  ('veterinarska-stanica',       'privatne_usluge', 'Veterinarska stanica / ambulanta','Ветеринарска станица / амбуланта','Veterinari',                    'jls', 'ostalo', false, false, 'paw',       370),
  ('prevodilacka-agencija',      'privatne_usluge', 'Prevodilačka agencija',          'Преводилачка агенција',          'Prevodioci',                     'jls', 'ostalo', false, false, 'globe',     380)
on conflict (slug) do nothing;
insert into search_synonyms (term, kind, slug, weight) values
  ('banka','type','banka',1), ('banke','type','banka',1), ('bankomat','type','banka',.8), ('racun','type','banka',.7), ('kartica','type','banka',.6), ('bank','type','banka',1),
  ('advokat','type','advokat',1), ('advokati','type','advokat',1), ('advokatska kancelarija','type','advokat',1), ('pravna pomoc','type','advokat',.8), ('lawyer','type','advokat',1),
  ('knjigovodja','type','racunovodstvena-agencija',1), ('knjigovodstvo','type','racunovodstvena-agencija',1), ('racunovodja','type','racunovodstvena-agencija',1), ('racunovodstvo','type','racunovodstvena-agencija',1), ('accountant','type','racunovodstvena-agencija',1),
  ('osiguranje','type','osiguravajuce-drustvo',1), ('osiguravajuca kuca','type','osiguravajuce-drustvo',1), ('insurance','type','osiguravajuce-drustvo',1),
  ('auto skola','type','auto-skola',1), ('autoskola','type','auto-skola',1), ('vozacki ispit','type','auto-skola',.7), ('driving school','type','auto-skola',1),
  ('ordinacija','type','privatna-ordinacija',1), ('privatna ordinacija','type','privatna-ordinacija',1), ('privatna klinika','type','privatna-ordinacija',1), ('laboratorija','type','privatna-ordinacija',.8), ('private clinic','type','privatna-ordinacija',1),
  ('zubar','type','stomatoloska-ordinacija',1), ('stomatolog','type','stomatoloska-ordinacija',1), ('dentist','type','stomatoloska-ordinacija',1),
  ('nekretnine','type','agencija-za-nekretnine',1), ('agencija za nekretnine','type','agencija-za-nekretnine',1), ('stan','type','agencija-za-nekretnine',.5), ('real estate','type','agencija-za-nekretnine',1),
  ('veterinar','type','veterinarska-stanica',1), ('veterinarska','type','veterinarska-stanica',1), ('vet','type','veterinarska-stanica',.8),
  ('prevodilac','type','prevodilacka-agencija',1), ('prevod','type','prevodilacka-agencija',.8), ('translator','type','prevodilacka-agencija',1)
on conflict (term) do nothing;
commit;
