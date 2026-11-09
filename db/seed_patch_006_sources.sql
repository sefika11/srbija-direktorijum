-- Patch 006: data_sources rows for the Tier 1/2 importers (run after seed_core.sql).
insert into data_sources (code, name, base_url, license, refresh_cron, notes) values
  ('rfzo_filijale',        'RFZO – filijale i ispostave',            'https://rfzo.rs/index.php/filijale',                        'public-sector information', '0 4 1 * *',  'Seats and coverage only; no addresses on the page.'),
  ('kji_imenik',           'Komora javnih izvršitelja – imenik',     'https://www.komoraizvrsitelja.rs/imenik-javnih-izvrsitelja', 'public register',           '0 4 * * 1',  'Name, seat, phone, email per izvršitelj.'),
  ('beleznik_kancelarije', 'Javnobeležnička komora – kancelarije',   'https://beleznik.org/kancelarije',                           'public register',           '0 4 * * 1',  'List + detail pages with phone/email/hours.'),
  ('rgz_adresni_registar', 'RGZ – Adresni registar (data.gov.rs)',   'https://data.gov.rs',                                        'Open Data (CC BY)',         '0 3 1 * *',  'Street + house number + coordinates; staging.ar_addresses.'),
  ('municipal_crawler',    'Sajtovi JLS – crawler + LLM ekstrakcija','',                                                           'per-site robots.txt',       '0 2 * * 0',  'Addresses, phones, hours from municipal sites.')
on conflict (code) do nothing;
