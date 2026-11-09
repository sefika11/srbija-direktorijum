import postgres from "postgres";

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
export const sql =
  globalForSql.sql ??
  postgres(process.env.DATABASE_URL!, { max: 5, idle_timeout: 20, prepare: false, transform: { undefined: null } });
if (process.env.NODE_ENV !== "production") globalForSql.sql = sql;

export type Group = "republicki_organi" | "lokalna_samouprava" | "javna_preduzeca" | "javne_ustanove" | "pravosudje_i_javna_ovlascenja" | "privatne_usluge";

export type TU = {
  id: number; slug: string; level: string; name_lat: string; name_cyr: string | null; official_name_lat: string | null;
  jls_kind: "grad" | "opstina" | null; parent_id: number | null; path: string; seat_name_lat: string | null; okrug_seat: boolean;
  population_2022: number | null; website: string | null; in_kosovo: boolean;
};
export type OrgType = { id: number; slug: string; group: Group; name_lat: string; name_cyr: string | null; name_plural_lat: string | null;
  description_md: string | null; faq_md: string | null; icon: string | null; sort_order: number; one_per_jls: boolean; national_network: boolean };
export type OrgRow = { id: number; slug: string; name_lat: string; name_cyr: string | null; official_name_lat: string | null; type_slug: string; type_name: string;
  group: Group; jurisdiction: string; founder_slug: string | null; founder_name: string | null; place_name: string | null; place_slug: string | null; verification: string;
  mb: string | null; pib: string | null; jbkjs: string | null; website: string | null; parent_id: number | null; parent_name: string | null; parent_slug: string | null; parent_type_slug: string | null; last_seen_at: string | null; is_private?: boolean };

export const getTU = (slug: string, level: "jls" | "okrug" | "gradska_opstina") =>
  sql<TU[]>`select id, slug, level, name_lat, name_cyr, official_name_lat, jls_kind, parent_id, path::text, seat_name_lat, okrug_seat, population_2022, website, in_kosovo
            from territorial_units where slug = ${slug} and level = ${level} and status = 'active' limit 1`.then((r) => r[0] ?? null);

export const getOkruzi = () =>
  sql<(TU & { jls_count: number; go_count: number; org_count: number })[]>`
    select o.id, o.slug, o.level, o.name_lat, o.name_cyr, o.official_name_lat, o.jls_kind, o.parent_id, o.path::text, o.seat_name_lat, o.okrug_seat, o.population_2022, o.website, o.in_kosovo,
           (select count(*) from territorial_units j where j.level = 'jls' and j.path <@ o.path)::int as jls_count,
           (select count(*) from territorial_units g where g.level = 'gradska_opstina' and g.path <@ o.path)::int as go_count,
           (select count(*) from organizations x join territorial_units f on f.id = x.founder_unit_id where f.path <@ o.path and x.status = 'active')::int as org_count
    from territorial_units o where o.level = 'okrug' and not o.in_kosovo order by o.sort_order, o.name_lat`;

export const getJlsInOkrug = (okrugId: number) =>
  sql<(TU & { org_count: number })[]>`
    select j.id, j.slug, j.level, j.name_lat, j.name_cyr, j.official_name_lat, j.jls_kind, j.parent_id, j.path::text, j.seat_name_lat, j.okrug_seat, j.population_2022, j.website, j.in_kosovo,
           (select count(*) from organizations x join territorial_units f on f.id = x.founder_unit_id where f.path <@ j.path and x.status = 'active')::int as org_count
    from territorial_units j where j.level = 'jls' and j.parent_id = ${okrugId} order by j.okrug_seat desc, j.name_lat`;

export const getAllJls = () =>
  sql<(TU & { okrug_slug: string; okrug_name: string; org_count: number })[]>`
    select j.id, j.slug, j.level, j.name_lat, j.name_cyr, j.official_name_lat, j.jls_kind, j.parent_id, j.path::text, j.seat_name_lat, j.okrug_seat, j.population_2022, j.website, j.in_kosovo,
           o.slug as okrug_slug, o.name_lat as okrug_name,
           (select count(*) from organizations x join territorial_units f on f.id = x.founder_unit_id where f.path <@ j.path and x.status = 'active')::int as org_count
    from territorial_units j join territorial_units o on o.id = j.parent_id where j.level = 'jls' and not j.in_kosovo order by j.name_lat`;

