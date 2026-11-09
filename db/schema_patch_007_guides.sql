-- Patch 007: structured, multilingual guides on top of `services` (docs/05 §1).
-- `guide` holds per-locale content so the four languages share one set of facts:
--   {"sr": {"title","summary","who":[],"where_note","documents":[{"name","note","variants":[]}],
--           "steps":[],"faq":[{"q","a"}],"for_foreigners"}, "en": {...}, "ru": {...}, "de": {...}}
-- Facts that must not drift between languages stay in dedicated columns: fees (jsonb array of
-- {"item","amount_rsd","basis","source_url","checked_at"}), typical_duration, legal_basis, euprava_url.
begin;
alter table services
  add column if not exists guide        jsonb not null default '{}'::jsonb,
  add column if not exists sources      jsonb not null default '[]'::jsonb,   -- [{"url","title","checked_at"}]
  add column if not exists checked_at   date,
  add column if not exists status       text not null default 'draft' check (status in ('draft','short','full')),
  add column if not exists sort_order   integer not null default 100;
comment on column services.status is 'draft = not shown; short = where-to-go + summary only; full = all blocks verified';
create index if not exists services_status_idx on services (status) where is_active;
commit;
