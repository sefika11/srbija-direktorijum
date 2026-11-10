/** Question-aware directory search: place detection (Serbian case endings), intent matching on guides,
 *  institution types and synonyms, grouped results and a "best answer". Postgres only, no model. */
import { emblemFor } from "@/lib/emblem-map";
import { catName } from "@/lib/guide-cats";
import * as db from "./db";
import { sql } from "./db";
import { href, pick, t as dictOf, type Locale, tn } from "./i18n";
import { ROADMAPS, ROAD_LABELS } from "./roadmaps";
import { cyrToLat, editDistance, fold, isVocabulary, lexMatch, stem, tokenize, type LexHit } from "./search-lexicon";
export { fold, stem };

export type Place = { id: number; slug: string; name_lat: string; level: "jls" | "gradska_opstina" | "okrug"; parent_slug: string | null; parent_id: number | null; jls_kind: string | null; path: string };
export type TypeHit = db.OrgType & { org_count: number; score: number };
export type GuideHit = db.GuideRow & { score: number };
export type Suggestion = { top?: boolean; kind: "guide" | "type" | "place" | "org" | "country" | "action" | "section" | "road"; href: string; title: string; sub: string | null; icon?: string | null; phone?: string | null; iso2?: string | null; count?: number | null; tel?: string | null };
export type Best =
  | { kind: "guide"; guide: db.GuideRow; serving: db.ServingRow[]; contacts: (db.Contact & { location_id: number })[]; hours: db.Hours[] }
  | { kind: "type"; type: TypeHit; serving: db.ServingRow[]; contacts: (db.Contact & { location_id: number })[]; hours: db.Hours[] }
  | { kind: "place"; place: Place };
export type SmartResult = { sections: { path: string; title: string; sub: string }[]; roads: string[]; placeParam: string | null; inPlace: Record<string, number>; q: string; intent: string; place: Place | null; guides: GuideHit[]; types: TypeHit[]; places: Place[]; orgs: db.SearchHit[]; best: Best | null; total: number };

const cp = (a: string, b: string) => { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; };
/** Locative-tolerant word match: 'kragujevcu' ~ 'kragujevac', 'novom' ~ 'novi'. */
function wordMatch(w: string, c: string): number {
  const n = cp(w, c);
  if (n < Math.max(3, w.length - 3) || n < c.length - 3) return 0;
  if (n === w.length && c.length > w.length && w.length < 5) return 0;   // 'sad' must not match 'sadovi'
  if (Math.max(w.length, c.length) <= 5 && n < Math.min(w.length, c.length) - 1) return 0; // 'banka' is not 'banja'
  if (n / Math.max(w.length, c.length) < .6) return 0;                                      // 'platim' is not 'plana'
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

/** Names other languages use for Serbian places, folded: the token is read as the Serbian name. */
const PLACE_ALIASES: Record<string, string> = { belgrade: "beograd", belgrad: "beograd", belgrado: "beograd", beograde: "beograd", nish: "nis", nisch: "nis", neusatz: "novi sad", subotitsa: "subotica", kragujevats: "kragujevac", kraguevac: "kragujevac", zemoun: "zemun" };
const placeTokens = (tokens: string[]) => tokens.flatMap((t) => (PLACE_ALIASES[t] ?? t).split(" "));

/** Find the best place mention in the token list; returns the place and the token indexes it consumed. */
async function detectPlace(tokens: string[]): Promise<{ place: Place; used: Set<number> } | null> {
  const all = await units();
  let best: { place: Place; used: Set<number>; score: number } | null = null;
  for (const u of all) {
    const n = u.words.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      let score = 0;
      for (let k = 0; k < n; k++) {
        const tok = tokens[i + k]; let m = wordMatch(tok, u.words[k]);
        // a word the lexicon knows ("medijator", "banka", "staž") is a need, not a place, unless it IS the place's name
        if (m && tok !== u.words[k] && isVocabulary(tok)) m = 0;
        if (!m) { score = 0; break; } score += m;
      }
      if (!score) continue;
      // exact words beat stems; JLS beats GO beats okrug when equal
      score = score * 10 + (tokens.slice(i, i + n).join(" ") === u.words.join(" ") ? 5 : 0) + (u.level === "jls" ? 2 : u.level === "gradska_opstina" ? 1 : 0);
      if (!best || score > best.score) best = { place: u, used: new Set(Array.from({ length: n }, (_, k) => i + k)), score };
    }
  }
  if (best) return { place: best.place, used: best.used };
  // typo in a one-word place name ("kragujeavc", "subotcia"): one slip from 6 letters, two from 9; never for a known word
  let fz: { place: Place; i: number; d: number; rank: number } | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]; if (tok.length < 6 || isVocabulary(tok)) continue;
    const max = tok.length >= 9 ? 2 : 1;
    for (const u of all) {
      if (u.words.length !== 1 || u.words[0].length < 5 || u.words[0][0] !== tok[0]) continue;
      const d = editDistance(tok, u.words[0], max); if (d > max) continue;
      const rank = u.level === "jls" ? 2 : u.level === "gradska_opstina" ? 1 : 0;
      if (!fz || d < fz.d || (d === fz.d && rank > fz.rank)) fz = { place: u, i, d, rank };
    }
  }
  return fz ? { place: fz.place, used: new Set([fz.i]) } : null;
}

