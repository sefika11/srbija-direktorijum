import { Fragment } from "react";
import { tx } from "@/lib/content-i18n";
import { catName } from "@/lib/guide-cats";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href, tn, pick } from "@/lib/i18n";
import * as db from "@/lib/db";
import { Breadcrumbs, Chip, VerificationChip, SectionTitle, AdSlot, SponsorCard } from "./ui";
import SearchBox from "./SearchBox";
import SerbiaMap, { type MapLabels } from "./SerbiaMap";
import MapStage from "./MapStage";
import BranchFilters from "./BranchFilters";
import { ROAD_LABELS, ROADMAPS } from "@/lib/roadmaps";
import { RoadTiles, RoadGroupTiles } from "./roadmap";
import { siteLd, siteUrl } from "@/lib/seo";
import TypeFilterBar from "./TypeFilterBar";
import { placesCount } from "@/lib/grammar";
import { OKRUG_SHAPES } from "@/lib/serbia-map";
import { JLS_SHAPES, GO_SHAPES } from "@/lib/serbia-map-jls";
import type { Feature3D } from "./SerbiaMap3D";
import HeroFX from "./HeroFX";
import Opener from "./Opener";
import { Icon, GROUP_ICON } from "./icons";
import Glyph3D from "./Glyph3D";
import EmblemStage from "./EmblemStage";
import DossierDeck from "./DossierDeck";
import { emblemFor } from "@/lib/emblem-map";
import LANDMARKS from "@/lib/landmarks.json";

/** The landmark that stands for a district, city or municipality (lib/landmarks.json, docs/07 §24). */
type Landmark = { key: string; name: string; kind: string };
const landmarkOf = (id: string): Landmark | null => (LANDMARKS as unknown as Record<string, Landmark>)[id] ?? null;
const LM_LABEL: Record<Locale, string> = { sr: "Simbol", en: "Landmark", ru: "Символ", de: "Wahrzeichen" };
function LandmarkHead({ id, fallbackTitle, locale, children }: { id: string; fallbackTitle: string; locale: Locale; children: React.ReactNode }) {
  const lm = landmarkOf(id);
  return (<>
    <div className="hub-head-org is-landmark"><EmblemStage emblem={lm?.key ?? "townhall"} title={lm?.name ?? fallbackTitle} size={400} cls="estage-org estage-landmark" />{children}</div>
    {lm && <p className="landmark-cap"><span>{LM_LABEL[locale]}</span>{lm.name}</p>}
  </>);
}
import { Passport } from "./Passport";
const GROUP_GLYPH: Record<string, string> = { lokalna_samouprava: "townhall", republicki_organi: "parliament", javne_ustanove: "hospital", javna_preduzeca: "utility", pravosudje_i_javna_ovlascenja: "court", privatne_usluge: "briefcase" };
import { LeadForm, CorrectionBlock, ClaimBlock } from "./forms";
import { GUIDE } from "@/lib/guide";

const GROUPS: db.Group[] = ["lokalna_samouprava", "republicki_organi", "javne_ustanove", "javna_preduzeca", "pravosudje_i_javna_ovlascenja", "privatne_usluge"];

export function tuLabel(u: { level: string; jls_kind: string | null; name_lat: string; official_name_lat: string | null }) {
  return u.official_name_lat ?? u.name_lat;
}
/** Type name of an org row: singular Serbian for sr, the translated type name otherwise (falls back to Serbian). */
const rowType = (r: { type_name: string; type_name_en?: string | null; type_name_ru?: string | null; type_name_de?: string | null }, l: Locale) => l === "sr" ? r.type_name : tn({ name_lat: r.type_name, name_en: r.type_name_en, name_ru: r.type_name_ru, name_de: r.type_name_de }, l);
const UNIT_KIND: Record<string, Record<Locale, string>> = {
  sediste: { sr: "Sedište", en: "Head office", ru: "Головной офис", de: "Hauptsitz" }, filijala: { sr: "Filijala", en: "Branch", ru: "Филиал", de: "Filiale" },
  ispostava: { sr: "Ispostava", en: "Sub-office", ru: "Отделение", de: "Außenstelle" }, ekspozitura: { sr: "Ekspozitura", en: "Branch office", ru: "Офис", de: "Zweigstelle" },
  sluzba: { sr: "Služba", en: "Service", ru: "Служба", de: "Dienst" }, odeljenje: { sr: "Odeljenje", en: "Department", ru: "Отдел", de: "Abteilung" },
  odsek: { sr: "Odsek", en: "Section", ru: "Подотдел", de: "Referat" }, stanica: { sr: "Stanica", en: "Station", ru: "Станция", de: "Station" },
  salter_sala: { sr: "Šalter sala", en: "Service hall", ru: "Операционный зал", de: "Schalterhalle" }, sudska_jedinica: { sr: "Sudska jedinica", en: "Court unit", ru: "Судебное подразделение", de: "Gerichtsabteilung" },
  ogranak: { sr: "Ogranak", en: "Branch", ru: "Филиал", de: "Zweigstelle" }, mesna_kancelarija: { sr: "Mesna kancelarija", en: "Local office", ru: "Местный офис", de: "Ortsbüro" },
  punkt: { sr: "Punkt", en: "Service point", ru: "Пункт", de: "Stützpunkt" }, ambulanta: { sr: "Ambulanta", en: "Outpatient clinic", ru: "Амбулатория", de: "Ambulanz" },
  ostalo: { sr: "Ostalo", en: "Other", ru: "Прочее", de: "Sonstige" },
};
const orgHref = (l: Locale, o: { type_slug: string; slug: string }) => href(l, `/${o.type_slug}/${o.slug}`);
const tuHref = (l: Locale, u: { level: string; slug: string }, parentSlug?: string | null) =>
  u.level === "okrug" ? href(l, `/okrug/${u.slug}`) : u.level === "gradska_opstina" && parentSlug ? href(l, `/${parentSlug}/${u.slug}`) : href(l, `/${u.slug}`);

