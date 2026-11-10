import Link from "next/link";
import * as db from "@/lib/db";
import { smartSearch, type Place } from "@/lib/search";
import { inPlace } from "@/lib/grammar";
import { href, t, type Locale, tn } from "@/lib/i18n";
import { Breadcrumbs, SectionTitle } from "./ui";
import SearchBox from "./SearchBox";
import { Icon } from "./icons";
import { content as guideContent } from "./guides";

const L: Record<Locale, Record<string, string>> = {
  sr: { bestFor: "Najbolji odgovor", inPlace: "u", guides: "Vodiči", types: "Vrste institucija", places: "Opštine i okruzi", orgs: "Institucije", open: "Otvori", all: "Prikaži sve", noPhone: "telefon još nije unet", noAddress: "tačna adresa još nije uneta", whereFor: "Nadležno za", tip: "Upišite šta vam treba i grad, npr. „pasoš Kragujevac“." },
  en: { bestFor: "Best answer", inPlace: "in", guides: "Guides", types: "Institution types", places: "Municipalities and districts", orgs: "Institutions", open: "Open", all: "Show all", noPhone: "phone not yet entered", noAddress: "exact address not yet entered", whereFor: "Serving", tip: "Type what you need and the town, e.g. “passport Kragujevac”." },
  ru: { bestFor: "Лучший ответ", inPlace: "в", guides: "Инструкции", types: "Типы учреждений", places: "Общины и округа", orgs: "Учреждения", open: "Открыть", all: "Показать все", noPhone: "телефон ещё не внесён", noAddress: "точный адрес ещё не внесён", whereFor: "Обслуживает", tip: "Совет: напишите, что вам нужно, и город, например «pasoš Kragujevac»." },
  de: { bestFor: "Beste Antwort", inPlace: "in", guides: "Anleitungen", types: "Arten von Einrichtungen", places: "Gemeinden und Bezirke", orgs: "Einrichtungen", open: "Öffnen", all: "Alle anzeigen", noPhone: "Telefon folgt", noAddress: "genaue Adresse folgt", whereFor: "Zuständig für", tip: "Tipp: Anliegen und Ort eingeben, z. B. „pasoš Kragujevac“." },
};
const placeHref = (locale: Locale, p: Place) => href(locale, p.level === "okrug" ? `/okrug/${p.slug}` : p.level === "gradska_opstina" ? `/${p.parent_slug}/${p.slug}` : `/${p.slug}`);
const DAYS: Record<Locale, string[]> = { sr: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] };
function hoursLine(rows: db.Hours[], locale: Locale): string | null {
  const use = rows.filter((r) => r.hours_type === "rad_sa_strankama").length ? rows.filter((r) => r.hours_type === "rad_sa_strankama") : rows;
  if (!use.length) return null;
  const f = use[0], l = use[use.length - 1];
  return `${DAYS[locale][f.day_of_week - 1]}${l.day_of_week > f.day_of_week ? `–${DAYS[locale][l.day_of_week - 1]}` : ""} ${f.opens.slice(0, 5)}–${f.closes.slice(0, 5)}`;
}

function ServingList({ serving, contacts, hours, locale }: { serving: db.ServingRow[]; contacts: (db.Contact & { location_id: number })[]; hours: db.Hours[]; locale: Locale }) {
  const s = L[locale];
  return (
    <ul className="grid gap-2 mt-3">
      {serving.slice(0, 3).map((x) => { const ph = contacts.filter((c) => c.location_id === x.location_id && (c.kind === "phone" || c.kind === "mobile")); const hl = hoursLine(hours.filter((h) => h.location_id === x.location_id), locale); return (
        <li key={x.location_id} className="rounded-xl border border-line bg-surface p-3.5 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <div className="eyebrow">{x.org_name_lat}</div>
            <Link href={href(locale, `/${x.org_type_slug}/${x.org_slug}/${x.location_slug}`)} className="font-serif text-[17px] font-semibold no-underline text-ink hover:text-accent">{x.unit_name_lat}</Link>
            <div className="text-[13px] text-muted mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              <span className="inline-flex items-center gap-1"><Icon.pin /> {x.address_display ? `${x.address_display}, ${x.jls_name_lat ?? ""}` : `${x.jls_name_lat ?? ""} · ${s.noAddress}`}</span>
              <span className="inline-flex items-center gap-1 tabular"><Icon.phone /> {ph[0] ? <a href={`tel:${ph[0].value}`}>{ph[0].value_display ?? ph[0].value}</a> : s.noPhone}</span>
              {(hl ?? x.hours_text) && <span className="inline-flex items-center gap-1"><Icon.clock /> {hl ?? x.hours_text}</span>}
            </div>
          </div>
          <Link href={href(locale, `/${x.org_type_slug}/${x.org_slug}/${x.location_slug}`)} className="quick-chip self-start">{s.open} →</Link>
        </li>); })}
    </ul>
  );
}