function grams(tokens: string[]): string[] { const g = [...tokens]; for (let i = 0; i + 1 < tokens.length; i++) g.push(`${tokens[i]} ${tokens[i + 1]}`); return g; }

/** Stored synonyms (search_synonyms), read once and matched in memory: one database round trip fewer per keystroke. */
let synCache: { at: number; rows: { kind: string; slug: string; weight: number; term: string }[] } | null = null;
async function synonymRows() {
  if (synCache && Date.now() - synCache.at < 10 * 60_000) return synCache.rows;
  const rows = await sql<{ kind: string; slug: string; weight: number; term: string }[]>`select kind, slug, weight::float as weight, term from search_synonyms`;
  synCache = { at: Date.now(), rows: rows.map((r) => ({ ...r, term: fold(cyrToLat(r.term)) })) }; return synCache.rows;
}
async function synonyms(tokens: string[]): Promise<{ kind: string; slug: string; weight: number }[]> {
  if (!tokens.length) return [];
  const g = new Set(grams(tokens)); const prefixes = [...new Set([...tokens.filter((t) => t.length >= 4), ...tokens.map(stem).filter((t) => t.length >= 4)])];
  const best = new Map<string, { kind: string; slug: string; weight: number }>();
  for (const r of await synonymRows()) {
    if (!(g.has(r.term) || prefixes.some((p) => r.term.startsWith(p) || p.startsWith(r.term)))) continue;
    const key = `${r.kind}:${r.slug}`; const cur = best.get(key); if (!cur || r.weight > cur.weight) best.set(key, { kind: r.kind, slug: r.slug, weight: r.weight });
  }
  return [...best.values()].sort((x, y) => y.weight - x.weight);
}

type Needs = { guide: Map<string, number>; type: Map<string, number>; road: LexHit[]; path: LexHit[]; lex: LexHit[] };
/** What the words ask for: every guide and institution type with a weight (0 = not asked for), from the stored synonyms and the lexicon. */
async function needs(tokens: string[]): Promise<Needs> {
  const out: Needs = { guide: new Map(), type: new Map(), road: [], path: [], lex: [] };
  if (!tokens.length) return out;
  const syn = await synonyms(tokens).catch(() => [] as { kind: string; slug: string; weight: number }[]); const lex = lexMatch(tokens);
  const put = (m: Map<string, number>, slug: string, w: number) => { if (w > (m.get(slug) ?? 0)) m.set(slug, w); };
  for (const s of syn) if (s.kind === "guide" || s.kind === "type") put(out[s.kind], s.slug, 1.7 * s.weight);
  for (const h of lex) { if (h.kind === "guide" || h.kind === "type") put(out[h.kind], h.slug, 2.3 * h.score); else out[h.kind].push(h); }
  out.lex = lex;
  return out;
}

/** pg_trgm's similarity(), in code: shared three-letter pieces of the words over all pieces of both. */
function trigrams(text: string): Set<string> { const out = new Set<string>(); for (const w of text.split(" ")) { if (!w) continue; const p = `  ${w} `; for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3)); } return out; }
function similarity(a: string, b: string): number { const A = trigrams(a), B = trigrams(b); if (!A.size || !B.size) return 0; let n = 0; for (const t of A) if (B.has(t)) n++; return n / (A.size + B.size - n); }

/** Guides and institution types are a few dozen rows that change rarely: read once, kept ten minutes, matched in memory.
 *  That leaves one database round per keystroke (institutions, branches, counts) instead of two. */
type GuideIdx = { row: db.GuideRow; name: string; titles: string; words: Set<string> };
type TypeIdx = { row: db.OrgType & { org_count: number }; names: string[]; lat: string[] };
let catalog: { at: number; guides: GuideIdx[]; types: TypeIdx[] } | null = null;
async function getCatalog() {
  if (catalog && Date.now() - catalog.at < 10 * 60_000) return catalog;
  const [guides, types] = await Promise.all([db.getGuides(), db.getOrgTypes()]);
  catalog = { at: Date.now(),
    guides: guides.map((row) => { const sr = (row.guide.sr ?? {}) as { title?: string; summary?: string }, en = (row.guide.en ?? {}) as { title?: string };
      const all = Object.values(row.guide ?? {}).map((c) => { const x = (c ?? {}) as { title?: string; summary?: string }; return `${x.title ?? ""} ${x.summary ?? ""}`; }).join(" ");
      const ws = fold(cyrToLat(`${row.name_lat} ${row.summary ?? ""} ${row.category_name} ${all}`)).split(" ");
      return { row, name: fold(row.name_lat), titles: fold(`${sr.title ?? ""} ${en.title ?? ""}`), words: new Set([...ws, ...ws.map(stem)]) }; }),
    types: types.map((row) => ({ row, names: [row.name_lat, row.name_plural_lat ?? "", row.name_en ?? "", row.name_de ?? ""].map(fold).filter(Boolean), lat: [row.name_lat, row.name_plural_lat ?? ""].map(fold).filter(Boolean) })) };
  return catalog;
}