/** Municipalities and city districts for the map: JLS rows plus gradske opštine (with their city's slug). */
export const getMapUnits = () =>
  sql<{ slug: string; name_lat: string; level: "jls" | "gradska_opstina"; jls_kind: "grad" | "opstina" | null; okrug_slug: string; parent_slug: string | null; org_count: number }[]>`
    select u.slug, u.name_lat, u.level::text as level, u.jls_kind, ok.slug as okrug_slug, case when u.level = 'gradska_opstina' then p.slug end as parent_slug,
           case when u.level = 'gradska_opstina'
                then (select count(distinct l.org_id) from locations l join territorial_units t on t.id = l.territorial_unit_id where t.path <@ u.path and l.status = 'active')
                else (select count(*) from organizations x join territorial_units f on f.id = x.founder_unit_id where f.path <@ u.path and x.status = 'active') end::int as org_count
    from territorial_units u join territorial_units p on p.id = u.parent_id
    join territorial_units ok on ok.level = 'okrug' and ok.path @> u.path
    where u.level in ('jls','gradska_opstina') and not u.in_kosovo and u.status = 'active' order by u.level, u.name_lat`;

export const getChildrenGO = (jlsId: number) =>
  sql<(TU & { org_count: number })[]>`
    select g.id, g.slug, g.level, g.name_lat, g.name_cyr, g.official_name_lat, g.jls_kind, g.parent_id, g.path::text, g.seat_name_lat, g.okrug_seat, g.population_2022, g.website, g.in_kosovo,
           (select count(*) from organizations x where x.founder_unit_id = g.id and x.status = 'active')::int as org_count
    from territorial_units g where g.level = 'gradska_opstina' and g.parent_id = ${jlsId} order by g.name_lat`;

export const getAncestors = (path: string) =>
  sql<TU[]>`select id, slug, level, name_lat, name_cyr, official_name_lat, jls_kind, parent_id, path::text, seat_name_lat, okrug_seat, population_2022, website, in_kosovo
            from territorial_units where path @> ${path}::ltree order by nlevel(path)`;

export const getOrgTypes = () =>
  sql<(OrgType & { org_count: number })[]>`
    select t.id, t.slug, t."group", t.name_lat, t.name_cyr, t.name_plural_lat, t.description_md, t.faq_md, t.icon, t.sort_order, t.one_per_jls, t.national_network,
           (select count(*) from organizations o where o.org_type_id = t.id and o.status = 'active')::int as org_count
    from org_types t where t.is_active order by t.sort_order`;

export const getOrgType = (slug: string) =>
  sql<OrgType[]>`select id, slug, "group", name_lat, name_cyr, name_plural_lat, description_md, faq_md, icon, sort_order, one_per_jls, national_network from org_types where slug = ${slug}`.then((r) => r[0] ?? null);

const ORG_SELECT = sql`
  select o.id, o.slug, o.name_lat, o.name_cyr, o.official_name_lat, t.slug as type_slug, t.name_lat as type_name, t."group" as group, o.jurisdiction,
         f.slug as founder_slug, f.name_lat as founder_name, p.name_lat as place_name, p.slug as place_slug, o.verification, o.mb, o.pib, o.jbkjs, o.website,
         o.parent_org_id as parent_id, par.name_lat as parent_name, par.slug as parent_slug, pt.slug as parent_type_slug, o.last_seen_at::text, o.is_private
  from organizations o
  join org_types t on t.id = o.org_type_id
  left join territorial_units f on f.id = o.founder_unit_id
  left join locations l on l.org_id = o.id and l.is_primary
  left join territorial_units p on p.id = l.territorial_unit_id
  left join organizations par on par.id = o.parent_org_id
  left join org_types pt on pt.id = par.org_type_id`;