function OrgList({ orgs, locale, dense = false, compact = false, byPlace = false }: { orgs: db.OrgRow[]; locale: Locale; dense?: boolean; compact?: boolean; byPlace?: boolean }) {
  if (!orgs.length) return <p className="text-muted text-[13.5px]">{t(locale).noData}</p>;
  // very large types (thousands of rows): one light line per institution, plain anchors, so the page stays a sane size
  if (compact) return <ul className="org-compact">{orgs.map((o) => <li key={o.id}><a href={orgHref(locale, o)}>{o.name_lat}</a>{o.place_name && <span>{o.place_name}</span>}</li>)}</ul>;
  return (
    <ul className={`grid grid-cols-1 gap-2 ${dense ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
      {orgs.map((o) => (
        <li key={o.id} className="card card-hover spot px-3.5 py-2.5 min-w-0">
          <Link href={orgHref(locale, o)} className="hit no-underline text-ink font-medium text-[14px] leading-snug block hover:text-accent">{o.name_lat}</Link>
          <div className="text-[12px] text-muted mt-0.5 truncate">{o.is_private && <span className="inline-block rounded-full bg-surface-2 px-1.5 py-px text-[10.5px] uppercase tracking-wider font-semibold mr-1.5 align-middle">{locale === "sr" ? "privatno" : locale === "en" ? "private" : locale === "ru" ? "частное" : "privat"}</span>}{byPlace ? (o.place_name ?? o.founder_name ?? rowType(o, locale)) : <>{rowType(o, locale)}{o.place_name && o.place_name !== o.founder_name ? ` · ${o.place_name}` : ""}</>}</div>
          {/* what a visitor came for, without opening the page: the street and a number to tap */}
          {(o.addr || o.phone) && <div className="org-card-contact">{o.addr && <span className="truncate"><Icon.pin /> {o.addr}</span>}{o.phone && <a href={`tel:${o.phone_raw ?? o.phone}`} className="tabular"><Icon.phone /> {o.phone}</a>}</div>}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Home
const L3D: Record<Locale, { open: string; stage: string; hint: string; hintUnits: string }> = {
  sr: { open: "Otvori", stage: "Mapa", hint: "Pređite preko okruga. Klik otvara okrug. Visina = broj institucija.", hintUnits: "Pređite preko opštine. Klik je otvara. Visina = broj institucija." },
  en: { open: "Open", stage: "Map", hint: "Hover a district. Click opens it. Height = number of institutions.", hintUnits: "Hover a municipality. Click opens it. Height = number of institutions." },
  ru: { open: "Открыть", stage: "Карта", hint: "Наведите на округ. Клик открывает его. Высота = число учреждений.", hintUnits: "Наведите на общину. Клик открывает её. Высота = число учреждений." },
  de: { open: "Öffnen", stage: "Karte", hint: "Bezirk überfahren. Klick öffnet ihn. Höhe = Zahl der Einrichtungen.", hintUnits: "Gemeinde überfahren. Klick öffnet sie. Höhe = Zahl der Einrichtungen." },
};
const MAP_LABELS: Record<Locale, MapLabels> = {
  sr: { institutions: "Institucije", municipalities: "Gradovi i opštine", hint: "Pređite preko okruga za podatke. Klik na okrug prikazuje njegove opštine. Zum: točkić miša ili dva prsta.", hintTouch: "Dodirnite okrug za njegove opštine. Zum: dva prsta.",
        hintZoomed: "Klik na opštinu otvara njene institucije. Prevucite za pomeranje.", zoomIn: "Uvećaj", zoomOut: "Umanji", reset: "Cela Srbija",
        back: "Cela Srbija", openOkrug: "Otvori okrug", cityDistricts: "Gradske opštine", cityDistrict: "Gradska opština", openUnit: "Otvori", city: "Grad", municipality: "Opština", serbia: "Srbija", okrug: "Okrug", seat: "Sedište" },
  en: { institutions: "Institutions", municipalities: "Cities and municipalities", hint: "Hover a district for figures. Click a district to show its municipalities. Zoom: scroll or pinch.", hintTouch: "Tap a district for its municipalities. Zoom: pinch.",
        hintZoomed: "Click a municipality to open its institutions. Drag to pan.", zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Whole country",
        back: "Whole country", openOkrug: "Open district", cityDistricts: "City districts", cityDistrict: "City district", openUnit: "Open", city: "City", municipality: "Municipality", serbia: "Serbia", okrug: "District", seat: "Seat" },
  ru: { institutions: "Учреждения", municipalities: "Города и общины", hint: "Наведите на округ для данных. Клик по округу показывает его общины. Масштаб: колесо мыши или два пальца.", hintTouch: "Нажмите на округ, чтобы увидеть его общины. Масштаб: два пальца.",
        hintZoomed: "Клик по общине открывает её учреждения. Перетаскивайте для перемещения.", zoomIn: "Увеличить", zoomOut: "Уменьшить", reset: "Вся Сербия",
        back: "Вся Сербия", openOkrug: "Открыть округ", cityDistricts: "Городские общины", cityDistrict: "Городская община", openUnit: "Открыть", city: "Город", municipality: "Община", serbia: "Сербия", okrug: "Округ", seat: "Центр" },
  de: { institutions: "Einrichtungen", municipalities: "Städte und Gemeinden", hint: "Bezirk überfahren für Zahlen. Klick auf einen Bezirk zeigt seine Gemeinden. Zoom: Scrollen oder Pinch.", hintTouch: "Bezirk antippen für seine Gemeinden. Zoom: zwei Finger.",
        hintZoomed: "Klick auf eine Gemeinde öffnet ihre Einrichtungen. Ziehen zum Verschieben.", zoomIn: "Vergrößern", zoomOut: "Verkleinern", reset: "Ganz Serbien",
        back: "Ganz Serbien", openOkrug: "Bezirk öffnen", cityDistricts: "Stadtbezirke", cityDistrict: "Stadtbezirk", openUnit: "Öffnen", city: "Stadt", municipality: "Gemeinde", serbia: "Serbien", okrug: "Bezirk", seat: "Sitz" },
};

export async function Home({ locale }: { locale: Locale }) {
  const d = t(locale);
  const [okruzi, allJls, types, stats, guides] = await Promise.all([db.getOkruzi(), db.getMapUnits(), db.getOrgTypes(), db.getStats(), db.getGuides()]);
  // a district that is one city (Grad Beograd) opens the city itself, where its municipalities are
  const okrugHref = (o: { slug: string; jls_count: number }) => { const only = o.jls_count === 1 ? allJls.find((j) => j.okrug_slug === o.slug && j.level === "jls") : null; return href(locale, only ? `/${only.slug}` : `/okrug/${o.slug}`); };
  const topGuides = [...guides].sort((a, b) => (a.status === "full" ? 0 : 1) - (b.status === "full" ? 0 : 1) || a.sort_order - b.sort_order).slice(0, 6);
  const mapLabels = MAP_LABELS[locale];
  const QUICK: Record<Locale, { q: string; label: string }[]> = {
    sr: [{ q: "/vodic/licna-karta", label: "Lična karta" }, { q: "/vodic/pasos", label: "Pasoš" }, { q: "/vodic/vozacka-dozvola", label: "Vozačka dozvola" }, { q: "/vodic/zdravstvena-knjizica", label: "Zdravstvena kartica" }, { q: "/vodic/privremeni-boravak-stranci", label: "Boravak za strance" }, { q: "/vize", label: "Vize i ulazak" }],
    en: [{ q: "/vodic/licna-karta", label: "ID card" }, { q: "/vodic/pasos", label: "Passport" }, { q: "/vodic/vozacka-dozvola", label: "Driving licence" }, { q: "/vodic/zdravstvena-knjizica", label: "Health insurance" }, { q: "/vodic/privremeni-boravak-stranci", label: "Residence permit" }, { q: "/vize", label: "Visas and entry" }],
    ru: [{ q: "/vodic/licna-karta", label: "Личная карта" }, { q: "/vodic/pasos", label: "Паспорт" }, { q: "/vodic/vozacka-dozvola", label: "Водительские права" }, { q: "/vodic/zdravstvena-knjizica", label: "Мед. страхование" }, { q: "/vodic/privremeni-boravak-stranci", label: "ВНЖ" }, { q: "/vize", label: "Визы и въезд" }],
    de: [{ q: "/vodic/licna-karta", label: "Personalausweis" }, { q: "/vodic/pasos", label: "Reisepass" }, { q: "/vodic/vozacka-dozvola", label: "Führerschein" }, { q: "/vodic/zdravstvena-knjizica", label: "Krankenversicherung" }, { q: "/vodic/privremeni-boravak-stranci", label: "Aufenthaltstitel" }, { q: "/vize", label: "Visa und Einreise" }],
  };
  const guidesTitle = locale === "sr" ? "Kako se šta rešava" : locale === "en" ? "How things get done" : locale === "ru" ? "Как всё оформить" : "So geht es";
  const guidesLead = locale === "sr" ? "Dokumenta, takse, rokovi i tačno mesto gde idete u vašoj opštini." : locale === "en" ? "Documents, fees, deadlines and the exact office in your municipality." : locale === "ru" ? "Документы, пошлины, сроки и точное место в вашей общине." : "Unterlagen, Gebühren, Fristen und die genaue Stelle in Ihrer Gemeinde.";
  const guidesWord = locale === "sr" ? "vodiča" : locale === "en" ? "guides" : locale === "ru" ? "инструкций" : "Anleitungen";
  const allGuides = locale === "sr" ? "Svi vodiči" : locale === "en" ? "All guides" : locale === "ru" ? "Все инструкции" : "Alle Anleitungen";
  const typesLabel = locale === "sr" ? "vrsta institucija" : locale === "en" ? "institution types" : locale === "ru" ? "типов учреждений" : "Einrichtungsarten";
  const mapTitle = locale === "sr" ? "25 okruga, 145 gradova i opština" : locale === "en" ? "25 districts, 145 cities and municipalities" : locale === "ru" ? "25 округов, 145 городов и общин" : "25 Bezirke, 145 Städte und Gemeinden";
  const locWord = pick(locale, "lokacija", "locations", "адресов", "Standorte");
  const locLabelLong = pick(locale, "lokacija javnih i privatnih institucija", "locations of public and private institutions", "адресов государственных и частных учреждений", "Standorte öffentlicher und privater Einrichtungen");
  const popular = locale === "sr" ? "Najčešće traženo" : locale === "en" ? "Most searched" : locale === "ru" ? "Часто ищут" : "Häufig gesucht";
  const byGroupAll = GROUPS.map((g) => ({ g, types: types.filter((x) => x.group === g && x.org_count > 0), total: types.filter((x) => x.group === g).reduce((n, x) => n + x.org_count, 0) }));
  const maxGroup = Math.max(1, ...byGroupAll.map((x) => x.total));
  const T = {
    sr: { open: "Otvori", browse: "Istražite", bySituation: "Po životnoj situaciji" },
    en: { open: "Open", browse: "Explore", bySituation: "By life situation" },
    ru: { open: "Открыть", browse: "Смотреть", bySituation: "По жизненной ситуации" },
    de: { open: "Öffnen", browse: "Entdecken", bySituation: "Nach Lebenslage" },
  }[locale];
  return (
    <main id="main">
      {siteLd(locale, d.tagline).map((x, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }} />)}
      <Opener words={d.siteName.split(" ")} eyebrow={`${pick(locale, "Republika Srbija", "Republic of Serbia", "Республика Сербия", "Republik Serbien")} · ${new Date().getFullYear()}`} count={stats.locations} countLabel={locLabelLong} />
      <HeroFX />
      {/* Opening: the search and the 3D map are the centrepiece */}
      <section className="hero-open hero-map border-b border-line">
        <div className="shell pt-6 sm:pt-7 text-center" data-reveal>
          <div className="eyebrow justify-center mb-3">{pick(locale, "Republika Srbija", "Republic of Serbia", "Республика Сербия", "Republik Serbien")} · {d.siteName}</div>
          <h1 className="display text-[28px] sm:text-[36px] xl:text-[42px] mx-auto max-w-[26ch]" aria-label={`${d.tagline.split(":")[0]}.`}>{`${d.tagline.split(":")[0]}.`.split(" ").map((w, i, arr) => <Fragment key={i}><span className="w" aria-hidden><span className="i" style={{ "--i": i } as React.CSSProperties}>{w}</span></span>{i < arr.length - 1 ? " " : ""}</Fragment>)}</h1>
          <p className="lede text-muted mt-3 mx-auto max-w-[54ch]">{d.tagline.includes(":") ? d.tagline.split(":")[1].trim().replace(/^./, (c) => c.toUpperCase()) : ""}</p>
        </div>
        <div className="shell mt-6 sm:mt-7 pb-10 sm:pb-14" data-reveal style={{ "--d": "120ms" } as React.CSSProperties}>
          <div className="hero-stage">
            <div className="hero-search">
              <SearchBox locale={locale} large placeholder={d.searchPlaceholder} submitLabel={d.search} />
              <div className="hero-popular text-[13px]">
                <span className="text-muted mr-1">{popular}:</span>
                {QUICK[locale].map((x) => <Link key={x.q} href={href(locale, x.q)} className="quick-chip">{x.label}</Link>)}
              </div>
            </div>
            <MapStage locale={locale} labels={L3D[locale]} hint={L3D[locale].hint} cls="is-hero" padTop={64} padBottom={22}
                      features={OKRUG_SHAPES.flatMap((s) => { const o = okruzi.find((x) => x.slug === s.slug); return o ? [{ key: s.slug, d: s.d, cx: s.cx, cy: s.cy, bbox: s.bbox, name: o.name_lat, sub: o.seat_name_lat ?? undefined, label: o.seat_name_lat ?? o.name_lat, count: o.org_count, href: okrugHref(o),
                        stats: [{ v: o.org_count.toLocaleString(locale === "sr" ? "sr-Latn" : locale), l: d.institutions }, { v: `${o.jls_count}${o.go_count ? ` + ${o.go_count}` : ""}`, l: d.municipalities }] } satisfies Feature3D] : []; })}
                      fallback={<SerbiaMap key="map-2d" okruzi={okruzi.map((o) => ({ slug: o.slug, name_lat: o.name_lat, seat_name_lat: o.seat_name_lat, jls_count: o.jls_count, go_count: o.go_count, org_count: o.org_count }))}
                                           jls={allJls.map((j) => ({ slug: j.slug, name_lat: j.name_lat, okrug_slug: j.okrug_slug, org_count: j.org_count, jls_kind: j.jls_kind, level: j.level, parent_slug: j.parent_slug }))}
                                           locale={locale} labels={mapLabels} variant="light" height="hero" />} />
          </div>
          {/* index tabs: the three areas below hang off the map; each tab opens its dossier */}
          <nav className="hero-index" aria-label={T.browse}>
            {[{ id: "vodici", n: guides.length, l: guidesWord, t: guidesTitle }, { id: "putokaz", n: ROADMAPS.length, l: ROAD_LABELS[locale].count, t: T.bySituation }, { id: "vrste", n: stats.locations, l: locWord, t: d.browseByCategory }, { id: "okruzi", n: stats.jls, l: d.municipalities, t: d.browseByRegion }].map((x, i) => (
              <a key={x.id} href={`#${x.id}`} className="hero-index-card" style={{ "--i": i } as React.CSSProperties}>
                <span className="tab" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <span className="num" data-count={x.n}>{x.n.toLocaleString(locale === "sr" ? "sr-Latn" : locale)}</span>
                <span className="lbl">{x.l}</span>
                <span className="ttl">{x.t} <span aria-hidden>↓</span></span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Below the map: the three areas are one deck of index cards; changing card is a rotation, not a scroll */}
      <div className="shell deck-shell">
        <DossierDeck
          tabs={[...(topGuides.length ? [{ id: "vodici", label: pick(locale, "Vodiči", "Guides", "Инструкции", "Anleitungen") }] : []), { id: "putokaz", label: ROAD_LABELS[locale].nav }, { id: "vrste", label: pick(locale, "Vrste institucija", "Institution types", "Типы учреждений", "Einrichtungsarten") }, { id: "okruzi", label: pick(locale, "Okruzi i gradovi", "Districts and cities", "Округа и города", "Bezirke und Städte") }]}
          labels={{ prev: locale === "sr" ? "Prethodna kartica" : locale === "en" ? "Previous card" : locale === "ru" ? "Предыдущая карточка" : "Vorherige Karte", next: locale === "sr" ? "Sledeća kartica" : locale === "en" ? "Next card" : locale === "ru" ? "Следующая карточка" : "Nächste Karte",
                    hint: locale === "sr" ? "Prevucite karticu ili koristite strelice" : locale === "en" ? "Drag the card or use the arrows" : locale === "ru" ? "Потяните карточку или используйте стрелки" : "Karte ziehen oder Pfeile benutzen", region: T.browse }}>
          {[
            ...(topGuides.length ? [
              <div key="vodici" className="band tex-tweed dossier">
                <div className="section-head">
                  <div><h2 className="display-sm">{guidesLead}</h2></div>
                  <Link href={href(locale, "/vodici")} className="quick-chip">{allGuides} →</Link>
                </div>
                <div className="rail">
                  {topGuides.map((g, i) => { const c = g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}; return (
                    <Link key={g.id} href={href(locale, `/vodic/${g.slug}`)} className="guide-card fold spot no-underline text-ink">
                      <span className="num tab" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                      <div className="eyebrow">{catName(g, locale)}</div>
                      <div className="font-serif text-[22px] font-semibold leading-[1.15] mt-3 pr-14 tracking-[-0.01em]">{c.title ?? g.name_lat}</div>
                      <p className="text-muted text-[13.5px] mt-2 flex-1 leading-relaxed">{c.summary ?? g.summary}</p>
                      <div className="mt-4 flex items-center justify-between text-[12.5px]">
                        {g.status === "full" ? <span className="text-muted">✓ {locale === "sr" ? "Provereno" : locale === "en" ? "Verified" : locale === "ru" ? "Проверено" : "Geprüft"} {g.checked_at}</span> : <span className="text-muted">{locale === "sr" ? "kratki vodič" : locale === "en" ? "short guide" : locale === "ru" ? "кратко" : "Kurzfassung"}</span>}
                        <span className="text-accent font-medium">{T.open} →</span>
                      </div>
                    </Link>); })}
                </div>
              </div>] : []),
            <div key="putokaz" className="band tex-tweed dossier">
              <div className="section-head">
                <div><h2 className="display-sm">{ROAD_LABELS[locale].title}</h2><p className="text-muted mt-2 text-[14.5px] max-w-[60ch]">{ROAD_LABELS[locale].lead}</p></div>
                <Link href={href(locale, "/putokaz")} className="quick-chip">{ROAD_LABELS[locale].nav} →</Link>
              </div>
              <RoadGroupTiles locale={locale} />
            </div>,
            <div key="vrste" className="band tex-mesh dossier">
              <div className="section-head">
                <div><h2 className="display-sm">{stats.orgs.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {d.institutions}, {stats.locations.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {locWord}</h2><p className="text-muted mt-2 text-[14.5px]">{stats.types} {typesLabel}. {pick(locale, "Lokacija je svako mesto na koje možete otići: sedište, filijala, ispostava, vrtić, područna škola.", "A location is every place you can go to: a seat, a branch, an office, a kindergarten, a branch school.", "Адрес: любое место, куда можно прийти: главный офис, филиал, отделение, детский сад, филиал школы.", "Ein Standort ist jeder Ort, den Sie aufsuchen können: Sitz, Filiale, Außenstelle, Kindergarten, Zweigschule.")}</p></div>
              </div>
              <div className="bento">
                {byGroupAll.filter((x) => x.total > 0).map(({ g, types: ts, total }, i) => { return (
                  <div key={g} className="bento-card spot">
                    <div className="flex items-start justify-between gap-3">
                      <span className="glyph-wrap"><Glyph3D icon={GROUP_GLYPH[g]} size={104} /></span>
                      <div className="big">{total.toLocaleString(locale === "sr" ? "sr-Latn" : locale)}</div>
                    </div>
                    <h3 className="font-semibold text-[16px] mt-4">{d.groups[g]}</h3>
                    <div className="bar"><i style={{ "--w": (total / maxGroup).toFixed(3) } as React.CSSProperties} /></div>
                    <ul className="text-[13.5px] grid gap-1.5 mt-4">
                      {ts.slice(0, i < 2 ? 6 : 4).map((x) => <li key={x.id} className="flex justify-between gap-3"><Link href={href(locale, `/${x.slug}`)} className="no-underline text-ink hover:text-accent truncate">{tn(x, locale)}</Link>{!x.national_network && <span className="text-muted tabular shrink-0">{x.org_count.toLocaleString(locale === "sr" ? "sr-Latn" : locale)}</span>}</li>)}
                    </ul>
                  </div>); })}
              </div>
            </div>,
            <div key="okruzi" className="band tex-nylon dossier">
              <div className="section-head">
                <div><h2 className="display-sm">{mapTitle}</h2></div>
              </div>
              <ul className="okrug-tiles">
                {okruzi.map((o) => <li key={o.id}><Link href={okrugHref(o)} className="okrug-tile plinth"><span>{o.name_lat}</span><span className="n tabular">{o.org_count}</span></Link></li>)}
              </ul>
            </div>,
          ]}
        </DossierDeck>
      </div>

    </main>
  );
}

// ---------------------------------------------------------------- Featured placements (paid, labelled, never above the reader's answer)
function FeaturedRail({ locale, rows }: { locale: Locale; rows: db.FeaturedRow[] }) {
  const d = t(locale);
  return (
    <ul className="featured-rail" aria-label={d.sponsor}>
      {rows.map((f) => (
        <li key={f.id} className="card featured-card spot">
          <div className="flex items-center justify-between gap-3"><span className="eyebrow plain">{rowType(f, locale)}{f.place_name ? ` · ${f.place_name}` : ""}</span><span className="featured-tag">{d.sponsor}</span></div>
          <Link href={href(locale, `/${f.type_slug}/${f.org_slug}`)} className="font-serif text-[19px] font-semibold no-underline text-ink hover:text-accent mt-1 block">{f.org_name}</Link>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {f.phone && <a href={`tel:${f.phone.replace(/[^+\d]/g, "")}`} className="vital-tel">{f.phone}</a>}
            {f.website && <a href={f.website} rel="noopener sponsored" target="_blank" className="text-muted">{f.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Vital services block (municipality page)
const VITAL_L: Record<Locale, { title: string; emergency: string; faults: string; admin: string; health: string; social: string; children: string; police: string; call: string; water: string; power: string; heat: string; gas: string; waste: string; parking: string; fire: string; ambulance: string; amss: string; tax: string; registry: string; hall: string; dz: string; hospital: string; csr: string; nsz: string; os: string; ss: string; pu: string; apoteke: string; none: string }> = {
  sr: { title: "Vitalno za ovu opštinu", emergency: "Hitni brojevi", faults: "Kvarovi i komunalno", admin: "Uprava i porez", health: "Zdravlje", social: "Socijalno i posao", children: "Deca i škole", police: "Policija", call: "Pozovi", water: "Vodovod", power: "Struja", heat: "Grejanje", gas: "Gas", waste: "Čistoća", parking: "Parking", fire: "Vatrogasci", ambulance: "Hitna pomoć", amss: "AMSS – pomoć na putu", tax: "Lokalna poreska administracija", registry: "Matičar", hall: "Opštinska uprava", dz: "Dom zdravlja", hospital: "Bolnica", csr: "Centar za socijalni rad", nsz: "Nacionalna služba za zapošljavanje", os: "osnovnih škola", ss: "srednjih škola", pu: "vrtića", apoteke: "apoteka", none: "broj još nije unet" },
  en: { title: "Vital for this municipality", emergency: "Emergency numbers", faults: "Faults and utilities", admin: "Administration and tax", health: "Health", social: "Social and work", children: "Children and schools", police: "Police", call: "Call", water: "Water", power: "Power", heat: "Heating", gas: "Gas", waste: "Waste", parking: "Parking", fire: "Fire brigade", ambulance: "Ambulance", amss: "AMSS roadside", tax: "Local tax office", registry: "Registrar", hall: "Municipal administration", dz: "Health centre", hospital: "Hospital", csr: "Social work centre", nsz: "Employment service", os: "primary schools", ss: "secondary schools", pu: "kindergartens", apoteke: "pharmacies", none: "number not yet listed" },
  ru: { title: "Главное для этой общины", emergency: "Экстренные номера", faults: "Аварии и коммунальные службы", admin: "Администрация и налоги", health: "Здоровье", social: "Социальная помощь и работа", children: "Дети и школы", police: "Полиция", call: "Позвонить", water: "Водоканал", power: "Электричество", heat: "Отопление", gas: "Газ", waste: "Уборка", parking: "Парковка", fire: "Пожарные", ambulance: "Скорая помощь", amss: "AMSS, помощь на дороге", tax: "Местная налоговая", registry: "ЗАГС", hall: "Администрация общины", dz: "Дом здоровья", hospital: "Больница", csr: "Центр соцработы", nsz: "Служба занятости", os: "начальных школ", ss: "средних школ", pu: "детских садов", apoteke: "аптек", none: "номер ещё не внесён" },
  de: { title: "Wichtig für diese Gemeinde", emergency: "Notrufnummern", faults: "Störungen und Versorgung", admin: "Verwaltung und Steuern", health: "Gesundheit", social: "Soziales und Arbeit", children: "Kinder und Schulen", police: "Polizei", call: "Anrufen", water: "Wasser", power: "Strom", heat: "Heizung", gas: "Gas", waste: "Abfall", parking: "Parken", fire: "Feuerwehr", ambulance: "Rettungsdienst", amss: "AMSS Pannenhilfe", tax: "Lokale Steuerverwaltung", registry: "Standesamt", hall: "Gemeindeverwaltung", dz: "Gesundheitszentrum", hospital: "Krankenhaus", csr: "Sozialzentrum", nsz: "Arbeitsamt", os: "Grundschulen", ss: "Mittelschulen", pu: "Kindergärten", apoteke: "Apotheken", none: "Nummer noch nicht erfasst" },
};
function VitalBlock({ locale, vital, police, counts, place }: { locale: Locale; vital: db.VitalRow[]; police: { slug: string; unit_name_lat: string; org_slug: string }[]; counts: { os: number; ss: number; pu: number; apoteke: number }; place: string }) {
  const L = VITAL_L[locale];
  const pick = (...slugs: string[]) => vital.filter((v) => slugs.includes(v.type_slug));
  const Row = ({ label, rows }: { label: string; rows: { name: string; phone: string | null; phone_display: string | null; href: string }[] }) => rows.length === 0 ? null : (
    <li className="vital-row">
      <span className="vital-lbl">{label}</span>
      <span className="vital-vals">{rows.slice(0, 3).map((r) => (
        <span key={r.href} className="vital-val">
          <Link href={r.href} className="no-underline text-ink hover:text-accent">{r.name}</Link>
          {r.phone ? <a href={`tel:${r.phone}`} className="vital-tel">{r.phone_display ?? r.phone}</a> : <span className="text-muted text-[12px]">{L.none}</span>}
        </span>))}
      </span>
    </li>);
  // drop the legal-form prefix only when a proper name follows it ("JKP Vodovod" → "Vodovod", but "Javno preduzeće za upravljanje…" stays whole)
  const shortName = (n: string) => { const m = n.replace(/^(Javno komunalno preduzeće|Javno preduzeće|JKP|JP)\s+/i, ""); return /^(za|u|na)\s/i.test(m) || m.length < 4 ? n : m.replace(/^["„“]|["“”]$/g, ""); };
  const org = (v: db.VitalRow) => ({ name: shortName(v.name_lat), phone: v.phone, phone_display: v.phone_display, href: href(locale, `/${v.type_slug}/${v.slug}`) });
  const groups: { title: string; rows: { label: string; rows: ReturnType<typeof org>[] }[] }[] = [
    { title: L.faults, rows: [{ label: L.water, rows: pick("jkp-vodovod").map(org) }, { label: L.power, rows: pick("eps-distribucija").map(org) }, { label: L.heat, rows: pick("jkp-toplana").map(org) }, { label: L.gas, rows: pick("jkp-gas").map(org) }, { label: L.waste, rows: pick("jkp-cistoca").map(org) }, { label: L.parking, rows: pick("jkp-parking-servis").map(org) }] },
    { title: L.admin, rows: [{ label: L.hall, rows: (pick("opstinska-uprava", "gradska-uprava").filter((v) => !/poresk/i.test(v.name_lat)).length ? pick("opstinska-uprava", "gradska-uprava") : pick("uprava-gradske-opstine")).filter((v) => !/poresk/i.test(v.name_lat)).map(org) }, { label: L.tax, rows: [...pick("lokalna-poreska-administracija"), ...pick("gradska-uprava", "opstinska-uprava").filter((v) => /poresk/i.test(v.name_lat))].map(org) }, { label: L.registry, rows: pick("maticna-sluzba").map(org) }] },
    { title: L.health, rows: [{ label: L.dz, rows: pick("dom-zdravlja").map(org) }, { label: L.hospital, rows: pick("opsta-bolnica").map(org) }] },
    { title: L.social, rows: [{ label: L.csr, rows: pick("centar-za-socijalni-rad").map(org) }, { label: L.nsz, rows: pick("nsz").map(org) }] },
  ];
  const policeRows = police.slice(0, 3).map((p) => ({ name: p.unit_name_lat, phone: null as string | null, phone_display: null as string | null, href: href(locale, `/mup-policijska-uprava/${p.org_slug}/${p.slug}`) }));
  const kids = ([[counts.os, L.os, "osnovna-skola"], [counts.ss, L.ss, "srednja-skola"], [counts.pu, L.pu, "predskolska-ustanova"], [counts.apoteke, L.apoteke, "apoteka"]] as [number, string, string][]).filter(([n]) => n > 0);
  return (
    <section className="vital card" aria-labelledby="vital-h" data-reveal data-fx="flip">
      <div className="vital-head"><div className="eyebrow">{L.title}</div><div className="vital-emergency" id="vital-h"><span className="eyebrow plain">{L.emergency}</span>{[["192", L.police], ["193", L.fire], ["194", L.ambulance], ["1987", L.amss]].map(([n, l]) => <a key={n} href={`tel:${n}`} className="vital-num"><b>{n}</b><span>{l}</span></a>)}</div></div>
      <div className="vital-grid">
        {groups.map((g) => g.rows.some((r) => r.rows.length) && <div key={g.title} className="vital-col"><div className="vital-title">{g.title}</div><ul>{g.rows.map((r) => <Row key={r.label} label={r.label} rows={r.rows} />)}</ul></div>)}
        {policeRows.length > 0 && <div className="vital-col"><div className="vital-title">{L.police}</div><ul><Row label="" rows={policeRows} /></ul></div>}
        {kids.length > 0 && <div className="vital-col"><div className="vital-title">{L.children}</div><ul className="vital-kids">{kids.map(([n, l, sl]) => <li key={sl}><a href={`${href(locale, `/${sl}`)}?mesto=${place}#lista`} className="no-underline text-ink hover:text-accent"><b className="tabular">{n}</b> {l} →</a></li>)}</ul></div>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Okrug hub
export async function OkrugHub({ locale, okrug }: { locale: Locale; okrug: db.TU }) {
  const d = t(locale);
  const [jls, okrugTotal] = await Promise.all([db.getJlsInOkrug(okrug.id), db.countOrgsInUnit(okrug.path)]);
  return (
    <main id="main">
      <HeroFX />
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { label: okrug.name_lat }]} />
          <div className="eyebrow mt-4">{d.okrug}</div>
          <LandmarkHead id={`okrug/${okrug.slug}`} fallbackTitle={d.okrug} locale={locale}><h1 className="display-sm text-[34px] sm:text-[44px]">{okrug.official_name_lat ?? okrug.name_lat}</h1></LandmarkHead>
          <p className="text-muted mt-3 tabular lede">{okrug.seat_name_lat ? `${d.seat}: ${okrug.seat_name_lat} · ` : ""}{jls.length} {d.municipalities} · {okrugTotal.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {d.institutions}</p>
          <div className="mt-5"><SearchBox locale={locale} large placeholder="" submitLabel={d.search} scope={{ slug: okrug.slug, label: okrug.name_lat }} /></div>
        </div>
        <MapStage locale={locale} labels={L3D[locale]} hint={L3D[locale].hintUnits} cls="is-hub"
                  features={JLS_SHAPES.filter((s) => s.okrug === okrug.slug).flatMap((s) => { const j = jls.find((x) => x.slug === s.slug); return j ? [{ key: s.slug, d: s.d, cx: s.cx, cy: s.cy, bbox: s.bbox, name: j.name_lat, sub: j.jls_kind === "grad" ? d.city : d.municipality, count: j.org_count, href: href(locale, `/${j.slug}`), stats: [{ v: j.org_count.toLocaleString(locale === "sr" ? "sr-Latn" : locale), l: d.institutions }] } satisfies Feature3D] : []; })}
                  context={OKRUG_SHAPES.filter((s) => s.slug !== okrug.slug).map((s) => ({ key: s.slug, d: s.d }))}
                  fit={OKRUG_SHAPES.find((s) => s.slug === okrug.slug)?.bbox} />
      </div></section>
      <div className="shell py-6">
      <AdSlot locale={locale} code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {jls.map((j, i) => (
          <li key={j.id} className="card card-hover spot plinth p-5" data-reveal data-fx={i % 2 ? "wing-r" : "wing-l"} style={{ "--d": `${(i % 6) * 60}ms` } as React.CSSProperties}>
            <div className="lm-card">
              <div className="min-w-0">
                <div className="eyebrow">{j.jls_kind === "grad" ? d.city : d.municipality}{j.okrug_seat ? ` · ${pick(locale, "sedište okruga", "district seat", "центр округа", "Bezirkssitz")}` : ""}</div>
                <Link href={href(locale, `/${j.slug}`)} className="hit font-serif text-[20px] font-semibold no-underline text-ink hover:text-accent">{j.name_lat}</Link>
                <div className="text-[13px] text-muted mt-1.5 tabular">{j.org_count} {d.institutions}</div>
                {landmarkOf(j.slug) && <div className="lm-card-name">{landmarkOf(j.slug)!.name}</div>}
              </div>
              {landmarkOf(j.slug) && <Glyph3D icon={landmarkOf(j.slug)!.key} size={96} className="lm-card-img" />}
            </div>
          </li>
        ))}
      </ul>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- JLS / GO hub
export async function UnitHub({ locale, unit, parent }: { locale: Locale; unit: db.TU; parent: db.TU | null }) {
  const d = t(locale);
  const VITAL_TYPES = ["opstinska-uprava", "gradska-uprava", "uprava-gradske-opstine", "lokalna-poreska-administracija", "maticna-sluzba", "dom-zdravlja", "opsta-bolnica", "jkp-vodovod", "eps-distribucija", "jkp-toplana", "jkp-gas", "jkp-cistoca", "jkp-parking-servis", "centar-za-socijalni-rad", "nsz"];
  // Big cities hold thousands of institutions: the page shows every type that is small here in full and one tile per
  // large type (with its count) that opens the filtered, paged list. Nothing is listed by the thousand.
  const PER_TYPE = 12;
  const [orgs, unitTotal, gos, ancestors, types, vital, allGuides] = await Promise.all([db.getOrgsInUnitTop(unit.path, PER_TYPE), db.countOrgsInUnit(unit.path), unit.level === "jls" ? db.getChildrenGO(unit.id) : Promise.resolve([]), db.getAncestors(unit.path), db.getOrgTypes(), db.getVitalForUnit(unit.path, VITAL_TYPES), db.getGuides().catch(() => [] as db.GuideRow[])]);
  const hubGuides = allGuides.filter((g) => g.status === "full").slice(0, 7);
  const typeN = new Map<string, number>(); for (const o of orgs) typeN.set(o.type_slug, o.type_n);
  const typeBy = new Map(types.map((x) => [x.slug, x]));
  const placeParam = unit.level === "gradska_opstina" && parent ? `${parent.slug}/${unit.slug}` : unit.slug;
  const okrugAll = ancestors.find((a) => a.level === "okrug");
  const okrug = okrugAll && /^Grad\s/.test(okrugAll.name_lat) ? undefined : okrugAll; // a one-city district (Grad Beograd) is the city itself: no separate step
  const national = types.filter((x) => x.national_network);
  const serving = await Promise.all(national.map((x) => db.getServingLocations(unit.level === "jls" ? unit.id : (parent?.id ?? unit.id), x.slug).then((r) => ({ type: x, rows: r }))));
  const path = unit.level === "gradska_opstina" && parent ? `/${parent.slug}/${unit.slug}` : `/${unit.slug}`;
  return (
    <main id="main">
      <HeroFX />
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
      <div>
      <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, ...(okrug ? [{ href: href(locale, `/okrug/${okrug.slug}`), label: okrug.name_lat }] : []), ...(parent ? [{ href: href(locale, `/${parent.slug}`), label: parent.name_lat }] : []), { label: unit.name_lat }]} />
      <div className="eyebrow mt-4">{unit.level === "gradska_opstina" ? d.gradskaOpstina : unit.jls_kind === "grad" ? d.city : d.municipality}{okrug && unit.level === "jls" ? ` · ${okrug.name_lat}` : ""}</div>
      <LandmarkHead id={unit.level === "gradska_opstina" && parent ? `${parent.slug}/${unit.slug}` : unit.slug} fallbackTitle={unit.level === "gradska_opstina" ? d.gradskaOpstina : unit.jls_kind === "grad" ? d.city : d.municipality} locale={locale}><h1 className="display-sm text-[34px] sm:text-[44px]">{tuLabel(unit)}</h1></LandmarkHead>
      <p className="text-muted mt-3 tabular lede">{unitTotal.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {d.institutions}{unit.website ? <> · <a href={unit.website} rel="noopener">{d.website} ↗</a></> : null}</p>
      <div className="mt-5"><SearchBox locale={locale} large placeholder="" submitLabel={d.search} scope={{ slug: unit.slug, label: unit.name_lat }} /></div>
      </div>
      {(() => {
        const citySlug = unit.level === "gradska_opstina" && parent ? parent.slug : unit.slug;
        const unitShape = JLS_SHAPES.find((s) => s.slug === citySlug);
        if (!unitShape) return null;
        const goShapes = GO_SHAPES.filter((g) => g.parent === citySlug);
        const goBy = Object.fromEntries(gos.map((g) => [g.slug, g]));
        const feats: Feature3D[] = goShapes.length && gos.length
          ? goShapes.flatMap((g) => { const row = goBy[g.slug]; return row ? [{ key: `${citySlug}/${g.slug}`, d: g.d, cx: g.cx, cy: g.cy, bbox: g.bbox, name: row.name_lat, sub: d.gradskaOpstina, count: row.org_count, href: href(locale, `/${citySlug}/${g.slug}`), stats: [{ v: row.org_count.toLocaleString(locale === "sr" ? "sr-Latn" : locale), l: d.institutions }] }] : []; })
          : [{ key: unitShape.slug, d: unitShape.d, cx: unitShape.cx, cy: unitShape.cy, bbox: unitShape.bbox, name: unit.level === "gradska_opstina" && parent ? parent.name_lat : unit.name_lat, sub: unit.jls_kind === "grad" ? d.city : d.municipality, count: unitTotal, href: href(locale, `/${citySlug}`), stats: [{ v: unitTotal.toLocaleString(locale === "sr" ? "sr-Latn" : locale), l: d.institutions }] }];
        const ctx = JLS_SHAPES.filter((s) => s.okrug === unitShape.okrug && s.slug !== citySlug).map((s) => ({ key: s.slug, d: s.d }));
        const b = unitShape.bbox; const padx = (b[2] - b[0]) * .35, pady = (b[3] - b[1]) * .35;
        return <MapStage locale={locale} labels={{ ...L3D[locale], hint: L3D[locale].hintUnits }} cls="is-hub" features={feats} context={ctx} fit={[b[0] - padx, b[1] - pady, b[2] + padx, b[3] + pady]} />;
      })()}
      </div></section>
      <div className="shell py-6">
      <VitalBlock locale={locale} vital={vital} police={serving.find((s) => s.type.slug === "mup-policijska-uprava")?.rows ?? []} counts={{ os: typeN.get("osnovna-skola") ?? 0, ss: typeN.get("srednja-skola") ?? 0, pu: typeN.get("predskolska-ustanova") ?? 0, apoteke: typeN.get("apoteka") ?? 0 }} place={placeParam} />
      <AdSlot locale={locale} code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div>
          {gos.length > 0 && (
            <section className="mb-8" data-reveal data-fx="flip">
              <SectionTitle>{d.gradskeOpstine}</SectionTitle>
              <ul className="lm-go-grid">{gos.map((g) => { const lm = landmarkOf(`${unit.slug}/${g.slug}`); return (
                <li key={g.id}><Link href={href(locale, `/${unit.slug}/${g.slug}`)} className="lm-go card card-hover no-underline text-ink">
                  {lm && <Glyph3D icon={lm.key} size={64} className="lm-go-img" />}
                  <span className="min-w-0"><span className="lm-go-name">{g.name_lat}</span><span className="lm-go-sub">{lm ? lm.name : ""}</span></span>
                  <span className="lm-go-n tabular">{g.org_count}</span>
                </Link></li>); })}</ul>
            </section>
          )}
          {GROUPS.map((g, i) => {
            const inGroup = orgs.filter((o) => o.group === g);
            if (!inGroup.length && g !== "republicki_organi") return null;
            const slugs = [...new Set(inGroup.map((o) => o.type_slug))].sort((a, b) => (typeBy.get(a)?.sort_order ?? 999) - (typeBy.get(b)?.sort_order ?? 999));
            const groupTotal = slugs.reduce((n, sl) => n + (typeN.get(sl) ?? 0), 0);
            const bigTypes = slugs.filter((sl) => (typeN.get(sl) ?? 0) > PER_TYPE);
            const small = inGroup.filter((o) => o.type_n <= PER_TYPE).sort((a, b) => (typeBy.get(a.type_slug)?.sort_order ?? 999) - (typeBy.get(b.type_slug)?.sort_order ?? 999) || a.name_lat.localeCompare(b.name_lat, "sr-Latn"));
            const list = { length: groupTotal };
            const mz = g === "lokalna_samouprava" ? small.filter((o) => o.type_slug === "mesna-zajednica") : [];
            const main = g === "lokalna_samouprava" ? small.filter((o) => o.type_slug !== "mesna-zajednica") : small;
            return (
              <section key={g} className="mb-8" data-reveal data-fx="flip">
                <SectionTitle id={g}><span className="inline-flex items-center gap-2.5"><Glyph3D icon={GROUP_GLYPH[g]} size={34} /> {d.groups[g]} {(g === "republicki_organi" ? list.length + serving.length : list.length) > 0 && <span className="text-muted font-normal text-[14px] tabular">{g === "republicki_organi" ? list.length + serving.length : list.length}</span>}</span></SectionTitle>
                {g === "republicki_organi" && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {serving.map(({ type, rows }) => (
                      <li key={type.id} className="card card-hover px-3.5 py-2.5 min-w-0 [overflow-wrap:anywhere]">
                        <Link href={href(locale, `/${type.slug}`)} className="font-medium text-[14px] no-underline text-ink hover:text-accent">{tn(type, locale)}</Link>
                        <div className="text-[12.5px] text-muted mt-0.5">
                          {rows.length ? rows.map((r, k) => <span key={r.id}>{k > 0 && ", "}<Link href={href(locale, `/${type.slug}/${r.org_slug}/${r.slug}`)}>{/^sedi[sš]te$/i.test(r.unit_name_lat.trim()) ? (r.tu_name || type.name_lat) : r.unit_name_lat}</Link></span>) : <span>{d.noData}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {main.length > 0 && <OrgList orgs={main} locale={locale} />}
                {bigTypes.length > 0 && (
                  <ul className={`type-tiles ${main.length ? "mt-3" : ""}`}>
                    {bigTypes.map((sl) => { const ty = typeBy.get(sl); const n = typeN.get(sl) ?? 0; return (
                      <li key={sl}><a href={`${href(locale, `/${sl}`)}?mesto=${placeParam}#lista`} className="type-tile card card-hover no-underline text-ink">
                        <Glyph3D icon={emblemFor(sl, ty?.icon)} size={44} className="type-tile-img" />
                        <span className="min-w-0"><span className="type-tile-name">{ty ? tn(ty, locale) : sl}</span></span>
                        <span className="type-tile-n tabular">{n.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} →</span>
                      </a></li>); })}
                  </ul>
                )}
                {mz.length > 0 && (
                  <details className="mt-3 card p-3.5"><summary className="cursor-pointer font-medium text-[14px]">{pick(locale, "Mesne zajednice", "Local communities", "Местные общины", "Ortsgemeinschaften")} <span className="text-muted tabular font-normal">({mz.length})</span></summary>
                    <ul className="mt-3 columns-2 sm:columns-3 gap-4 text-[13px]">{mz.map((o) => <li key={o.id} className="break-inside-avoid"><Link href={orgHref(locale, o)}>{o.name_lat.replace(/^Mesna zajednica\s+/i, "")}</Link></li>)}</ul></details>
                )}
                {i === 1 && <AdSlot locale={locale} code="jls_inline_1" w={336} h={280} label={d.ad} />}
              </section>
            );
          })}
        </div>
        <aside className="lg:sticky lg:top-20 grid gap-5">
          <SponsorCard locale={locale} label={d.sponsor} sponsor={null} compact />
          {hubGuides.length > 0 && <div className="card p-4"><GuideLinks locale={locale} guides={hubGuides} jlsSlug={unit.level === "gradska_opstina" && parent ? parent.slug : unit.slug} stacked /><Link href={href(locale, "/putokaz")} className="inline-block mt-3 text-[13.5px] font-medium">{ROAD_LABELS[locale].nav} →</Link></div>}
          {(okrug || (unit.seat_name_lat && unit.level === "jls" && unit.seat_name_lat !== unit.name_lat)) && <div className="card p-4 text-[13.5px]">
            {okrug && <><div className="eyebrow mb-2">{d.okrug}</div><Link href={href(locale, `/okrug/${okrug.slug}`)} className="font-medium">{okrug.name_lat}</Link></>}
            {unit.seat_name_lat && unit.level === "jls" && unit.seat_name_lat !== unit.name_lat && <div className="text-muted mt-2">{d.seat}: {unit.seat_name_lat}</div>}
          </div>}
        </aside>
      </div>
      </div>
    </main>
  );
}

/** Guides attached to an institution type: "how it is done" links on the type hub and on each institution of that type. */
function GuideLinks({ locale, guides, jlsSlug, stacked = false }: { locale: Locale; guides: db.GuideRow[]; jlsSlug?: string | null; stacked?: boolean }) {
  if (!guides.length) return null;
  const label = locale === "sr" ? "Kako se šta rešava" : locale === "en" ? "How it is done" : locale === "ru" ? "Как это оформить" : "So geht es";
  const title = (g: db.GuideRow) => (g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}).title ?? g.name_lat;
  const to = (g: db.GuideRow) => href(locale, `/vodic/${g.slug}`) + (jlsSlug ? `?opstina=${jlsSlug}` : "");
  return stacked ? (
    <><div className="eyebrow mb-2">{label}</div><ul className="grid gap-1.5 text-[13.5px]">{guides.map((g) => <li key={g.id}><Link href={to(g)} className="no-underline text-ink hover:text-accent">{title(g)} →</Link></li>)}</ul></>
  ) : (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]"><span className="text-muted mr-1">{label}:</span>{guides.map((g) => <Link key={g.id} href={to(g)} className="quick-chip">{title(g)} →</Link>)}</div>
  );
}

// ---------------------------------------------------------------- Org type hub
/** A branch whose only name is "Sedište" (head office) is a label, not a proper name: say it in the page's language. */
const unitName = (u: string, locale: Locale) => (/^sedi[sš]te$/i.test(u.trim()) ? pick(locale, "Sedište", "Head office", "Главный офис", "Hauptsitz") : u);
const foldName = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(banka|bank|a\.?d\.?|ad|d\.?o\.?o\.?|srbija|beograd)\b/g, "").replace(/[^a-z0-9]/g, "");
/** "Raiffeisen bank" as the branch name of Raiffeisen banka says nothing: the same name written twice. */
const sameName = (unit: string, org: string) => { const a = foldName(unit), b = foldName(org); return !a || a === b || b.startsWith(a) || a.startsWith(b); };
/** What tells two branches of one brand apart in a list: the branch's own name when it has one, else the town. */
const branchPlace = (b: db.ServingRow) => { const u = b.unit_name_lat.trim(); const generic = /^(ekspozitura|poslovnica|filijala|ispostava|sediste|sedište)$/i.test(u) || sameName(u, b.org_name_lat); const town = b.settlement_name_lat ?? b.jls_name_lat ?? ""; return generic ? town : (town && !u.toLowerCase().includes(town.toLowerCase()) ? `${u}, ${town}` : u); };

/** which line of an institution's facts works as the "field" filter on a paged type page */
const TYPE_FACET: Record<string, { key: string; label: Record<Locale, string> }> = {
  "sudski-vestak": { key: "oblasti", label: { sr: "Sve oblasti", en: "All fields", ru: "Все области", de: "Alle Fachgebiete" } },
};
const PAGE_SIZE = 60, PAGED_FROM = 250;
/** types whose entries are licensed people, not institutions (wording only) */
const PERSON_TYPES = new Set(["sudski-vestak", "medijator", "stecajni-upravnik", "procenitelj-nepokretnosti", "sudski-prevodilac", "javni-beleznik", "javni-izvrsitelj", "advokat"]);
const PG: Record<Locale, { name: string; allPlaces: string; show: string; reset: string; shown: (a: number, b: number, n: number) => string; prev: string; next: string; page: string; none: string }> = {
  sr: { name: "Naziv ili ime", allPlaces: "Sva mesta", show: "Prikaži", reset: "Poništi", shown: (a, b, n) => `Prikazano ${a}–${b} od ${n.toLocaleString("sr-Latn")}`, prev: "Prethodna", next: "Sledeća", page: "Strana", none: "Nema rezultata za ovaj izbor." },
  en: { name: "Name", allPlaces: "All places", show: "Show", reset: "Reset", shown: (a, b, n) => `Showing ${a}–${b} of ${n.toLocaleString("en")}`, prev: "Previous", next: "Next", page: "Page", none: "Nothing matches this selection." },
  ru: { name: "Название или имя", allPlaces: "Все места", show: "Показать", reset: "Сбросить", shown: (a, b, n) => `Показано ${a}–${b} из ${n.toLocaleString("ru")}`, prev: "Назад", next: "Вперёд", page: "Страница", none: "По этому выбору ничего не найдено." },
  de: { name: "Name", allPlaces: "Alle Orte", show: "Anzeigen", reset: "Zurücksetzen", shown: (a, b, n) => `${a}–${b} von ${n.toLocaleString("de")}`, prev: "Zurück", next: "Weiter", page: "Seite", none: "Keine Treffer für diese Auswahl." },
};

export async function OrgTypeHub({ locale, type, brand = null, place = null, query = {} }: { locale: Locale; type: db.OrgType; brand?: string | null; place?: string | null; query?: { q?: string | null; facet?: string | null; page?: number } }) {
  const d = t(locale);
  // Very large types are filtered and paged on the server instead of listing thousands of rows on one page.
  const total = await db.countOrgsOfType(type.slug);
  const facetDef = TYPE_FACET[type.slug] ?? null;
  const filter: db.TypeFilter = { q: query.q?.trim().slice(0, 60) || null, jls: place, facetKey: facetDef?.key ?? null, facet: facetDef ? (query.facet?.trim().slice(0, 80) || null) : null };
  const filtered = !!(filter.q || filter.jls || filter.facet);
  const big = !type.national_network && total > PAGED_FROM;
  const allOrgs = big ? [] : await db.getOrgsOfType(type.slug, 12000);
  const chain = type.national_network || (allOrgs.length > 0 && allOrgs.every((o) => !o.place_name));
  // paged list: always for big types; for a small type when a place or a name is asked for (a link from a city page), unless it is a chain (those filter their branches)
  const paged = big || (filtered && !chain);
  const [matchCount, placeOptions0, facetValues, goUnit] = paged
    ? await Promise.all([filtered ? db.countOrgsOfType(type.slug, filter) : Promise.resolve(total), db.getPlacesOfType(type.slug), facetDef ? db.getFacetValues(type.slug, facetDef.key) : Promise.resolve([] as { v: string; n: number }[]), place?.includes("/") ? db.getTU(place.split("/")[1], "gradska_opstina") : Promise.resolve(null)])
    : [total, [] as { slug: string; name_lat: string; n: number }[], [] as { v: string; n: number }[], null];
  const placeOptions = place?.includes("/") ? [{ slug: place, name_lat: goUnit?.name_lat ?? place.split("/")[1], n: matchCount }, ...placeOptions0] : placeOptions0;
  // a page number past the end shows the last page, never an empty one
  const pageNo = Math.min(Math.max(1, Math.floor(query.page ?? 1)), Math.max(1, Math.ceil(matchCount / PAGE_SIZE)));
  const pageRows = paged ? await db.getOrgsOfTypePaged(type.slug, filter, PAGE_SIZE, (pageNo - 1) * PAGE_SIZE) : [];
  const orgs = paged ? pageRows : allOrgs;
  // National networks (RFZO, PIO, Poreska uprava...) are one organization with many branches: list the branches by okrug.
  // Chains (national networks, banks, insurers) are few organisations with many branches and no primary seat: list the branches by district.
  const branchMode = !paged && chain;
  const unitCount = await db.countLocationsOfType(type.slug).catch(() => 0);
  const [branches, featured, typeGuides] = await Promise.all([branchMode ? db.getLocationsOfType(type.slug) : Promise.resolve([] as db.ServingRow[]), db.getFeatured(type.slug, null).catch(() => [] as db.FeaturedRow[]), db.getGuidesForType(type.slug).catch(() => [] as db.GuideRow[])]);
  const groups = new Map<string, db.OrgRow[]>();
  const OTHER = locale === "sr" ? "Ostalo" : locale === "en" ? "Other" : locale === "ru" ? "Прочее" : "Sonstige";
  for (const o of orgs) { const k = o.founder_name ?? o.place_name ?? OTHER; groups.set(k, [...(groups.get(k) ?? []), o]); }
  const keys = [...groups.keys()].sort((a, b) => (a === OTHER ? 1 : 0) - (b === OTHER ? 1 : 0) || a.localeCompare(b, "sr-Latn"));
  const agg = (key: (b: db.ServingRow) => [string | null, string | null], keep: (b: db.ServingRow) => boolean = () => true) => { const m = new Map<string, { slug: string; name: string; count: number }>(); for (const b of branches) { if (!keep(b)) continue; const [slug, name] = key(b); if (!slug) continue; const e = m.get(slug) ?? { slug, name: name ?? slug, count: 0 }; e.count++; m.set(slug, e); } return [...m.values()]; };
  const brands = agg((b) => [b.org_slug, b.org_name_lat], (b) => !place || b.jls_slug === place).sort((a, b) => b.count - a.count);
  const placeList = agg((b) => [b.jls_slug, b.jls_name_lat], (b) => !brand || b.org_slug === brand).sort((a, b) => a.name.localeCompare(b.name, "sr-Latn"));
  // a place is a city ("nis") or a city municipality ("beograd/zemun")
  const inPlace = (b: db.ServingRow) => !place || (place.includes("/") ? b.jls_slug === place.split("/")[0] && b.tu_slug === place.split("/")[1] : b.jls_slug === place);
  const shownBranches = branches.filter((b) => (!brand || b.org_slug === brand) && inPlace(b));
  const byOkrug = new Map<string, db.ServingRow[]>();
  for (const b of shownBranches) { const k = place ? (b.jls_name_lat ?? "—") : (b.okrug_name_lat ?? "—"); byOkrug.set(k, [...(byOkrug.get(k) ?? []), b]); }
  const okrugKeys = [...byOkrug.keys()].sort((a, b) => a.localeCompare(b, "sr-Latn"));
  const count = branchMode ? branches.length : paged ? total : orgs.length;
  const places = branchMode ? new Set(branches.map((b) => b.jls_slug)).size : paged ? placeOptions0.length : keys.length;
  let faq: { q: string; a: string }[] = [];
  try { const parsed = type.faq_md ? JSON.parse(type.faq_md) : []; if (Array.isArray(parsed)) faq = parsed.filter((x) => x && x.q && x.a).map((x: { q: string; a: string }) => ({ q: tx(x.q, locale), a: tx(x.a, locale) })); } catch { faq = []; }
  return (
    <main id="main">
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10 grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)] lg:items-center">
        <div className="min-w-0">
        <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { label: d.groups[type.group] }, { label: tn(type, locale) }]} />
        <div className="eyebrow mt-4">{d.groups[type.group]}</div>
        <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold leading-tight">{tn(type, locale)}</h1>
        <p className="text-muted mt-2 tabular">{count.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} {branchMode ? (locale === "sr" ? "lokacija" : locale === "en" ? "locations" : locale === "ru" ? "адресов" : "Standorte") : PERSON_TYPES.has(type.slug) ? (locale === "sr" ? "upisanih u registar" : locale === "en" ? "listed in the register" : locale === "ru" ? "в реестре" : "im Register") : d.institutions}{!branchMode && unitCount > count * 1.3 ? ` · ${unitCount.toLocaleString(locale === "sr" ? "sr-Latn" : locale)} ${pick(locale, "objekata i jedinica", "buildings and units", "зданий и подразделений", "Gebäude und Stellen")}` : ""} · {placesCount(places, locale)}</p>
        {type.description_md && <div className="prose max-w-3xl mt-3 text-[15px] text-muted">{tx(type.description_md, locale)}</div>}
        <GuideLinks locale={locale} guides={typeGuides} />
        </div>
        <EmblemStage emblem={emblemFor(type.slug, type.icon)} title={tn(type, locale)} size={400} cls="estage-hero deskframe" />
      </div></section>
      <div className="shell py-6">
      {faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />}
      <AdSlot locale={locale} code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div className="grid gap-5">
          {featured.length > 0 && <FeaturedRail locale={locale} rows={featured} />}
          {faq.length > 0 && (
            <section className="card p-5">
              <SectionTitle>{locale === "sr" ? "Česta pitanja" : locale === "en" ? "Frequently asked" : locale === "ru" ? "Частые вопросы" : "Häufige Fragen"}</SectionTitle>
              <div className="grid gap-2">{faq.map((f, i) => <details key={i} className="rounded-md border border-line faq group"><summary className="cursor-pointer font-medium text-[14.5px] list-none flex justify-between gap-3">{f.q}<span className="text-muted group-open:rotate-45 transition" aria-hidden>+</span></summary><p className="text-[14px] text-muted">{f.a}</p></details>)}</div>
            </section>
          )}
          {branchMode && branches.length > 24 && <BranchFilters locale={locale} basePath={href(locale, `/${type.slug}`)} brands={brands} places={placeList} brand={brand} place={place} shown={shownBranches.length} total={branches.length} />}
          {branchMode ? okrugKeys.map((k, i) => (
            <section key={k} className="cv-auto">
              <SectionTitle>{k} <span className="text-muted font-normal text-[13px] tabular">{byOkrug.get(k)!.length}</span></SectionTitle>
              {shownBranches.length > 400 ? (
                /* a whole national network on one page (2,000 bank branches): one light line per branch; pick a place or a brand above to get the cards */
                <ul className="org-compact">{byOkrug.get(k)!.map((b) => <li key={b.location_id}><a href={href(locale, `/${b.org_type_slug}/${b.org_slug}/${b.location_slug}`)}>{orgs.length > 1 ? `${b.org_name_lat} · ${branchPlace(b)}` : unitName(b.unit_name_lat, locale)}</a><span>{b.address_display ?? ""}</span></li>)}</ul>
              ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {byOkrug.get(k)!.map((b) => (
                  <li key={b.location_id} className="card card-hover p-4">
                    <div className="eyebrow">{orgs.length > 1 ? b.org_name_lat : (UNIT_KIND[b.unit_kind]?.[locale] ?? b.unit_kind)}</div>
                    <Link href={href(locale, `/${b.org_type_slug}/${b.org_slug}/${b.location_slug}`)} className="hit font-serif text-[17px] font-semibold no-underline text-ink hover:text-accent">{orgs.length > 1 && (/^(ekspozitura|poslovnica|filijala|ispostava)$/i.test(b.unit_name_lat) || sameName(b.unit_name_lat, b.org_name_lat)) ? `${b.org_name_lat} · ${branchPlace(b)}` : unitName(b.unit_name_lat, locale)}</Link>
                    <div className="text-[13px] text-muted mt-1">{b.address_display ? `${b.address_display}, ` : ""}{b.jls_name_lat}</div>
                  </li>
                ))}
              </ul>)}
              
            </section>
          )) : paged ? [(() => {
            const P = PG[locale]; const base = href(locale, `/${type.slug}`); const pages = Math.max(1, Math.ceil(matchCount / PAGE_SIZE)); const cur = Math.min(pageNo, pages);
            const facetOptions = facetValues.filter((x) => x.v && /^[A-ZŠĐČĆŽ]/.test(x.v));
            const link = (n: number) => { const u = new URLSearchParams(); if (filter.q) u.set("q", filter.q); if (filter.jls) u.set("mesto", filter.jls); if (filter.facet) u.set("oblast", filter.facet); if (n > 1) u.set("strana", String(n)); const qs = u.toString(); return `${qs ? `${base}?${qs}` : base}#lista`; };
            const windowed = [...new Set([1, cur - 2, cur - 1, cur, cur + 1, cur + 2, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
            const from = matchCount ? (cur - 1) * PAGE_SIZE + 1 : 0, to = Math.min(matchCount, cur * PAGE_SIZE);
            return (
              <section key="paged" className="grid gap-4" id="lista">
                <TypeFilterBar base={base} q={filter.q ?? null} place={filter.jls ?? null} facet={filter.facet ?? null} filtered={filtered}
                  places={placeOptions.map((o) => ({ value: o.slug, label: o.name_lat, sub: String(o.n) }))} facets={facetDef ? facetOptions.map((o) => ({ value: o.v, label: o.v, sub: String(o.n) })) : []}
                  labels={{ name: P.name, allPlaces: P.allPlaces, allFields: facetDef?.label[locale] ?? "", show: P.show, reset: P.reset }} />
                <p className="text-[13px] text-muted tabular" aria-live="polite">{matchCount ? P.shown(from, to, matchCount) : P.none}</p>
                {orgs.length > 0 && <OrgList orgs={orgs} locale={locale} dense byPlace />}
                {pages > 1 && (
                  <nav className="pager" aria-label={P.page}>
                    {cur > 1 ? <a href={link(cur - 1)} rel="prev" className="pager-step">← {P.prev}</a> : <span className="pager-step is-off">← {P.prev}</span>}
                    <span className="pager-nums">{windowed.map((n, i) => <Fragment key={n}>{i > 0 && n - windowed[i - 1] > 1 && <span className="pager-gap" aria-hidden>…</span>}{n === cur ? <span className="pager-n is-on" aria-current="page">{n}</span> : <a href={link(n)} className="pager-n">{n}</a>}</Fragment>)}</span>
                    {cur < pages ? <a href={link(cur + 1)} rel="next" className="pager-step">{P.next} →</a> : <span className="pager-step is-off">{P.next} →</span>}
                  </nav>
                )}
              </section>
            );
          })()] : keys.map((k, i) => {
            const list = groups.get(k)!;
            const body = <OrgList orgs={list} locale={locale} dense compact={orgs.length > 800} />;
            return (
              <section key={k} className="cv-auto">
                {list.length > 12 ? (
                  <details className="card p-3.5" open={keys.length === 1 || orgs.length <= 40}><summary className="cursor-pointer font-semibold text-[15px]">{k} <span className="text-muted tabular font-normal">({list.length})</span></summary><div className="mt-3">{body}</div></details>
                ) : (<><SectionTitle>{k} <span className="text-muted font-normal text-[13px] tabular">{list.length}</span></SectionTitle>{body}</>)}
                
              </section>
            );
          })}
        </div>
        <aside className="lg:sticky lg:top-20"><SponsorCard locale={locale} label={d.sponsor} sponsor={null} compact /></aside>
      </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Institution page (Part 2 layout)
/** Register facts stored with an institution ("- key: value" lines). Label per key; keys not listed here are technical and stay hidden. */
const FACT_LABEL: Record<string, Record<Locale, string>> = {
  oblasti: { sr: "Oblasti veštačenja", en: "Fields of expertise", ru: "Области экспертизы", de: "Fachgebiete" }, zvanje: { sr: "Zvanje", en: "Title", ru: "Квалификация", de: "Titel" },
  sud: { sr: "Sud", en: "Court", ru: "Суд", de: "Gericht" }, court: { sr: "Sud", en: "Court", ru: "Суд", de: "Gericht" }, languages: { sr: "Jezici", en: "Languages", ru: "Языки", de: "Sprachen" },
  licenca: { sr: "Licenca", en: "Licence", ru: "Лицензия", de: "Lizenz" }, licence: { sr: "Licenca", en: "Licence", ru: "Лицензия", de: "Lizenz" }, licence_no: { sr: "Broj licence", en: "Licence no.", ru: "Номер лицензии", de: "Lizenznummer" },
  licence_valid_until: { sr: "Licenca važi do", en: "Licence valid until", ru: "Лицензия действует до", de: "Lizenz gültig bis" }, licence_valid_to: { sr: "Licenca važi do", en: "Licence valid until", ru: "Лицензия действует до", de: "Lizenz gültig bis" },
  authorisation_no: { sr: "Broj ovlašćenja NBS", en: "NBS authorisation no.", ru: "Номер разрешения НБС", de: "NBS-Zulassungsnummer" }, dozvola_ministarstva_finansija: { sr: "Dozvola Ministarstva finansija", en: "Ministry of Finance permit", ru: "Разрешение Минфина", de: "Genehmigung des Finanzministeriums" },
  service: { sr: "Usluga", en: "Service", ru: "Услуга", de: "Leistung" }, capacity: { sr: "Kapacitet", en: "Capacity", ru: "Вместимость", de: "Kapazität" }, activities: { sr: "Aktivnosti", en: "Activities", ru: "Деятельность", de: "Tätigkeiten" },
  stars: { sr: "Kategorija (zvezdice)", en: "Category (stars)", ru: "Категория (звёзды)", de: "Kategorie (Sterne)" }, units: { sr: "Smeštajnih jedinica", en: "Rooms / units", ru: "Номеров", de: "Zimmer / Einheiten" }, beds: { sr: "Ležaja", en: "Beds", ru: "Мест", de: "Betten" },
  operator: { sr: "Privredni subjekt", en: "Operator", ru: "Оператор", de: "Betreiber" }, pun_naziv: { sr: "Pun naziv", en: "Full name", ru: "Полное название", de: "Vollständiger Name" },
  parent: { sr: "Nadležna carinarnica", en: "Parent customs house", ru: "Вышестоящая таможня", de: "Zuständiges Zollamt" }, neighbour_country: { sr: "Susedna država", en: "Neighbouring country", ru: "Соседняя страна", de: "Nachbarland" },
  level: { sr: "Nivo", en: "Level", ru: "Уровень", de: "Stufe" }, ownership: { sr: "Vlasništvo", en: "Ownership", ru: "Собственность", de: "Trägerschaft" }, consular_jurisdiction: { sr: "Konzularna nadležnost", en: "Consular jurisdiction", ru: "Консульский округ", de: "Konsularbezirk" },
  accreditation_no: { sr: "Akreditacioni broj", en: "Accreditation no.", ru: "Номер аккредитации", de: "Akkreditierungsnummer" }, glavno_drustvo: { sr: "Matično društvo", en: "Parent firm", ru: "Головная компания", de: "Muttergesellschaft" },
  category: { sr: "Kategorija", en: "Category", ru: "Категория", de: "Kategorie" }, pib: { sr: "PIB", en: "Tax ID (PIB)", ru: "ИНН (PIB)", de: "Steuernummer (PIB)" },
};
function facts(md: string | null, locale: Locale): { label: string; value: string }[] {
  if (!md) return [];
  const out: { label: string; value: string }[] = [];
  for (const line of md.split("\n")) { const m = /^-\s*([a-z_0-9]+):\s*(.+)$/.exec(line.trim()); if (!m) continue; const lab = FACT_LABEL[m[1]]; const v = m[2].trim(); if (lab && v && v !== "null" && !out.some((x) => x.label === lab[locale])) out.push({ label: lab[locale], value: v }); }
  return out;
}

export async function OrgPage({ locale, org, locSlug, path }: { locale: Locale; org: db.OrgRow; locSlug?: string; path: string }) {
  const d = t(locale);
  const [locations, children, vertical, types, country, typeGuides] = await Promise.all([db.getLocations(org.id), db.getOrgChildren(org.id), db.getVertical(org.type_slug), db.getOrgTypes(), ["ambasada", "konzulat"].includes(org.type_slug) ? db.getCountryByMissionName(org.name_lat).catch(() => null) : Promise.resolve(null), db.getGuidesForType(org.type_slug).catch(() => [] as db.GuideRow[])]);
  const type = types.find((x) => x.slug === org.type_slug)!;
  const loc = (locSlug ? locations.find((l) => l.location_slug === locSlug) : null) ?? locations.find((l) => l.is_primary) ?? locations[0] ?? null;
  const ids = loc ? [loc.location_id] : [];
  // a unit (a kindergarten building, a branch school) often has no contact of its own in the register: the seat's is shown, said as such
  const seat = locations.find((l) => l.is_primary) ?? null;
  const isUnit = !!loc && !loc.is_primary && !!seat && seat.location_id !== loc.location_id;
  const [contactsAll, hours, coverage, ancestors, sponsor] = await Promise.all([
    db.getContacts(isUnit ? [...ids, seat!.location_id] : ids), db.getHours(ids), db.getCoverage(ids),
    loc ? db.getAncestors((await db.sql<{ path: string }[]>`select path::text from territorial_units where slug = ${loc.tu_slug} limit 1`)[0]?.path ?? "") : Promise.resolve([]),
    loc ? db.getSponsorship("loc_after_address_native", (await db.sql<{ id: number }[]>`select id from territorial_units where slug = ${loc.tu_slug} limit 1`)[0]?.id ?? 0, type.id, org.id, loc.location_id) : Promise.resolve(null),
  ]);
  const jls = ancestors.find((a) => a.level === "jls"); const okrug = ancestors.find((a) => a.level === "okrug");
  const own = contactsAll.filter((c) => !loc || c.location_id === loc.location_id);
  const viaSeat = isUnit && !own.some((c) => ["phone", "mobile"].includes(c.kind));
  const contacts = viaSeat ? contactsAll.filter((c) => c.location_id === seat!.location_id) : own;
  const phones = contacts.filter((c) => ["phone", "mobile"].includes(c.kind)); const emails = contacts.filter((c) => c.kind === "email"); const sites = contacts.filter((c) => c.kind === "website");
  const site = org.website ?? sites[0]?.value ?? null;
  const placeLine = loc ? [loc.address_display, loc.address_extra, [loc.postal_code, loc.settlement_name_lat ?? loc.tu_name_lat].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;
  const mapsQ = encodeURIComponent(`${org.name_lat} ${placeLine ?? ""}`.trim());
  const title = loc && !loc.is_primary ? `${org.name_lat} – ${unitName(loc.unit_name_lat, locale)}` : org.name_lat;
  const related = jls ? await db.sql<db.OrgRow[]>`select o.id, o.slug, o.name_lat, o.name_cyr, o.official_name_lat, t.slug as type_slug, t.name_lat as type_name, t.name_en as type_name_en, t.name_ru as type_name_ru, t.name_de as type_name_de, t."group" as group, o.jurisdiction, null::text as founder_slug, null::text as founder_name, null::text as place_name, null::text as place_slug, o.verification, null::text as mb, null::text as pib, null::text as jbkjs, o.website, null::bigint as parent_id, null::text as parent_name, null::text as parent_slug, null::text as parent_type_slug, null::text as last_seen_at
      from organizations o join org_types t on t.id = o.org_type_id join territorial_units f on f.id = o.founder_unit_id
      where t."group" = ${org.group} and o.id <> ${org.id} and o.status = 'active' and f.path <@ ${jls.path}::ltree and t.slug <> 'mesna-zajednica' order by t.sort_order, o.name_lat limit 8` : [];
  const DAYS = locale === "sr" ? ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"] : locale === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : locale === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const regLine = [org.mb && `MB ${org.mb}`, org.pib && `PIB ${org.pib}`, org.jbkjs && `JBKJS ${org.jbkjs}`].filter(Boolean).join(" · ");
  // Where the data really came from, and what the register says about this entry. The founder line is shown only for
  // budget users (they have a JBKJS): for everyone else the "founder" column only says which municipality they are in.
  const extras = await db.getOrgExtras(org.id);
  const sourceNames = extras.sources.length ? extras.sources : org.jbkjs ? ["Uprava za trezor – Spisak korisnika javnih sredstava"] : [];
  const regFacts = facts(extras.description_md, locale);
  const showFounder = !!org.jbkjs && !!org.founder_name;
  const typeSing = locale === "sr" ? type.name_lat : tn(type, locale); // singular Serbian name; translated names are plural
  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const openRows = hours.filter((h) => h.hours_type === "rad_sa_strankama").length ? hours.filter((h) => h.hours_type === "rad_sa_strankama") : hours.filter((h) => h.hours_type === "radno_vreme");
  const orgLd = {
    "@context": "https://schema.org", "@type": PERSON_TYPES.has(org.type_slug) ? "ProfessionalService" : org.is_private ? "LocalBusiness" : "GovernmentOffice",
    name: title, ...(org.official_name_lat && org.official_name_lat !== org.name_lat ? { legalName: org.official_name_lat } : {}), url: siteUrl() + path, description: `${typeSing}${jls ? `, ${jls.name_lat}` : ""}`,
    ...(loc && (loc.address_display || loc.tu_name_lat) ? { address: { "@type": "PostalAddress", ...(loc.address_display ? { streetAddress: loc.address_display } : {}), addressLocality: loc.settlement_name_lat ?? loc.tu_name_lat, ...(loc.postal_code ? { postalCode: loc.postal_code } : {}), ...(okrug ? { addressRegion: okrug.name_lat } : {}), addressCountry: "RS" } } : {}),
    ...(loc?.lat != null && loc?.lng != null && !PERSON_TYPES.has(org.type_slug) ? { geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng } } : {}),
    ...(phones[0] ? { telephone: phones[0].value } : {}), ...(emails[0] ? { email: emails[0].value } : {}), ...(site ? { sameAs: site.startsWith("http") ? site : `https://${site}` } : {}),
    ...(openRows.length ? { openingHoursSpecification: openRows.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DOW[h.day_of_week - 1], opens: h.opens.slice(0, 5), closes: h.closes.slice(0, 5) })) } : {}),
    ...(coverage.length ? { areaServed: coverage.slice(0, 30).map((c) => ({ "@type": "AdministrativeArea", name: c.name_lat })) } : {}),
  };
  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <section className="hero-light border-b border-line"><div className="shell py-7 sm:py-9">
      <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, ...(jls ? [{ href: href(locale, `/${jls.slug}`), label: jls.name_lat }] : []), { href: href(locale, `/${org.type_slug}`), label: tn(type, locale) }, ...(loc && !loc.is_primary ? [{ href: orgHref(locale, org), label: org.name_lat }, { label: loc.unit_name_lat }] : [{ label: org.name_lat }])]} />
      <div className="eyebrow mt-4">{typeSing}{jls ? ` · ${jls.name_lat}` : ""}</div>
      <div className="hub-head-org"><EmblemStage emblem={emblemFor(type.slug, type.icon)} title={typeSing} size={200} cls="estage-org" /><h1 className="font-serif text-[28px] sm:text-[36px] font-semibold leading-[1.12]">{title}</h1></div>
      <p className="text-muted mt-2 text-[14px]">{org.official_name_lat && org.official_name_lat.toLowerCase() !== org.name_lat.toLowerCase() ? org.official_name_lat : typeSing}{showFounder ? ` · ${d.founder}: ` : jls ? " · " : ""}{showFounder ? (org.founder_slug ? <Link href={href(locale, `/${org.founder_slug}`)}>{org.founder_name}</Link> : org.founder_name) : jls ? <Link href={href(locale, `/${jls.slug}`)}>{jls.name_lat}</Link> : null}</p>
      <div className="mt-2 flex items-center gap-3 flex-wrap"><VerificationChip state={loc?.verification ?? org.verification} locale={locale} />{org.is_private && <Chip>{locale === "sr" ? "Privatna ustanova" : locale === "en" ? "Private institution" : locale === "ru" ? "Частное учреждение" : "Private Einrichtung"}</Chip>}<a href="#izmeni" className="text-[12.5px]">{d.editData}</a></div>
      </div></section>
      <div className="shell">
      <div className="sticky top-[69px] z-10 -mx-4 px-4 py-2.5 bg-bg/95 backdrop-blur border-b border-line lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:m-0 lg:mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {phones[0] ? <a href={`tel:${phones[0].value}`} className="btn-primary"><Icon.phone /> {d.call} {phones[0].value_display ?? phones[0].value}</a>
                     : <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-2 text-muted px-3.5 py-2 text-[13.5px]"><Icon.phone /> {pick(locale, "Telefon nije poznat", "Phone unknown", "Телефон неизвестен", "Telefon unbekannt")}</span>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} rel="noopener nofollow" target="_blank" className="quick-chip !py-2 !rounded-[10px] font-medium"><Icon.pin /> {d.directions}</a>
          {site && <a href={site.startsWith("http") ? site : `https://${site}`} rel="noopener" target="_blank" className="quick-chip !py-2 !rounded-[10px] font-medium">{d.website} ↗</a>}
        </div>
      </div>
      <AdSlot locale={locale} code="loc_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start mt-2">
        <div className="min-w-0">
          <section data-reveal data-fx="flip" className="card is-contact stack p-4 sm:p-5">
            <SectionTitle>{d.contactAndAddress}</SectionTitle>
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
              <dt className="text-muted">{d.address}</dt><dd>{placeLine ?? <span className="text-muted">{loc ? `${loc.tu_name_lat}${okrug ? `, ${okrug.name_lat}` : ""} · ${pick(locale, "tačna adresa još nije uneta", "exact address not yet entered", "точный адрес пока не указан", "genaue Adresse noch nicht erfasst")}` : d.noData}</span>}</dd>
              <dt className="text-muted">{d.phone}</dt><dd className="tabular">{phones.length ? phones.map((p) => <div key={p.value}><a href={`tel:${p.value}`}>{p.value_display ?? p.value}</a>{p.label && p.label !== "OpenStreetMap" ? <span className="text-muted"> ({p.label})</span> : null}</div>) : <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">{d.email}</dt><dd>{emails.length ? emails.map((e) => <div key={e.value}><a href={`mailto:${e.value}`}>{e.value}</a></div>) : <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">{d.website}</dt><dd className="break-all">{site ? <a href={site.startsWith("http") ? site : `https://${site}`} rel="noopener">{site.replace(/^https?:\/\//, "")}</a> : <span className="text-muted">—</span>}</dd>
              {regLine && <><dt className="text-muted">{d.registry}</dt><dd className="font-mono text-[12.5px] text-muted">{regLine}</dd></>}
            </dl>
            {phones.some((x) => x.label === "OpenStreetMap") && <p className="text-[13px] text-muted mt-3">{pick(locale, "Izvor telefona: OpenStreetMap (otvorena mapa koju dopunjuju korisnici). Proverite pre poziva.", "Phone source: OpenStreetMap (an open map edited by its users). Check before you rely on it.", "Источник телефона: OpenStreetMap (открытая карта, которую дополняют пользователи). Проверьте перед звонком.", "Quelle der Telefonnummer: OpenStreetMap (offene, von Nutzern gepflegte Karte). Bitte vor dem Anruf prüfen.")}</p>}
            {viaSeat && <p className="text-[13px] text-muted mt-3">{pick(locale, "Ova jedinica nema svoj telefon u registru; prikazan je kontakt sedišta ustanove:", "This unit has no phone of its own in the register; the contact shown is the institution's seat:", "У этого подразделения нет своего телефона в реестре; показан контакт головного учреждения:", "Diese Stelle hat im Register kein eigenes Telefon; angezeigt wird der Kontakt des Sitzes:")} <Link href={orgHref(locale, org)}>{org.name_lat}</Link>{seat?.address_display ? `, ${seat.address_display}${seat.settlement_name_lat ? `, ${seat.settlement_name_lat}` : ""}` : ""}.</p>}
            {regFacts.length > 0 && (
              <dl className="reg-facts">
                {regFacts.map((f) => <Fragment key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></Fragment>)}
              </dl>
            )}
          </section>
          {sponsor && <div className="my-5"><SponsorCard locale={locale} label={d.sponsor} sponsor={sponsor} /></div>}
          <section data-reveal data-fx="flip" className="card ledger p-4 sm:p-5">
            <SectionTitle>{d.hours}</SectionTitle>
            {hours.length ? (
              <table className="text-[14px] tabular w-full max-w-md"><tbody>
                {["rad_sa_strankama", "radno_vreme"].map((ht) => hours.filter((h) => h.hours_type === ht)).filter((x) => x.length).map((rows) => (
                  <tr key={rows[0].hours_type} className="align-top"><th className="text-left font-medium text-muted pr-4 py-1">{rows[0].hours_type === "rad_sa_strankama" ? d.radSaStrankama : d.hours}</th>
                    <td className="py-1">{rows.map((h) => <div key={h.day_of_week}>{DAYS[h.day_of_week - 1]} {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)}</div>)}</td></tr>
                ))}</tbody></table>
            ) : loc?.hours_text ? <p className="text-[14px]">{loc.hours_text}</p>
              : <p className="text-[14px] text-muted">{pick(locale, "Radno vreme još nije uneto. Ako ga znate, ", "Opening hours not yet entered. If you know them, ", "Часы работы пока не указаны. Если вы их знаете, ", "Öffnungszeiten noch nicht erfasst. Wenn Sie sie kennen, ")}<a href="#izmeni">{d.editData.toLowerCase()}</a>.</p>}
            {/* hours that do not come from the institution's own page say so: a rule, an emergency service, or the open map */}
            {[...new Set(hours.map((h) => h.note).filter(Boolean))].map((n) => <p key={n} className="text-[12.5px] text-muted mt-2">{
              n === "po propisu" ? pick(locale, "Radno vreme organa državne uprave po odluci Vlade; ovaj organ ga nije posebno objavio. Proverite pre dolaska.", "Working hours of state administration bodies under the Government's decision; this body has not published its own. Check before you go.", "Часы работы органов государственного управления по решению правительства; сам орган их не публикует. Уточните перед визитом.", "Arbeitszeit der Staatsverwaltung laut Regierungsbeschluss; die Stelle selbst veröffentlicht keine. Bitte vorab prüfen.")
              : n === "dežurna služba" ? pick(locale, "Dežurna služba radi neprekidno. Hitni poziv: 193.", "The duty service works around the clock. Emergency call: 193.", "Дежурная служба работает круглосуточно. Экстренный вызов: 193.", "Der Bereitschaftsdienst arbeitet rund um die Uhr. Notruf: 193.")
              : n === "OpenStreetMap" ? pick(locale, "Izvor radnog vremena: OpenStreetMap (otvorena mapa koju dopunjuju korisnici). Proverite pre dolaska.", "Source of these hours: OpenStreetMap (an open map edited by its users). Check before you go.", "Источник часов работы: OpenStreetMap (открытая карта, которую дополняют пользователи). Уточните перед визитом.", "Quelle der Öffnungszeiten: OpenStreetMap (offene, von Nutzern gepflegte Karte). Bitte vorab prüfen.")
              : n}</p>)}
          </section>
          {(coverage.length > 0 || locations.length > 1 || org.parent_name || children.length > 0) && (
            <section data-reveal data-fx="flip" className="card p-4 sm:p-5 mt-5">
              <SectionTitle>{d.jurisdiction}</SectionTitle>
              {coverage.length > 0 && <p className="text-[14px]">{d.coveredAreas}: <span className="inline-flex flex-wrap gap-1.5 align-middle">{coverage.map((c) => <Link key={c.slug} href={tuHref(locale, c)} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12.5px] no-underline text-ink">{c.name_lat}</Link>)}</span></p>}
              {locations.length > 1 && locations.length <= 13 && <div className="mt-3 text-[14px]"><span className="text-muted">{d.units}:</span> {locations.filter((l) => !loc || l.location_id !== loc.location_id).map((l, i) => <span key={l.location_id}>{i > 0 && " · "}<Link href={href(locale, `/${org.type_slug}/${org.slug}/${l.location_slug}`)}>{unitName(l.unit_name_lat, locale)}</Link></span>)}</div>}
              {/* many units (a preschool institution with dozens of kindergartens): every one is listed, by name */}
              {locations.length > 13 && <details className="mt-3 unit-list" open={!isUnit}><summary>{d.units} <span className="text-muted tabular font-normal">({(locations.length - 1).toLocaleString(locale === "sr" ? "sr-Latn" : locale)})</span></summary>
                <ul>{locations.filter((l) => !loc || l.location_id !== loc.location_id).sort((x, y) => Number(y.is_primary) - Number(x.is_primary) || x.unit_name_lat.localeCompare(y.unit_name_lat, "sr-Latn")).map((l) => <li key={l.location_id}><Link href={href(locale, `/${org.type_slug}/${org.slug}/${l.location_slug}`)}>{unitName(l.unit_name_lat, locale)}</Link>{l.address_display ? <span> · {l.address_display}</span> : l.settlement_name_lat && !l.unit_name_lat.includes(l.settlement_name_lat) ? <span> · {l.settlement_name_lat}</span> : null}</li>)}</ul></details>}
              {org.parent_name && org.parent_slug && org.parent_type_slug && <div className="mt-3 text-[14px]"><span className="text-muted">{d.parentUnit}:</span> <Link href={href(locale, `/${org.parent_type_slug}/${org.parent_slug}`)}>{org.parent_name}</Link></div>}
              {children.length > 0 && <div className="mt-3 text-[14px]"><span className="text-muted">{pick(locale, "U sastavu", "Subordinate bodies", "Подчинённые органы", "Nachgeordnete Stellen")}:</span> {children.slice(0, 30).map((c, i) => <span key={c.id}>{i > 0 && " · "}<Link href={orgHref(locale, c)}>{c.name_lat}</Link></span>)}{children.length > 30 ? ` … (${children.length})` : ""}</div>}
            </section>
          )}
          {vertical && <LeadForm locale={locale} vertical={{ ...vertical, name_lat: tx(vertical.name_lat, locale), pitch_lat: tx(vertical.pitch_lat, locale) }} context={{ page_path: path, location_id: loc?.location_id ?? null, territorial_unit_id: jls?.id ?? null }} />}
          <section data-reveal data-fx="flip" className="card p-4 sm:p-5">
            <SectionTitle>{d.about}</SectionTitle>
            <div className="prose text-[14.5px]">
              {type.description_md ? <p>{tx(type.description_md, locale)}</p> : (
                <p>{org.name_lat} {locale === "sr" ? `je ${type.name_lat.toLowerCase()}` : locale === "en" ? `is listed under: ${tn(type, locale)}` : locale === "ru" ? `— категория: ${tn(type, locale)}` : `ist eingetragen unter: ${tn(type, locale)}`}{showFounder ? ` (${d.founder.toLowerCase()}: ${org.founder_name})` : ""}{jls ? `, ${jls.name_lat}${okrug ? `, ${okrug.name_lat}` : ""}` : ""}. {sourceNames.length
                  ? (locale === "sr" ? `Podaci potiču iz zvaničnog izvora: ${sourceNames.join("; ")}. Adresu, telefon i radno vreme dopunjujemo iz zvaničnih sajtova i prijava korisnika.` : locale === "en" ? `The data comes from an official source: ${sourceNames.join("; ")}. Address, phone and hours are completed from official sites and user reports.` : locale === "ru" ? `Данные взяты из официального источника: ${sourceNames.join("; ")}. Адрес, телефон и часы работы дополняются по официальным сайтам и сообщениям пользователей.` : `Die Daten stammen aus einer offiziellen Quelle: ${sourceNames.join("; ")}. Adresse, Telefon und Öffnungszeiten werden aus offiziellen Websites und Nutzerhinweisen ergänzt.`)
                  : (locale === "sr" ? "Podatke dopunjujemo iz zvaničnih sajtova i prijava korisnika." : locale === "en" ? "Details are completed from official sites and user reports." : locale === "ru" ? "Данные дополняются по официальным сайтам и сообщениям пользователей." : "Die Angaben werden aus offiziellen Websites und Nutzerhinweisen ergänzt.")}</p>
              )}
            </div>
          </section>
          {related.length > 0 && (
            <section className="mt-5">
              <SectionTitle>{d.related}</SectionTitle>
              <p className="text-[13px] text-muted mb-2">{d.groups[org.group]} · {jls?.name_lat}</p>
              <OrgList orgs={related} locale={locale} />
              {jls && <p className="mt-3 text-[14px]"><Link href={href(locale, `/${jls.slug}`)}>{d.allInstitutions} · {jls.name_lat} →</Link></p>}
            </section>
          )}
          <CorrectionBlock locale={locale} entityType={loc ? "location" : "organization"} entityId={loc?.location_id ?? org.id} pagePath={path} lastChecked={loc?.last_seen_at ?? org.last_seen_at} sources={sourceNames.length ? sourceNames : [pick(locale, "zvanični sajt institucije", "the institution's official site", "официальный сайт учреждения", "offizielle Website der Einrichtung")]} />
          <ClaimBlock locale={locale} orgId={org.id} locationId={loc?.location_id ?? null} />
        </div>
        <aside className="lg:sticky lg:top-20 grid gap-5">
          {country && (
            <Link href={href(locale, `/vize/${country.slug}`)} className="card p-4 no-underline text-ink flex items-center gap-4 card-hover spot">
              <Passport iso2={country.iso2} name={locale === "sr" ? country.name_sr : country.name_en} size={64} label={pick(locale, "PASOŠ", "PASSPORT", "ПАСПОРТ", "REISEPASS")} />
              <span className="min-w-0"><span className="eyebrow plain">{locale === "sr" ? "Vize i uslovi ulaska" : locale === "en" ? "Visas and entry rules" : locale === "ru" ? "Визы и въезд" : "Visa und Einreise"}</span>
                <span className="block font-serif text-[18px] font-semibold mt-1">{locale === "sr" ? country.name_sr : country.name_en} →</span>
                <span className="block text-[12.5px] text-muted mt-1">{pick(locale, "Ulazak u Srbiju", "Entering Serbia", "Въезд в Сербию", "Einreise nach Serbien")}: {country.to_rs_regime ?? "—"} · {pick(locale, "iz Srbije", "from Serbia", "из Сербии", "aus Serbien")}: {country.from_rs_regime ?? "—"}</span></span>
            </Link>
          )}
          {typeGuides.length > 0 && <div className="card p-4"><GuideLinks locale={locale} guides={typeGuides} jlsSlug={jls?.slug} stacked /></div>}
          <SponsorCard locale={locale} label={d.sponsor} sponsor={null} compact />
          {jls && <div className="card p-4 text-[13.5px]"><div className="eyebrow mb-2">{d.otherUnits}</div>{!type.national_network && !type.one_per_jls && <div className="mb-1"><a href={`${href(locale, `/${org.type_slug}`)}?mesto=${jls.slug}#lista`}>{tn(type, locale)} · {jls.name_lat}</a></div>}<Link href={href(locale, `/${org.type_slug}`)}>{tn(type, locale)} · {pick(locale, "cela Srbija", "all of Serbia", "вся Сербия", "ganz Serbien")}</Link><div className="mt-1"><Link href={href(locale, `/${jls.slug}`)}>{d.allInstitutions} · {jls.name_lat}</Link></div>{okrug && <div className="mt-1"><Link href={href(locale, `/okrug/${okrug.slug}`)}>{okrug.name_lat}</Link></div>}</div>}
          <div className="hidden xl:block"><AdSlot locale={locale} code="loc_sidebar_programmatic" w={300} h={600} label={d.ad} /></div>
        </aside>
      </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Search
// ---------------------------------------------------------------- For foreigners
export async function ForForeigners({ locale }: { locale: Locale }) {
  const d = t(locale); const g = GUIDE[locale];
  const [types, guides] = await Promise.all([db.getOrgTypes(), db.getGuides()]);
  const newcomer = ["privremeni-boravak-stranci", "prijava-prebivalista", "licna-karta", "zdravstvena-knjizica", "pib-za-strance", "otvaranje-firme-preduzetnik"].map((s) => guides.find((x) => x.slug === s)).filter(Boolean) as db.GuideRow[];
  return (
    <main id="main">
      <section className="band-primary border-b border-line"><div className="shell py-10 sm:py-14">
        <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { label: d.forForeigners }]} />
        <div className="eyebrow plain mt-4">{d.forForeigners} · English · Русский · Deutsch</div>
        <h1 className="font-serif text-[30px] sm:text-[40px] font-semibold mt-1 max-w-3xl leading-[1.1]">{g.title}</h1>
        <p className="mt-3 max-w-3xl text-[16px]">{g.lead}</p>
        {newcomer.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{newcomer.map((x) => { const c = x.guide[locale] ?? x.guide.en ?? x.guide.sr ?? {}; return <Link key={x.id} href={href(locale, `/vodic/${x.slug}`)} className="inline-flex items-center rounded-full bg-white/12 hover:bg-white/22 border border-white/25 text-white px-3.5 py-1.5 text-[13.5px] no-underline">{c.title ?? x.name_lat} →</Link>; })}<Link href={href(locale, "/vize")} className="inline-flex items-center rounded-full bg-white/12 hover:bg-white/22 border border-white/25 text-white px-3.5 py-1.5 text-[13.5px] no-underline">{pick(locale, "Vize i uslovi ulaska", "Visas and entry rules", "Визы и въезд", "Visa und Einreise")} →</Link></div>}
      </div></section>
      <div className="shell py-10">
      <section className="mb-10">
        <SectionTitle>{ROAD_LABELS[locale].title}</SectionTitle>
        <p className="text-muted text-[14.5px] max-w-[62ch] mb-4">{ROAD_LABELS[locale].lead}</p>
        <RoadTiles locale={locale} group="dolazak" />
        <p className="mt-4 text-[14px]"><Link href={href(locale, "/putokaz")} className="font-medium">{ROAD_LABELS[locale].byTopic} →</Link></p>
      </section>
      <SectionTitle>{pick(locale, "Institucije sa kojima ćete imati posla", "Offices you will deal with", "Учреждения, в которые вы будете обращаться", "Stellen, mit denen Sie zu tun haben")}</SectionTitle>
      <ul className="grid md:grid-cols-2 gap-4">
        {g.steps.map((s, i) => {
          const ty = types.find((x) => x.slug === s.type);
          return (
            <li key={i} className="card card-hover p-5 flex gap-4">
              {ty ? <Glyph3D icon={emblemFor(ty.slug, ty.icon)} size={52} className="shrink-0" /> : null}
              <div className="min-w-0">
                <div className="eyebrow">{s.where}</div>
                <h2 className="font-semibold text-[17px] mt-0.5">{s.title}</h2>
                <p className="text-[14px] text-muted mt-1.5">{s.body}</p>
                {ty && <Link href={href(locale, `/${ty.slug}`)} className="inline-block mt-3 text-[14px] font-medium">{tn(ty, locale)}{ty.national_network ? "" : ` (${ty.org_count.toLocaleString(locale === "sr" ? "sr-Latn" : locale)})`} →</Link>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[12.5px] text-muted mt-8 max-w-3xl">{g.disclaimer}</p>
      </div>
    </main>
  );
}

export function StaticPage({ locale, slug }: { locale: Locale; slug: string }) {
  const d = t(locale);
  const pages: Record<string, { title: string; body: string[] }> = {
    "o-sajtu": { title: d.aboutSite, body: pick<string[]>(locale,
      ["Gde da idem? je nezavisni, privatni imenik svih institucija u Srbiji: republičkih organa, lokalne samouprave, javnih preduzeća, ustanova, sudova, javnih beležnika i izvršitelja.", "Podaci potiču iz zvaničnih registara (Uprava za trezor – Evidencija KJS, RZS, RGZ) i zvaničnih sajtova institucija, i dopunjuju se prijavama korisnika. Sajt nije državni servis i ne zastupa nijednu instituciju.", "Finansira se oglasima, sponzorstvima lokalnih firmi i posredovanjem upita ka proverenim partnerima; svaki plaćeni sadržaj je obeležen."],
      ["Gde da idem? is an independent, privately run directory of all institutions in Serbia: national bodies, local government, public enterprises, public institutions, courts, notaries and enforcement agents.", "The data comes from official registers (Treasury Administration – register of public funds users, the Statistical Office, the Geodetic Authority) and from the institutions' official websites, and is completed through user reports. The site is not a government service and does not represent any institution.", "It is funded by advertising, sponsorships by local businesses and by passing enquiries on to vetted partners; all paid content is labelled."],
      ["Gde da idem? — независимый частный справочник всех учреждений Сербии: республиканских органов, местного самоуправления, государственных предприятий, учреждений, судов, нотариусов и судебных исполнителей.", "Данные берутся из официальных реестров (Казначейство – реестр получателей бюджетных средств, Статистическое управление, Геодезическое управление) и с официальных сайтов учреждений и дополняются по сообщениям пользователей. Сайт не является государственным сервисом и не представляет ни одно учреждение.", "Он финансируется за счёт рекламы, спонсорства местных компаний и передачи запросов проверенным партнёрам; весь платный контент помечен."],
      ["Gde da idem? ist ein unabhängiges, privat betriebenes Verzeichnis aller Einrichtungen in Serbien: staatliche Stellen, Kommunalverwaltung, öffentliche Unternehmen, öffentliche Einrichtungen, Gerichte, Notare und Vollstreckungsbeamte.", "Die Daten stammen aus amtlichen Registern (Schatzamt – Verzeichnis der Empfänger öffentlicher Mittel, Statistikamt, Geodätische Behörde) und von den offiziellen Websites der Einrichtungen und werden durch Hinweise von Nutzern ergänzt. Die Website ist kein staatlicher Dienst und vertritt keine Einrichtung.", "Sie finanziert sich durch Werbung, Sponsoring lokaler Unternehmen und die Weitergabe von Anfragen an geprüfte Partner; jeder bezahlte Inhalt ist gekennzeichnet."]) },
    partneri: { title: d.becomePartner, body: pick<string[]>(locale,
      ["Lokalne firme mogu zakupiti sponzorsko mesto na stranicama institucija u svom gradu (jedan sponzor po stranici), ili primati upite korisnika iz svoje oblasti (knjigovodstvo, advokatura, geodezija, osiguranje, prevodi).", "Cenovnik zavisi od posećenosti stranica koje vas zanimaju; javite se preko kontakt forme ili na email naveden u podnožju."],
      ["Local businesses can book a sponsor spot on institution pages in their city (one sponsor per page), or receive enquiries from users in their field (accounting, legal services, surveying, insurance, translation).", "Prices depend on the traffic of the pages you are interested in; get in touch through the contact form or at the email address in the footer."],
      ["Местные компании могут арендовать спонсорское место на страницах учреждений своего города (один спонсор на страницу) или получать запросы пользователей по своей теме (бухгалтерия, юридические услуги, геодезия, страхование, переводы).", "Цены зависят от посещаемости интересующих вас страниц; напишите через форму обратной связи или на электронную почту, указанную внизу страницы."],
      ["Lokale Unternehmen können auf den Seiten der Einrichtungen in ihrer Stadt einen Sponsorenplatz buchen (ein Sponsor pro Seite) oder Anfragen von Nutzern aus ihrem Fachgebiet erhalten (Buchhaltung, Rechtsberatung, Vermessung, Versicherung, Übersetzungen).", "Die Preise hängen von den Besucherzahlen der Seiten ab, die Sie interessieren; schreiben Sie uns über das Kontaktformular oder an die E-Mail-Adresse in der Fußzeile."]) },
    privatnost: { title: d.privacy, body: pick<string[]>(locale,
      ["Sajt ne koristi kolačiće za praćenje; analitika je anonimna. Oglasne mreže (Google AdSense) mogu koristiti kolačiće u skladu sa svojim politikama; posetiocima iz EU prikazuje se izbor saglasnosti.", "Podaci iz forme za upit (ime, telefon, email, poruka) prosleđuju se jednom partneru radi odgovora i brišu se najkasnije 180 dana od slanja. Rukovalac podacima je operator sajta; zahtev za brisanje pošaljite na email u podnožju.", "Podaci o institucijama su javni podaci o organima javne vlasti; zahtev za ispravku možete poslati sa svake stranice."],
      ["The site does not use tracking cookies; analytics are anonymous. Advertising networks (Google AdSense) may use cookies in line with their own policies; visitors from the EU are shown a consent choice.", "Data from the enquiry form (name, phone, email, message) is passed to one partner so that they can reply, and is deleted no later than 180 days after it is sent. The data controller is the site operator; send a deletion request to the email address in the footer.", "The data about institutions is public data about public authorities; you can send a correction request from every page."],
      ["Сайт не использует cookie для отслеживания; аналитика анонимна. Рекламные сети (Google AdSense) могут использовать cookie в соответствии со своей политикой; посетителям из ЕС показывается выбор согласия.", "Данные из формы запроса (имя, телефон, электронная почта, сообщение) передаются одному партнёру для ответа и удаляются не позднее чем через 180 дней после отправки. Оператором данных является владелец сайта; запрос на удаление отправьте на электронную почту, указанную внизу страницы.", "Данные об учреждениях — это общедоступные сведения об органах публичной власти; запрос на исправление можно отправить с любой страницы."],
      ["Die Website verwendet keine Tracking-Cookies; die Analyse ist anonym. Werbenetzwerke (Google AdSense) können Cookies gemäß ihren eigenen Richtlinien verwenden; Besuchern aus der EU wird eine Einwilligungsauswahl angezeigt.", "Die Angaben aus dem Anfrageformular (Name, Telefon, E-Mail, Nachricht) werden zur Beantwortung an einen Partner weitergegeben und spätestens 180 Tage nach dem Absenden gelöscht. Verantwortlicher für die Daten ist der Betreiber der Website; einen Löschantrag senden Sie bitte an die E-Mail-Adresse in der Fußzeile.", "Die Angaben zu Einrichtungen sind öffentliche Daten über Behörden; einen Korrekturwunsch können Sie von jeder Seite aus senden."]) },
  };
  const p = pages[slug];
  if (!p) return null;
  return (
    <main id="main">
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10">
        <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { label: p.title }]} />
        <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold mt-4">{p.title}</h1>
      </div></section>
      <div className="shell py-8"><div className="prose max-w-3xl text-[15.5px] leading-relaxed">{p.body.map((x, i) => <p key={i}>{x}</p>)}</div></div>
    </main>
  );
}
