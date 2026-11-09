-- =============================================================================
--  Seed: territorial hierarchy + taxonomy (v0.1, 2026-11-09)
--  Run after schema.sql. Idempotent-ish: run once on an empty database.
--
--  Coverage: Republika, 2 AP, 30 okrug rows (29 upravnih okruga + Grad Beograd
--  as okrug-level pseudo-row), 145 administered JLS (28 gradova incl. Beograd +
--  117 opština = 145), 27 gradske opštine. Kosovo okruzi are inserted flagged
--  in_kosovo = true with no JLS children (add later if ever needed).
--  Codes (RZS, MB, PIB, JBKJS, population) are left NULL on purpose — they are
--  loaded by the importer from Trezor KJS list / RZS, not typed by hand.
-- =============================================================================

begin;

-- Latin → Cyrillic for PLACE NAMES ONLY (digraph ambiguity is irrelevant
-- for toponyms: Ljig, Knjaževac, Odžaci are all true digraphs).
create or replace function lat_to_cyr_place(text)
returns text language sql immutable parallel safe strict as
$$
  select translate(
    replace(replace(replace(replace(replace(replace(
      $1, 'Lj','Љ'), 'Nj','Њ'), 'Dž','Џ'), 'lj','љ'), 'nj','њ'), 'dž','џ'),
    'ABVGDĐEŽZIJKLMNOPRSTĆUFHCČŠabvgdđežzijklmnoprstćufhcčš',
    'АБВГДЂЕЖЗИЈКЛМНОПРСТЋУФХЦЧШабвгдђежзијклмнопрстћуфхцчш')
$$;

-- 1. Root + provinces --------------------------------------------------------
insert into territorial_units (level, parent_id, slug, name_lat, name_cyr, official_name_lat, iso_3166_2)
values ('republika', null, 'srbija', 'Srbija', 'Србија', 'Republika Srbija', 'RS');

insert into territorial_units (level, parent_id, slug, name_lat, name_cyr, official_name_lat, iso_3166_2, in_kosovo)
select 'pokrajina', r.id, v.slug, v.name_lat, v.name_cyr, v.official, v.iso, v.kim
from territorial_units r,
     (values
       ('vojvodina', 'Vojvodina', 'Војводина', 'Autonomna pokrajina Vojvodina', 'RS-VO', false),
       ('kosovo-i-metohija', 'Kosovo i Metohija', 'Косово и Метохија', 'Autonomna pokrajina Kosovo i Metohija', 'RS-KM', true)
     ) as v(slug, name_lat, name_cyr, official, iso, kim)
where r.level = 'republika';

-- 2. Okruzi ------------------------------------------------------------------
create temp table _okrug (slug text, name text, iso text, parent_slug text, seat text, kim boolean default false, sort int);
insert into _okrug (slug, name, iso, parent_slug, seat, kim, sort) values
  ('grad-beograd',        'Grad Beograd',               'RS-00', 'srbija',    'Beograd',            false, 0),
  ('severnobacki',        'Severnobački okrug',         'RS-01', 'vojvodina', 'Subotica',           false, 1),
  ('srednjobanatski',     'Srednjobanatski okrug',      'RS-02', 'vojvodina', 'Zrenjanin',          false, 2),
  ('severnobanatski',     'Severnobanatski okrug',      'RS-03', 'vojvodina', 'Kikinda',            false, 3),
  ('juznobanatski',       'Južnobanatski okrug',        'RS-04', 'vojvodina', 'Pančevo',            false, 4),
  ('zapadnobacki',        'Zapadnobački okrug',         'RS-05', 'vojvodina', 'Sombor',             false, 5),
  ('juznobacki',          'Južnobački okrug',           'RS-06', 'vojvodina', 'Novi Sad',           false, 6),
  ('sremski',             'Sremski okrug',              'RS-07', 'vojvodina', 'Sremska Mitrovica',  false, 7),
  ('macvanski',           'Mačvanski okrug',            'RS-08', 'srbija',    'Šabac',              false, 8),
  ('kolubarski',          'Kolubarski okrug',           'RS-09', 'srbija',    'Valjevo',            false, 9),
  ('podunavski',          'Podunavski okrug',           'RS-10', 'srbija',    'Smederevo',          false, 10),
  ('branicevski',         'Braničevski okrug',          'RS-11', 'srbija',    'Požarevac',          false, 11),
  ('sumadijski',          'Šumadijski okrug',           'RS-12', 'srbija',    'Kragujevac',         false, 12),
  ('pomoravski',          'Pomoravski okrug',           'RS-13', 'srbija',    'Jagodina',           false, 13),
  ('borski',              'Borski okrug',               'RS-14', 'srbija',    'Bor',                false, 14),
  ('zajecarski',          'Zaječarski okrug',           'RS-15', 'srbija',    'Zaječar',            false, 15),
  ('zlatiborski',         'Zlatiborski okrug',          'RS-16', 'srbija',    'Užice',              false, 16),
  ('moravicki',           'Moravički okrug',            'RS-17', 'srbija',    'Čačak',              false, 17),
  ('raski',               'Raški okrug',                'RS-18', 'srbija',    'Kraljevo',           false, 18),
  ('rasinski',            'Rasinski okrug',             'RS-19', 'srbija',    'Kruševac',           false, 19),
  ('nisavski',            'Nišavski okrug',             'RS-20', 'srbija',    'Niš',                false, 20),
  ('toplicki',            'Toplički okrug',             'RS-21', 'srbija',    'Prokuplje',          false, 21),
  ('pirotski',            'Pirotski okrug',             'RS-22', 'srbija',    'Pirot',              false, 22),
  ('jablanicki',          'Jablanički okrug',           'RS-23', 'srbija',    'Leskovac',           false, 23),
  ('pcinjski',            'Pčinjski okrug',             'RS-24', 'srbija',    'Vranje',             false, 24),
  ('kosovski',            'Kosovski okrug',             'RS-25', 'kosovo-i-metohija', 'Priština',   true,  25),
  ('pecki',               'Pećki okrug',                'RS-26', 'kosovo-i-metohija', 'Peć',        true,  26),
  ('prizrenski',          'Prizrenski okrug',           'RS-27', 'kosovo-i-metohija', 'Prizren',    true,  27),
  ('kosovskomitrovacki',  'Kosovskomitrovački okrug',   'RS-28', 'kosovo-i-metohija', 'Kosovska Mitrovica', true, 28),
  ('kosovsko-pomoravski', 'Kosovsko-pomoravski okrug',  'RS-29', 'kosovo-i-metohija', 'Gnjilane',   true,  29);

