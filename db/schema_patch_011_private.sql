-- Patch 011: private-sector institutions live in the same tables, flagged; plus the RFZO pharmacy source.
begin;
alter table organizations add column if not exists is_private boolean not null default false;
create index if not exists organizations_private_idx on organizations (is_private) where is_private;
insert into data_sources (code, name, base_url, license, refresh_cron, notes) values
  ('rfzo_apoteke', 'RFZO – ugovorene privatne apoteke (XLSX)', 'https://www.rfzo.rs/davaoci-zdravstvenih-usluga/ugovaranje-apoteke/priv-apo', 'public-sector information', '0 4 10 * *', 'Monthly XLSX; seat + ogranci with phone and email.')
on conflict (code) do nothing;
commit;