/** Organizations founded by a unit (or any unit inside it) or physically seated inside it. */
export const getOrgsInUnit = (path: string) =>
  sql<OrgRow[]>`${ORG_SELECT}
    where o.status = 'active' and (f.path <@ ${path}::ltree or p.path <@ ${path}::ltree)
    order by t.sort_order, o.name_lat`;

export const getOrgsOfType = (typeSlug: string, limit = 2000) =>
  sql<OrgRow[]>`${ORG_SELECT} where o.status = 'active' and t.slug = ${typeSlug} order by coalesce(f.name_lat, p.name_lat, ''), o.name_lat limit ${limit}`;

export const getOrg = (typeSlug: string, orgSlug: string) =>
  sql<OrgRow[]>`${ORG_SELECT} where o.slug = ${orgSlug} and t.slug = ${typeSlug} limit 1`.then((r) => r[0] ?? null);

export const getOrgChildren = (orgId: number) =>
  sql<OrgRow[]>`${ORG_SELECT} where o.parent_org_id = ${orgId} and o.status = 'active' order by o.name_lat limit 300`;

export type LocRow = { location_id: number; location_slug: string; unit_name_lat: string; unit_kind: string; is_primary: boolean; address_display: string | null;
  address_extra: string | null; postal_code: string | null; settlement_name_lat: string | null; lat: number | null; lng: number | null; hours_text: string | null; notes_md: string | null;
  verification: string; verified_at: string | null; last_seen_at: string | null; tu_slug: string; tu_name_lat: string; tu_level: string; jls_slug: string | null; jls_name_lat: string | null;
  okrug_name_lat: string | null };
export const getLocations = (orgId: number) =>
  sql<LocRow[]>`select location_id, location_slug, unit_name_lat, unit_kind, is_primary, address_display, address_extra, postal_code, settlement_name_lat, lat, lng, hours_text, notes_md,
                       verification, verified_at::text, last_seen_at::text, tu_slug, tu_name_lat, tu_level::text, jls_slug, jls_name_lat, okrug_name_lat
                from v_location_page where org_id = ${orgId} and location_status = 'active' order by is_primary desc, unit_name_lat`;

export type Contact = { kind: string; value: string; value_display: string | null; label: string | null };
export const getContacts = (locationIds: number[]) =>
  locationIds.length ? sql<(Contact & { location_id: number })[]>`select location_id, kind::text, value, value_display, label from location_contacts where location_id in ${sql(locationIds)} order by is_primary desc, sort_order` : Promise.resolve([]);

export type Hours = { location_id: number; hours_type: string; day_of_week: number; opens: string; closes: string; note: string | null };
export const getHours = (locationIds: number[]) =>
  locationIds.length ? sql<Hours[]>`select location_id, hours_type::text, day_of_week, opens::text, closes::text, note from opening_hours where location_id in ${sql(locationIds)} order by hours_type, day_of_week` : Promise.resolve([]);

export const getCoverage = (locationIds: number[]) =>
  locationIds.length ? sql<{ location_id: number; slug: string; name_lat: string; level: string }[]>`
    select c.location_id, u.slug, u.name_lat, u.level::text from location_coverage c join territorial_units u on u.id = c.territorial_unit_id
    where c.location_id in ${sql(locationIds)} order by u.name_lat` : Promise.resolve([]);

/** National-network offices that serve a JLS (coverage → inside → none). */
export const getServingLocations = (jlsId: number, typeSlug: string) =>
  sql<{ id: number; slug: string; unit_name_lat: string; org_slug: string; tu_name: string }[]>`
    select s.id, s.slug, s.unit_name_lat, o.slug as org_slug, u.name_lat as tu_name
    from locations_serving(${jlsId}, ${typeSlug}) s join organizations o on o.id = s.org_id join territorial_units u on u.id = s.territorial_unit_id limit 5`;

