-- locations_serving(jls, type): what a resident of a municipality is sent to.
-- Until now a location inside the municipality was returned only when NO location carried an explicit coverage row for it.
-- The map imports wrote such rows ("covers its own municipality") for some rows of a kind, and every other row of that kind
-- then vanished: 25 map lawyers hid 6,000 Belgrade lawyers from the bar directory; 76 of 13,413 lawyers, 68 of 1,428 estate
-- agencies, 3,359 of 3,408 pharmacies carried one. Rule now: for kinds that are not one national network, covering and
-- sitting inside both count. National networks (tax, health fund, Treasury, police) keep the old rule, so the head office in
-- Belgrade does not answer for a branch.
create or replace function locations_serving(p_jls_id bigint, p_org_type_slug text)
returns setof locations language sql stable as
$$
  with jls as (select path from territorial_units where id = p_jls_id),
  explicit as (
    select l.* from locations l
    join location_coverage c on c.location_id = l.id
    join organizations o on o.id = l.org_id
    join org_types ot on ot.id = o.org_type_id
    where ot.slug = p_org_type_slug and c.territorial_unit_id = p_jls_id and l.status = 'active'
  ),
  inside as (
    select l.* from locations l
    join organizations o on o.id = l.org_id
    join org_types ot on ot.id = o.org_type_id
    join territorial_units t on t.id = l.territorial_unit_id
    cross join jls
    where ot.slug = p_org_type_slug and l.status = 'active' and jls.path @> t.path
  )
  select * from explicit
  union
  select * from inside where not exists (select 1 from explicit)
     or not coalesce((select national_network from org_types where slug = p_org_type_slug), false)
$$;
