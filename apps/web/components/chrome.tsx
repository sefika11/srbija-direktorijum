import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";
import { Icon } from "./icons";
import SearchBox from "./SearchBox";

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="tricolor" aria-hidden />
      <div className="shell flex items-center gap-4 py-2.5">
        <Link href={href(locale, "/")} className="no-underline text-ink flex items-center gap-2.5 shrink-0">
          <span aria-hidden className="brand-mark">A</span>
          <span className="leading-tight">
            <span className="block font-serif font-semibold text-[17px]">{d.siteName}</span>
            <span className="hidden md:block text-[11px] text-muted tracking-[.08em] uppercase">Republika Srbija · 145 gradova i opština</span>
          </span>
        </Link>
        <div className="flex-1 min-w-[200px] hidden sm:flex justify-center"><SearchBox locale={locale} placeholder={d.searchPlaceholder} submitLabel={d.search} /></div>
        <nav className="flex items-center gap-3 text-[13.5px] ml-auto">
          <Link href={href(locale, "/vodici")} className="no-underline text-ink hover:text-accent hidden sm:inline-flex items-center gap-1.5">{locale === "sr" ? "Vodiči" : locale === "en" ? "Guides" : locale === "ru" ? "Инструкции" : "Anleitungen"}</Link>
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
    <footer className="site-footer mt-20">
      <div className="tricolor-thin" aria-hidden />
      <div className="shell py-12 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr] text-[13.5px]">
        <div>
          <div className="flex items-center gap-2.5"><span aria-hidden className="brand-mark">A</span><span className="font-serif font-semibold text-[17px] text-white">{d.siteName}</span></div>
          <p className="mt-3 max-w-md leading-relaxed">{d.tagline}</p>
        </div>
        <div>
          <div className="eyebrow mb-2">Sajt</div>
          <ul className="grid gap-1.5">
            <li><Link href={href(locale, "/vodici")} className="no-underline">{locale === "sr" ? "Vodiči" : locale === "en" ? "Guides" : locale === "ru" ? "Инструкции" : "Anleitungen"}</Link></li>
            <li><Link href={href(locale, "/o-sajtu")} className="no-underline">{d.aboutSite}</Link></li>
            <li><Link href={href(locale, "/partneri")} className="no-underline">{d.becomePartner}</Link></li>
            <li><Link href={href(locale, "/privatnost")} className="no-underline">{d.privacy}</Link></li>
            <li><Link href={href(locale, "/za-strance")} className="no-underline">{d.forForeigners}</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-2">{d.dataSources}</div>
          <p className="leading-relaxed">Uprava za trezor (registar KJS), RZS, RGZ, RFZO, Komora javnih izvršitelja, Javnobeležnička komora, zvanični sajtovi institucija.</p>
          <p className="mt-2 text-[12px] opacity-80">Granice okruga i opština: © OpenStreetMap contributors (ODbL) via geoBoundaries.</p>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="shell py-4 text-[12px] opacity-80 flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>© {new Date().getFullYear()} {d.siteName}</span><span>Podaci se proveravaju redovno; prijavite grešku na svakoj strani.</span>
      </div></div>
    </footer>
  );
}