async function matchGuides(intent: string, tokens: string[], need: Needs, limit: number): Promise<GuideHit[]> {
  if (!intent && !need.guide.size) return [];
  const words = intent ? intent.split(" ") : [];
  const scored = (await getCatalog()).guides.map((g) => {
    // the text score alone is a weak signal (0.3 to 1.8); a need the lexicon recognises decides
    const text = intent ? (words.every((w) => g.words.has(w) || g.words.has(stem(w))) ? 1 : 0) + similarity(g.name, intent) + (g.titles.includes(intent) ? 0.8 : 0) : 0;
    return { ...g.row, score: text * 0.8 + (need.guide.get(g.row.slug) ?? 0) };
  });
  return scored.filter((r) => r.score >= 0.55).sort((x, y) => y.score - x.score).filter((r, _i, all) => r.score >= all[0].score * 0.42).slice(0, limit);
}

async function matchTypes(intent: string, tokens: string[], need: Needs, limit: number): Promise<TypeHit[]> {
  if (!intent && !need.type.size) return [];
  const toks = [...new Set([...tokens.filter((t) => t.length >= 4), ...tokens.map(stem).filter((t) => t.length >= 4)])];
  const scored = (await getCatalog()).types.map((t) => {
    const text = (intent ? Math.max(0, ...t.names.map((n) => similarity(n, intent))) : 0) + (toks.some((k) => t.lat.some((n) => n.includes(k))) ? 0.6 : 0);
    return { ...t.row, score: text * 0.9 + (need.type.get(t.row.slug) ?? 0) };
  });
  return scored.filter((r) => r.score >= 0.5 && r.org_count > 0).sort((x, y) => y.score - x.score).filter((r, _i, all) => r.score >= all[0].score * 0.42).slice(0, limit);
}

