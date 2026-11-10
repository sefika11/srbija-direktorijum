/** Question-aware directory search: place detection (Serbian case endings), intent matching on guides,
 *  institution types and synonyms, grouped results and a "best answer". Postgres only, no model. */
import * as db from "./db";
import { sql } from "./db";
import { href, type Locale } from "./i18n";

export type Place = { id: number; slug: string; name_lat: string; level: "jls" | "gradska_opstina" | "okrug"; parent_slug: string | null; parent_id: number | null; jls_kind: string | null; path: string };
export type TypeHit = db.OrgType & { org_count: number; score: number };
export type GuideHit = db.GuideRow & { score: number };
export type Suggestion = { kind: "guide" | "type" | "place" | "org" | "country" | "action"; href: string; title: string; sub: string | null; icon?: string | null; phone?: string | null; iso2?: string | null; count?: number | null; tel?: string | null };
export type Best =
  | { kind: "guide"; guide: db.GuideRow; serving: db.ServingRow[]; contacts: (db.Contact & { location_id: number })[]; hours: db.Hours[] }
  | { kind: "type"; type: TypeHit; serving: db.ServingRow[]; contacts: (db.Contact & { location_id: number })[]; hours: db.Hours[] }
  | { kind: "place"; place: Place };
export type SmartResult = { q: string; intent: string; place: Place | null; guides: GuideHit[]; types: TypeHit[]; places: Place[]; orgs: db.SearchHit[]; best: Best | null; total: number };

const STOP = new Set(["u", "za", "kako", "gde", "da", "se", "mi", "treba", "vadim", "izvadim", "dobijem", "izvaditi", "dobiti", "i", "na", "iz", "do", "kod", "moj", "moja", "moje", "hocu", "zelim", "mogu", "li", "je", "sta", "koji", "koja", "koje", "the", "a", "an", "to", "get", "how", "where", "in", "do", "i", "for", "my", "can", "need", "apply", "wie", "wo", "ich", "in", "der", "die", "das", "где", "как", "в", "мне", "нужно", "получить"]);

export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").replace(/Đ/g, "dj").toLowerCase().replace(/[^a-z0-9а-яё ]+/gi, " ").replace(/\s+/g, " ").trim();
}
function cyrToLat(s: string): string {
  const m: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s", ы: "i", э: "e", ю: "ju", я: "ja", ё: "e", й: "j", щ: "sc", ь: "", ъ: "" };
  return s.replace(/[Ѐ-ӿ]/g, (c) => m[c] ?? c);
}
const cp = (a: string, b: string) => { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; };
/** Locative-tolerant word match: 'kragujevcu' ~ 'kragujevac', 'novom' ~ 'novi'. */
function wordMatch(w: string, c: string): number {
  const n = cp(w, c);
  if (n < Math.max(3, w.length - 3) || n < c.length - 3) return 0;
  if (n === w.length && c.length > w.length && w.length < 5) return 0;   // 'sad' must not match 'sadovi'
  return n;
}

let unitsCache: { at: number; units: (Place & { words: string[] })[] } | null = null;
async function units(): Promise<(Place & { words: string[] })[]> {
  if (unitsCache && Date.now() - unitsCache.at < 10 * 60_000) return unitsCache.units;
  const rows = await sql<Place[]>`select u.id, u.slug, u.name_lat, u.level::text as level, p.slug as parent_slug, u.parent_id, u.jls_kind::text as jls_kind, u.path::text as path
    from territorial_units u left join territorial_units p on p.id = u.parent_id
    where u.level in ('jls','gradska_opstina','okrug') and not u.in_kosovo and u.status = 'active'`;
  unitsCache = { at: Date.now(), units: rows.map((r) => ({ ...r, words: fold(r.name_lat.replace(/^(grad|opstina|opština)\s+/i, "")).split(" ") })) };
  return unitsCache.units;
}

/** Find the best place mention in the token list; returns the place and the token indexes it consumed. */
async function detectPlace(tokens: string[]): Promise<{ place: Place; used: Set<number> } | null> {
  const all = await units();
  let best: { place: Place; used: Set<number>; score: number } | null = null;
  for (const u of all) {
    const n = u.words.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      let score = 0;
      for (let k = 0; k < n; k++) { const m = wordMatch(tokens[i + k], u.words[k]); if (!m) { score = 0; break; } score += m; }
      if (!score) continue;
      // exact words beat stems; JLS beats GO beats okrug when equal
      score = score * 10 + (tokens.slice(i, i + n).join(" ") === u.words.join(" ") ? 5 : 0) + (u.level === "jls" ? 2 : u.level === "gradska_opstina" ? 1 : 0);
      if (!best || score > best.score) best = { place: u, used: new Set(Array.from({ length: n }, (_, k) => i + k)), score };
    }
  }
  return best ? { place: best.place, used: best.used } : null;
}