export const getVertical = (typeSlug: string) =>
  sql<{ slug: string; name_lat: string; pitch_lat: string | null; form_schema: unknown }[]>`
    select v.slug, v.name_lat, v.pitch_lat, v.form_schema from vertical_triggers vt join lead_verticals v on v.id = vt.vertical_id
    join org_types t on t.id = vt.org_type_id where t.slug = ${typeSlug} and v.is_active order by vt.priority limit 1`.then((r) => r[0] ?? null);

export const getSponsorship = (slotCode: string, tuId: number, orgTypeId: number, orgId: number, locationId: number | null) =>
  sql<{ sponsorship_id: number; creative_id: number; partner_id: number; headline: string | null; body: string | null; cta_text: string | null; image_url: string | null; landing_url: string; partner_name: string }[]>`
    select p.sponsorship_id, p.creative_id, p.partner_id, c.headline, c.body, c.cta_text, c.image_url, c.landing_url, pa.name as partner_name
    from pick_sponsorship(${slotCode}, ${tuId}, ${orgTypeId}::smallint, ${orgId}, null, ${locationId}) p
    join creatives c on c.id = p.creative_id join partners pa on pa.id = p.partner_id`.then((r) => r[0] ?? null);

export type SearchHit = { kind: "org" | "tu"; slug: string; name_lat: string; sub: string | null; type_slug: string | null; rank: number };
export const search = (q: string, limit = 30) => sql<SearchHit[]>`
  with qq as (select f_unaccent(lower(${q})) as q)
  (select 'tu' as kind, u.slug, u.name_lat, u.official_name_lat as sub, null::text as type_slug,
          1.0 + similarity(f_unaccent(lower(u.name_lat)), qq.q) as rank
   from territorial_units u, qq where u.level in ('jls','gradska_opstina','okrug') and not u.in_kosovo
     and (f_unaccent(lower(u.name_lat)) % qq.q or u.search @@ plainto_tsquery('simple', qq.q)) )
  union all
  (select 'org', o.slug, o.name_lat, coalesce(f.name_lat, p.name_lat) || ' · ' || t.name_lat, t.slug,
          similarity(f_unaccent(lower(o.name_lat)), qq.q) + case when o.search @@ plainto_tsquery('simple', qq.q) then 0.5 else 0 end
   from organizations o join org_types t on t.id = o.org_type_id left join territorial_units f on f.id = o.founder_unit_id
   left join locations l on l.org_id = o.id and l.is_primary left join territorial_units p on p.id = l.territorial_unit_id, qq
   where o.status = 'active' and (o.search @@ plainto_tsquery('simple', qq.q) or f_unaccent(lower(o.name_lat)) % qq.q))
  order by rank desc, name_lat limit ${limit}`;

export const getStats = () =>
  sql<{ orgs: number; locations: number; jls: number; types: number }[]>`
    select (select count(*) from organizations where status = 'active')::int as orgs, (select count(*) from locations where status = 'active')::int as locations,
           (select count(*) from territorial_units where level = 'jls' and not in_kosovo)::int as jls, (select count(*) from org_types where is_active)::int as types`.then((r) => r[0]);

export const countOrgsByOkrug = () =>
  sql<{ slug: string; n: number }[]>`select o.slug, count(x.id)::int as n from territorial_units o
    left join territorial_units f on f.path <@ o.path left join organizations x on x.founder_unit_id = f.id and x.status = 'active'
    where o.level = 'okrug' group by o.slug`;

export const insertSuggestion = (p: { entity_type: string; entity_id: number | null; kind: string; patch: unknown; message: string | null; reporter_email: string | null; ip_hash: string | null; user_agent: string | null; page_path: string }) =>
  sql`insert into edit_suggestions (entity_type, entity_id, kind, patch, message, reporter_email, reporter_ip_hash, user_agent, page_path)
      values (${p.entity_type}, ${p.entity_id}, ${p.kind}::edit_kind, ${JSON.stringify(p.patch)}::jsonb, ${p.message}, ${p.reporter_email}, ${p.ip_hash}, ${p.user_agent}, ${p.page_path})`;

