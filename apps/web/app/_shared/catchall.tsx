// Shared by the static catch-all page and its request-time twin (app/dyn): resolving a path, its head tags and its body.
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Header, Footer } from "@/components/chrome";
import { Home, OkrugHub, UnitHub, OrgTypeHub, OrgPage, ForForeigners, StaticPage, tuLabel, unitTitle } from "@/components/pages";
import { GuidesHub, GuidePage, GUIDE_LABELS, content as guideContent } from "@/components/guides";
import { SmartSearchPage } from "@/components/search";
import { PartnersPage } from "@/components/partners";
import { VisaHub, CountryPage } from "@/components/visa";
import { RoadmapHub, RoadmapPage } from "@/components/roadmap";
import { ROAD_LABELS, getRoadmap, type Roadmap } from "@/lib/roadmaps";
import * as db from "@/lib/db";
import { href, splitLocale, t, tn, pick, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export type Query = Record<string, string | string[] | undefined>;

type Resolved =
  | { kind: "home" } | { kind: "search" } | { kind: "foreigners" } | { kind: "static"; slug: string }
  | { kind: "okrug"; unit: db.TU } | { kind: "unit"; unit: db.TU; parent: db.TU | null }
  | { kind: "type"; type: db.OrgType } | { kind: "org"; org: db.OrgRow; type: db.OrgType; locSlug?: string }
  | { kind: "guides" } | { kind: "guide"; guide: db.GuideRow }
  | { kind: "visa" } | { kind: "country"; country: db.CountryRow }
  | { kind: "roadmaps" } | { kind: "roadmap"; road: Roadmap }
  | { kind: "moved"; to: string };

async function resolve(rest: string[]): Promise<Resolved | null> {
  if (rest.length === 0) return { kind: "home" };
  const [a, b, c] = rest;
  if (a === "pretraga" && rest.length === 1) return { kind: "search" };
  if (a === "za-strance" && rest.length === 1) return { kind: "foreigners" };
  if (["o-sajtu", "partneri", "privatnost"].includes(a) && rest.length === 1) return { kind: "static", slug: a };
  if (a === "vodici" && rest.length === 1) return { kind: "guides" };
  if (a === "putokaz" && rest.length === 1) return { kind: "roadmaps" };
  if (a === "putokaz" && b && rest.length === 2) { const road = getRoadmap(b); return road ? { kind: "roadmap", road } : null; }
  if (a === "vize" && rest.length === 1) return { kind: "visa" };
  if (a === "vize" && b && rest.length === 2) { const c = await db.getCountry(b); return c ? { kind: "country", country: c } : null; }
  if (a === "vodic" && b && rest.length === 2) { const g = await db.getGuide(b); return g ? { kind: "guide", guide: g } : null; }
  if (a === "okrug" && b && rest.length === 2) { const u = await db.getTU(b, "okrug"); return u ? { kind: "okrug", unit: u } : null; }
  const jls = await db.getTU(a, "jls");
  if (jls) {
    if (rest.length === 1) return { kind: "unit", unit: jls, parent: null };
    if (rest.length === 2) { const go = await db.getGO(jls.id, b); return go ? { kind: "unit", unit: go, parent: jls } : null; }
    return null;
  }
  const type = await db.getOrgType(a);
  if (!type) return null;
  if (rest.length === 1) return { kind: "type", type };
  const org = await db.getOrg(a, b);
  // an organisation merged into another one keeps its address: the old page leads to the new one
  if (!org) { const next = await db.getOrgSuccessor(a, b); return next ? { kind: "moved", to: `/${next.type_slug}/${next.slug}` } : null; }
  if (rest.length === 2) return { kind: "org", org, type };
  if (rest.length === 3) return { kind: "org", org, type, locSlug: c };
  return null;
}

/** Head tags for a path. `query` is empty on the static page and the real query string on the request-time twin. */
export async function metaFor(path: string[], query: Query): Promise<Metadata> {
  const [locale, rest] = splitLocale(path);
  const r = await resolve(rest);
  if (!r || r.kind === "moved") return {};
  const d = t(locale);
  const plain = "/" + rest.join("/");
  const P = <T,>(sr: T, en: T, ru: T, de: T) => pick(locale, sr, en, ru, de);
  const lc = (x: string) => (locale === "de" ? x : x.toLowerCase()); // German nouns keep their capital
  const m = (title: string, description?: string | null, extra: { absolute?: boolean; query?: string; noindex?: boolean } = {}) => pageMeta({ locale, plain, title, description, ...extra });
  switch (r.kind) {
    case "home": return m(P("Gde da idem? – sve institucije Srbije", "Gde da idem? – every public and private institution in Serbia", "Gde da idem? – все учреждения Сербии", "Gde da idem? – alle Einrichtungen Serbiens"), d.tagline, { absolute: true });
    case "search": return m(d.search, null, { noindex: true });
    case "foreigners": return m(d.forForeigners, d.forForeignersLead);
    case "static": return m(r.slug === "partneri" ? d.becomePartner : r.slug === "o-sajtu" ? d.aboutSite : d.privacy, r.slug === "o-sajtu" ? d.tagline
      : r.slug === "partneri" ? P("Sponzorsko mesto na stranama institucija u vašem gradu i upiti korisnika iz vaše oblasti: kako se oglasiti na sajtu Gde da idem?", "A sponsor spot on institution pages in your city and enquiries from users in your field: how to advertise on Gde da idem?", "Спонсорское место на страницах учреждений вашего города и запросы пользователей в вашей сфере: как разместить рекламу на Gde da idem?", "Ein Sponsorenplatz auf den Seiten der Einrichtungen Ihrer Stadt und Anfragen von Nutzern aus Ihrer Branche: so werben Sie auf Gde da idem?")
      : P("Koje podatke sajt Gde da idem? prikuplja, kako se koriste upiti iz obrasca, kolačići i kako da zatražite ispravku ili brisanje.", "What data Gde da idem? collects, how enquiry-form data is used, cookies, and how to ask for a correction or deletion.", "Какие данные собирает Gde da idem?, как используются запросы из формы, файлы cookie и как запросить исправление или удаление.", "Welche Daten Gde da idem? erhebt, wie Anfragen aus dem Formular verwendet werden, Cookies und wie Sie Berichtigung oder Löschung verlangen."));
    case "guides": return m(GUIDE_LABELS[locale].guides, GUIDE_LABELS[locale].guidesLead);
    case "roadmaps": return m(ROAD_LABELS[locale].title, ROAD_LABELS[locale].lead);
    case "roadmap": return m(`${r.road.title[locale]} – ${lc(ROAD_LABELS[locale].nav)}`, r.road.lead[locale]);
    case "visa": return m(P("Vize i uslovi ulaska – sve države", "Visas and entry rules – all countries", "Визы и условия въезда – все страны", "Visa und Einreise – alle Länder"),
      P("Za svaku državu: vizni režim za ulazak u Srbiju i uslovi za putovanje građana Srbije. Izvor: Ministarstvo spoljnih poslova.", "For every country: the visa regime for entering Serbia and the travel rules for Serbian citizens. Source: Ministry of Foreign Affairs.", "Для каждой страны: визовый режим для въезда в Сербию и правила поездок для граждан Сербии. Источник: МИД Сербии.", "Für jedes Land: Visumregelung für die Einreise nach Serbien und Reisebestimmungen für serbische Staatsangehörige. Quelle: Außenministerium."));
    case "country": { const n = locale === "sr" ? r.country.name_sr : r.country.name_en; const to = r.country.to_rs_regime ?? "—", from = r.country.from_rs_regime ?? "—";
      return m(P(`${n} – viza, uslovi ulaska, ambasada`, `${n} – visa, entry rules, embassy`, `${n} – виза, въезд, посольство`, `${n} – Visum, Einreise, Botschaft`),
        P(`${n}: ulazak u Srbiju ${to}, putovanje iz Srbije ${from}. Predstavništva i zvanično uputstvo Ministarstva spoljnih poslova.`, `${n}: entering Serbia ${to}, travelling from Serbia ${from}. Missions and the official Ministry of Foreign Affairs instructions.`, `${n}: въезд в Сербию ${to}, поездка из Сербии ${from}. Представительства и официальная инструкция МИД.`, `${n}: Einreise nach Serbien ${to}, Reise aus Serbien ${from}. Vertretungen und amtliche Hinweise des Außenministeriums.`)); }
    case "guide": { const c = guideContent(r.guide, locale).c; return m(`${c.title ?? r.guide.name_lat} – ${lc(GUIDE_LABELS[locale].documents)}, ${lc(GUIDE_LABELS[locale].fees)}, ${lc(GUIDE_LABELS[locale].whereToGo)}`, c.summary ?? r.guide.summary); }
    case "okrug": { const n = r.unit.name_lat; return m(`${n} – ${P("gradovi, opštine i institucije", "cities, municipalities and institutions", "города, общины и учреждения", "Städte, Gemeinden und Einrichtungen")}`,
      P(`${n}: svi gradovi i opštine okruga sa institucijama, adresama, telefonima i radnim vremenom.`, `${n}: every city and municipality in the district with its institutions, addresses, phone numbers and opening hours.`, `${n}: все города и общины округа с учреждениями, адресами, телефонами и часами работы.`, `${n}: alle Städte und Gemeinden des Bezirks mit Einrichtungen, Adressen, Telefonnummern und Öffnungszeiten.`)); }
    case "unit": { const n = r.unit.name_lat; return m(`${tuLabel(r.unit)} – ${P("institucije, adrese, telefoni", "institutions, addresses, phone numbers", "учреждения, адреса, телефоны", "Einrichtungen, Adressen, Telefonnummern")}`,
      P(`${n}: opštinska uprava, policija, sud, pošta, banke, škole, zdravstvo i sve ostale institucije, sa adresom, telefonom i radnim vremenom.`, `${n}: municipal offices, police, court, post offices, banks, schools, health care and every other institution, with address, phone and opening hours.`, `${n}: администрация, полиция, суд, почта, банки, школы, медицина и все остальные учреждения с адресом, телефоном и часами работы.`, `${n}: Gemeindeverwaltung, Polizei, Gericht, Post, Banken, Schulen, Gesundheitswesen und alle weiteren Einrichtungen mit Adresse, Telefon und Öffnungszeiten.`)); }
    case "type": {
      // A place or a page number makes a page of its own (it keeps its query in the canonical); a free-text or field filter is a search view and stays out of the index.
      const sp = query; const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : null);
      const mesto = one("mesto"), brend = one("brend"), strana = Math.max(1, Number.parseInt(one("strana") ?? "1", 10) || 1), search = !!(one("q") || one("oblast"));
      const place = mesto ? await db.getTU(mesto.includes("/") ? mesto.split("/")[1] : mesto, mesto.includes("/") ? "gradska_opstina" : "jls").catch(() => null) : null;
      const name = tn(r.type, locale);
      // a page number past the last page shows the last page again: that address is a duplicate, so it stays out of the index
      // a place of a multi-building type pages through its buildings (see OrgTypeHub), so the last page is counted the same way
      const byLoc = strana > 1 && !!place && (await db.getMultiTypes().catch(() => new Set<string>())).has(r.type.slug);
      const pastEnd = strana > 1 && strana > Math.max(1, Math.ceil((await (byLoc ? db.countLocationsOfTypeIn(r.type.slug, { jls: mesto }) : db.countOrgsOfType(r.type.slug, { jls: place ? mesto : null })).catch(() => 0)) / 60));
      const qs = [place ? `mesto=${encodeURIComponent(mesto!)}` : "", brend ? `brend=${encodeURIComponent(brend)}` : "", strana > 1 && !pastEnd ? `strana=${strana}` : ""].filter(Boolean).join("&");
      const pageTail = strana > 1 ? ` – ${d.page} ${strana}` : "";
      const title = place ? `${name} – ${place.name_lat}${pageTail}` : `${name} – ${P("spisak po gradovima", "by city", "по городам", "nach Stadt")}${pageTail}`;
      const where = place ? place.name_lat : P("Srbiji", "Serbia", "Сербии", "Serbien");
      return m(title, P(`${name} u ${where}: adresa, telefon, radno vreme i sajt. Spisak iz zvaničnih registara.`, `${name} in ${where}: address, phone, opening hours and website. Listed from official registers.`, `${name} в ${where}: адрес, телефон, часы работы и сайт. Список из официальных реестров.`, `${name} in ${where}: Adresse, Telefon, Öffnungszeiten und Website. Aus amtlichen Registern.`), { query: qs, noindex: search || pastEnd });
    }
    case "org": {
      // a branch page is titled by the branch ("Lukoil – Požega", "Banka X – Ekspozitura Zemun, Beograd"), not by the organisation alone: hundreds of branches would share one title
      const unit = r.locSlug ? (await db.getLocations(r.org.id).catch(() => [])).find((l) => l.location_slug === r.locSlug && !l.is_primary && !/^sedi[sš]te$/i.test(l.unit_name_lat.trim())) : null;
      if (unit) {
        const full = unitTitle(r.org.name_lat, unit.unit_name_lat); const town = unit.jls_name_lat && !full.includes(unit.jls_name_lat) ? unit.jls_name_lat : null;
        return m(`${full}${town ? `, ${town}` : ""} – ${P("adresa, telefon, radno vreme", "address, phone, opening hours", "адрес, телефон, часы работы", "Adresse, Telefon, Öffnungszeiten")}`,
          `${full}${town ? `, ${town}` : ""}${unit.address_display ? `, ${unit.address_display}` : ""}: ${lc(d.contactAndAddress)}, ${lc(d.hours)}. ${tn(r.type, locale)}.`);
      }
      const n = r.org.name_lat; const place = r.org.place_name && !n.includes(r.org.place_name) ? r.org.place_name : null;
      return m(`${n}${place ? `, ${place}` : ""} – ${P("adresa, telefon, radno vreme", "address, phone, opening hours", "адрес, телефон, часы работы", "Adresse, Telefon, Öffnungszeiten")}`,
        `${n}${place ? `, ${place}` : ""}: ${lc(d.contactAndAddress)}, ${lc(d.hours)}, ${lc(d.jurisdiction)}. ${tn(r.type, locale)}.`); }
  }
}