function tokenize(q: string): string[] { return fold(cyrToLat(q)).split(" ").filter((t) => t && !STOP.has(t)); }
function grams(tokens: string[]): string[] { const g = [...tokens]; for (let i = 0; i + 1 < tokens.length; i++) g.push(`${tokens[i]} ${tokens[i + 1]}`); return g; }

async function synonyms(tokens: string[]): Promise<{ kind: string; slug: string; weight: number }[]> {
  if (!tokens.length) return [];
  const g = grams(tokens); const prefixes = tokens.filter((t) => t.length >= 4);
  return sql<{ kind: string; slug: string; weight: number }[]>`
    select kind, slug, max(weight)::float as weight from search_synonyms
    where term = any(${g}::text[]) ${prefixes.length ? sql`or exists (select 1 from unnest(${prefixes}::text[]) p where term like p || '%' or p like term || '%')` : sql``}
    group by kind, slug order by weight desc`;
}

async function matchGuides(intent: string, tokens: string[], syn: { kind: string; slug: string; weight: number }[], limit: number): Promise<GuideHit[]> {
  if (!intent && !syn.length) return [];
  const synSlugs = syn.filter((s) => s.kind === "guide").map((s) => s.slug);
  const rows = await sql<(db.GuideRow & { score: number })[]>`
    select s.id, s.slug, c.slug as category_slug, c.name_lat as category_name, c.icon as category_icon, s.name_lat, s.summary, s.guide, s.fees, s.typical_duration,
           s.legal_basis, s.euprava_url, s.online_available, s.sources, s.checked_at::text, s.status, s.lead_vertical_id, s.sort_order,
           coalesce((select array_agg(t.slug order by ots.is_primary desc, t.slug) from org_type_services ots join org_types t on t.id = ots.org_type_id where ots.service_id = s.id), '{}') as org_type_slugs,
           (case when s.slug = any(${synSlugs}::text[]) then 2.0 else 0 end
            + case when ${intent} <> '' and s.search @@ plainto_tsquery('simple', f_unaccent(${intent})) then 1.0 else 0 end
            + case when ${intent} <> '' then similarity(f_unaccent(lower(s.name_lat)), f_unaccent(${intent})) else 0 end
            + case when ${intent} <> '' and f_unaccent(lower(s.guide->'sr'->>'title' || ' ' || coalesce(s.guide->'en'->>'title',''))) like '%' || f_unaccent(${intent}) || '%' then 0.8 else 0 end)::float as score
    from services s join service_categories c on c.id = s.category_id
    where s.is_active and s.status <> 'draft'
    order by score desc, s.sort_order limit ${limit}`;
  return rows.filter((r) => r.score >= 0.3);
}

async function matchTypes(intent: string, tokens: string[], syn: { kind: string; slug: string; weight: number }[], limit: number): Promise<TypeHit[]> {
  if (!intent && !syn.length) return [];
  const synSlugs = syn.filter((s) => s.kind === "type").map((s) => s.slug);
  const toks = tokens.filter((t) => t.length >= 4);
  const rows = await sql<TypeHit[]>`
    select t.id, t.slug, t."group", t.name_lat, t.name_cyr, t.name_plural_lat, t.description_md, t.faq_md, t.icon, t.sort_order, t.one_per_jls, t.national_network,
           (select count(*) from organizations o where o.org_type_id = t.id and o.status = 'active')::int as org_count,
           (case when t.slug = any(${synSlugs}::text[]) then 2.0 else 0 end
            + case when ${intent} <> '' then greatest(similarity(f_unaccent(lower(t.name_lat)), f_unaccent(${intent})), similarity(f_unaccent(lower(coalesce(t.name_plural_lat, ''))), f_unaccent(${intent}))) else 0 end
            + case when ${toks.length > 0} and exists (select 1 from unnest(${toks}::text[]) k where f_unaccent(lower(t.name_lat)) like '%' || k || '%' or f_unaccent(lower(coalesce(t.name_plural_lat,''))) like '%' || k || '%') then 0.6 else 0 end)::float as score
    from org_types t where t.is_active
    order by score desc, t.sort_order limit ${limit}`;
  return rows.filter((r) => r.score >= 0.4 && r.org_count > 0);
}

