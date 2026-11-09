-- Patch 008: search log (zero-result queries are the editorial backlog) + hand-maintained synonyms.
begin;
create table if not exists search_log (
  id          bigint generated always as identity primary key,
  q           text not null,
  locale      text not null default 'sr',
  place_slug  text,
  n_results   integer not null default 0,
  best_kind   text,                 -- guide | type | org | tu | null
  created_at  timestamptz not null default now()
);
create index if not exists search_log_zero_idx on search_log (created_at) where n_results = 0;
create table if not exists search_synonyms (
  term        text primary key,     -- folded (lowercase, no diacritics) word or phrase as people type it
  kind        text not null check (kind in ('guide','type')),
  slug        text not null,
  weight      real not null default 1.0
);
insert into search_synonyms (term, kind, slug, weight) values
  ('pasos','guide','pasos',1), ('pasosa','guide','pasos',1), ('putna isprava','guide','pasos',1), ('passport','guide','pasos',1),
  ('licna','guide','licna-karta',1), ('licna karta','guide','licna-karta',1), ('licnu kartu','guide','licna-karta',1), ('id card','guide','licna-karta',1), ('lk','guide','licna-karta',.6),
  ('vozacka','guide','vozacka-dozvola',1), ('vozacka dozvola','guide','vozacka-dozvola',1), ('vozacku','guide','vozacka-dozvola',1), ('driving licence','guide','vozacka-dozvola',1),
  ('registracija vozila','guide','registracija-vozila',1), ('registracija auta','guide','registracija-vozila',1), ('tablice','guide','registracija-vozila',.8),
  ('knjizica','guide','zdravstvena-knjizica',1), ('zdravstvena','guide','zdravstvena-knjizica',1), ('zdravstveno osiguranje','guide','zdravstvena-knjizica',1), ('kartica zdravstvenog','guide','zdravstvena-knjizica',1), ('rfzo kartica','guide','zdravstvena-knjizica',1), ('health insurance','guide','zdravstvena-knjizica',1),
  ('prebivaliste','guide','prijava-prebivalista',1), ('prijava adrese','guide','prijava-prebivalista',1), ('prijava boravista','guide','prijava-prebivalista',1),
  ('boravak','guide','privremeni-boravak-stranci',1), ('privremeni boravak','guide','privremeni-boravak-stranci',1), ('dozvola boravka','guide','privremeni-boravak-stranci',1), ('residence permit','guide','privremeni-boravak-stranci',1), ('viza','guide','privremeni-boravak-stranci',.7),
  ('izvod','guide','izvod-iz-maticne-knjige',1), ('izvod iz maticne','guide','izvod-iz-maticne-knjige',1), ('rodjenih','guide','izvod-iz-maticne-knjige',1), ('vencanih','guide','izvod-iz-maticne-knjige',1), ('maticar','guide','izvod-iz-maticne-knjige',.9),
  ('deciji dodatak','guide','deciji-dodatak',1), ('deciji','guide','deciji-dodatak',.9), ('roditeljski dodatak','guide','deciji-dodatak',.7),
  ('socijalna pomoc','guide','novcana-socijalna-pomoc',1), ('socijalno','guide','novcana-socijalna-pomoc',.8),
  ('firma','guide','otvaranje-firme-preduzetnik',1), ('preduzetnik','guide','otvaranje-firme-preduzetnik',1), ('pausal','guide','otvaranje-firme-preduzetnik',1), ('otvaranje firme','guide','otvaranje-firme-preduzetnik',1), ('doo','guide','otvaranje-firme-preduzetnik',.8),
  ('overa','guide','overa-kod-javnog-beleznika',1), ('notar','guide','overa-kod-javnog-beleznika',1), ('beleznik','guide','overa-kod-javnog-beleznika',.9),
  ('pib','guide','pib-za-strance',1), ('poreski broj','guide','pib-za-strance',1),
  ('nezaposlen','guide','prijava-na-nsz',1), ('biro','guide','prijava-na-nsz',1), ('nsz','guide','prijava-na-nsz',.9), ('zavod za zaposljavanje','guide','prijava-na-nsz',1),
  ('policija','type','mup-policijska-uprava',1), ('policijska uprava','type','mup-policijska-uprava',1), ('policijska stanica','type','mup-policijska-uprava',1), ('mup','type','mup-policijska-uprava',1), ('sup','type','mup-policijska-uprava',.8),
  ('poreska','type','poreska-uprava',1), ('poreska uprava','type','poreska-uprava',1), ('porez','type','poreska-uprava',.8),
  ('katastar','type','rgz-katastar',1), ('rgz','type','rgz-katastar',1), ('list nepokretnosti','type','rgz-katastar',.9),
  ('pio','type','pio-fond',1), ('penzija','type','pio-fond',.9), ('fond pio','type','pio-fond',1),
  ('dom zdravlja','type','dom-zdravlja',1), ('lekar','type','dom-zdravlja',.8), ('bolnica','type','opsta-bolnica',1),
  ('centar za socijalni rad','type','centar-za-socijalni-rad',1), ('csr','type','centar-za-socijalni-rad',.9),
  ('sud','type','osnovni-sud',.8), ('osnovni sud','type','osnovni-sud',1), ('prekrsajni','type','prekrsajni-sud',1),
  ('izvrsitelj','type','javni-izvrsitelj',1), ('vodovod','type','jkp-vodovod',1), ('cistoca','type','jkp-cistoca',1), ('parking','type','jkp-parking-servis',1),
  ('trezor','type','uprava-za-trezor',1), ('apr','type','apr',1), ('vrtic','type','predskolska-ustanova',1), ('skola','type','osnovna-skola',.8), ('fakultet','type','fakultet',1),
  ('opstina','type','opstinska-uprava',.8), ('opstinska uprava','type','opstinska-uprava',1), ('gradska uprava','type','gradska-uprava',1), ('mesna zajednica','type','mesna-zajednica',1)
on conflict (term) do nothing;
commit;