insert into territorial_units (level, parent_id, slug, name_lat, name_cyr, official_name_lat, iso_3166_2, seat_name_lat, in_kosovo, sort_order)
select 'okrug', p.id, o.slug, o.name, lat_to_cyr_place(o.name),
       case when o.slug = 'grad-beograd' then 'Grad Beograd' else replace(o.name, ' okrug', ' upravni okrug') end,
       o.iso, o.seat, o.kim, o.sort
from _okrug o
join territorial_units p on p.slug = o.parent_slug and p.level in ('republika', 'pokrajina');

-- 3. JLS: gradovi i opštine --------------------------------------------------
create temp table _jls (okrug text, name text, kind jls_kind, seat boolean default false);
insert into _jls (okrug, name, kind, seat) values
  -- Grad Beograd (JLS with okrug status; its 17 gradske opštine follow in step 4)
  ('grad-beograd', 'Beograd', 'grad', true),
  -- Severnobački
  ('severnobacki', 'Subotica', 'grad', true), ('severnobacki', 'Bačka Topola', 'opstina', false), ('severnobacki', 'Mali Iđoš', 'opstina', false),
  -- Srednjobanatski
  ('srednjobanatski', 'Zrenjanin', 'grad', true), ('srednjobanatski', 'Nova Crnja', 'opstina', false), ('srednjobanatski', 'Novi Bečej', 'opstina', false),
  ('srednjobanatski', 'Sečanj', 'opstina', false), ('srednjobanatski', 'Žitište', 'opstina', false),
  -- Severnobanatski
  ('severnobanatski', 'Kikinda', 'grad', true), ('severnobanatski', 'Ada', 'opstina', false), ('severnobanatski', 'Čoka', 'opstina', false),
  ('severnobanatski', 'Kanjiža', 'opstina', false), ('severnobanatski', 'Novi Kneževac', 'opstina', false), ('severnobanatski', 'Senta', 'opstina', false),
  -- Južnobanatski
  ('juznobanatski', 'Pančevo', 'grad', true), ('juznobanatski', 'Vršac', 'grad', false), ('juznobanatski', 'Alibunar', 'opstina', false),
  ('juznobanatski', 'Bela Crkva', 'opstina', false), ('juznobanatski', 'Kovačica', 'opstina', false), ('juznobanatski', 'Kovin', 'opstina', false),
  ('juznobanatski', 'Opovo', 'opstina', false), ('juznobanatski', 'Plandište', 'opstina', false),
  -- Zapadnobački
  ('zapadnobacki', 'Sombor', 'grad', true), ('zapadnobacki', 'Apatin', 'opstina', false), ('zapadnobacki', 'Kula', 'opstina', false), ('zapadnobacki', 'Odžaci', 'opstina', false),
  -- Južnobački
  ('juznobacki', 'Novi Sad', 'grad', true), ('juznobacki', 'Bač', 'opstina', false), ('juznobacki', 'Bačka Palanka', 'opstina', false),
  ('juznobacki', 'Bački Petrovac', 'opstina', false), ('juznobacki', 'Beočin', 'opstina', false), ('juznobacki', 'Bečej', 'opstina', false),
  ('juznobacki', 'Srbobran', 'opstina', false), ('juznobacki', 'Sremski Karlovci', 'opstina', false), ('juznobacki', 'Temerin', 'opstina', false),
  ('juznobacki', 'Titel', 'opstina', false), ('juznobacki', 'Vrbas', 'opstina', false), ('juznobacki', 'Žabalj', 'opstina', false),
  -- Sremski
  ('sremski', 'Sremska Mitrovica', 'grad', true), ('sremski', 'Inđija', 'opstina', false), ('sremski', 'Irig', 'opstina', false),
  ('sremski', 'Pećinci', 'opstina', false), ('sremski', 'Ruma', 'opstina', false), ('sremski', 'Šid', 'opstina', false), ('sremski', 'Stara Pazova', 'opstina', false),
  -- Mačvanski
  ('macvanski', 'Šabac', 'grad', true), ('macvanski', 'Loznica', 'grad', false), ('macvanski', 'Bogatić', 'opstina', false),
  ('macvanski', 'Koceljeva', 'opstina', false), ('macvanski', 'Krupanj', 'opstina', false), ('macvanski', 'Ljubovija', 'opstina', false),
  ('macvanski', 'Mali Zvornik', 'opstina', false), ('macvanski', 'Vladimirci', 'opstina', false),
  -- Kolubarski
  ('kolubarski', 'Valjevo', 'grad', true), ('kolubarski', 'Lajkovac', 'opstina', false), ('kolubarski', 'Ljig', 'opstina', false),
  ('kolubarski', 'Mionica', 'opstina', false), ('kolubarski', 'Osečina', 'opstina', false), ('kolubarski', 'Ub', 'opstina', false),
  -- Podunavski
  ('podunavski', 'Smederevo', 'grad', true), ('podunavski', 'Smederevska Palanka', 'opstina', false), ('podunavski', 'Velika Plana', 'opstina', false),
  -- Braničevski
  ('branicevski', 'Požarevac', 'grad', true), ('branicevski', 'Golubac', 'opstina', false), ('branicevski', 'Kučevo', 'opstina', false),
  ('branicevski', 'Malo Crniće', 'opstina', false), ('branicevski', 'Petrovac na Mlavi', 'opstina', false), ('branicevski', 'Veliko Gradište', 'opstina', false),
  ('branicevski', 'Žabari', 'opstina', false), ('branicevski', 'Žagubica', 'opstina', false),
  -- Šumadijski
  ('sumadijski', 'Kragujevac', 'grad', true), ('sumadijski', 'Aranđelovac', 'opstina', false), ('sumadijski', 'Batočina', 'opstina', false),
  ('sumadijski', 'Knić', 'opstina', false), ('sumadijski', 'Lapovo', 'opstina', false), ('sumadijski', 'Rača', 'opstina', false), ('sumadijski', 'Topola', 'opstina', false),
  -- Pomoravski
  ('pomoravski', 'Jagodina', 'grad', true), ('pomoravski', 'Ćuprija', 'opstina', false), ('pomoravski', 'Despotovac', 'opstina', false),
  ('pomoravski', 'Paraćin', 'opstina', false), ('pomoravski', 'Rekovac', 'opstina', false), ('pomoravski', 'Svilajnac', 'opstina', false),
  -- Borski
  ('borski', 'Bor', 'grad', true), ('borski', 'Kladovo', 'opstina', false), ('borski', 'Majdanpek', 'opstina', false), ('borski', 'Negotin', 'opstina', false),
  -- Zaječarski
  ('zajecarski', 'Zaječar', 'grad', true), ('zajecarski', 'Boljevac', 'opstina', false), ('zajecarski', 'Knjaževac', 'opstina', false), ('zajecarski', 'Sokobanja', 'opstina', false),
  -- Zlatiborski
  ('zlatiborski', 'Užice', 'grad', true), ('zlatiborski', 'Arilje', 'opstina', false), ('zlatiborski', 'Bajina Bašta', 'opstina', false),
  ('zlatiborski', 'Čajetina', 'opstina', false), ('zlatiborski', 'Kosjerić', 'opstina', false), ('zlatiborski', 'Nova Varoš', 'opstina', false),
  ('zlatiborski', 'Požega', 'opstina', false), ('zlatiborski', 'Priboj', 'opstina', false), ('zlatiborski', 'Prijepolje', 'opstina', false), ('zlatiborski', 'Sjenica', 'opstina', false),
  -- Moravički
  ('moravicki', 'Čačak', 'grad', true), ('moravicki', 'Gornji Milanovac', 'opstina', false), ('moravicki', 'Ivanjica', 'opstina', false), ('moravicki', 'Lučani', 'opstina', false),
  -- Raški
  ('raski', 'Kraljevo', 'grad', true), ('raski', 'Novi Pazar', 'grad', false), ('raski', 'Raška', 'opstina', false), ('raski', 'Tutin', 'opstina', false), ('raski', 'Vrnjačka Banja', 'opstina', false),
  -- Rasinski
  ('rasinski', 'Kruševac', 'grad', true), ('rasinski', 'Aleksandrovac', 'opstina', false), ('rasinski', 'Brus', 'opstina', false),
  ('rasinski', 'Ćićevac', 'opstina', false), ('rasinski', 'Trstenik', 'opstina', false), ('rasinski', 'Varvarin', 'opstina', false),
  -- Nišavski
  ('nisavski', 'Niš', 'grad', true), ('nisavski', 'Aleksinac', 'opstina', false), ('nisavski', 'Doljevac', 'opstina', false),
  ('nisavski', 'Gadžin Han', 'opstina', false), ('nisavski', 'Merošina', 'opstina', false), ('nisavski', 'Ražanj', 'opstina', false), ('nisavski', 'Svrljig', 'opstina', false),
  -- Toplički
  ('toplicki', 'Prokuplje', 'grad', true), ('toplicki', 'Blace', 'opstina', false), ('toplicki', 'Kuršumlija', 'opstina', false), ('toplicki', 'Žitorađa', 'opstina', false),
  -- Pirotski
  ('pirotski', 'Pirot', 'grad', true), ('pirotski', 'Babušnica', 'opstina', false), ('pirotski', 'Bela Palanka', 'opstina', false), ('pirotski', 'Dimitrovgrad', 'opstina', false),
  -- Jablanički
  ('jablanicki', 'Leskovac', 'grad', true), ('jablanicki', 'Bojnik', 'opstina', false), ('jablanicki', 'Crna Trava', 'opstina', false),
  ('jablanicki', 'Lebane', 'opstina', false), ('jablanicki', 'Medveđa', 'opstina', false), ('jablanicki', 'Vlasotince', 'opstina', false),
  -- Pčinjski
  ('pcinjski', 'Vranje', 'grad', true), ('pcinjski', 'Bosilegrad', 'opstina', false), ('pcinjski', 'Bujanovac', 'opstina', false),
  ('pcinjski', 'Preševo', 'opstina', false), ('pcinjski', 'Surdulica', 'opstina', false), ('pcinjski', 'Trgovište', 'opstina', false), ('pcinjski', 'Vladičin Han', 'opstina', false);