async function matchOrgs(q: string, placePath: string | null, limit: number): Promise<db.SearchHit[]> {
  if (q.length < 2) return [];
  return sql<db.SearchHit[]>`
    with qq as (select f_unaccent(lower(${q})) as q)
    select 'org'::text as kind, o.slug, o.name_lat, coalesce(f.name_lat, p.name_lat) || ' · ' || t.name_lat as sub, t.slug as type_slug,
           (similarity(f_unaccent(lower(o.name_lat)), qq.q) + case when o.search @@ plainto_tsquery('simple', qq.q) then 0.5 else 0 end)::float as rank
    from organizations o join org_types t on t.id = o.org_type_id left join territorial_units f on f.id = o.founder_unit_id
    left join locations l on l.org_id = o.id and l.is_primary left join territorial_units p on p.id = l.territorial_unit_id, qq
    where o.status = 'active' and (o.search @@ plainto_tsquery('simple', qq.q) or f_unaccent(lower(o.name_lat)) % qq.q)
      ${placePath ? sql`and (f.path <@ ${placePath}::ltree or p.path <@ ${placePath}::ltree)` : sql``}
    order by rank desc, o.name_lat limit ${limit}`;
}

async function placesLike(tokens: string[], limit: number): Promise<Place[]> {
  const all = await units(); const out: { p: Place; s: number }[] = [];
  for (const u of all) {
    let s = 0;
    for (const t of tokens) for (const w of u.words) { const m = wordMatch(t, w) || (t.length >= 3 && w.startsWith(t) ? t.length : 0); if (m > s) s = m; }
    if (s) out.push({ p: u, s: s * 10 + (u.level === "jls" ? 2 : u.level === "gradska_opstina" ? 1 : 0) });
  }
  return out.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
}

async function jlsIdFor(place: Place): Promise<number | null> {
  if (place.level === "jls") return place.id;
  if (place.level === "gradska_opstina") return place.parent_id;
  return null;
}

export async function smartSearch(q: string, locale: Locale): Promise<SmartResult> {
  const tokens = tokenize(q);
  const det = tokens.length ? await detectPlace(tokens) : null;
  const intentTokens = det ? tokens.filter((_, i) => !det.used.has(i)) : tokens;
  const intent = intentTokens.join(" ");
  const syn = await synonyms(intentTokens);
  const placePath = det?.place.path ?? null;
  const [guides, types, orgs, places] = await Promise.all([
    matchGuides(intent, intentTokens, syn, 6), matchTypes(intent, intentTokens, syn, 6),
    intent ? matchOrgs(intent, placePath, det ? 20 : 30) : Promise.resolve([]),
    det ? Promise.resolve([det.place]) : placesLike(tokens, 6),
  ]);
  let best: Best | null = null;
  const jlsId = det ? await jlsIdFor(det.place) : null;
  if (guides[0] && guides[0].score >= 0.8) {
    const typeSlug = guides[0].org_type_slugs[0];
    const serving = jlsId && typeSlug ? await db.getServing(jlsId, typeSlug) : [];
    const ids = serving.map((s) => s.location_id);
    const [contacts, hours] = await Promise.all([db.getContacts(ids), db.getHours(ids)]);
    best = { kind: "guide", guide: guides[0], serving, contacts, hours };
  } else if (types[0] && types[0].score >= 0.8 && jlsId) {
    const serving = await db.getServing(jlsId, types[0].slug);
    const ids = serving.map((s) => s.location_id);
    const [contacts, hours] = await Promise.all([db.getContacts(ids), db.getHours(ids)]);
    best = { kind: "type", type: types[0], serving, contacts, hours };
  } else if (det && !intent) {
    best = { kind: "place", place: det.place };
  }
  const total = guides.length + types.length + orgs.length + places.length;
  sql`insert into search_log (q, locale, place_slug, n_results, best_kind) values (${q.slice(0, 200)}, ${locale}, ${det?.place.slug ?? null}, ${total}, ${best?.kind ?? null})`.catch(() => {});
  return { q, intent, place: det?.place ?? null, guides, types, places, orgs, best, total };
}