async function matchOrgs(q: string, placePath: string | null, limit: number, locale: Locale = "sr"): Promise<(db.SearchHit & { phone: string | null })[]> {
  if (q.length < 2) return [];
  const rows = await sql<(db.SearchHit & { phone: string | null; sub_place: string | null; t_sr: string; t_en: string | null; t_ru: string | null; t_de: string | null })[]>`
    with qq as (select f_unaccent(lower(${q})) as q)
    select 'org'::text as kind, o.slug, o.name_lat, coalesce(f.name_lat, p.name_lat) as sub_place, t.name_lat as t_sr, t.name_en as t_en, t.name_ru as t_ru, t.name_de as t_de, null::text as sub, t.slug as type_slug,
           (select lc.value_display from locations l2 join location_contacts lc on lc.location_id = l2.id where l2.org_id = o.id and lc.kind = 'phone' order by l2.is_primary desc, lc.id limit 1) as phone,
           (similarity(f_unaccent(lower(o.name_lat)), qq.q) + case when o.search @@ plainto_tsquery('simple', qq.q) then 0.5 else 0 end)::float as rank
    from organizations o join org_types t on t.id = o.org_type_id left join territorial_units f on f.id = o.founder_unit_id
    left join locations l on l.org_id = o.id and l.is_primary left join territorial_units p on p.id = l.territorial_unit_id, qq
    where o.status = 'active' and (o.search @@ plainto_tsquery('simple', qq.q) or f_unaccent(lower(o.name_lat)) % qq.q)
      ${placePath ? sql`and (f.path <@ ${placePath}::ltree or p.path <@ ${placePath}::ltree)` : sql``}
    order by rank desc, o.name_lat limit ${limit}`;
  // the type half of the sub-line is translated (Serbian singular for sr, the translated type name otherwise)
  return rows.map((r) => ({ ...r, sub: r.sub_place ? `${r.sub_place} · ${locale === "sr" ? r.t_sr : tn({ name_lat: r.t_sr, name_en: r.t_en, name_ru: r.t_ru, name_de: r.t_de }, locale)}` : null }));
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
  const tokens = placeTokens(tokenize(q));
  const det = tokens.length ? await detectPlace(tokens) : null;
  let intentTokens = det ? tokens.filter((_, i) => !det.used.has(i)) : tokens;
  if (det && intentTokens.length && intentTokens.every((t) => PLACE_WORDS.has(t))) intentTokens = [];
  const intent = intentTokens.join(" ");
  const syn = await needs(intentTokens);
  const placePath = det?.place.path ?? null;
  const [guides, types, orgs, places] = await Promise.all([
    matchGuides(intent, intentTokens, syn, 6), matchTypes(intent, intentTokens, syn, 6),
    intent ? matchOrgs(intent, placePath, det ? 20 : 30, locale) : Promise.resolve([]),
    det ? Promise.resolve([det.place]) : placesLike(tokens, 6),
  ]);
  let best: Best | null = null;
  const jlsId = det ? await jlsIdFor(det.place) : null;
  const gTop = guides[0] ? guides[0].score + ((syn.guide.get(guides[0].slug) ?? 0) >= 1.8 ? 0.65 : 0) : 0, tTop = types[0]?.score ?? 0;
  if (guides[0] && gTop >= 1.0 && gTop >= tTop) {
    const typeSlug = guides[0].org_type_slugs[0];
    const serving = jlsId && typeSlug ? await db.getServing(jlsId, typeSlug) : [];
    const ids = serving.map((s) => s.location_id);
    const [contacts, hours] = await Promise.all([db.getContacts(ids), db.getHours(ids)]);
    best = { kind: "guide", guide: guides[0], serving, contacts, hours };
  } else if (types[0] && tTop >= 1.0 && jlsId) {
    const serving = await db.getServing(jlsId, types[0].slug);
    const ids = serving.map((s) => s.location_id);
    const [contacts, hours] = await Promise.all([db.getContacts(ids), db.getHours(ids)]);
    best = { kind: "type", type: types[0], serving, contacts, hours };
  } else if (det && !intent) {
    best = { kind: "place", place: det.place };
  }
  const total = guides.length + types.length + orgs.length + places.length;
  sql`insert into search_log (q, locale, place_slug, n_results, best_kind) values (${q.slice(0, 200)}, ${locale}, ${det?.place.slug ?? null}, ${total}, ${best?.kind ?? null})`.catch(() => {});
  const placeParam = det && det.place.level !== "okrug" ? (det.place.level === "gradska_opstina" ? `${det.place.parent_slug}/${det.place.slug}` : det.place.slug) : null;
  const inPlace = await typeCountsIn(types.map((t) => t.slug), placePath).catch(() => ({} as Record<string, number>));
  const roads = syn.road.filter((h) => h.score >= 0.5).map((h) => h.slug);
  const sections = syn.path.filter((h) => h.score >= 0.5).flatMap((h) => { const sec = SECTIONS.find((x) => x.path === h.slug); return sec ? [{ path: sec.path, title: sec.title[locale], sub: sec.sub[locale] }] : []; });
  return { q, intent, place: det?.place ?? null, guides, types, places, orgs, best, total: total + roads.length + sections.length, roads, sections, placeParam, inPlace };
}