insert into territorial_units (level, parent_id, slug, name_lat, name_cyr, official_name_lat, jls_kind, is_capital, okrug_seat, seat_name_lat)
select 'jls', o.id, slugify_sr(j.name), j.name, lat_to_cyr_place(j.name),
       case j.kind when 'grad' then 'Grad ' || j.name else 'Opština ' || j.name end,
       j.kind, (j.name = 'Beograd'), j.seat, j.name
from _jls j
join territorial_units o on o.level = 'okrug' and o.slug = j.okrug;

-- 4. Gradske opštine ---------------------------------------------------------
create temp table _go (jls text, name text);
insert into _go (jls, name) values
  ('Beograd', 'Barajevo'), ('Beograd', 'Čukarica'), ('Beograd', 'Grocka'), ('Beograd', 'Lazarevac'),
  ('Beograd', 'Mladenovac'), ('Beograd', 'Novi Beograd'), ('Beograd', 'Obrenovac'), ('Beograd', 'Palilula'),
  ('Beograd', 'Rakovica'), ('Beograd', 'Savski venac'), ('Beograd', 'Sopot'), ('Beograd', 'Stari grad'),
  ('Beograd', 'Surčin'), ('Beograd', 'Voždovac'), ('Beograd', 'Vračar'), ('Beograd', 'Zemun'), ('Beograd', 'Zvezdara'),
  ('Niš', 'Crveni Krst'), ('Niš', 'Medijana'), ('Niš', 'Niška Banja'), ('Niš', 'Palilula'), ('Niš', 'Pantelej'),
  ('Novi Sad', 'Novi Sad'), ('Novi Sad', 'Petrovaradin'),
  ('Požarevac', 'Kostolac'),
  ('Vranje', 'Vranjska Banja'),
  ('Užice', 'Sevojno');