/** Lightweight suggestions for the typeahead. */
const ACTIONS: { re: RegExp; tel: string; title: Record<Locale, string> }[] = [
  { re: /^(policij|polic|192)/, tel: "192", title: { sr: "Policija", en: "Police", ru: "Полиция", de: "Polizei" } },
  { re: /^(vatrog|pozar|požar|193)/, tel: "193", title: { sr: "Vatrogasci", en: "Fire brigade", ru: "Пожарные", de: "Feuerwehr" } },
  { re: /^(hitna|ambul|194)/, tel: "194", title: { sr: "Hitna pomoć", en: "Ambulance", ru: "Скорая помощь", de: "Rettungsdienst" } },
  { re: /^(amss|pomoc na putu|1987|slep)/, tel: "1987", title: { sr: "AMSS – pomoć na putu", en: "Roadside assistance (AMSS)", ru: "Помощь на дороге (AMSS)", de: "Pannenhilfe (AMSS)" } },
  { re: /^(struja|kvar struj|nestala struj|elektrodistrib|eps)/, tel: "0800360300", title: { sr: "Elektrodistribucija – prijava kvara", en: "Power outage line", ru: "Электросети – авария", de: "Stromausfall melden" } },
];
let typeIconCache: { at: number; map: Record<string, string | null> } | null = null;
async function typeIcons(): Promise<Record<string, string | null>> {
  if (typeIconCache && Date.now() - typeIconCache.at < 10 * 60_000) return typeIconCache.map;
  const rows = await sql<{ slug: string; icon: string | null }[]>`select slug, icon from org_types`;
  typeIconCache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.slug, r.icon])) }; return typeIconCache.map;
}
async function matchCountries(tokens: string[], locale: Locale, limit: number): Promise<{ iso2: string; slug: string; name: string; to: string | null; from: string | null }[]> {
  const toks = tokens.filter((t) => t.length >= 3); if (!toks.length) return [];
  const rows = await sql<{ iso2: string; slug: string; name_sr: string; name_en: string; to_rs_regime: string | null; from_rs_regime: string | null }[]>`
    select iso2, slug, name_sr, name_en, to_rs_regime, from_rs_regime from countries
    where exists (select 1 from unnest(${toks}::text[]) t where f_unaccent(lower(name_sr)) like t || '%' or f_unaccent(lower(name_en)) like t || '%' or f_unaccent(lower(name_sr)) like '% ' || t || '%')
    order by name_sr limit ${limit}`;
  return rows.map((r) => ({ iso2: r.iso2, slug: r.slug, name: locale === "sr" ? r.name_sr : r.name_en, to: r.to_rs_regime, from: r.from_rs_regime }));
}
type BranchHit = { org_slug: string; org_name: string; type_slug: string; icon: string | null; location_slug: string; unit_name: string; address: string | null; phone: string | null };
/** Branches (locations) of the matched institution types inside a place: the answer to "banka Niš", "pošta Čačak", "ambulanta Zemun". */
async function matchBranches(typeSlugs: string[], placePath: string | null, limit: number): Promise<BranchHit[]> {
  if (!typeSlugs.length || !placePath) return [];
  return sql<BranchHit[]>`
    select o.slug as org_slug, o.name_lat as org_name, t.slug as type_slug, t.icon, l.slug as location_slug, l.unit_name_lat as unit_name, l.address_display as address,
           (select value_display from location_contacts c where c.location_id = l.id and c.kind = 'phone' order by c.id limit 1) as phone
    from locations l join organizations o on o.id = l.org_id join org_types t on t.id = o.org_type_id join territorial_units tu on tu.id = l.territorial_unit_id
    where l.status = 'active' and o.status = 'active' and t.slug = any(${typeSlugs}::text[]) and tu.path <@ ${placePath}::ltree
    order by (select count(*) from location_contacts c where c.location_id = l.id) desc, o.name_lat, l.unit_name_lat limit ${limit}`;
}
async function orgPhones(slugs: string[]): Promise<Record<string, string>> {
  if (!slugs.length) return {};
  const rows = await sql<{ slug: string; phone: string }[]>`select o.slug, c.value_display as phone from organizations o
    join lateral (select lc.value_display from locations l join location_contacts lc on lc.location_id = l.id where l.org_id = o.id and lc.kind = 'phone' order by l.is_primary desc, lc.id limit 1) c on true
    where o.slug = any(${slugs}::text[])`;
  return Object.fromEntries(rows.map((r) => [r.slug, r.phone]));
}

