import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/chrome";
import { Home, OkrugHub, UnitHub, OrgTypeHub, OrgPage, SearchPage, ForForeigners, StaticPage, tuLabel } from "@/components/pages";
import { GuidesHub, GuidePage, GUIDE_LABELS, content as guideContent } from "@/components/guides";
import { SmartSearchPage } from "@/components/search";
import { PartnersPage } from "@/components/partners";
import { VisaHub, CountryPage } from "@/components/visa";
import { cookies } from "next/headers";
import * as db from "@/lib/db";
import { LOCALES, HREFLANG, href, splitLocale, t, type Locale } from "@/lib/i18n";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { path: string[] };
type Props = { params: Promise<Params>; searchParams: Promise<Record<string, string | string[] | undefined>> };

type Resolved =
  | { kind: "home" } | { kind: "search" } | { kind: "foreigners" } | { kind: "static"; slug: string }
  | { kind: "okrug"; unit: db.TU } | { kind: "unit"; unit: db.TU; parent: db.TU | null }
  | { kind: "type"; type: db.OrgType } | { kind: "org"; org: db.OrgRow; type: db.OrgType; locSlug?: string }
  | { kind: "guides" } | { kind: "guide"; guide: db.GuideRow }
  | { kind: "visa" } | { kind: "country"; country: db.CountryRow };

async function resolve(rest: string[]): Promise<Resolved | null> {
  if (rest.length === 0) return { kind: "home" };
  const [a, b, c] = rest;
  if (a === "pretraga" && rest.length === 1) return { kind: "search" };
  if (a === "za-strance" && rest.length === 1) return { kind: "foreigners" };
  if (["o-sajtu", "partneri", "privatnost"].includes(a) && rest.length === 1) return { kind: "static", slug: a };
  if (a === "vodici" && rest.length === 1) return { kind: "guides" };
  if (a === "vize" && rest.length === 1) return { kind: "visa" };
  if (a === "vize" && b && rest.length === 2) { const c = await db.getCountry(b); return c ? { kind: "country", country: c } : null; }
  if (a === "vodic" && b && rest.length === 2) { const g = await db.getGuide(b); return g ? { kind: "guide", guide: g } : null; }
  if (a === "okrug" && b && rest.length === 2) { const u = await db.getTU(b, "okrug"); return u ? { kind: "okrug", unit: u } : null; }
  const jls = await db.getTU(a, "jls");
  if (jls) {
    if (rest.length === 1) return { kind: "unit", unit: jls, parent: null };
    if (rest.length === 2) { const go = await db.getTU(b, "gradska_opstina"); return go && go.parent_id === jls.id ? { kind: "unit", unit: go, parent: jls } : null; }
    return null;
  }
  const type = await db.getOrgType(a);
  if (!type) return null;
  if (rest.length === 1) return { kind: "type", type };
  const org = await db.getOrg(a, b);
  if (!org) return null;
  if (rest.length === 2) return { kind: "org", org, type };
  if (rest.length === 3) return { kind: "org", org, type, locSlug: c };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const [locale, rest] = splitLocale(path);
  const r = await resolve(rest);
  if (!r) return {};
  const d = t(locale);
  const plain = "/" + rest.join("/");
  const languages = Object.fromEntries(LOCALES.map((l) => [HREFLANG[l], href(l, plain)]));
  const base: Metadata = { alternates: { canonical: href(locale, plain), languages } };
  switch (r.kind) {
    case "home": return { ...base, title: { absolute: locale === "sr" ? "Gde da idem? – sve institucije Srbije" : locale === "en" ? "Gde da idem? – every public institution in Serbia" : locale === "ru" ? "Gde da idem? – все учреждения Сербии" : "Gde da idem? – alle Einrichtungen Serbiens" }, description: d.tagline };
    case "search": return { ...base, title: d.search, robots: { index: false } };
    case "foreigners": return { ...base, title: d.forForeigners, description: d.forForeignersLead };
    case "static": return { ...base, title: r.slug === "partneri" ? (locale === "en" ? "Partnership and advertising" : "Partnerstvo i oglašavanje") : r.slug === "o-sajtu" ? d.aboutSite : d.privacy };
    case "guides": return { ...base, title: GUIDE_LABELS[locale].guides, description: GUIDE_LABELS[locale].guidesLead };
    case "visa": return { ...base, title: locale === "sr" ? "Vize i uslovi ulaska – sve države" : locale === "en" ? "Visas and entry rules – all countries" : locale === "ru" ? "Визы и условия въезда – все страны" : "Visa und Einreise – alle Länder", description: locale === "sr" ? "Za svaku državu: vizni režim za ulazak u Srbiju i uslovi za putovanje građana Srbije. Izvor: MSP." : "Visa regime for entering Serbia and travel rules for Serbian citizens, per country. Source: MFA." };
    case "country": { const n = locale === "sr" ? r.country.name_sr : r.country.name_en; return { ...base, title: locale === "sr" ? `${n} – viza, uslovi ulaska, ambasada` : locale === "en" ? `${n} – visa, entry rules, embassy` : locale === "ru" ? `${n} – виза, въезд, посольство` : `${n} – Visum, Einreise, Botschaft`, description: locale === "sr" ? `${n}: ulazak u Srbiju ${r.country.to_rs_regime ?? ""}, putovanje iz Srbije ${r.country.from_rs_regime ?? ""}. Predstavništva, zvanično uputstvo MSP.` : `${n}: entering Serbia ${r.country.to_rs_regime ?? ""}, travelling from Serbia ${r.country.from_rs_regime ?? ""}. Missions and official MFA instructions.` }; }
    case "guide": { const c = guideContent(r.guide, locale).c; return { ...base, title: `${c.title ?? r.guide.name_lat} – ${GUIDE_LABELS[locale].documents.toLowerCase()}, ${GUIDE_LABELS[locale].fees.toLowerCase()}, ${GUIDE_LABELS[locale].whereToGo.toLowerCase()}`, description: c.summary ?? r.guide.summary ?? undefined }; }
    case "okrug": return { ...base, title: `${r.unit.name_lat} – ${locale === "sr" ? "gradovi, opštine i institucije" : d.institutions}`, description: `${d.allInstitutionsIn} ${r.unit.name_lat}: ${d.tagline}` };
    case "unit": return { ...base, title: `${tuLabel(r.unit)} – ${locale === "sr" ? "institucije, adrese, telefoni" : d.institutions}`, description: `${d.allInstitutionsIn} ${r.unit.name_lat}. ${d.tagline}` };
    case "type": return { ...base, title: `${r.type.name_plural_lat ?? r.type.name_lat} – ${locale === "sr" ? "spisak po gradovima" : "by city"}` };
    case "org": return { ...base, title: `${r.org.name_lat}${r.org.founder_name && !r.org.name_lat.includes(r.org.founder_name) ? ` ${r.org.founder_name}` : ""} – ${locale === "sr" ? "adresa, telefon, radno vreme" : "address, phone, hours"}`,
      description: `${r.org.name_lat}: ${d.contactAndAddress.toLowerCase()}, ${d.hours.toLowerCase()}, ${d.jurisdiction.toLowerCase()}. ${r.type.name_lat}${r.org.founder_name ? `, ${r.org.founder_name}` : ""}.` };
  }
}