insert into territorial_units (level, parent_id, slug, name_lat, name_cyr, official_name_lat)
select 'gradska_opstina', j.id, slugify_sr(g.name), g.name, lat_to_cyr_place(g.name), 'Gradska opština ' || g.name
from _go g
join territorial_units j on j.level = 'jls' and j.name_lat = g.jls;

-- 5. Data sources ------------------------------------------------------------
insert into data_sources (code, name, base_url, license, refresh_cron, notes) values
  ('trezor_kjs',   'Uprava za trezor – Spisak korisnika javnih sredstava', 'https://www.trezor.gov.rs', 'Public record (xls, monthly)', '0 4 2 * *',
     'The universe of public-money users: every organ, JKP, ustanova with JBKJS, MB, PIB, type and parent. Seed source for organizations.'),
  ('apr',          'Agencija za privredne registre', 'https://www.apr.gov.rs', 'Public record; bulk via paid data service', null,
     'JKP/JP legal data (MB, PIB, address of sedište, status). Per-record lookups are free; bulk is a paid feed.'),
  ('euprava',      'Portal eUprava', 'https://euprava.gov.rs', 'Public', null, 'Service catalogue + organ list + online-service deep links.'),
  ('data_gov_rs',  'Portal otvorenih podataka', 'https://data.gov.rs', 'Open data (various)', null, 'Datasets published by organs; check per-dataset license.'),
  ('rgz_adresni_registar', 'RGZ Adresni registar (GeoSrbija)', 'https://geosrbija.rs', 'Open data', null, 'Authoritative street + house-number geocoding.'),
  ('rzs',          'Republički zavod za statistiku', 'https://www.stat.gov.rs', 'Public', null, 'Šifarnik opština i naselja, Popis 2022 population.'),
  ('municipal_site', 'Zvanični sajt grada/opštine', null, 'Public information; respect robots.txt', '0 3 * * 0', 'Per-JLS crawler profiles for uprava, JKP, ustanove, hours and phones.'),
  ('osm',          'OpenStreetMap', 'https://www.openstreetmap.org', 'ODbL (attribution required)', null, 'Fallback coordinates and amenity tags (office=government).'),
  ('wikidata',     'Wikidata', 'https://www.wikidata.org', 'CC0', null, 'Stable ids, Cyrillic/Latin labels, geo for JLS and naselja.'),
  ('user_submission', 'Prijava korisnika', null, 'User-contributed', null, 'Edits from the Prijavi grešku / Izmeni podatke form; applied only after review.'),
  ('manual',       'Ručni unos', null, 'Internal', null, 'Editor-entered data.');

