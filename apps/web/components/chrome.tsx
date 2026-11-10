import Link from "next/link";
import HtmlLang from "./HtmlLang";
import type { Locale } from "@/lib/i18n";
import { t, href, pick, LOCALES, LOCALE_LABEL } from "@/lib/i18n";
import { LanguageSwitch } from "./ui";
import { Logo } from "./Logo";
import * as db from "@/lib/db";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import NavMenu from "./NavMenu";
import { ROAD_LABELS } from "@/lib/roadmaps";

export function Header({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale);
  const P = (sr: string, en: string, ru: string, de: string) => pick(locale, sr, en, ru, de);
  const guides = P("Vodiči", "Guides", "Инструкции", "Anleitungen"), visas = P("Vize i uslovi ulaska", "Visas and entry rules", "Визы и въезд", "Visa und Einreise");
  return (
    <><a href="#main" className="skip-link">{P("Pređi na sadržaj", "Skip to content", "К содержанию", "Zum Inhalt")}</a><HtmlLang locale={locale} /><header className="site-header sticky top-0 z-40">
      <div className="tricolor" aria-hidden />
      <div className="shell flex items-center gap-3 sm:gap-4 min-h-[64px]">
        <Link href={href(locale, "/")} className="no-underline text-ink shrink-0" aria-label={d.siteName}>
          <Logo name={d.siteName} size={46} sub={P("Sve institucije Srbije", "Every institution in Serbia", "Все учреждения Сербии", "Alle Einrichtungen Serbiens")} />
        </Link>
        {path !== "/" ? <div className="flex-1 min-w-[260px] hidden lg:flex justify-center"><SearchBox locale={locale} placeholder={d.searchPlaceholder} submitLabel={d.search} /></div> : <div className="flex-1" />}
        <nav className="flex items-center gap-2 sm:gap-3 text-[13.5px] ml-auto" aria-label={P("Glavna navigacija", "Main navigation", "Основная навигация", "Hauptnavigation")}>
          <Link href={href(locale, "/vodici")} className="no-underline text-ink hover:text-accent hidden sm:inline-flex items-center gap-1.5">{guides}</Link>
          <Link href={href(locale, "/putokaz")} className="no-underline text-ink hover:text-accent hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">{ROAD_LABELS[locale].nav}</Link>
          <div className="hidden sm:block"><LanguageSwitch locale={locale} path={path} /></div>
          <ThemeToggle toLight={P("Svetla tema", "Light theme", "Светлая тема", "Helles Design")} toDark={P("Tamna tema", "Dark theme", "Тёмная тема", "Dunkles Design")} />
          <NavMenu label={P("Meni", "Menu", "Меню", "Menü")} langLabel={d.language}
            items={[{ href: href(locale, "/pretraga"), label: d.search, from: "lg" }, { href: href(locale, "/vodici"), label: guides, from: "sm" }, { href: href(locale, "/putokaz"), label: ROAD_LABELS[locale].nav, from: "sm" }, { href: href(locale, "/za-strance"), label: d.forForeigners }, { href: href(locale, "/vize"), label: visas }]}
            langs={LOCALES.map((l) => ({ href: href(l, path), code: l, label: LOCALE_LABEL[l], current: l === locale }))} />
        </nav>
      </div>
    </header></>
  );
}

/** Official registers the directory is built from (name as the institution writes it, link to its own site). */
const SOURCES: [string, string][] = [
  ["Uprava za trezor – Evidencija KJS", "https://www.trezor.gov.rs"], ["Republički zavod za statistiku", "https://www.stat.gov.rs"], ["Republički geodetski zavod", "https://www.rgz.gov.rs"],
  ["Narodna banka Srbije", "https://www.nbs.rs"], ["Agencija za privredne registre", "https://www.apr.gov.rs"], ["RFZO", "https://www.rfzo.rs"], ["Ministarstvo unutrašnjih poslova", "http://www.mup.gov.rs"],
  ["Ministarstvo pravde", "https://www.mpravde.gov.rs"], ["Komora javnih izvršitelja", "https://www.komoraizvrsitelja.rs"], ["Javnobeležnička komora Srbije", "https://beleznik.org"],
];

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
            <li><Link href={href(locale, "/putokaz")}>{ROAD_LABELS[locale].nav}</Link></li>
            <li><Link href={href(locale, "/za-strance")}>{d.forForeigners}</Link></li>
            <li><Link href={href(locale, "/vize")}>{pick(locale, "Vize i uslovi ulaska", "Visas and entry rules", "Визы и въезд", "Visa und Einreise")}</Link></li>
            <li><Link href={href(locale, "/partneri")}>{d.becomePartner}</Link></li>
            <li><Link href={href(locale, "/o-sajtu")}>{d.aboutSite}</Link></li>
            <li><Link href={href(locale, "/privatnost")}>{d.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">{L.sources}</div>
          <ul className="footer-sources">{SOURCES.map(([name, url]) => <li key={url}><a href={url} target="_blank" rel="noopener">{name}</a></li>)}</ul>
          <p className="mt-2 text-[12.5px] footer-note">{pick(locale, "I zvanični sajtovi institucija. Granice i lokacije:", "And the institutions' official sites. Boundaries and locations:", "А также официальные сайты учреждений. Границы и координаты:", "Sowie die amtlichen Websites der Einrichtungen. Grenzen und Standorte:")} © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL), geoBoundaries, Geofabrik.</p>
        </div>
      </div>
      <div className="footer-base"><div className="shell py-4 text-[12.5px] flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>© {new Date().getFullYear()} {d.siteName}</span><span>{pick(locale, "Grešku možete prijaviti na svakoj strani.", "You can report an error on any page.", "Сообщить об ошибке можно на любой странице.", "Fehler können Sie auf jeder Seite melden.")}</span>
      </div></div>
    </footer>
  );
}
