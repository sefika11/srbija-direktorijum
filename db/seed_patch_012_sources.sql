-- Patch 012: provenance sources for contact look-ups.
insert into data_sources (code, name, base_url, license, refresh_cron, notes) values
  ('institution_site', 'Zvanični sajt institucije', '', 'public information', '0 3 * * 0', 'Phones, emails, hours read from the institution''s own website (agent look-up or crawler).'),
  ('mup_portal', 'MUP – portal (PU/PS stranice)', 'https://www.mup.gov.rs', 'public-sector information', '0 3 1 * *', 'Directorate and station contacts rendered from the WebSphere portal (headless).')
on conflict (code) do nothing;