-- 6. Organization types ------------------------------------------------------
insert into org_types (slug, "group", name_lat, name_cyr, name_plural_lat, default_jurisdiction, default_legal_form, one_per_jls, national_network, icon, sort_order) values
  -- Republički organi
  ('ministarstvo',             'republicki_organi', 'Ministarstvo',                              'Министарство',                           'Ministarstva',                              'republika', 'organ_drzavne_uprave', false, false, 'landmark', 10),
  ('poreska-uprava',           'republicki_organi', 'Poreska uprava',                            'Пореска управа',                          'Filijale Poreske uprave',                   'republika', 'organ_drzavne_uprave', false, true,  'receipt', 11),
  ('apr',                      'republicki_organi', 'Agencija za privredne registre (APR)',      'Агенција за привредне регистре',          'Organizacione jedinice APR-a',              'republika', 'agencija',             false, true,  'briefcase', 12),
  ('pio-fond',                 'republicki_organi', 'Republički fond PIO',                       'Републички фонд ПИО',                     'Filijale Fonda PIO',                        'republika', 'fond',                 false, true,  'piggy-bank', 13),
  ('rfzo',                     'republicki_organi', 'Republički fond za zdravstveno osiguranje', 'Републички фонд за здравствено осигурање','Filijale RFZO',                             'republika', 'fond',                 false, true,  'heart-pulse', 14),
  ('rgz-katastar',             'republicki_organi', 'RGZ – Služba za katastar nepokretnosti',    'РГЗ – Служба за катастар непокретности',  'Službe za katastar nepokretnosti',          'republika', 'organ_drzavne_uprave', false, true,  'map', 15),
  ('mup-policijska-uprava',    'republicki_organi', 'MUP – Policijska uprava / stanica',         'МУП – Полицијска управа / станица',       'Policijske uprave i stanice',               'republika', 'organ_drzavne_uprave', false, true,  'shield', 16),
  ('nsz',                      'republicki_organi', 'Nacionalna služba za zapošljavanje',        'Национална служба за запошљавање',        'Filijale NSZ',                              'republika', 'organ_drzavne_uprave', false, true,  'users', 17),
  ('uprava-za-trezor',         'republicki_organi', 'Uprava za trezor',                          'Управа за трезор',                        'Filijale Uprave za trezor',                 'republika', 'organ_drzavne_uprave', false, true,  'banknote', 18),
  ('upravni-okrug',            'republicki_organi', 'Upravni okrug',                             'Управни округ',                           'Upravni okruzi',                            'okrug',     'organ_drzavne_uprave', false, false, 'building-2', 19),
  ('pokrajinski-sekretarijat', 'republicki_organi', 'Pokrajinski sekretarijat',                  'Покрајински секретаријат',                'Pokrajinski sekretarijati',                 'pokrajina', 'organ_pokrajine',      false, false, 'landmark', 20),
  -- Lokalna samouprava
  ('gradska-uprava',           'lokalna_samouprava', 'Gradska uprava',                           'Градска управа',                          'Gradske uprave',                            'jls',       'organ_jls', true,  false, 'building', 30),
  ('opstinska-uprava',         'lokalna_samouprava', 'Opštinska uprava',                         'Општинска управа',                        'Opštinske uprave',                          'jls',       'organ_jls', true,  false, 'building', 31),
  ('uprava-gradske-opstine',   'lokalna_samouprava', 'Uprava gradske opštine',                   'Управа градске општине',                  'Uprave gradskih opština',                   'gradska_opstina', 'organ_jls', true, false, 'building', 32),
  ('lokalna-poreska-administracija', 'lokalna_samouprava', 'Lokalna poreska administracija',     'Локална пореска администрација',          'Lokalne poreske administracije',            'jls',       'organ_jls', true,  false, 'receipt', 33),
  ('maticna-sluzba',           'lokalna_samouprava', 'Matična služba',                           'Матична служба',                          'Matične službe',                            'jls',       'organ_jls', true,  false, 'file-text', 34),
  ('sekretarijat',             'lokalna_samouprava', 'Sekretarijat / odeljenje uprave',           'Секретаријат / одељење управе',           'Sekretarijati i odeljenja',                 'jls',       'organ_jls', false, false, 'folder', 35),
  ('mesna-zajednica',          'lokalna_samouprava', 'Mesna zajednica',                          'Месна заједница',                         'Mesne zajednice',                           'jls',       'organ_jls', false, false, 'home', 36),
  -- Javna preduzeća
  ('jkp-vodovod',              'javna_preduzeca', 'JKP Vodovod i kanalizacija',                  'ЈКП Водовод и канализација',              'Vodovodi',                                  'jls', 'jkp', true,  false, 'droplets', 40),
  ('jkp-cistoca',              'javna_preduzeca', 'JKP Čistoća / Komunalac',                     'ЈКП Чистоћа / Комуналац',                 'Komunalna preduzeća za čistoću',            'jls', 'jkp', true,  false, 'trash-2', 41),
  ('jkp-parking-servis',       'javna_preduzeca', 'JKP Parking servis',                          'ЈКП Паркинг сервис',                      'Parking servisi',                           'jls', 'jkp', false, false, 'circle-parking', 42),
  ('jkp-toplana',              'javna_preduzeca', 'JKP Toplana / Gradska toplana',               'ЈКП Топлана',                             'Toplane',                                   'jls', 'jkp', false, false, 'flame', 43),
  ('jkp-zelenilo',             'javna_preduzeca', 'JKP Zelenilo',                                'ЈКП Зеленило',                            'Preduzeća za zelenilo',                     'jls', 'jkp', false, false, 'trees', 44),
  ('jkp-pijace',               'javna_preduzeca', 'JKP Pijace / Tržnica',                        'ЈКП Пијаце / Тржница',                    'Pijace',                                    'jls', 'jkp', false, false, 'shopping-basket', 45),
  ('jkp-pogrebne-usluge',      'javna_preduzeca', 'JKP Pogrebne usluge / Groblja',               'ЈКП Погребне услуге / Гробља',            'Pogrebna preduzeća',                        'jls', 'jkp', false, false, 'flower-2', 46),
  ('jkp-gradski-prevoz',       'javna_preduzeca', 'JKP / JP Gradski prevoz',                     'ЈКП / ЈП Градски превоз',                 'Preduzeća za gradski prevoz',               'jls', 'jkp', false, false, 'bus', 47),
  ('jp-urbanizam',             'javna_preduzeca', 'JP Urbanizam / Direkcija za izgradnju',       'ЈП Урбанизам / Дирекција за изградњу',    'Preduzeća za urbanizam',                    'jls', 'javno_preduzece', false, false, 'ruler', 48),
  ('jp-posta-srbije',          'javna_preduzeca', 'JP Pošta Srbije',                             'ЈП Пошта Србије',                         'Pošte',                                     'republika', 'javno_preduzece', false, true, 'mail', 49),
  ('eps-distribucija',         'javna_preduzeca', 'Elektrodistribucija Srbije (ogranak)',        'Електродистрибуција Србије',              'Ogranci Elektrodistribucije',               'republika', 'javno_preduzece', false, true, 'zap', 50),
  -- Javne ustanove
  ('dom-zdravlja',             'javne_ustanove', 'Dom zdravlja',                                 'Дом здравља',                             'Domovi zdravlja',                           'jls', 'javna_ustanova', true,  false, 'stethoscope', 60),
  ('opsta-bolnica',            'javne_ustanove', 'Opšta bolnica / Klinički centar',              'Општа болница / Клинички центар',         'Bolnice',                                   'okrug', 'javna_ustanova', false, false, 'hospital', 61),
  ('apoteka',                  'javne_ustanove', 'Apotekarska ustanova',                         'Апотекарска установа',                    'Apotekarske ustanove',                      'jls', 'javna_ustanova', false, false, 'pill', 62),
  ('zavod-za-javno-zdravlje',  'javne_ustanove', 'Zavod / Institut za javno zdravlje',           'Завод за јавно здравље',                  'Zavodi za javno zdravlje',                  'okrug', 'zavod', false, false, 'microscope', 63),
  ('centar-za-socijalni-rad',  'javne_ustanove', 'Centar za socijalni rad',                      'Центар за социјални рад',                 'Centri za socijalni rad',                   'jls', 'javna_ustanova', true,  false, 'hand-heart', 64),
  ('predskolska-ustanova',     'javne_ustanove', 'Predškolska ustanova (vrtić)',                 'Предшколска установа',                    'Predškolske ustanove',                      'jls', 'javna_ustanova', true,  false, 'baby', 65),
  ('osnovna-skola',            'javne_ustanove', 'Osnovna škola',                                'Основна школа',                           'Osnovne škole',                             'jls', 'javna_ustanova', false, false, 'school', 66),
  ('srednja-skola',            'javne_ustanove', 'Srednja škola / Gimnazija',                    'Средња школа / Гимназија',                'Srednje škole',                             'jls', 'javna_ustanova', false, false, 'graduation-cap', 67),
  ('narodna-biblioteka',       'javne_ustanove', 'Narodna biblioteka',                           'Народна библиотека',                      'Biblioteke',                                'jls', 'javna_ustanova', true,  false, 'library', 68),
  ('kulturni-centar',          'javne_ustanove', 'Kulturni centar / Dom kulture',                'Културни центар / Дом културе',           'Kulturni centri',                           'jls', 'javna_ustanova', false, false, 'theater', 69),
  ('muzej',                    'javne_ustanove', 'Muzej / Arhiv',                                'Музеј / Архив',                           'Muzeji i arhivi',                           'jls', 'javna_ustanova', false, false, 'landmark', 70),
  ('sportski-centar',          'javne_ustanove', 'Sportski centar',                              'Спортски центар',                         'Sportski centri',                           'jls', 'javna_ustanova', false, false, 'dumbbell', 71),
  ('turisticka-organizacija',  'javne_ustanove', 'Turistička organizacija',                      'Туристичка организација',                 'Turističke organizacije',                   'jls', 'javna_ustanova', true,  false, 'compass', 72),
  -- Pravosuđe i javna ovlašćenja
  ('osnovni-sud',              'pravosudje_i_javna_ovlascenja', 'Osnovni sud',                   'Основни суд',                             'Osnovni sudovi',                            'okrug', 'sud', false, false, 'scale', 80),
  ('visi-sud',                 'pravosudje_i_javna_ovlascenja', 'Viši sud',                      'Виши суд',                                'Viši sudovi',                               'okrug', 'sud', false, false, 'scale', 81),
  ('privredni-sud',            'pravosudje_i_javna_ovlascenja', 'Privredni sud',                 'Привредни суд',                           'Privredni sudovi',                          'okrug', 'sud', false, false, 'scale', 82),
  ('prekrsajni-sud',           'pravosudje_i_javna_ovlascenja', 'Prekršajni sud',                'Прекршајни суд',                          'Prekršajni sudovi',                         'okrug', 'sud', false, false, 'scale', 83),
  ('apelacioni-sud',           'pravosudje_i_javna_ovlascenja', 'Apelacioni sud',                'Апелациони суд',                          'Apelacioni sudovi',                         'republika', 'sud', false, false, 'scale', 84),
  ('upravni-sud',              'pravosudje_i_javna_ovlascenja', 'Upravni sud',                   'Управни суд',                             'Upravni sud i odeljenja',                   'republika', 'sud', false, false, 'scale', 85),
  ('osnovno-javno-tuzilastvo', 'pravosudje_i_javna_ovlascenja', 'Osnovno javno tužilaštvo',      'Основно јавно тужилаштво',                'Osnovna javna tužilaštva',                  'okrug', 'tuzilastvo', false, false, 'gavel', 86),
  ('vise-javno-tuzilastvo',    'pravosudje_i_javna_ovlascenja', 'Više javno tužilaštvo',         'Више јавно тужилаштво',                   'Viša javna tužilaštva',                     'okrug', 'tuzilastvo', false, false, 'gavel', 87),
  ('javni-beleznik',           'pravosudje_i_javna_ovlascenja', 'Javni beležnik (notar)',        'Јавни бележник',                          'Javni beležnici',                           'jls', 'javni_beleznik', false, false, 'stamp', 88),
  ('javni-izvrsitelj',         'pravosudje_i_javna_ovlascenja', 'Javni izvršitelj',              'Јавни извршитељ',                         'Javni izvršitelji',                         'jls', 'javni_izvrsitelj', false, false, 'file-badge', 89),
  ('sudski-prevodilac',        'pravosudje_i_javna_ovlascenja', 'Sudski prevodilac / tumač',     'Судски преводилац / тумач',               'Sudski prevodioci',                         'jls', 'ostalo', false, false, 'languages', 90);

