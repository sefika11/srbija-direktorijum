// One place for the head tags every page shares: canonical, hreflang (with x-default), Open Graph and Twitter card.
import type { Metadata } from "next";
import { LOCALES, HREFLANG, href, type Locale } from "@/lib/i18n";

export const SITE_NAME = "Gde da idem?";
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const OG_LOCALE: Record<Locale, string> = { sr: "sr_RS", en: "en_US", ru: "ru_RU", de: "de_DE" };

/**
 * `plain` is the path without the locale prefix ("/beograd"). `query` is the part of the query string that makes a page of its own
 * (a place filter, a page number); it is kept in the canonical and in every language alternate. `noindex` is for views that are
 * a search result rather than a page (free-text filters).
 */
export function pageMeta({ locale, plain, title, description, absolute = false, query = "", noindex = false }: {
  locale: Locale; plain: string; title: string; description?: string | null; absolute?: boolean; query?: string; noindex?: boolean;
}): Metadata {
  const q = query ? `?${query}` : "";
  const url = href(locale, plain) + q;
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [HREFLANG[l], href(l, plain) + q]));
  languages["x-default"] = href("sr", plain) + q;
  const full = absolute ? title : `${title} · ${SITE_NAME}`;
  const desc = description ? description.replace(/\s+/g, " ").trim().slice(0, 300) : undefined;
  return {
    title: absolute ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: url, languages },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", siteName: SITE_NAME, title: full, description: desc, url, locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]), images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }] },
    twitter: { card: "summary_large_image", title: full, description: desc, images: ["/og.png"] },
  };
}

/** JSON-LD for the home page: the site with its search box, and who publishes it. */
export function siteLd(locale: Locale, description: string) {
  const base = siteUrl();
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: base + href(locale, "/"), description, inLanguage: HREFLANG[locale],
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${base}${href(locale, "/pretraga")}?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: base, logo: `${base}/icon.svg` },
  ];
}

/** BreadcrumbList from the same items the visible breadcrumb shows (last item has no link). */
export function breadcrumbLd(items: { href?: string; label: string }[]) {
  const base = siteUrl();
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, ...(it.href ? { item: base + it.href } : {}) })) };
}