export default async function Page({ params, searchParams }: Props) {
  const { path } = await params;
  const sp = await searchParams;
  const [locale, rest] = splitLocale(path);
  const r = await resolve(rest);
  if (!r) notFound();
  const plain = "/" + rest.join("/");
  let body: React.ReactNode;
  switch (r.kind) {
    case "home": body = <Home locale={locale} />; break;
    case "search": body = <SmartSearchPage locale={locale} q={typeof sp.q === "string" ? sp.q : ""} />; break;
    case "foreigners": body = <ForForeigners locale={locale} />; break;
    case "static": body = r.slug === "partneri" ? <PartnersPage locale={locale} path={href(locale, plain)} /> : <StaticPage locale={locale} slug={r.slug} />; break;
    case "guides": body = <GuidesHub locale={locale} />; break;
    case "visa": body = <VisaHub locale={locale} />; break;
    case "country": body = <CountryPage locale={locale} country={r.country} />; break;
    case "guide": { const fromQuery = typeof sp.opstina === "string" ? sp.opstina : null; const fromCookie = fromQuery ? null : ((await cookies()).get("opstina")?.value ?? null);
      body = <GuidePage locale={locale} guide={r.guide} jlsSlug={fromQuery ?? fromCookie} path={href(locale, plain)} />; break; }
    case "okrug": body = <OkrugHub locale={locale} okrug={r.unit} />; break;
    case "unit": body = <UnitHub locale={locale} unit={r.unit} parent={r.parent} />; break;
    case "type": body = <OrgTypeHub locale={locale} type={r.type} brand={typeof sp.brend === "string" ? sp.brend : null} place={typeof sp.mesto === "string" ? sp.mesto : null} />; break;
    case "org": body = <OrgPage locale={locale} org={r.org} locSlug={r.locSlug} path={href(locale, plain)} />; break;
  }
  return (<><Header locale={locale as Locale} path={plain} /><div lang={locale === "sr" ? "sr-Latn" : locale}>{body}</div><Footer locale={locale as Locale} /></>);
}
