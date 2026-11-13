"use client";
/** Branch hubs (banks, insurers, telecom shops, national networks): pick your place, narrow to one brand. URL-driven so links are shareable. */
import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import type { Locale } from "@/lib/i18n";

type Agg = { slug: string; name: string; count: number };
const L: Record<Locale, { place: string; all: string; shown: string; reset: string; brand: string }> = {
  sr: { place: "Vaše mesto ili opština…", all: "Sve", shown: "prikazano", reset: "Poništi", brand: "Brend" },
  en: { place: "Your town or municipality…", all: "All", shown: "shown", reset: "Reset", brand: "Brand" },
  ru: { place: "Ваш город или община…", all: "Все", shown: "показано", reset: "Сбросить", brand: "Бренд" },
  de: { place: "Ihr Ort oder Ihre Gemeinde…", all: "Alle", shown: "angezeigt", reset: "Zurücksetzen", brand: "Marke" },
};

export default function BranchFilters({ locale, basePath, brands, places, brand, place, shown, total }: { locale: Locale; basePath: string; brands: Agg[]; places: Agg[]; brand: string | null; place: string | null; shown: number; total: number }) {
  const T = L[locale]; const router = useRouter();
  const url = (b: string | null, p: string | null) => { const q = new URLSearchParams(); if (b) q.set("brend", b); if (p) q.set("mesto", p); const s = q.toString(); return s ? `${basePath}?${s}` : basePath; };
  return (
    <div className="bf card p-3 sm:p-4 grid gap-3">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
        <Combobox label={T.place} placeholder={T.place} value={place} options={places.map((p) => ({ value: p.slug, label: p.name, sub: String(p.count) }))} onChange={(v) => router.push(url(brand, v), { scroll: false })} />
        <div className="text-[12.5px] text-muted tabular whitespace-nowrap">{shown.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} / {total.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {T.shown}{(brand || place) && <> · <Link href={basePath} className="text-accent">{T.reset}</Link></>}</div>
      </div>
      {brands.length > 1 && (
        <div className="bf-brands" role="tablist" aria-label={T.brand}>
          <Link href={url(null, place)} role="tab" aria-selected={!brand} className={`quick-chip ${!brand ? "is-on" : ""}`}>{T.all}</Link>
          {brands.map((b) => <Link key={b.slug} href={url(b.slug, place)} role="tab" aria-selected={brand === b.slug} className={`quick-chip ${brand === b.slug ? "is-on" : ""}`}>{b.name}<span className="text-muted tabular ml-1.5">{b.count}</span></Link>)}
        </div>
      )}
    </div>
  );
}
