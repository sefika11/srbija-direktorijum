-- Daily job (apps/web/app/api/cron/daily): the result of the last look at an organisation's website.
alter table organizations add column if not exists website_checked_at timestamptz;
alter table organizations add column if not exists website_status smallint;   -- HTTP status of the last check; 0 = no answer
create index if not exists organizations_website_check_idx on organizations (website_checked_at nulls first) where website is not null and status = 'active';
