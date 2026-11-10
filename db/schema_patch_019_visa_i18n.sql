-- 019: translations of the visa texts per locale: {"en": {...}, "ru": {...}, "de": {...}, "sr": {...}} with the same field names as the source columns
alter table countries add column if not exists i18n jsonb;
