import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/chrome";
import { Home, OkrugHub, UnitHub, OrgTypeHub, OrgPage, SearchPage, ForForeigners, StaticPage, tuLabel } from "@/components/pages";
import * as db from "@/lib/db";
import { LOCALES, HREFLANG, href, splitLocale, t, type Locale } from "@/lib/i18n";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { path: string[] };
type Props = { params: Promise<Params>; searchParams: Promise<Record<string, string | string[] | undefined>> };

type Resolved =
  | { kind: "home" } | { kind: "search" } | { kind: "foreigners" } | { kind: "static"; slug: string }
  | { kind: "okrug"; unit: db.TU } | { kind: "unit"; unit: db.TU; parent: db.TU | null }
  | { kind: "type"; type: db.OrgType } | { kind: "org"; org: db.OrgRow; type: db.OrgType; locSlug?: string };

async function resolve(rest: string[]): Promise<Resolved | null> {
  if (rest.length === 0) return { kind: "home" };
  const [a, b, c] = rest;
  if (a === "pretraga" && rest.length === 1) return { kind: "search" };
  if (a === "za-strance" && rest.length === 1) return { kind: "foreigners" };
  if (["o-sajtu", "partneri", "privatnost"].includes(a) && rest.length === 1) return { kind: "static", slug: a };
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
    case "home": return { ...base, title: `${d.siteName}`, description: d.tagline };
    case "search": return { ...base, title: d.search, robots: { index: false } };
    case "foreigners": return { ...base, title: d.forForeigners, description: d.forForeignersLead };
    case "static": return { ...base, title: r.slug };
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
    case "search": body = <SearchPage locale={locale} q={typeof sp.q === "string" ? sp.q : ""} />; break;
    case "foreigners": body = <ForForeigners locale={locale} />; break;
    case "static": body = <StaticPage locale={locale} slug={r.slug} />; break;
    case "okrug": body = <OkrugHub locale={locale} okrug={r.unit} />; break;
    case "unit": body = <UnitHub locale={locale} unit={r.unit} parent={r.parent} />; break;
    case "type": body = <OrgTypeHub locale={locale} type={r.type} />; break;
    case "org": body = <OrgPage locale={locale} org={r.org} locSlug={r.locSlug} path={href(locale, plain)} />; break;
  }
  return (<><Header locale={locale as Locale} path={plain} /><div lang={locale === "sr" ? "sr-Latn" : locale}>{body}</div><Footer locale={locale as Locale} /></>);
}