/** Site sections a user may type for directly: matched on folded prefixes in any of the four languages. */
const SECTIONS: { path: string; icon: string; keys: string[]; title: Record<Locale, string>; sub: Record<Locale, string> }[] = [
  { path: "/vize", icon: "globe", keys: ["viz", "visa", "pasos", "passport", "ulazak", "entry", "putovanj", "travel", "drzav", "countr", "виз", "паспорт", "einreis"], title: { sr: "Vize i uslovi ulaska", en: "Visas and entry rules", ru: "Визы и условия въезда", de: "Visa und Einreise" }, sub: { sr: "194 države · oba smera · koraci do vize", en: "194 countries · both directions · steps to a visa", ru: "194 страны · оба направления", de: "194 Länder · beide Richtungen" } },
  { path: "/putokaz", icon: "compass", keys: ["putokaz", "roadmap", "marsrut", "wegweiser"], title: { sr: ROAD_LABELS.sr.title, en: ROAD_LABELS.en.title, ru: ROAD_LABELS.ru.title, de: ROAD_LABELS.de.title }, sub: { sr: "radim, studiram, otvaram firmu, selim se, vraćam se", en: "work, study, business, family, returning", ru: "работа, учёба, бизнес, семья, возвращение", de: "Arbeit, Studium, Firma, Familie, Rückkehr" } },
  { path: "/vodici", icon: "file-text", keys: ["vodic", "vodič", "guide", "kako", "how", "uputstv", "инструкц", "anleit"], title: { sr: "Vodiči: kako se šta rešava", en: "Guides: how things get done", ru: "Инструкции", de: "Anleitungen" }, sub: { sr: "lična karta, pasoš, boravak, firma…", en: "ID card, passport, residence, company…", ru: "документы, ВНЖ, фирма…", de: "Ausweis, Pass, Aufenthalt, Firma…" } },
  { path: "/za-strance", icon: "users", keys: ["stranc", "foreign", "expat", "boravak", "residence", "иностран", "ausland"], title: { sr: "Za strance", en: "For foreigners", ru: "Для иностранцев", de: "Für Ausländer" }, sub: { sr: "boravak, PIB, banka, zdravstvo", en: "residence, tax ID, bank, health", ru: "ВНЖ, ИНН, банк, здоровье", de: "Aufenthalt, Steuernummer, Bank" } },
  { path: "/ambasada", icon: "globe", keys: ["ambasad", "embass", "konzul", "consul", "посольств", "botschaft"], title: { sr: "Ambasade i konzulati u Srbiji", en: "Embassies and consulates in Serbia", ru: "Посольства и консульства", de: "Botschaften und Konsulate" }, sub: { sr: "125 predstavništava u Beogradu i Srbiji", en: "125 missions", ru: "125 представительств", de: "125 Vertretungen" } },
  { path: "/partneri", icon: "briefcase", keys: ["partner", "oglas", "advert", "sponzor", "reklam"], title: { sr: "Partnerstvo i oglašavanje", en: "Partnership and advertising", ru: "Партнёрство и реклама", de: "Partnerschaft und Werbung" }, sub: { sr: "upiti, pozicije, cene", en: "inquiries, placements, prices", ru: "запросы, позиции, цены", de: "Anfragen, Plätze, Preise" } },
  { path: "/banka", icon: "bank", keys: ["bank", "banka", "банк", "kartic", "racun", "kredit"], title: { sr: "Banke i ekspoziture", en: "Banks and branches", ru: "Банки и отделения", de: "Banken und Filialen" }, sub: { sr: "po gradovima, sa telefonima", en: "by city, with phones", ru: "по городам, с телефонами", de: "nach Städten, mit Telefon" } },
];
/** Sub-label of a place suggestion: okrug / grad / opština / gradska opština in the page language. */
const placeKind = (p: { level: string; jls_kind: string | null }, locale: Locale) => {
  const d = dictOf(locale); const w = p.level === "okrug" ? d.okrug : p.level === "gradska_opstina" ? d.gradskaOpstina : p.jls_kind === "grad" ? d.city : d.municipality;
  return locale === "de" ? w : w.toLowerCase();
};
/** Visa regime values are stored in Serbian ("bez vize", "viza", "eviza", "eta"). */
const regimeWord = (r: string, locale: Locale) => r === "bez vize" ? pick(locale, "bez vize", "visa-free", "без визы", "visumfrei") : r === "viza" ? pick(locale, "viza", "visa", "виза", "Visum") : r === "eviza" ? pick(locale, "eViza", "eVisa", "eVisa", "eVisum") : r === "eta" ? "eTA" : r;
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
  typeIconCache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.slug, emblemFor(r.slug, r.icon) ?? null])) }; return typeIconCache.map;
}
const COUNTRY_ALIASES: Record<string, string> = { amerik: "US", sad: "US", usa: "US", engles: "GB", britan: "GB", uk: "GB", velik: "GB", nemac: "DE", holand: "NL", nizozem: "NL", svajcar: "CH", austrij: "AT", rusij: "RU", kinesk: "CN", kin: "CN", japan: "JP", turs: "TR", grck: "GR", spanij: "ES", italij: "IT", francusk: "FR", kanad: "CA", australij: "AU", emirat: "AE", dubai: "AE", katar: "QA", egip: "EG", indij: "IN", koreja: "KR", madjar: "HU", hrvat: "HR", slovenij: "SI", bosn: "BA", crn: "ME", makedon: "MK", albanij: "AL", bugar: "BG", rumun: "RO" };
async function matchCountries(tokens: string[], locale: Locale, limit: number): Promise<{ iso2: string; slug: string; name: string; to: string | null; from: string | null; sure: boolean }[]> {
  const toks = [...new Set([...tokens.filter((t) => t.length >= 4), ...tokens.map(stem).filter((t) => t.length >= 4)])];
  const shortToks = tokens.filter((t) => t.length >= 2 && t.length < 4);
  const aliasIso = [...new Set([...toks.flatMap((t) => Object.entries(COUNTRY_ALIASES).filter(([k]) => k === t || (t.startsWith(k) && k.length >= 4) || (k.startsWith(t) && t.length >= 4)).map(([, v]) => v)), ...shortToks.flatMap((t) => Object.entries(COUNTRY_ALIASES).filter(([k]) => k === t).map(([, v]) => v))])];
  if (!toks.length && !aliasIso.length) return [];
  const rows = await sql<{ iso2: string; slug: string; name_sr: string; name_en: string; to_rs_regime: string | null; from_rs_regime: string | null }[]>`
    select iso2, slug, name_sr, name_en, to_rs_regime, from_rs_regime from countries
    where iso2 = any(${aliasIso}::text[]) or exists (select 1 from unnest(${toks}::text[]) t where f_unaccent(lower(name_sr)) like t || '%' or f_unaccent(lower(name_en)) like t || '%' or f_unaccent(lower(name_sr)) like '% ' || t || '%')
    order by (iso2 = any(${aliasIso}::text[])) desc, name_sr limit ${limit}`;
  const full = (n: string) => { const f = fold(n); return toks.some((t) => t.length >= 5 && (f === t || f.startsWith(t) || stem(f) === stem(t))); };
  return rows.map((r) => ({ iso2: r.iso2, slug: r.slug, name: locale === "sr" ? r.name_sr : r.name_en, to: r.to_rs_regime, from: r.from_rs_regime, sure: aliasIso.includes(r.iso2) || full(r.name_sr) || full(r.name_en) }));
}
type BranchHit = { sim?: number; org_slug: string; org_name: string; type_slug: string; icon: string | null; location_slug: string; unit_name: string; address: string | null; phone: string | null };
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
/** "poštanska štedionica kragujevac": branches of organisations whose NAME matches, inside the detected place. */
async function matchBrandBranches(q: string, placePath: string | null, limit: number): Promise<BranchHit[]> {
  if (!placePath || q.length < 3) return [];
  return sql<BranchHit[]>`
    with qq as (select f_unaccent(lower(${q})) as q)
    select similarity(f_unaccent(lower(o.name_lat)), qq.q)::float as sim, o.slug as org_slug, o.name_lat as org_name, t.slug as type_slug, t.icon, l.slug as location_slug, l.unit_name_lat as unit_name, l.address_display as address,
           (select value_display from location_contacts c where c.location_id = l.id and c.kind = 'phone' order by c.id limit 1) as phone
    from locations l join organizations o on o.id = l.org_id join org_types t on t.id = o.org_type_id join territorial_units tu on tu.id = l.territorial_unit_id, qq
    where l.status = 'active' and o.status = 'active' and tu.path <@ ${placePath}::ltree
      and (f_unaccent(lower(o.name_lat)) % qq.q or o.search @@ plainto_tsquery('simple', qq.q))
    order by similarity(f_unaccent(lower(o.name_lat)), qq.q) desc, (l.address_display is not null) desc, (select count(*) from location_contacts c where c.location_id = l.id) desc limit ${limit}`;
}
/** How many institutions (or branches) of each type sit inside a place: decides whether "apoteka Niš" can open the list for Niš. */
async function typeCountsIn(typeSlugs: string[], placePath: string | null): Promise<Record<string, number>> {
  if (!typeSlugs.length || !placePath) return {};
  const rows = await sql<{ slug: string; n: number }[]>`select t.slug, count(*)::int as n from locations l join organizations o on o.id = l.org_id join org_types t on t.id = o.org_type_id join territorial_units tu on tu.id = l.territorial_unit_id
    where l.status = 'active' and o.status = 'active' and t.slug = any(${typeSlugs}::text[]) and tu.path <@ ${placePath}::ltree group by 1`;
  return Object.fromEntries(rows.map((r) => [r.slug, r.n]));
}
/** Words that make a country row the answer (a visa or border question) rather than a side note. */
const VISA_RE = /^(viz|visa|visum|pasos|passport|ulaz|entry|einreis|putov|travel|reise|ambasad|embass|botschaft|konzul|consul|posolst|granic|border)/;
const PLACE_WORDS = new Set(["opstina", "opstine", "opstini", "grad", "grada", "gradu", "okrug", "okruga", "mesto", "municipality", "city", "town", "district", "gemeinde", "stadt", "bezirk", "obscina", "gorod", "okrug"]);
const GROUP_CAP: Partial<Record<Suggestion["kind"], number>> = { guide: 4, type: 5, org: 8, place: 3, country: 3, road: 2, section: 2 };