export const insertLead = (p: { vertical_slug: string; page_path: string; location_id: number | null; territorial_unit_id: number | null; payload: Record<string, unknown>; contact_phone: string | null; contact_email: string | null; dedupe_hash: string; consent_version: string; ip_hash: string | null; user_agent: string | null; honeypot: boolean }) =>
  sql`insert into leads (vertical_id, page_path, location_id, territorial_unit_id, payload, contact_phone, contact_email, dedupe_hash, consent_version, ip_hash, user_agent, honeypot_tripped)
      select v.id, ${p.page_path}, ${p.location_id}, ${p.territorial_unit_id}, ${JSON.stringify(p.payload)}::jsonb, ${p.contact_phone}, ${p.contact_email}, ${p.dedupe_hash}, ${p.consent_version}, ${p.ip_hash}, ${p.user_agent}, ${p.honeypot}
      from lead_verticals v where v.slug = ${p.vertical_slug} on conflict (dedupe_hash) do nothing`;

// ---------------------------------------------------------------- Guides (services with structured content, patch 007)
export type GuideContent = {
  title?: string; summary?: string; who?: string[]; where_note?: string;
  documents?: { name: string; note?: string; variants?: string[] }[];
  steps?: string[]; faq?: { q: string; a: string }[]; for_foreigners?: string;
};
export type Fee = { item: string; amount_rsd: number | null; basis?: string; source_url?: string; checked_at?: string; note?: string };
export type GuideSource = { url: string; title?: string; checked_at?: string };
export type GuideRow = {
  id: number; slug: string; category_slug: string; category_name: string; category_icon: string | null; name_lat: string; summary: string | null;
  guide: Record<string, GuideContent>; fees: Fee[]; typical_duration: string | null; legal_basis: string | null; euprava_url: string | null;
  online_available: boolean; sources: GuideSource[]; checked_at: string | null; status: "short" | "full"; lead_vertical_id: number | null; org_type_slugs: string[]; sort_order: number;
};
const GUIDE_SELECT = sql`
  select s.id, s.slug, c.slug as category_slug, c.name_lat as category_name, c.icon as category_icon, s.name_lat, s.summary, s.guide, s.fees, s.typical_duration,
         s.legal_basis, s.euprava_url, s.online_available, s.sources, s.checked_at::text, s.status, s.lead_vertical_id, s.sort_order,
         coalesce((select array_agg(t.slug order by ots.is_primary desc, t.slug) from org_type_services ots join org_types t on t.id = ots.org_type_id where ots.service_id = s.id), '{}') as org_type_slugs
  from services s join service_categories c on c.id = s.category_id`;
export const getGuides = () => sql<GuideRow[]>`${GUIDE_SELECT} where s.is_active and s.status <> 'draft' order by c.sort_order, s.sort_order, s.name_lat`;
export const getGuide = (slug: string) => sql<GuideRow[]>`${GUIDE_SELECT} where s.slug = ${slug} and s.is_active and s.status <> 'draft' limit 1`.then((r) => r[0] ?? null);

const LOC_COLS = sql`location_id, location_slug, unit_name_lat, unit_kind, is_primary, address_display, address_extra, postal_code, settlement_name_lat, lat, lng, hours_text, notes_md,
  verification, verified_at::text, last_seen_at::text, tu_slug, tu_name_lat, tu_level::text, jls_slug, jls_name_lat, okrug_name_lat, org_slug, org_name_lat, org_type_slug`;
export type ServingRow = LocRow & { org_slug: string; org_name_lat: string; org_type_slug: string };
/** The location(s) of a given institution type that serve a municipality: explicit coverage first, else seated inside it. */
export const getServing = (jlsId: number, typeSlug: string) =>
  sql<ServingRow[]>`select ${LOC_COLS} from v_location_page where location_id in (select id from locations_serving(${jlsId}, ${typeSlug}))
                    and location_status = 'active'
                    order by is_primary desc, unit_kind = 'filijala' desc, (unit_name_lat ilike 'policijska stanica%' or unit_name_lat ilike 'policijska uprava%' or unit_name_lat ilike 'vatrogasn%') desc, unit_name_lat limit 8`;