-- 7. Service categories ------------------------------------------------------
insert into service_categories (slug, name_lat, name_cyr, icon, sort_order) values
  ('licna-dokumenta',        'Lična dokumenta',          'Лична документа',          'id-card', 10),
  ('maticne-knjige',         'Matične knjige',           'Матичне књиге',            'file-text', 20),
  ('vozila-i-saobracaj',     'Vozila i saobraćaj',       'Возила и саобраћај',       'car', 30),
  ('nekretnine-i-katastar',  'Nekretnine i katastar',    'Некретнине и катастар',    'map', 40),
  ('porezi-i-takse',         'Porezi i takse',           'Порези и таксе',           'receipt', 50),
  ('firma-i-preduzetnistvo', 'Firma i preduzetništvo',   'Фирма и предузетништво',   'briefcase', 60),
  ('gradjenje-i-urbanizam',  'Građenje i urbanizam',     'Грађење и урбанизам',      'ruler', 70),
  ('socijalna-zastita',      'Socijalna zaštita',        'Социјална заштита',        'hand-heart', 80),
  ('zdravstvo',              'Zdravstvo',                'Здравство',                'stethoscope', 90),
  ('penzije-i-osiguranje',   'Penzije i osiguranje',     'Пензије и осигурање',      'piggy-bank', 100),
  ('obrazovanje-i-deca',     'Obrazovanje i deca',       'Образовање и деца',        'school', 110),
  ('komunalne-usluge',       'Komunalne usluge',         'Комуналне услуге',         'droplets', 120),
  ('zaposljavanje',          'Zapošljavanje',            'Запошљавање',              'users', 130),
  ('sud-i-pravda',           'Sud i pravda',             'Суд и правда',             'scale', 140),
  ('stranci-i-boravak',      'Stranci i boravak',        'Странци и боравак',        'globe', 150);