export async function SmartSearchPage({ locale, q }: { locale: Locale; q: string }) {
  const d = t(locale); const s = L[locale];
  const r = q.trim().length >= 2 ? await smartSearch(q.trim(), locale) : null;
  const placeQ = r?.place && r.place.level !== "okrug" ? `?opstina=${r.place.level === "gradska_opstina" ? r.place.parent_slug : r.place.slug}` : "";
  return (
    <main>
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-10">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.search }]} />
        <h1 className="font-serif text-[26px] sm:text-[32px] font-semibold mt-4">{q ? <>{d.results} „{q}“</> : d.search}</h1>
        <div className="mt-4"><SearchBox locale={locale} defaultValue={q} large placeholder={d.searchPlaceholder} submitLabel={d.search} /></div>
        {!q && <p className="text-muted text-[13.5px] mt-3">{s.tip}</p>}
      </div></section>
      <div className="shell py-8 grid gap-9">
        {r && r.total === 0 && <p className="text-muted">{d.noResults}<br /><span className="text-[13.5px]">{s.tip}</span></p>}

        {r?.best && (
          <section className="rounded-2xl p-5 sm:p-6 border border-line bg-surface best-answer">
            <div className="eyebrow">{s.bestFor}{r.place ? ` · ${r.place.name_lat}` : ""}</div>
            {r.best.kind === "guide" && (() => { const g = r.best.guide; const c = guideContent(g, locale).c; return (
              <>
                <Link href={href(locale, `/vodic/${g.slug}${placeQ}`)} className="font-serif text-[24px] font-semibold leading-tight no-underline text-ink hover:text-accent block mt-1">{c.title ?? g.name_lat}</Link>
                <p className="text-[14.5px] text-muted mt-1.5 max-w-2xl">{c.summary ?? g.summary}</p>
                {r.best.serving.length > 0 ? <ServingList serving={r.best.serving} contacts={r.best.contacts} hours={r.best.hours} locale={locale} /> : null}
                <Link href={href(locale, `/vodic/${g.slug}${placeQ}`)} className="btn-primary mt-4">{locale === "sr" ? "Otvori vodič" : locale === "en" ? "Open guide" : locale === "ru" ? "Открыть инструкцию" : "Anleitung öffnen"} →</Link>
              </>); })()}
            {r.best.kind === "type" && (
              <>
                <Link href={href(locale, `/${r.best.type.slug}`)} className="font-serif text-[24px] font-semibold leading-tight no-underline text-ink hover:text-accent block mt-1">{tn(r.best.type, locale)}{r.place ? ` ${locale === "sr" ? inPlace(r.place.name_lat) : `${s.inPlace} ${r.place.name_lat}`}` : ""}</Link>
                {r.best.serving.length > 0 ? <ServingList serving={r.best.serving} contacts={r.best.contacts} hours={r.best.hours} locale={locale} /> : <p className="text-muted text-[14px] mt-2">{d.noData}</p>}
                <Link href={href(locale, `/${r.best.type.slug}`)} className="quick-chip mt-4">{s.all} →</Link>
              </>
            )}
            {r.best.kind === "place" && (
              <Link href={placeHref(locale, r.best.place)} className="font-serif text-[24px] font-semibold leading-tight no-underline text-ink hover:text-accent block mt-1">{r.best.place.name_lat} →</Link>
            )}
          </section>
        )}

        {r && r.guides.length > 0 && <section><SectionTitle>{s.guides}</SectionTitle>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{r.guides.map((g) => { const c = guideContent(g, locale).c; return (
            <li key={g.id} className="card card-hover p-4"><div className="eyebrow">{g.category_name}</div><Link href={href(locale, `/vodic/${g.slug}${placeQ}`)} className="font-serif text-[17px] font-semibold no-underline text-ink hover:text-accent block mt-0.5">{c.title ?? g.name_lat}</Link><p className="text-[13px] text-muted mt-1 line-clamp-2">{c.summary ?? g.summary}</p></li>); })}</ul></section>}

        {r && r.types.length > 0 && <section><SectionTitle>{s.types}</SectionTitle>
          <ul className="flex flex-wrap gap-2">{r.types.map((ty) => <li key={ty.id}><Link href={href(locale, `/${ty.slug}`)} className="quick-chip">{tn(ty, locale)}<span className="text-muted tabular ml-1.5">{ty.org_count}</span></Link></li>)}</ul></section>}

        {r && r.places.length > 0 && !(r.best?.kind === "place") && <section><SectionTitle>{s.places}</SectionTitle>
          <ul className="flex flex-wrap gap-2">{r.places.map((p) => <li key={p.id}><Link href={placeHref(locale, p)} className="quick-chip"><Icon.pin /> {p.name_lat}</Link></li>)}</ul></section>}

        {r && r.orgs.length > 0 && <section><SectionTitle>{s.orgs}{r.place ? <span className="text-muted font-normal text-[14px]"> · {r.place.name_lat}</span> : null}</SectionTitle>
          <ul className="grid gap-2 max-w-3xl">{r.orgs.map((h, i) => (
            <li key={i} className="card card-hover px-4 py-3 flex items-start gap-3">
              <span className="icon-badge !w-9 !h-9 shrink-0 mt-0.5"><Icon.landmark /></span>
              <div className="min-w-0"><Link href={href(locale, `/${h.type_slug}/${h.slug}`)} className="font-medium no-underline text-ink text-[15px] hover:text-accent">{h.name_lat}</Link><div className="text-[12.5px] text-muted">{h.sub}</div></div>
            </li>))}</ul></section>}
      </div>
    </main>
  );
}
