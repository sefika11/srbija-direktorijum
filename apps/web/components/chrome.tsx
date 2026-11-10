import Link from "next/link";
import HtmlLang from "./HtmlLang";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";
import { Icon } from "./icons";
import { Logo } from "./Logo";
import * as db from "@/lib/db";
import SearchBox from "./SearchBox";

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  return (
    <><a href="#main" className="skip-link">{locale === "sr" ? "Pređi na sadržaj" : locale === "en" ? "Skip to content" : locale === "ru" ? "К содержанию" : "Zum Inhalt"}</a><HtmlLang locale={locale} /><header className="site-header sticky top-0 z-40">
      <div className="tricolor" aria-hidden />
      <div className="shell flex items-center gap-4 min-h-[64px]">
        <Link href={href(locale, "/")} className="no-underline text-ink shrink-0" aria-label={d.siteName}>
          <Logo name={d.siteName} size={46} sub={locale === "sr" ? "Sve institucije Srbije" : locale === "en" ? "Every institution in Serbia" : locale === "ru" ? "Все учреждения Сербии" : "Alle Einrichtungen Serbiens"} />
        </Link>
        {path !== "/" ? <div className="flex-1 min-w-[260px] hidden lg:flex justify-center"><SearchBox locale={locale} placeholder={d.searchPlaceholder} submitLabel={d.search} /></div> : <div className="flex-1" />}
        <nav className="flex items-center gap-3 text-[13.5px] ml-auto">
          <Link href={href(locale, "/vodici")} className="no-underline text-ink hover:text-accent hidden sm:inline-flex items-center gap-1.5">{locale === "sr" ? "Vodiči" : locale === "en" ? "Guides" : locale === "ru" ? "Инструкции" : "Anleitungen"}</Link>
          <Link href={href(locale, "/za-strance")} className="no-underline text-ink hover:text-accent hidden md:inline-flex items-center gap-1.5 whitespace-nowrap"><Icon.globe />{d.forForeigners}</Link>
          <LanguageSwitch locale={locale} path={path} />
        </nav>
      </div>
    </header></>
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
      <div className="footer-edge" aria-hidden />
      <div className="shell footer-top">
        <div className="footer-brand">
          <Link href={href(locale, "/")} className="no-underline footer-logo" aria-label={d.siteName}><Logo name={d.siteName} size={62} big /></Link>
          <p className="footer-tag">{d.tagline}</p>
        </div>
        <p className="footer-note">{L.note}</p>
      </div>
      <div className="shell footer-cols">
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
            <li><Link href={href(locale, "/vize")}>{locale === "sr" ? "Vize i uslovi ulaska" : locale === "en" ? "Visas and entry rules" : locale === "ru" ? "Визы и въезд" : "Visa und Einreise"}</Link></li>
            <li><Link href={href(locale, "/partneri")}>{d.becomePartner}</Link></li>
            <li><Link href={href(locale, "/o-sajtu")}>{d.aboutSite}</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.legal}</div>
          <ul className="grid gap-1.5"><li><Link href={href(locale, "/privatnost")}>{d.privacy}</Link></li></ul>
          <div className="eyebrow mb-3 mt-6">{locale === "sr" ? "Jezik" : locale === "en" ? "Language" : locale === "ru" ? "Язык" : "Sprache"}</div>
          <ul className="footer-langs">{(["sr", "en", "ru", "de"] as Locale[]).map((l) => <li key={l}><Link href={href(l, "/")} hrefLang={l} aria-current={l === locale ? "true" : undefined}>{{ sr: "Srpski", en: "English", ru: "Русский", de: "Deutsch" }[l]}</Link></li>)}</ul>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.sources}</div>
          <p className="leading-relaxed text-[13.5px]">Uprava za trezor (registar KJS), RZS, RGZ, RFZO, MUP (zvanični spiskovi), Komora javnih izvršitelja, Javnobeležnička komora, zvanični sajtovi institucija.</p>
          <p className="mt-2 text-[12.5px] footer-note">Granice i lokacije: © OpenStreetMap contributors (ODbL) via geoBoundaries i Geofabrik.</p>
        </div>
      </div>
      <div className="footer-base"><div className="shell py-4 text-[12.5px] flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>© {new Date().getFullYear()} {d.siteName}</span><span>{locale === "sr" ? "Prijavite grešku na svakoj strani." : locale === "en" ? "Report an error on any page." : locale === "ru" ? "Сообщите об ошибке на любой странице." : "Fehler auf jeder Seite melden."}</span>
      </div></div>
    </footer>
  );
}