-- 8. Lead verticals + triggers ----------------------------------------------
insert into lead_verticals (slug, name_lat, pitch_lat, default_price_rsd, routing_mode, form_schema) values
  ('knjigovodstvo',        'Knjigovodstvena agencija',        'Otvarate firmu ili menjate knjigovođu? Dobijte ponudu od lokalne agencije.', 1500, 'round_robin',
     '[{"name":"ime","label":"Ime i prezime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"email","label":"Email","type":"email","required":false},{"name":"oblik","label":"Oblik poslovanja","type":"select","options":["Preduzetnik (paušal)","Preduzetnik (knjige)","DOO","Još ne znam"],"required":true},{"name":"poruka","label":"Šta vam treba?","type":"textarea","required":false}]'),
  ('advokat',              'Advokat',                          'Treba vam advokat za nekretnine, nasleđe ili ugovor? Besplatna prva konsultacija.', 2500, 'round_robin',
     '[{"name":"ime","label":"Ime i prezime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"oblast","label":"Oblast","type":"select","options":["Nekretnine","Nasleđe / ostavina","Ugovori","Radno pravo","Ostalo"],"required":true},{"name":"poruka","label":"Ukratko o čemu se radi","type":"textarea","required":true}]'),
  ('geometar',             'Geodetska agencija / geometar',   'Treba vam geometar za parcelaciju, snimanje objekta ili ozakonjenje?', 2000, 'round_robin',
     '[{"name":"ime","label":"Ime i prezime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"usluga","label":"Usluga","type":"select","options":["Snimanje objekta","Parcelacija / deoba","Obnova granica","Elaborat za ozakonjenje","Ostalo"],"required":true}]'),
  ('osiguranje-vozila',    'Osiguranje vozila',               'Registrujete vozilo? Uporedite ponude za obavezno osiguranje.', 500, 'exclusive',
     '[{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"vozilo","label":"Vozilo","type":"text","required":false}]'),
  ('selidbe',              'Selidbe i transport',             'Menjate adresu? Zatražite ponudu za selidbu.', 800, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"datum","label":"Okvirni datum","type":"date","required":false}]'),
  ('sudski-prevodilac',    'Sudski prevodilac',               'Treba vam overeni prevod dokumenata?', 600, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"jezik","label":"Jezik","type":"text","required":true}]'),
  ('projektovanje-i-legalizacija', 'Arhitekta / projektni biro', 'Gradite, dograđujete ili ozakonjujete objekat? Pronađite projektanta.', 2500, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"tip","label":"Šta planirate","type":"select","options":["Nova gradnja","Dogradnja / rekonstrukcija","Ozakonjenje","Ostalo"],"required":true}]'),
  ('agencija-za-nekretnine', 'Agencija za nekretnine',        'Kupujete ili prodajete nekretninu?', 1500, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"tip","label":"Zanima me","type":"select","options":["Kupovina","Prodaja","Izdavanje"],"required":true}]'),
  ('privatna-zdravstvena-ustanova', 'Privatna ordinacija / laboratorija', 'Želite pregled bez čekanja? Privatne ordinacije u vašem gradu.', 1000, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"usluga","label":"Pregled / analiza","type":"text","required":false}]'),
  ('privatni-vrtic',       'Privatni vrtić',                  'Nema mesta u državnom vrtiću? Pogledajte privatne vrtiće sa subvencijom.', 1200, 'round_robin',
     '[{"name":"ime","label":"Ime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"uzrast","label":"Uzrast deteta","type":"text","required":false}]');

