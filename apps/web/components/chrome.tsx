import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";
import { Icon } from "./icons";
import * as db from "@/lib/db";
import SearchBox from "./SearchBox";

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="tricolor" aria-hidden />
      <div className="shell flex items-center gap-4 py-2.5">
        <Link href={href(locale, "/")} className="no-underline text-ink flex items-center gap-2.5 shrink-0">
          <span aria-hidden className="brand-mark">G</span>
          <span className="leading-tight">
            <span className="block font-serif font-semibold text-[17px]">{d.siteName}</span>
            <span className="hidden md:block text-[11px] text-muted tracking-[.08em] uppercase">{locale === "sr" ? "Sve institucije Srbije" : locale === "en" ? "Every institution in Serbia" : locale === "ru" ? "Все учреждения Сербии" : "Alle Einrichtungen Serbiens"}</span>
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

export async function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  const guides = await db.getGuides().catch(() => [] as db.GuideRow[]);
  const top = guides.filter((g) => g.status === "full").slice(0, 7);
  const L = { sr: { product: "Sajt", guides: "Vodiči", sources: "Izvori podataka", legal: "Pravno", all: "Svi vodiči", note: "Nezavisni imenik. Nije državni servis; podatke proveravamo redovno i ispravljamo na prijavu." },
              en: { product: "Site", guides: "Guides", sources: "Data sources", legal: "Legal", all: "All guides", note: "Independent directory. Not a government service; data is checked regularly and corrected on report." },
              ru: { product: "Сайт", guides: "Инструкции", sources: "Источники данных", legal: "Правовое", all: "Все инструкции", note: "Независимый справочник, не государственный сервис; данные регулярно проверяются." },
              de: { product: "Website", guides: "Anleitungen", sources: "Datenquellen", legal: "Rechtliches", all: "Alle Anleitungen", note: "Unabhängiges Verzeichnis, kein staatlicher Dienst; Daten werden regelmäßig geprüft." } }[locale];
  return (
    <footer className="site-footer mt-20">
      <div className="tricolor-thin" aria-hidden />
      <div className="shell py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5"><span aria-hidden className="brand-mark">G</span><span className="font-serif font-semibold text-[18px]">{d.siteName}</span></div>
          <p className="mt-3 max-w-sm leading-relaxed">{d.tagline}</p>
          <p className="mt-3 footer-note text-[13px] leading-relaxed">{L.note}</p>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.guides}</div>
          <ul className="grid gap-1.5">
            {top.map((g) => <li key={g.id}><Link href={href(locale, `/vodic/${g.slug}`)}>{(g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}).title ?? g.name_lat}</Link></li>)}
            <li><Link href={href(locale, "/vodici")} className="font-medium">{L.all} →</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.product}</div>
          <ul className="grid gap-1.5">
            <li><Link href={href(locale, "/")}>{d.home}</Link></li>
            <li><Link href={href(locale, "/za-strance")}>{d.forForeigners}</Link></li>
            <li><Link href={href(locale, "/partneri")}>{d.becomePartner}</Link></li>
            <li><Link href={href(locale, "/o-sajtu")}>{d.aboutSite}</Link></li>
          </ul>
          <div className="eyebrow mb-3 mt-6">{L.legal}</div>
          <ul className="grid gap-1.5"><li><Link href={href(locale, "/privatnost")}>{d.privacy}</Link></li></ul>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.sources}</div>
          <p className="leading-relaxed text-[13.5px]">Uprava za trezor (registar KJS), RZS, RGZ, RFZO, MUP (zvanični spiskovi), Komora javnih izvršitelja, Javnobeležnička komora, zvanični sajtovi institucija.</p>
          <p className="mt-2 text-[12.5px] footer-note">Granice i lokacije: © OpenStreetMap contributors (ODbL) via geoBoundaries i Geofabrik.</p>
        </div>
      </div>
      <div className="border-t"><div className="shell py-4 text-[12.5px] footer-note flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>© {new Date().getFullYear()} {d.siteName}</span><span>{locale === "sr" ? "Prijavite grešku na svakoj strani." : locale === "en" ? "Report an error on any page." : locale === "ru" ? "Сообщите об ошибке на любой странице." : "Fehler auf jeder Seite melden."}</span>
      </div></div>
    </footer>
  );
}
