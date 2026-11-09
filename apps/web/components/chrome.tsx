import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";

export function SearchBox({ locale, defaultValue = "", large = false }: { locale: Locale; defaultValue?: string; large?: boolean }) {
  const d = t(locale);
  return (
    <form action={href(locale, "/pretraga")} role="search" className={`flex w-full ${large ? "max-w-2xl" : "max-w-md"}`}>
      <label htmlFor="q" className="sr-only">{d.search}</label>
      <input id="q" name="q" type="search" defaultValue={defaultValue} placeholder={d.searchPlaceholder} autoComplete="off"
             className={`flex-1 min-w-0 rounded-l-lg border border-line bg-surface px-4 ${large ? "py-3.5 text-[16px]" : "py-2 text-[14px]"} outline-none focus:border-accent`} />
      <button type="submit" className={`rounded-r-lg bg-accent text-white px-4 font-medium ${large ? "text-[15px]" : "text-[14px]"}`}>{d.search}</button>
    </form>
  );
}

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  return (
    <header className="border-b border-line bg-surface">
      <div className="shell flex items-center gap-4 py-3 flex-wrap">
        <Link href={href(locale, "/")} className="no-underline text-ink flex items-center gap-2.5 shrink-0">
          <span aria-hidden className="inline-grid place-items-center w-8 h-8 rounded-md bg-accent text-white font-serif font-semibold">A</span>
          <span className="font-serif font-semibold text-[17px] leading-tight">{d.siteName}</span>
        </Link>
        <div className="flex-1 min-w-[200px] hidden sm:block"><SearchBox locale={locale} /></div>
        <nav className="flex items-center gap-4 text-[13.5px] ml-auto">
          <Link href={href(locale, "/za-strance")} className="no-underline text-ink hover:underline">{d.forForeigners}</Link>
          <LanguageSwitch locale={locale} path={path} />
        </nav>
      </div>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="shell py-8 text-[13px] text-muted flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <div>© {new Date().getFullYear()} {d.siteName}. {d.dataSources}: Uprava za trezor (KJS), RZS, RGZ, zvanični sajtovi institucija. Granice okruga: © OpenStreetMap contributors (ODbL) via geoBoundaries.</div>
        <div className="flex gap-4">
          <Link href={href(locale, "/o-sajtu")} className="text-muted">{d.aboutSite}</Link>
          <Link href={href(locale, "/partneri")} className="text-muted">{d.becomePartner}</Link>
          <Link href={href(locale, "/privatnost")} className="text-muted">{d.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}