/** The page for a path. `sp` and `rememberedPlace` are empty on the static page; the request-time twin passes the query and the municipality cookie. */
export async function renderPage(path: string[], sp: Query, rememberedPlace: string | null) {
  const [locale, rest] = splitLocale(path);
  const r = await resolve(rest);
  if (!r) notFound();
  if (r.kind === "moved") permanentRedirect(href(locale, r.to));
  const plain = "/" + rest.join("/");
  let body: React.ReactNode;
  switch (r.kind) {
    case "home": body = <Home locale={locale} />; break;
    case "search": body = <SmartSearchPage locale={locale} q={typeof sp.q === "string" ? sp.q : ""} />; break;
    case "foreigners": body = <ForForeigners locale={locale} />; break;
    case "static": body = r.slug === "partneri" ? <PartnersPage locale={locale} path={href(locale, plain)} /> : <StaticPage locale={locale} slug={r.slug} />; break;
    case "guides": body = <GuidesHub locale={locale} />; break;
    case "roadmaps": body = <RoadmapHub locale={locale} />; break;
    case "roadmap": body = <RoadmapPage locale={locale} road={r.road} />; break;
    case "visa": body = <VisaHub locale={locale} />; break;
    case "country": body = <CountryPage locale={locale} country={r.country} />; break;
    case "guide": { const fromQuery = typeof sp.opstina === "string" ? sp.opstina : null; const fromCookie = fromQuery ? null : rememberedPlace;
      body = <GuidePage locale={locale} guide={r.guide} jlsSlug={fromQuery ?? fromCookie} path={href(locale, plain)} />; break; }
    case "okrug": {
      // a district that is one city (Grad Beograd) has nothing of its own to show: go straight to the city and its municipalities
      const inside = await db.getJlsInOkrug(r.unit.id);
      if (inside.length === 1) redirect(href(locale, `/${inside[0].slug}`));
      body = <OkrugHub locale={locale} okrug={r.unit} />; break; }
    case "unit": body = <UnitHub locale={locale} unit={r.unit} parent={r.parent} />; break;
    case "type": body = <OrgTypeHub locale={locale} type={r.type} brand={typeof sp.brend === "string" ? sp.brend : null} place={typeof sp.mesto === "string" && sp.mesto ? sp.mesto : null} query={{ q: typeof sp.q === "string" ? sp.q : null, facet: typeof sp.oblast === "string" ? sp.oblast : null, page: typeof sp.strana === "string" ? Number.parseInt(sp.strana, 10) || 1 : 1 }} />; break;
    case "org": body = <OrgPage locale={locale} org={r.org} locSlug={r.locSlug} path={href(locale, plain)} />; break;
  }
  return (<><Header locale={locale as Locale} path={plain} /><div lang={locale === "sr" ? "sr-Latn" : locale}>{body}</div><Footer locale={locale as Locale} /></>);
}
