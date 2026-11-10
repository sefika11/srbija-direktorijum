import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import * as db from "@/lib/db";
import { Breadcrumbs } from "./ui";
import PassportGlobe from "./PassportGlobe";
import VisaStage from "./VisaStage";
import { Passport, flagOf } from "./Passport";

const VL: Record<Locale, Record<string, string>> = {
  sr: { srNote: "", howTo: "Kako do vize", where: "Gde se predaje", apply: "Prijava / obrazac", appointment: "Zakazivanje", docs: "Dokumenta", fee: "Taksa", processing: "Rok obrade", validity: "Važenje", notes: "Napomena", noIns: "Zvanično uputstvo još nije preuzeto; proverite stranicu ambasade.", toRsHow: "Kako do vize za Srbiju", visaC: "Viza C (kratki boravak)", visaD: "Viza D (duži boravak)", forms: "Obrasci", exempt: "Oslobođeni vize", countries: "država", title: "Vize i uslovi ulaska", lead: "Za svaku državu: da li njeni građani ulaze u Srbiju bez vize, i šta treba građanima Srbije za put tamo. Izvor: Ministarstvo spoljnih poslova.", toRs: "Ulazak u Srbiju", fromRs: "Putovanje iz Srbije", free: "Bez vize", visa: "Viza potrebna", eviza: "eViza", eta: "Elektronska dozvola (eTA)", unknown: "Nije objavljeno", stay: "Boravak", conditions: "Uslovi", passport: "Pasoš", requirements: "Šta treba poneti", official: "Zvanično uputstvo (MSP)", missions: "Predstavništva u Srbiji", rsMission: "Predstavništvo Srbije", none: "Nema predstavništva u Srbiji; nadležna je ambasada u drugoj državi.", all: "Sve države", groupFree: "Bez vize za ulazak u Srbiju", groupVisa: "Viza za ulazak u Srbiju", search: "Nađite državu", updated: "Podaci MSP od", open: "Otvori", guide: "Vodič: boravak za strance" },
  en: { srNote: "The step-by-step instructions below are quoted from the Serbian Ministry of Foreign Affairs in Serbian; the official source linked above has the English version.", howTo: "How to get the visa", where: "Where to apply", apply: "Application / form", appointment: "Appointment", docs: "Documents", fee: "Fee", processing: "Processing time", validity: "Validity", notes: "Note", noIns: "Official instructions not yet collected; check the embassy page.", toRsHow: "How to get a Serbian visa", visaC: "Visa C (short stay)", visaD: "Visa D (long stay)", forms: "Forms", exempt: "Exempt from visa", countries: "countries", title: "Visas and entry rules", lead: "For every country: whether its citizens enter Serbia visa-free, and what Serbian citizens need to travel there. Source: Ministry of Foreign Affairs.", toRs: "Entering Serbia", fromRs: "Travelling from Serbia", free: "Visa-free", visa: "Visa required", eviza: "eVisa", eta: "Electronic authorisation (eTA)", unknown: "Not published", stay: "Stay", conditions: "Conditions", passport: "Passport", requirements: "What to bring", official: "Official instructions (MFA)", missions: "Missions in Serbia", rsMission: "Serbian mission", none: "No mission in Serbia; an embassy in another country is competent.", all: "All countries", groupFree: "Visa-free entry to Serbia", groupVisa: "Visa needed to enter Serbia", search: "Find a country", updated: "MFA data as of", open: "Open", guide: "Guide: residence for foreigners" },
  ru: { srNote: "Пошаговые инструкции ниже приведены на сербском языке по данным МИД Сербии; официальный источник по ссылке выше.", howTo: "Как получить визу", where: "Куда подавать", apply: "Заявление / форма", appointment: "Запись", docs: "Документы", fee: "Сбор", processing: "Срок рассмотрения", validity: "Срок действия", notes: "Примечание", noIns: "Официальная инструкция ещё не собрана; проверьте сайт посольства.", toRsHow: "Как получить визу в Сербию", visaC: "Виза C (краткосрочная)", visaD: "Виза D (долгосрочная)", forms: "Формы", exempt: "Без визы", countries: "стран", title: "Визы и условия въезда", lead: "По каждой стране: въезжают ли её граждане в Сербию без визы и что нужно гражданам Сербии для поездки туда. Источник: МИД Сербии.", toRs: "Въезд в Сербию", fromRs: "Поездка из Сербии", free: "Без визы", visa: "Нужна виза", eviza: "eVisa", eta: "Электронное разрешение (eTA)", unknown: "Не опубликовано", stay: "Пребывание", conditions: "Условия", passport: "Паспорт", requirements: "Что взять", official: "Официальная инструкция (МИД)", missions: "Представительства в Сербии", rsMission: "Представительство Сербии", none: "Представительства в Сербии нет; компетентно посольство в другой стране.", all: "Все страны", groupFree: "Без визы в Сербию", groupVisa: "Виза в Сербию", search: "Найти страну", updated: "Данные МИД от", open: "Открыть", guide: "Инструкция: ВНЖ для иностранцев" },
  de: { srNote: "Die Schritte unten sind auf Serbisch vom serbischen Außenministerium übernommen; die offizielle Quelle oben hat die deutsche bzw. englische Fassung.", howTo: "So bekommen Sie das Visum", where: "Wo beantragen", apply: "Antrag / Formular", appointment: "Termin", docs: "Unterlagen", fee: "Gebühr", processing: "Bearbeitungszeit", validity: "Gültigkeit", notes: "Hinweis", noIns: "Amtliche Anleitung noch nicht erfasst; Botschaftsseite prüfen.", toRsHow: "So bekommen Sie ein serbisches Visum", visaC: "Visum C (Kurzaufenthalt)", visaD: "Visum D (Langaufenthalt)", forms: "Formulare", exempt: "Visumfrei", countries: "Länder", title: "Visa und Einreise", lead: "Für jedes Land: ob seine Bürger visumfrei nach Serbien einreisen und was serbische Bürger für die Reise dorthin brauchen. Quelle: Außenministerium.", toRs: "Einreise nach Serbien", fromRs: "Reise aus Serbien", free: "Visumfrei", visa: "Visum nötig", eviza: "eVisum", eta: "Elektronische Genehmigung (eTA)", unknown: "Nicht veröffentlicht", stay: "Aufenthalt", conditions: "Bedingungen", passport: "Reisepass", requirements: "Was mitzubringen ist", official: "Amtliche Anleitung (MFA)", missions: "Vertretungen in Serbien", rsMission: "Serbische Vertretung", none: "Keine Vertretung in Serbien; zuständig ist eine Botschaft in einem anderen Land.", all: "Alle Länder", groupFree: "Visumfrei nach Serbien", groupVisa: "Visum für Serbien", search: "Land finden", updated: "MFA-Stand", open: "Öffnen", guide: "Anleitung: Aufenthalt für Ausländer" },
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
        <VisaStage locale={locale} countries={sorted.map((c) => ({ iso2: c.iso2, slug: c.slug, name: name(c), to: c.to_rs_regime, from: c.from_rs_regime }))} />
        <section><div className="section-head"><div><div className="eyebrow">01 · {L.groupFree}</div><h2 className="display-sm mt-2 text-[26px]">{free.length} {L.countries}</h2></div></div><Grid list={free} /></section>
        <section><div className="section-head"><div><div className="eyebrow">02 · {L.groupVisa}</div><h2 className="display-sm mt-2 text-[26px]">{visa.length} {L.countries}</h2></div></div><Grid list={visa} /></section>
      </div>
    </main>
  );
}

