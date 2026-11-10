import Link from "next/link";
import * as Flags from "country-flag-icons/react/3x2";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import * as db from "@/lib/db";
import { Breadcrumbs } from "./ui";

type FlagComp = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => React.JSX.Element;
const flagOf = (iso2: string): FlagComp | null => ((Flags as unknown as Record<string, FlagComp>)[iso2.toUpperCase()] ?? null);

/** Passport cover colours: EU burgundy, the Americas/Anglosphere navy, OIC-style green where that is the issued colour, black for a few; default dark blue. */
const EU = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
const GREEN = new Set("SA MA PK NG BD ID MY SN TN DZ EG MR IR AF NE BF ML TG".split(" "));
const RED = new Set("CH TR CN RU AL MK ME BA JP KR SG MX PE CL".split(" "));
const BLACK = new Set("NZ AO TD ZM MW".split(" "));
function coverColour(iso2: string) {
  if (EU.has(iso2)) return "#6b1f2b"; if (GREEN.has(iso2)) return "#1f5a3a"; if (RED.has(iso2)) return "#8a1f26"; if (BLACK.has(iso2)) return "#1a1a1f"; return "#1f2a5b";
}

/** A passport booklet drawn as layered SVG: cover with flag plate, page stack, spine shadow. Server-rendered. */
export function Passport({ iso2, name, size = 180, label = "PASOŠ" }: { iso2: string; name: string; size?: number; label?: string }) {
  const Flag = flagOf(iso2); const c = coverColour(iso2);
  return (
    <div className="passport" style={{ width: size, height: size * 1.32 }} aria-hidden>
      <div className="passport-pages" />
      <div className="passport-cover" style={{ background: `linear-gradient(135deg, ${c} 0%, color-mix(in oklab, ${c} 70%, black) 100%)` }}>
        <div className="passport-emblem">{Flag ? <Flag title={name} /> : <span className="passport-iso">{iso2}</span>}</div>
        <div className="passport-text"><span>{name.toUpperCase()}</span><b>{label}</b></div>
      </div>
      <div className="passport-sheen" />
    </div>
  );
}

const VL: Record<Locale, Record<string, string>> = {
  sr: { countries: "država", title: "Vize i uslovi ulaska", lead: "Za svaku državu: da li njeni građani ulaze u Srbiju bez vize, i šta treba građanima Srbije za put tamo. Izvor: Ministarstvo spoljnih poslova.", toRs: "Ulazak u Srbiju", fromRs: "Putovanje iz Srbije", free: "Bez vize", visa: "Viza potrebna", eviza: "eViza", eta: "Elektronska dozvola (eTA)", unknown: "Nije objavljeno", stay: "Boravak", conditions: "Uslovi", passport: "Pasoš", requirements: "Šta treba poneti", official: "Zvanično uputstvo (MSP)", missions: "Predstavništva u Srbiji", rsMission: "Predstavništvo Srbije", none: "Nema predstavništva u Srbiji; nadležna je ambasada u drugoj državi.", all: "Sve države", groupFree: "Bez vize za ulazak u Srbiju", groupVisa: "Viza za ulazak u Srbiju", search: "Nađite državu", updated: "Podaci MSP od", open: "Otvori", guide: "Vodič: boravak za strance" },
  en: { countries: "countries", title: "Visas and entry rules", lead: "For every country: whether its citizens enter Serbia visa-free, and what Serbian citizens need to travel there. Source: Ministry of Foreign Affairs.", toRs: "Entering Serbia", fromRs: "Travelling from Serbia", free: "Visa-free", visa: "Visa required", eviza: "eVisa", eta: "Electronic authorisation (eTA)", unknown: "Not published", stay: "Stay", conditions: "Conditions", passport: "Passport", requirements: "What to bring", official: "Official instructions (MFA)", missions: "Missions in Serbia", rsMission: "Serbian mission", none: "No mission in Serbia; an embassy in another country is competent.", all: "All countries", groupFree: "Visa-free entry to Serbia", groupVisa: "Visa needed to enter Serbia", search: "Find a country", updated: "MFA data as of", open: "Open", guide: "Guide: residence for foreigners" },
  ru: { countries: "стран", title: "Визы и условия въезда", lead: "По каждой стране: въезжают ли её граждане в Сербию без визы и что нужно гражданам Сербии для поездки туда. Источник: МИД Сербии.", toRs: "Въезд в Сербию", fromRs: "Поездка из Сербии", free: "Без визы", visa: "Нужна виза", eviza: "eVisa", eta: "Электронное разрешение (eTA)", unknown: "Не опубликовано", stay: "Пребывание", conditions: "Условия", passport: "Паспорт", requirements: "Что взять", official: "Официальная инструкция (МИД)", missions: "Представительства в Сербии", rsMission: "Представительство Сербии", none: "Представительства в Сербии нет; компетентно посольство в другой стране.", all: "Все страны", groupFree: "Без визы в Сербию", groupVisa: "Виза в Сербию", search: "Найти страну", updated: "Данные МИД от", open: "Открыть", guide: "Инструкция: ВНЖ для иностранцев" },
  de: { countries: "Länder", title: "Visa und Einreise", lead: "Für jedes Land: ob seine Bürger visumfrei nach Serbien einreisen und was serbische Bürger für die Reise dorthin brauchen. Quelle: Außenministerium.", toRs: "Einreise nach Serbien", fromRs: "Reise aus Serbien", free: "Visumfrei", visa: "Visum nötig", eviza: "eVisum", eta: "Elektronische Genehmigung (eTA)", unknown: "Nicht veröffentlicht", stay: "Aufenthalt", conditions: "Bedingungen", passport: "Reisepass", requirements: "Was mitzubringen ist", official: "Amtliche Anleitung (MFA)", missions: "Vertretungen in Serbien", rsMission: "Serbische Vertretung", none: "Keine Vertretung in Serbien; zuständig ist eine Botschaft in einem anderen Land.", all: "Alle Länder", groupFree: "Visumfrei nach Serbien", groupVisa: "Visum für Serbien", search: "Land finden", updated: "MFA-Stand", open: "Öffnen", guide: "Anleitung: Aufenthalt für Ausländer" },
};
const regimeLabel = (L: Record<string, string>, r: string | null) => r === "bez vize" ? L.free : r === "viza" ? L.visa : r === "eviza" ? L.eviza : r === "eta" ? L.eta : L.unknown;
const regimeClass = (r: string | null) => r === "bez vize" ? "is-free" : r === "viza" ? "is-visa" : r ? "is-e" : "is-unknown";

