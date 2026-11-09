-- Seed patch 002 (2026-11-09): two slots referenced by Part 2 of the blueprint.
begin;
insert into ad_slots (code, template, kind, width, height, position_note) values
  ('loc_bottom_leaderboard',   'location', 'programmatic', 728, 90,  'After the correction block, before footer. 320x100 on mobile.'),
  ('loc_sidebar_programmatic', 'location', 'programmatic', 300, 600, 'Right rail, sticky below the sponsor card. Rendered only at viewport >= 1200px.')
on conflict (code) do nothing;
commit;