/**
 * Suggestions for the typeahead. Every row gets one relevance figure on a common scale (a recognised need is about
 * 2.3, an exact name 3 or more, a loose text match under 2). The best row leads as the "best match" when it is a
 * clear answer; the groups follow in the order of their best row.
 */
export async function suggest(q: string, locale: Locale, scopeSlug?: string | null): Promise<Suggestion[]> {
  const tokens = placeTokens(tokenize(q));
  if (!tokens.length) return [];
  let det = await detectPlace(tokens);
  if (scopeSlug) { const u = (await units()).find((x) => x.slug === scopeSlug); if (u) det = { place: u, used: det?.used ?? new Set<number>() }; }
  let intentTokens = det ? tokens.filter((_, i) => !det.used.has(i)) : tokens;
  if (det && !scopeSlug && intentTokens.length && intentTokens.every((t) => PLACE_WORDS.has(t))) intentTokens = [];
  const intent = intentTokens.join(" ");
  const need = await needs(intentTokens);
  // guides and types are matched in memory first, so everything that needs the database goes out in ONE round
  const [guides, types] = await Promise.all([matchGuides(intent, intentTokens, need, 4), matchTypes(intent, intentTokens, need, 5)]);
  const branchTypes = types.slice(0, 4).map((t) => t.slug);
  const placePath = det?.place.path ?? null;
  // many city institutions are filed under the city, not its municipality: "banka Zemun" then falls back to Belgrade
  const isGO = det?.place.level === "gradska_opstina"; const cityPath = isGO ? det!.place.path.split(".").slice(0, -1).join(".") : null;
  const [places, orgs, countries, icons, typeBranches, brandBranches, inPlace, inCity] = await Promise.all([
    det && !scopeSlug ? Promise.resolve([det.place]) : scopeSlug ? Promise.resolve([] as Place[]) : placesLike(tokens, 3),
    intent ? matchOrgs(intent, placePath, scopeSlug ? 10 : 6, locale).catch(() => []) : Promise.resolve([]),
    scopeSlug ? Promise.resolve([]) : matchCountries(intentTokens, locale, 3).catch(() => []), typeIcons(),
    matchBranches(branchTypes, placePath, scopeSlug ? 10 : 6).catch(() => [] as BranchHit[]),
    intent && det ? matchBrandBranches(intent, det.place.path, 6).catch(() => [] as BranchHit[]) : Promise.resolve([] as BranchHit[]),
    typeCountsIn(branchTypes, placePath).catch(() => ({} as Record<string, number>)),
    typeCountsIn(branchTypes, cityPath).catch(() => ({} as Record<string, number>)),
  ]);
  const cityName = isGO ? (await units()).find((u) => u.id === det!.place.parent_id)?.name_lat ?? null : null;
  type Ranked = Suggestion & { rank: number };
  const out: Ranked[] = [];
  const folded = fold(cyrToLat(q));
  const lexOf = (kind: string, slug: string) => need.lex.find((h) => h.kind === kind && h.slug === slug)?.score ?? 0;

  for (const a of ACTIONS) if (a.re.test(folded)) out.push({ rank: 6, kind: "action", href: `tel:${a.tel}`, title: a.title[locale], sub: a.tel.replace(/^0800/, "0800 "), tel: a.tel, icon: a.tel === "192" ? "shield" : a.tel === "193" ? "flame" : a.tel === "194" ? "heart-pulse" : a.tel === "1987" ? "car" : "zap" });

  for (const sec of scopeSlug ? [] : SECTIONS) {
    const byKey = tokens.some((t) => t.length >= 3 && sec.keys.some((k) => t.startsWith(fold(k)) || (t.length >= 4 && fold(k).startsWith(t))));
    const lx = lexOf("path", sec.path);
    if (byKey || lx >= 0.5) out.push({ rank: Math.max(byKey ? 1.3 : 0, 2.3 * lx), kind: "section", href: href(locale, sec.path), title: sec.title[locale], sub: sec.sub[locale], icon: sec.icon });
  }
  for (const h of scopeSlug ? [] : need.road) {
    const r = ROADMAPS.find((x) => x.slug === h.slug); if (!r || h.score < 0.5) continue;
    out.push({ rank: 2.3 * h.score + (h.used.size >= 2 ? 0.6 : 0), kind: "road", href: href(locale, `/putokaz/${r.slug}`), title: r.title[locale], sub: `${r.steps.length} ${ROAD_LABELS[locale].steps}`, icon: r.emblem });
  }

  const cityParam = det && det.place.level !== "okrug" ? (det.place.level === "gradska_opstina" ? det.place.parent_slug : det.place.slug) : null;
  const placeParam = det && det.place.level !== "okrug" ? (det.place.level === "gradska_opstina" ? `${det.place.parent_slug}/${det.place.slug}` : det.place.slug) : null;
  for (const g of guides) { const c = g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}; out.push({ rank: g.score + ((need.guide.get(g.slug) ?? 0) >= 1.8 ? 0.65 : 0), kind: "guide", href: href(locale, `/vodic/${g.slug}${cityParam ? `?opstina=${cityParam}` : ""}`), title: c.title ?? g.name_lat, sub: det ? det.place.name_lat : catName(g, locale), icon: "file-text" }); }

  const exactType = need.lex.find((h) => h.kind === "type" && h.score >= 0.9 && h.used.size >= intentTokens.length)?.slug;
  for (const t0 of types) {
    const t = t0.slug === exactType ? { ...t0, score: t0.score + 0.5 } : t0;
    const here = inPlace[t.slug] ?? 0;
    // with a place: open the list of that type in that place ("apoteka Niš" → pharmacies in Niš)
    if (placeParam && here > 0) out.push({ rank: t.score + 0.5, kind: "type", href: `${href(locale, `/${t.slug}`)}?mesto=${placeParam}#lista`, title: tn(t, locale), sub: det!.place.name_lat, icon: t.icon, count: here });
    else if (cityParam && isGO && (inCity[t.slug] ?? 0) > 0) out.push({ rank: t.score + 0.4, kind: "type", href: `${href(locale, `/${t.slug}`)}?mesto=${cityParam}#lista`, title: tn(t, locale), sub: cityName, icon: t.icon, count: inCity[t.slug] });
    else out.push({ rank: t.score, kind: "type", href: href(locale, `/${t.slug}`), title: tn(t, locale), sub: null, icon: t.icon, count: t.national_network ? null : t.org_count });
  }

  for (const p of places) {
    const rank = det ? (intent ? 1.0 : 7) : tokens.length === 1 && !isVocabulary(tokens[0]) ? 2.0 : 0.9;
    out.push({ rank, kind: "place", href: href(locale, p.level === "okrug" ? `/okrug/${p.slug}` : p.level === "gradska_opstina" ? `/${p.parent_slug}/${p.slug}` : `/${p.slug}`), title: p.name_lat, sub: placeKind(p, locale), icon: p.level === "okrug" ? "map" : "building" });
  }

  const justAType = need.lex.some((h) => h.kind === "type" && h.score >= 0.8 && h.used.size >= intentTokens.length);
  const seen = new Set<string>(); const seenBranch = new Set<string>();
  const brandKeys = new Set(brandBranches.map((b) => `${b.org_slug}/${b.location_slug}`));
  for (const b of [...brandBranches, ...typeBranches]) {
    const generic = /^(ekspozitura|poslovnica|filijala|ispostava|sediste|sedište|ambulanta|pošta|posta)$/i.test(b.unit_name.trim()); const key = `${b.org_name}|${b.address ?? ""}|${generic ? "" : b.unit_name}`;
    if (seenBranch.has(key)) continue; seenBranch.add(key); const h = `/${b.type_slug}/${b.org_slug}/${b.location_slug}`; seen.add(h);
    out.push({ rank: brandKeys.has(`${b.org_slug}/${b.location_slug}`) ? (justAType ? 1.8 : 2.6 + 2.6 * (b.sim ?? 0.2)) : 1.5, kind: "org", href: href(locale, h), title: generic || b.unit_name.toLowerCase().includes(b.org_name.toLowerCase()) ? b.org_name : `${b.org_name} · ${b.unit_name}`, sub: [b.address, det?.place.name_lat].filter(Boolean).join(", ") || (generic ? `${b.unit_name} · ${det?.place.name_lat ?? ""}` : null), icon: b.icon, phone: b.phone });
  }
  for (const o of orgs) {
    const h = `/${o.type_slug}/${o.slug}`; if (seen.has(h)) continue; seen.add(h);
    // a name that (nearly) is the query is an answer; a name that merely shares a word is a guess
    const rank = (o.rank >= 1.3 ? 3.4 : Math.min(2.0, o.rank * 1.8)) + (scopeSlug ? 0.5 : 0);
    out.push({ rank, kind: "org", href: href(locale, h), title: o.name_lat, sub: o.sub, icon: o.type_slug ? icons[o.type_slug] ?? null : null, phone: o.phone });
  }
  const visaAsked = tokens.some((t) => VISA_RE.test(t));
  for (const c of countries) out.push({ rank: c.sure ? 2.4 + (visaAsked ? 1.4 : 0) : 1.0, kind: "country", href: href(locale, `/vize/${c.slug}`), title: c.name, sub: [c.to ? `→ RS: ${regimeWord(c.to, locale)}` : null, c.from ? `RS →: ${regimeWord(c.from, locale)}` : null].filter(Boolean).join(" · ") || null, iso2: c.iso2 });

  // one best match in front, then the groups in the order of their best row, each capped
  out.sort((a, b) => b.rank - a.rank);
  const top = out[0] && out[0].rank >= 1.9 && out[0].kind !== "action" ? out[0] : null;
  const groupOrder: Suggestion["kind"][] = []; for (const r of out) if (!groupOrder.includes(r.kind)) groupOrder.push(r.kind);
  if (groupOrder.includes("action")) { groupOrder.splice(groupOrder.indexOf("action"), 1); groupOrder.unshift("action"); }
  const final: Suggestion[] = [];
  const strip = ({ rank: _rank, ...rest }: Ranked): Suggestion => rest;
  if (top) final.push({ ...strip(top), top: true });
  for (const k of groupOrder) { let n = 0; for (const r of out) { if (r.kind !== k || r === top) continue; if (n++ >= (GROUP_CAP[k] ?? 6)) break; final.push(strip(r)); } }
  return final.slice(0, 18);
}