export async function VisaHub({ locale }: { locale: Locale }) {
  const d = t(locale); const L = VL[locale];
  const rows = await db.getCountries();
  const name = (c: db.CountryRow) => (locale === "sr" ? c.name_sr : c.name_en);
  const sorted = [...rows].sort((a, b) => name(a).localeCompare(name(b), locale === "sr" ? "sr-Latn" : locale));
  const free = sorted.filter((c) => c.to_rs_regime === "bez vize"), visa = sorted.filter((c) => c.to_rs_regime !== "bez vize");
  const fetched = rows.find((c) => c.source_fetched_at)?.source_fetched_at ?? null;
  const Grid = ({ list }: { list: db.CountryRow[] }) => (
    <ul className="visa-grid">
      {list.map((c) => { const Flag = flagOf(c.iso2); return (
        <li key={c.iso2}><Link href={href(locale, `/vize/${c.slug}`)} className="visa-tile card spot no-underline text-ink">
          <span className="visa-flag">{Flag ? <Flag title={name(c)} /> : c.iso2}</span>
          <span className="min-w-0"><span className="block font-medium text-[14px] truncate">{name(c)}</span>
            <span className={`visa-pill ${regimeClass(c.from_rs_regime)}`}>{L.fromRs}: {regimeLabel(L, c.from_rs_regime)}</span></span>
        </Link></li>); })}
    </ul>);
  return (
    <main>
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10 hub-head">
        <div className="hub-glyph"><Passport iso2="RS" name="Srbija" size={88} /></div>
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { href: href(locale, "/za-strance"), label: d.forForeigners }, { label: L.title }]} />
          <div className="eyebrow mt-4">{d.forForeigners}</div>
          <h1 className="display-sm text-[32px] sm:text-[40px]">{L.title}</h1>
          <p className="text-muted mt-3 max-w-[62ch] lede">{L.lead}</p>
          <p className="text-[12.5px] text-muted mt-2 font-mono">{rows.length} {L.countries}{fetched ? ` · ${L.updated} ${fetched}` : ""}</p>
        </div>
      </div></section>
      <div className="shell py-8 grid gap-10">
        <section><div className="section-head"><div><div className="eyebrow">01 · {L.groupFree}</div><h2 className="display-sm mt-2 text-[26px]">{free.length} {L.countries}</h2></div></div><Grid list={free} /></section>
        <section><div className="section-head"><div><div className="eyebrow">02 · {L.groupVisa}</div><h2 className="display-sm mt-2 text-[26px]">{visa.length} {L.countries}</h2></div></div><Grid list={visa} /></section>
      </div>
    </main>
  );
}