export async function CountryPage({ locale, country }: { locale: Locale; country: db.CountryRow }) {
  const d = t(locale); const L = VL[locale];
  // translated texts per locale (countries.i18n), falling back to the source field by field
  const tr = (country.i18n ?? null)?.[locale] as Partial<db.CountryRow> | undefined;
  const c: db.CountryRow = tr ? { ...country, ...Object.fromEntries(Object.entries(tr).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))) } as db.CountryRow : country;
  const translated = !!tr;
  const name = locale === "sr" ? c.name_sr : c.name_en;
  const [missions, general] = await Promise.all([db.getMissionsOfCountry(c.name_sr), c.to_rs_regime && c.to_rs_regime !== "bez vize" ? db.getVisaGeneral(locale).catch(() => null) : Promise.resolve(null)]);
  const ins = c.from_rs_instructions ?? null;
  const reqs: string[] = Array.isArray(c.from_rs_requirements) ? (c.from_rs_requirements as string[]) : [];
  const Steps = ({ i, title }: { i: db.VisaInstructions; title: string }) => (
    <section className="card p-5 visa-steps">
      <div className="eyebrow">{title}</div>
      <ol className="visa-ol">
        {i.where && <li><b>{L.where}</b><span>{i.where}</span></li>}
        {(i.apply_url || i.appointment_url) && <li><b>{L.apply}</b><span className="flex flex-wrap gap-x-4 gap-y-1">{i.apply_url && <a href={i.apply_url} rel="noopener" target="_blank">{L.apply} ↗</a>}{i.appointment_url && <a href={i.appointment_url} rel="noopener" target="_blank">{L.appointment} ↗</a>}</span></li>}
        {i.documents && i.documents.length > 0 && <li><b>{L.docs}</b><ul className="list-disc pl-5 grid gap-1">{i.documents.map((d, k) => <li key={k}>{d}</li>)}</ul></li>}
        {(i.fee || i.processing || i.validity) && <li><b>{L.fee} · {L.processing} · {L.validity}</b><span className="visa-facts">{i.fee && <em>{L.fee}: {i.fee}</em>}{i.processing && <em>{L.processing}: {i.processing}</em>}{i.validity && <em>{L.validity}: {i.validity}</em>}</span></li>}
        {i.notes && <li><b>{L.notes}</b><span>{i.notes}</span></li>}
      </ol>
      {i.source_url && <a href={i.source_url} rel="noopener" target="_blank" className="text-[12.5px] text-muted mt-3 inline-block">{L.official}: {i.source_url.replace(/^https?:\/\//, "").split("/")[0]} ↗</a>}
    </section>);
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
          {locale !== "sr" && !translated && ins && c.from_rs_regime && c.from_rs_regime !== "bez vize" && <p className="text-[12.5px] text-muted -mb-2">{L.srNote}</p>}
          {c.from_rs_regime && c.from_rs_regime !== "bez vize" && (ins ? <Steps i={ins} title={`${L.howTo} · ${name}`} /> : <section className="card p-5"><div className="eyebrow">{L.howTo}</div><p className="mt-2 text-[14px] text-muted">{c.instructions_note ?? L.noIns}</p></section>)}
          {general?.visa_c && <Steps i={{ ...general.visa_c, notes: [general.visa_c.notes, general.visa_c.exemptions?.length ? `${L.exempt}: ${general.visa_c.exemptions.join("; ")}` : null].filter(Boolean).join(" ") || null }} title={`${L.toRsHow} · ${L.visaC}`} />}
          {general?.visa_d && <Steps i={general.visa_d} title={`${L.toRsHow} · ${L.visaD}`} />}
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
          <div className="card p-5 bg-surface-2"><PassportGlobe iso2={c.iso2} name={name} size={200} label={locale === "sr" ? "PASOŠ" : locale === "en" ? "PASSPORT" : locale === "ru" ? "ПАСПОРТ" : "REISEPASS"} homeLabel="Srbija" open={locale === "sr" ? "Otvori pasoš · globus" : locale === "en" ? "Open the passport · globe" : locale === "ru" ? "Открыть паспорт · глобус" : "Pass öffnen · Globus"} close={locale === "sr" ? "Zatvori globus" : locale === "en" ? "Close the globe" : locale === "ru" ? "Закрыть глобус" : "Globus schließen"} /></div>
          <div className="card p-4 text-[13px] text-muted">{c.source_fetched_at ? `${L.updated} ${c.source_fetched_at}. ` : ""}{locale === "sr" ? "Pravila se menjaju; pre puta proverite zvanično uputstvo." : locale === "en" ? "Rules change; check the official instructions before travelling." : locale === "ru" ? "Правила меняются; перед поездкой сверьтесь с официальной инструкцией." : "Regeln ändern sich; prüfen Sie vor der Reise die amtliche Anleitung."}</div>
        </aside>
      </div>
    </main>
  );
}