insert into vertical_triggers (vertical_id, org_type_id, priority)
select v.id, t.id, m.priority
from (values
  ('knjigovodstvo', 'apr', 10), ('knjigovodstvo', 'poreska-uprava', 20), ('knjigovodstvo', 'lokalna-poreska-administracija', 30),
  ('advokat', 'osnovni-sud', 10), ('advokat', 'visi-sud', 10), ('advokat', 'privredni-sud', 10), ('advokat', 'javni-izvrsitelj', 20), ('advokat', 'osnovno-javno-tuzilastvo', 30),
  ('geometar', 'rgz-katastar', 10),
  ('agencija-za-nekretnine', 'javni-beleznik', 20),
  ('osiguranje-vozila', 'mup-policijska-uprava', 10),
  ('selidbe', 'uprava-gradske-opstine', 40),
  ('sudski-prevodilac', 'maticna-sluzba', 20),
  ('projektovanje-i-legalizacija', 'jp-urbanizam', 10), ('projektovanje-i-legalizacija', 'sekretarijat', 30),
  ('privatna-zdravstvena-ustanova', 'dom-zdravlja', 10), ('privatna-zdravstvena-ustanova', 'opsta-bolnica', 20), ('privatna-zdravstvena-ustanova', 'rfzo', 30),
  ('privatni-vrtic', 'predskolska-ustanova', 10)
) as m(vertical, org_type, priority)
join lead_verticals v on v.slug = m.vertical
join org_types t on t.slug = m.org_type;

-- default vertical shown on an org type page when no service-level trigger fires
update org_types t set lead_vertical_id = v.id
from (select distinct on (org_type_id) org_type_id, vertical_id from vertical_triggers where org_type_id is not null order by org_type_id, priority) x
join lead_verticals v on v.id = x.vertical_id
where t.id = x.org_type_id;

-- 9. Ad slots (dimensions reserved in CSS → no layout shift) ----------------
insert into ad_slots (code, template, kind, width, height, position_note) values
  ('loc_top_leaderboard',      'location', 'programmatic', 728, 90,  'Below breadcrumb, above H1. 320x100 on mobile.'),
  ('loc_sidebar_sponsor',      'location', 'sponsor',      300, 250, 'Right rail, first card. Fixed-fee local sponsor; AdSense fallback.'),
  ('loc_after_address_native', 'location', 'sponsor',      null, null, 'Native card directly under address + map block, labelled "Sponzorisano".'),
  ('loc_lead_form',            'location', 'lead_form',    null, null, 'After opening hours, before services list. Vertical from vertical_triggers.'),
  ('loc_in_content_1',         'location', 'programmatic', 336, 280, 'Between services list and FAQ.'),
  ('loc_affiliate_after_fees', 'location', 'affiliate',    null, null, 'Inline text link under fees table (e.g. insurance on registracija vozila).'),
  ('loc_sticky_bottom_mobile', 'location', 'programmatic', 320, 50,  'Mobile anchor. Dismissible.'),
  ('jls_top_leaderboard',      'jls_hub',  'programmatic', 728, 90,  'Below H1.'),
  ('jls_sidebar_sponsor',      'jls_hub',  'sponsor',      300, 250, 'Right rail. City-wide sponsor (one per JLS).'),
  ('jls_inline_1',             'jls_hub',  'programmatic', 336, 280, 'After the second category block.'),
  ('svc_in_content_1',         'service',  'programmatic', 336, 280, 'After "Potrebna dokumenta".'),
  ('svc_lead_form',            'service',  'lead_form',    null, null, 'After fees, before "Gde se podnosi".'),
  ('svc_affiliate_inline',     'service',  'affiliate',    null, null, 'Inline link in the fees paragraph.'),
  ('svc_jls_sidebar_sponsor',  'service_jls', 'sponsor',   300, 250, 'Right rail on service × municipality pages.');

drop table _okrug; drop table _jls; drop table _go;

commit;

-- Sanity (expected: okrug 30, jls 145, gradska_opstina 27)
-- select level, count(*) from territorial_units group by 1 order by 1;