export async function CountryPage({ locale, country }: { locale: Locale; country: db.CountryRow }) {
  const d = t(locale); const L = VL[locale]; const c = country;
  const name = locale === "sr" ? c.name_sr : c.name_en;
  const missions = await db.getMissionsOfCountry(c.name_sr);
  const reqs: string[] = Array.isArray(c.from_rs_requirements) ? (c.from_rs_requirements as string[]) : [];
  const Panel = ({ title, regime, stay, extra, url, children }: { title: string; regime: string | null; stay: string | null; extra?: React.ReactNode; url: string | null; children?: React.ReactNode }) => (
    <section className="card p-5 visa-panel">
      <div className="eyebrow">{title}</div>
      <div className={`visa-regime ${regimeClass(regime)}`}>{regimeLabel(L, regime)}</div>
      {stay && <div className="mt-2 text-[14px]"><span className="text-muted">{L.stay}:</span> {stay}</div>}
      {extra}
      {children}
      {url && <a href={url} rel="noopener" target="_blank" className="btn-primary mt-4 inline-flex">{L.official} ↗</a>}
    </section>);
  return (
    <main>
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10 hub-head">
        <div className="hub-glyph"><Passport iso2={c.iso2} name={name} size={96} label={locale === "sr" ? "PASOŠ" : locale === "en" ? "PASSPORT" : locale === "ru" ? "ПАСПОРТ" : "REISEPASS"} /></div>
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { href: href(locale, "/vize"), label: L.title }, { label: name }]} />
          <div className="eyebrow mt-4">{L.title}</div>
          <h1 className="display-sm text-[32px] sm:text-[40px]">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`visa-pill ${regimeClass(c.to_rs_regime)}`}>{L.toRs}: {regimeLabel(L, c.to_rs_regime)}</span>
            <span className={`visa-pill ${regimeClass(c.from_rs_regime)}`}>{L.fromRs}: {regimeLabel(L, c.from_rs_regime)}</span>
          </div>
        </div>
      </div></section>
      <div className="shell py-8 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div className="grid gap-5">
          <Panel title={`${L.toRs} · ${name} → Srbija`} regime={c.to_rs_regime} stay={c.to_rs_stay} url={c.to_rs_url}
                 extra={c.to_rs_conditions ? <p className="mt-2 text-[14px] text-muted">{c.to_rs_conditions}</p> : null}>
            <p className="mt-3 text-[13.5px]"><Link href={href(locale, "/vodic/privremeni-boravak-stranci")}>{L.guide} →</Link></p>
          </Panel>
          <Panel title={`${L.fromRs} · Srbija → ${name}`} regime={c.from_rs_regime} stay={c.from_rs_stay} url={c.from_rs_url}
                 extra={c.from_rs_passport ? <div className="mt-2 text-[14px]"><span className="text-muted">{L.passport}:</span> {c.from_rs_passport}</div> : null}>
            {reqs.length > 0 && <div className="mt-3"><div className="text-[12.5px] text-muted font-mono uppercase tracking-[.1em]">{L.requirements}</div><ul className="mt-1.5 grid gap-1 text-[14px] list-disc pl-5">{reqs.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
            {c.rs_mission_name && <p className="mt-3 text-[13.5px] text-muted">{L.rsMission}: {c.rs_mission_name}{c.rs_mission_city ? `, ${c.rs_mission_city}` : ""}</p>}
          </Panel>
          <section className="card p-5">
            <div className="eyebrow">{L.missions}</div>
            {missions.length === 0 ? <p className="mt-2 text-[14px] text-muted">{L.none}</p> : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {missions.map((m) => <li key={m.id} className="card card-hover spot p-3.5">
                  <div className="eyebrow plain">{m.type_name}{m.place_name ? ` · ${m.place_name}` : ""}</div>
                  <Link href={href(locale, `/${m.type_slug}/${m.slug}`)} className="font-serif text-[17px] font-semibold no-underline text-ink hover:text-accent block mt-1">{m.name_lat}</Link>
                  <div className="mt-1.5 text-[13px] flex flex-wrap gap-x-4">{m.phone && <a href={`tel:${m.phone}`} className="vital-tel">{m.phone_display ?? m.phone}</a>}{m.website && <a href={m.website} rel="noopener" target="_blank" className="text-muted">{m.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}</div>
                </li>)}
              </ul>)}
          </section>
        </div>
        <aside className="grid gap-5 lg:sticky lg:top-20">
          <div className="card p-5 flex justify-center bg-surface-2"><Passport iso2={c.iso2} name={name} size={200} label={locale === "sr" ? "PASOŠ" : locale === "en" ? "PASSPORT" : locale === "ru" ? "ПАСПОРТ" : "REISEPASS"} /></div>
          <div className="card p-4 text-[13px] text-muted">{c.source_fetched_at ? `${L.updated} ${c.source_fetched_at}. ` : ""}{locale === "sr" ? "Pravila se menjaju; pre puta proverite zvanično uputstvo." : locale === "en" ? "Rules change; check the official instructions before travelling." : locale === "ru" ? "Правила меняются; перед поездкой сверьтесь с официальной инструкцией." : "Regeln ändern sich; prüfen Sie vor der Reise die amtliche Anleitung."}</div>
        </aside>
      </div>
    </main>
  );
}