/** All locations of a national-network type, for hub pages where one organization has many branches. */
export const getLocationsOfType = (typeSlug: string) =>
  sql<ServingRow[]>`select ${LOC_COLS} from v_location_page where org_type_slug = ${typeSlug} and location_status = 'active'
                    order by okrug_name_lat nulls last, jls_name_lat, unit_kind = 'filijala' desc, unit_name_lat limit 2000`;
export const getVerticalById = (id: number) =>
  sql<{ id: number; slug: string; name_lat: string; pitch_lat: string | null; form_schema: unknown }[]>`select id, slug, name_lat, pitch_lat, form_schema from lead_verticals where id = ${id} and is_active`.then((r) => r[0] ?? null);

/** Vital services for a municipality page: one row per organisation of the given types with its primary phone. */
export type VitalRow = { id: number; slug: string; type_slug: string; name_lat: string; phone: string | null; phone_display: string | null; location_slug: string | null; hours_text: string | null };
export const getVitalForUnit = (path: string, typeSlugs: string[]) =>
  sql<VitalRow[]>`select o.id, o.slug, t.slug as type_slug, o.name_lat, c.value as phone, c.value_display as phone_display, l.slug as location_slug, l.hours_text
    from organizations o join org_types t on t.id = o.org_type_id
    left join territorial_units f on f.id = o.founder_unit_id
    left join locations l on l.org_id = o.id and l.is_primary and l.status = 'active'
    left join territorial_units p on p.id = l.territorial_unit_id
    left join lateral (select value, value_display from location_contacts lc where lc.location_id = l.id and lc.kind = 'phone' order by lc.id limit 1) c on true
    where o.status = 'active' and t.slug = any(${typeSlugs}) and (f.path <@ ${path}::ltree or p.path <@ ${path}::ltree)
    order by t.sort_order, o.name_lat limit 60`;

export const insertClaim = (c: { org_id: number; location_id: number | null; claimant_name: string; claimant_role: string | null; email: string; phone: string | null; message: string | null; ip_hash: string | null }) =>
  sql`insert into listing_claims (org_id, location_id, claimant_name, claimant_role, email, phone, message, ip_hash)
      values (${c.org_id}, ${c.location_id}, ${c.claimant_name}, ${c.claimant_role}, ${c.email}, ${c.phone}, ${c.message}, ${c.ip_hash})`;

/** Active featured placements for a type (nationwide or inside a territorial unit path). */
export type FeaturedRow = { id: number; org_id: number; org_slug: string; org_name: string; type_slug: string; type_name: string; place_name: string | null; tier: string; phone: string | null; website: string | null };
export const getFeatured = (typeSlug: string | null, unitPath: string | null, limit = 3) =>
  sql<FeaturedRow[]>`select f.id, o.id as org_id, o.slug as org_slug, o.name_lat as org_name, t.slug as type_slug, t.name_lat as type_name, coalesce(tu.name_lat, p.name_lat) as place_name, f.tier,
      (select value_display from location_contacts c join locations l on l.id = c.location_id where l.org_id = o.id and c.kind = 'phone' order by l.is_primary desc, c.id limit 1) as phone, o.website
    from featured_listings f join organizations o on o.id = f.org_id join org_types t on t.id = f.org_type_id
    left join territorial_units tu on tu.id = f.territorial_unit_id
    left join locations pl on pl.org_id = o.id and pl.is_primary left join territorial_units p on p.id = pl.territorial_unit_id
    where f.status = 'active' and current_date between f.starts_at and f.ends_at and o.status = 'active'
      and (${typeSlug}::text is null or t.slug = ${typeSlug}) and (${unitPath}::text is null or tu.id is null or tu.path <@ ${unitPath}::ltree)
    order by f.tier = 'highlight' desc, f.starts_at desc limit ${limit}`;
