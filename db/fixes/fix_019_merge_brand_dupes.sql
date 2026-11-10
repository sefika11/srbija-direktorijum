-- 019: merge duplicate brand organisations (same bank/insurer loaded under two names) and de-duplicate their branches.
-- Slug-based so it runs identically on every database. Idempotent.
create or replace function merge_org(keep_slug text, drop_slug text, new_name text default null) returns text language plpgsql as $$
declare k bigint; d bigint; moved int := 0;
begin
  select id into k from organizations where slug = keep_slug; select id into d from organizations where slug = drop_slug;
  if k is null then return keep_slug || ': keeper missing'; end if;
  if d is not null then
    -- location slugs are unique per organisation: suffix a colliding slug before moving it
    update locations l set slug = l.slug || '-' || l.id where l.org_id = d and exists (select 1 from locations x where x.org_id = k and x.slug = l.slug);
    update locations set org_id = k where org_id = d; get diagnostics moved = row_count;
    update featured_listings set org_id = k where org_id = d;
    update listing_claims set org_id = k where org_id = d;
    update sponsorships set org_id = k where org_id = d;
    update organizations set website = coalesce(website, (select website from organizations where id = d)) where id = k;
    delete from organizations where id = d;
  end if;
  if new_name is not null then update organizations set name_lat = new_name where id = k; end if;
  return keep_slug || ': moved ' || moved;
end $$;

-- within one organisation, two branches at the same normalised address in the same municipality are one branch:
-- keep the row with more contacts + hours (tie: oldest), copy coordinates across, repoint children, drop the other.
create or replace function dedupe_locations(org_slug text) returns int language plpgsql as $$
declare r record; n int := 0;
begin
  for r in
    with l as (
      select l.id, l.org_id, f_unaccent(lower(regexp_replace(coalesce(l.address_display,''), '[^[:alnum:]]+', '', 'g'))) a, l.territorial_unit_id tu, l.lat, l.lng,
             (select count(*) from location_contacts c where c.location_id = l.id) + (select count(*) from opening_hours h where h.location_id = l.id) score
      from locations l join organizations o on o.id = l.org_id where o.slug = dedupe_locations.org_slug and l.address_display is not null and l.status = 'active')
    select a.id keep_id, b.id drop_id, a.lat alat, b.lat blat, b.lng blng
    from l a join l b on a.org_id = b.org_id and a.a = b.a and a.tu = b.tu and a.id <> b.id
    where (a.score > b.score) or (a.score = b.score and a.id < b.id)
  loop
    if not exists (select 1 from locations where id = r.drop_id) then continue; end if;
    if r.alat is null and r.blat is not null then update locations set lat = r.blat, lng = r.blng where id = r.keep_id; end if;
    update location_contacts c set location_id = r.keep_id where c.location_id = r.drop_id and not exists (select 1 from location_contacts x where x.location_id = r.keep_id and x.kind = c.kind and x.value = c.value);
    delete from location_contacts where location_id = r.drop_id;
    delete from opening_hours where location_id = r.drop_id and exists (select 1 from opening_hours where location_id = r.keep_id);
    update opening_hours set location_id = r.keep_id where location_id = r.drop_id;
    update opening_exceptions set location_id = r.keep_id where location_id = r.drop_id;
    update departments set location_id = r.keep_id where location_id = r.drop_id;
    update location_services set location_id = r.keep_id where location_id = r.drop_id;
    update location_coverage set location_id = r.keep_id where location_id = r.drop_id;
    update sponsorships set location_id = r.keep_id where location_id = r.drop_id;
    update leads set location_id = r.keep_id where location_id = r.drop_id;
    update featured_listings set location_id = r.keep_id where location_id = r.drop_id;
    update listing_claims set location_id = r.keep_id where location_id = r.drop_id;
    update locations set is_primary = true where id = r.keep_id and exists (select 1 from locations where id = r.drop_id and is_primary);
    delete from locations where id = r.drop_id; n := n + 1;
  end loop;
  return n;
end $$;

begin;
select merge_org('banka-raiffeisen', 'banka-raiffeisen-banka', 'Raiffeisen banka');
select merge_org('banka-raiffeisen', 'banka-raiffeisenbank');
select merge_org('banka-aik', 'banka-aikbank', 'AIK banka');
select merge_org('banka-postanska-stedionica', 'banka-banka-postanska-stedionica', 'Banka Poštanska štedionica');
select merge_org('banka-api', 'banka-api-bank', 'API Bank');
select merge_org('banka-nlb-komercijalna', 'banka-nlb', 'NLB Komercijalna banka');
select merge_org('banka-unicredit', 'banka-unicredit-srbija', 'UniCredit Bank');
select merge_org('banka-banca-intesa', 'banka-inteza', 'Banca Intesa');
select merge_org('banka-bank-of-china-srbija', 'banka-boc', 'Bank of China Srbija');
select slug, dedupe_locations(slug) removed from organizations o where exists (select 1 from org_types t where t.id = o.org_type_id and t.slug in ('banka','osiguranje','telekom-prodavnica')) order by 2 desc limit 12;
commit;
