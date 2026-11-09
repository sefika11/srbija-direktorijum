import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";
import { Icon } from "./icons";

export function SearchBox({ locale, defaultValue = "", large = false }: { locale: Locale; defaultValue?: string; large?: boolean }) {
  const d = t(locale);
  return (
    <form action={href(locale, "/pretraga")} role="search" className={`flex w-full ${large ? "max-w-2xl" : "max-w-md"} ${large ? "search-large" : ""}`}>
      <label htmlFor={large ? "q" : "q-top"} className="sr-only">{d.search}</label>
      <div className={`flex-1 min-w-0 flex items-center gap-2 rounded-l-xl border border-line bg-surface ${large ? "px-4" : "px-3"} focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition`}>
        <span className="text-muted shrink-0"><Icon.search /></span>
        <input id={large ? "q" : "q-top"} name="q" type="search" defaultValue={defaultValue} placeholder={d.searchPlaceholder} autoComplete="off"
               className={`flex-1 min-w-0 bg-transparent ${large ? "py-3.5 text-[16px]" : "py-2 text-[14px]"} outline-none placeholder:text-muted/80`} />
      </div>
      <button type="submit" className={`rounded-r-xl bg-accent hover:bg-accent-ink text-white px-5 font-medium transition ${large ? "text-[15px]" : "text-[14px]"}`}>{d.search}</button>
    </form>
  );
}

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="shell flex items-center gap-4 py-2.5">
        <Link href={href(locale, "/")} className="no-underline text-ink flex items-center gap-2.5 shrink-0">
          <span aria-hidden className="brand-mark">A</span>
          <span className="leading-tight">
            <span className="block font-serif font-semibold text-[17px]">{d.siteName}</span>
            <span className="hidden md:block text-[11px] text-muted tracking-wide">Republika Srbija · 145 gradova i opština</span>
          </span>
        </Link>
        <div className="flex-1 min-w-[200px] hidden sm:flex justify-center"><SearchBox locale={locale} /></div>
        <nav className="flex items-center gap-3 text-[13.5px] ml-auto">
          <Link href={href(locale, "/za-strance")} className="no-underline text-ink hover:text-accent hidden sm:inline-flex items-center gap-1.5"><Icon.globe />{d.forForeigners}</Link>
          <LanguageSwitch locale={locale} path={path} />
        </nav>
      </div>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="shell py-10 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr] text-[13.5px]">
        <div>
          <div className="flex items-center gap-2.5"><span aria-hidden className="brand-mark">A</span><span className="font-serif font-semibold text-[16px]">{d.siteName}</span></div>
          <p className="text-muted mt-3 max-w-md leading-relaxed">{d.tagline}</p>
        </div>
        <div>
          <div className="eyebrow mb-2">Sajt</div>
          <ul className="grid gap-1.5">
            <li><Link href={href(locale, "/o-sajtu")} className="text-ink no-underline hover:text-accent">{d.aboutSite}</Link></li>
            <li><Link href={href(locale, "/partneri")} className="text-ink no-underline hover:text-accent">{d.becomePartner}</Link></li>
            <li><Link href={href(locale, "/privatnost")} className="text-ink no-underline hover:text-accent">{d.privacy}</Link></li>
            <li><Link href={href(locale, "/za-strance")} className="text-ink no-underline hover:text-accent">{d.forForeigners}</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-2">{d.dataSources}</div>
          <p className="text-muted leading-relaxed">Uprava za trezor (registar KJS), RZS, RGZ, RFZO, Komora javnih izvršitelja, Javnobeležnička komora, zvanični sajtovi institucija.</p>
          <p className="text-muted mt-2 text-[12px]">Granice okruga i opština: © OpenStreetMap contributors (ODbL) via geoBoundaries.</p>
        </div>
      </div>
      <div className="border-t border-line"><div className="shell py-4 text-[12px] text-muted flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>© {new Date().getFullYear()} {d.siteName}</span><span>Podaci se proveravaju redovno; prijavite grešku na svakoj strani.</span>
      </div></div>
    </footer>
  );
}