export async function suggest(q: string, locale: Locale): Promise<Suggestion[]> {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const det = await detectPlace(tokens);
  const intentTokens = det ? tokens.filter((_, i) => !det.used.has(i)) : tokens;
  const intent = intentTokens.join(" ");
  const syn = await synonyms(intentTokens);
  const [guides, types, places, orgs, countries, icons] = await Promise.all([
    matchGuides(intent, intentTokens, syn, 3), matchTypes(intent, intentTokens, syn, 4),
    det ? Promise.resolve([det.place]) : placesLike(tokens, 3), intent ? matchOrgs(intent, det?.place.path ?? null, 6) : Promise.resolve([]),
    matchCountries(tokens, locale, 3).catch(() => []), typeIcons(),
  ]);
  const branchTypes = [...new Set([...types.map((t) => t.slug), ...syn.filter((x) => x.kind === "type").map((x) => x.slug)])].slice(0, 4);
  const [phones, branches] = await Promise.all([orgPhones(orgs.map((o) => o.slug)).catch(() => ({} as Record<string, string>)), matchBranches(branchTypes, det?.place.path ?? null, 6).catch(() => [] as BranchHit[])]);
  const out: Suggestion[] = [];
  const folded = fold(cyrToLat(q));
  for (const a of ACTIONS) if (a.re.test(folded)) out.push({ kind: "action", href: `tel:${a.tel}`, title: a.title[locale], sub: a.tel.replace(/^0800/, "0800 "), tel: a.tel, icon: a.tel === "192" ? "shield" : a.tel === "193" ? "flame" : a.tel === "194" ? "heart-pulse" : a.tel === "1987" ? "car" : "zap" });
  const placeQ = det ? `?opstina=${det.place.level === "gradska_opstina" ? det.place.parent_slug : det.place.slug}` : "";
  for (const g of guides) { const c = g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}; out.push({ kind: "guide", href: href(locale, `/vodic/${g.slug}${det && det.place.level !== "okrug" ? placeQ : ""}`), title: c.title ?? g.name_lat, sub: det ? det.place.name_lat : g.category_name, icon: "file-text" }); }
  for (const t of types) out.push({ kind: "type", href: href(locale, det && det.place.level !== "okrug" ? `/${det.place.level === "gradska_opstina" ? det.place.parent_slug : det.place.slug}#${t.group}` : `/${t.slug}`), title: t.name_plural_lat ?? t.name_lat, sub: det ? det.place.name_lat : null, icon: t.icon, count: t.org_count });
  for (const p of places) out.push({ kind: "place", href: href(locale, p.level === "okrug" ? `/okrug/${p.slug}` : p.level === "gradska_opstina" ? `/${p.parent_slug}/${p.slug}` : `/${p.slug}`), title: p.name_lat, sub: p.level === "okrug" ? "okrug" : p.level === "gradska_opstina" ? "gradska opština" : p.jls_kind === "grad" ? "grad" : "opština", icon: p.level === "okrug" ? "map" : "building" });
  const seen = new Set<string>();
  const seenBranch = new Set<string>();
  for (const b of branches) { const generic = /^(ekspozitura|poslovnica|filijala|ispostava|sediste|sedište|ambulanta|pošta|posta)$/i.test(b.unit_name.trim()); const key = `${b.org_name}|${b.address ?? ""}|${generic ? "" : b.unit_name}`; if (seenBranch.has(key)) continue; seenBranch.add(key); const h = `/${b.type_slug}/${b.org_slug}/${b.location_slug}`; seen.add(h); out.push({ kind: "org", href: href(locale, h), title: generic || b.unit_name.toLowerCase().includes(b.org_name.toLowerCase()) ? b.org_name : `${b.org_name} · ${b.unit_name}`, sub: [b.address, det?.place.name_lat].filter(Boolean).join(", ") || (generic ? `${b.unit_name} · ${det?.place.name_lat ?? ""}` : null), icon: b.icon, phone: b.phone }); }
  for (const o of orgs) { const h = `/${o.type_slug}/${o.slug}`; if (seen.has(h)) continue; seen.add(h); out.push({ kind: "org", href: href(locale, h), title: o.name_lat, sub: o.sub, icon: o.type_slug ? icons[o.type_slug] ?? null : null, phone: phones[o.slug] ?? null }); }
  for (const c of countries) out.push({ kind: "country", href: href(locale, `/vize/${c.slug}`), title: c.name, sub: [c.to ? `→ RS: ${c.to}` : null, c.from ? `RS →: ${c.from}` : null].filter(Boolean).join(" · ") || null, iso2: c.iso2 });
  return out.slice(0, 18);
}
