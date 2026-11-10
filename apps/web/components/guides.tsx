import Link from "next/link";
import * as db from "@/lib/db";
import { href, t, type Locale, tn } from "@/lib/i18n";
import { AdSlot, Breadcrumbs, SectionTitle } from "./ui";
import { LeadForm, CorrectionBlock } from "./forms";
import { Icon } from "./icons";
import MunicipalityPicker from "./MunicipalityPicker";
import JourneyBoard, { type Station } from "./JourneyBoard";
import { emblemFor } from "@/lib/emblem-map";
import manifest from "@/public/emblems/manifest.json";
const EMBLEM_KEYS = new Set<string>(manifest.keys);

export const GUIDE_LABELS = {
  sr: { guides: "Vodiči", guidesLead: "Kako se šta rešava: dokumenta, takse, rokovi i tačno mesto gde idete u vašoj opštini.", yourMunicipality: "Vaša opština", choose: "Izaberite grad ili opštinu…",
        whereToGo: "Gde se ide", whoCan: "Ko može", documents: "Šta poneti", fees: "Koliko košta", duration: "Koliko traje", steps: "Koraci", faq: "Česta pitanja", forForeigners: "Za strane državljane",
        sources: "Izvori", checked: "Provereno", euprava: "Elektronski preko eUprave", shortNotice: "Kratki vodič: proverili smo nadležnu instituciju; detaljan opis dokumenata i taksi dodajemo uskoro.",
        servingFor: "Nadležno za", noServing: "Za izabranu opštinu još nemamo tačnu adresu. Pogledajte spisak svih lokacija:", pickHint: "Izaberite opštinu da vidite tačnu adresu, telefon i radno vreme nadležne službe.",
        call: "Pozovi", open: "Otvori", allLocations: "Sve lokacije", amount: "Iznos", basis: "Osnov", variants: "Napomena", relatedTypes: "Nadležne institucije", inPreparation: "u pripremi", otherGuides: "Drugi vodiči", free: "bez takse", rsd: "RSD", journey: "Put kroz postupak", scrollHint: "Listajte ↓" },
  en: { guides: "Guides", guidesLead: "How things get done: documents, fees, deadlines and the exact office to visit in your municipality.", yourMunicipality: "Your municipality", choose: "Choose a city or municipality…",
        whereToGo: "Where to go", whoCan: "Who can apply", documents: "What to bring", fees: "Fees", duration: "How long it takes", steps: "Steps", faq: "Frequently asked", forForeigners: "For foreign nationals",
        sources: "Sources", checked: "Checked", euprava: "Online via eUprava", shortNotice: "Short guide: the competent institution is verified; the detailed document and fee list is coming soon.",
        servingFor: "Serving", noServing: "We do not yet have the exact office for this municipality. See all locations:", pickHint: "Pick your municipality to see the exact address, phone and hours of the competent office.",
        call: "Call", open: "Open", allLocations: "All locations", amount: "Amount", basis: "Basis", variants: "Note", relatedTypes: "Competent institutions", inPreparation: "in preparation", otherGuides: "Other guides", free: "no fee", rsd: "RSD", journey: "The procedure, station by station", scrollHint: "Scroll ↓" },
  ru: { guides: "Инструкции", guidesLead: "Как всё оформить: документы, пошлины, сроки и точное место, куда идти в вашей общине.", yourMunicipality: "Ваша община", choose: "Выберите город или общину…",
        whereToGo: "Куда идти", whoCan: "Кто может", documents: "Что взять с собой", fees: "Сколько стоит", duration: "Сколько длится", steps: "Шаги", faq: "Частые вопросы", forForeigners: "Для иностранцев",
        sources: "Источники", checked: "Проверено", euprava: "Онлайн через eUprava", shortNotice: "Краткая инструкция: компетентное учреждение проверено; подробный список документов и пошлин скоро.",
        servingFor: "Обслуживает", noServing: "Для выбранной общины точного адреса пока нет. Смотрите все адреса:", pickHint: "Выберите общину, чтобы увидеть адрес, телефон и часы работы компетентной службы.",
        call: "Позвонить", open: "Открыть", allLocations: "Все адреса", amount: "Сумма", basis: "Основание", variants: "Примечание", relatedTypes: "Компетентные учреждения", inPreparation: "готовится", otherGuides: "Другие инструкции", free: "без пошлины", rsd: "RSD", journey: "Путь по процедуре", scrollHint: "Листайте ↓" },
  de: { guides: "Anleitungen", guidesLead: "So geht es: Unterlagen, Gebühren, Fristen und die genaue Stelle in Ihrer Gemeinde.", yourMunicipality: "Ihre Gemeinde", choose: "Stadt oder Gemeinde wählen…",
        whereToGo: "Wohin", whoCan: "Wer kann", documents: "Was mitbringen", fees: "Gebühren", duration: "Dauer", steps: "Schritte", faq: "Häufige Fragen", forForeigners: "Für Ausländer",
        sources: "Quellen", checked: "Geprüft", euprava: "Online über eUprava", shortNotice: "Kurzanleitung: die zuständige Stelle ist geprüft; die ausführliche Liste der Unterlagen und Gebühren folgt in Kürze.",
        servingFor: "Zuständig für", noServing: "Für die gewählte Gemeinde fehlt noch die genaue Stelle. Alle Standorte:", pickHint: "Wählen Sie Ihre Gemeinde, um Adresse, Telefon und Öffnungszeiten der zuständigen Stelle zu sehen.",
        call: "Anrufen", open: "Öffnen", allLocations: "Alle Standorte", amount: "Betrag", basis: "Grundlage", variants: "Hinweis", relatedTypes: "Zuständige Stellen", inPreparation: "in Vorbereitung", otherGuides: "Weitere Anleitungen", free: "gebührenfrei", rsd: "RSD", journey: "Der Weg durch das Verfahren", scrollHint: "Scrollen ↓" },
} as const;

const DAYS: Record<Locale, string[]> = { sr: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] };

/** Pick the locale's content, falling back en → sr so a guide never renders empty. */
export function content(g: db.GuideRow, locale: Locale): { c: db.GuideContent; lang: Locale } {
  for (const l of [locale, "en", "sr"] as Locale[]) if (g.guide[l] && Object.keys(g.guide[l]).length) return { c: g.guide[l], lang: l };
  return { c: {}, lang: "sr" };
}
const fmtRsd = (n: number) => n.toLocaleString("sr-Latn", { maximumFractionDigits: 0 });
function compactHours(rows: db.Hours[], locale: Locale): string[] {
  const pref = rows.filter((r) => r.hours_type === "rad_sa_strankama"); const use = pref.length ? pref : rows;
  const out: string[] = []; let run: { from: number; to: number; o: string; c: string } | null = null;
  for (const r of use) {
    const o = r.opens.slice(0, 5), c = r.closes.slice(0, 5);
    if (run && run.o === o && run.c === c && r.day_of_week === run.to + 1) run.to = r.day_of_week;
    else { if (run) out.push(fmtRun(run, locale)); run = { from: r.day_of_week, to: r.day_of_week, o, c }; }
  }
  if (run) out.push(fmtRun(run, locale));
  return out;
}
const fmtRun = (r: { from: number; to: number; o: string; c: string }, locale: Locale) => `${DAYS[locale][r.from - 1]}${r.to > r.from ? `–${DAYS[locale][r.to - 1]}` : ""} ${r.o}–${r.c}`;

// ---------------------------------------------------------------- Hub
export async function GuidesHub({ locale }: { locale: Locale }) {
  const d = t(locale); const L = GUIDE_LABELS[locale];
  const guides = await db.getGuides();
  const cats = new Map<string, { name: string; items: db.GuideRow[] }>();
  for (const g of guides) { const c = cats.get(g.category_slug) ?? { name: g.category_name, items: [] }; c.items.push(g); cats.set(g.category_slug, c); }
  return (
    <main id="main">
      <section className="hero-light border-b border-line"><div className="shell py-10 sm:py-14">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: L.guides }]} />
        <h1 className="font-serif text-[32px] sm:text-[40px] font-semibold leading-[1.1] mt-4 max-w-3xl">{L.guides}</h1>
        <p className="text-muted mt-3 text-[16px] max-w-2xl">{L.guidesLead}</p>
      </div></section>
      <section className="shell py-10 grid gap-8">
        {[...cats.entries()].map(([slug, c]) => (
          <div key={slug}>
            <SectionTitle>{c.name}</SectionTitle>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {c.items.map((g) => { const { c: gc } = content(g, locale); return (
                <li key={g.id} className="card card-hover fold p-5 flex flex-col">
                  <Link href={href(locale, `/vodic/${g.slug}`)} className="font-serif text-[19px] font-semibold leading-snug no-underline text-ink hover:text-accent">{gc.title ?? g.name_lat}</Link>
                  <p className="text-muted text-[13.5px] mt-2 flex-1">{gc.summary ?? g.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">{g.status === "full" ? <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5 font-medium">✓ {L.checked}{g.checked_at ? ` ${g.checked_at}` : ""}</span> : <span className="rounded-full bg-surface-2 px-2 py-0.5">{L.inPreparation}</span>}{g.online_available && <span className="rounded-full bg-accent-soft text-accent-ink px-2 py-0.5">eUprava</span>}</div>
                </li>); })}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------- Guide page
export async function GuidePage({ locale, guide, jlsSlug, path }: { locale: Locale; guide: db.GuideRow; jlsSlug: string | null; path: string }) {
  const d = t(locale); const L = GUIDE_LABELS[locale];
  const { c, lang } = content(guide, locale);
  const [allJls, jls] = await Promise.all([db.getAllJls(), jlsSlug ? db.getTU(jlsSlug, "jls") : Promise.resolve(null)]);
  const primaryType = guide.org_type_slugs[0] ?? null;
  const [types, serving, vertical, others] = await Promise.all([
    Promise.all(guide.org_type_slugs.map((s) => db.getOrgType(s))),
    jls && primaryType ? db.getServing(jls.id, primaryType) : Promise.resolve([] as db.ServingRow[]),
    guide.lead_vertical_id ? db.getVerticalById(guide.lead_vertical_id) : Promise.resolve(null),
    db.getGuides(),
  ]);
  const ids = serving.map((s) => s.location_id);
  const [contacts, hours] = await Promise.all([db.getContacts(ids), db.getHours(ids)]);
  const basePath = href(locale, `/vodic/${guide.slug}`);
  const title = c.title ?? guide.name_lat;
  const faqLd = c.faq?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const otherGuides = others.filter((g) => g.id !== guide.id && g.category_slug === guide.category_slug).slice(0, 5);
  const stations: Station[] = [
    { id: "gde", kind: "where", label: L.whereToGo },
    ...(c.who?.length ? [{ id: "ko", kind: "who" as const, label: L.whoCan }] : []),
    ...(c.documents?.length ? [{ id: "dokumenta", kind: "docs" as const, label: L.documents, n: c.documents.length }] : []),
    ...(guide.fees?.length ? [{ id: "takse", kind: "fees" as const, label: L.fees }] : []),
    ...(c.steps?.length ? [{ id: "koraci", kind: "steps" as const, label: L.steps, n: c.steps.length }] : []),
    ...(guide.typical_duration ? [{ id: "trajanje", kind: "duration" as const, label: L.duration }] : []),
    ...(c.faq?.length ? [{ id: "faq", kind: "faq" as const, label: L.faq }] : []),
  ];
  const emblemKey = emblemFor(primaryType, types[0]?.icon); const emblem = emblemKey && EMBLEM_KEYS.has(emblemKey) ? emblemKey : "townhall";
  const sideCards = (<>
    {types.filter(Boolean).length > 0 && <div className="card p-4"><div className="eyebrow mb-2">{L.relatedTypes}</div><ul className="grid gap-1.5 text-[13.5px]">{types.filter(Boolean).map((ty) => <li key={ty!.id}><Link href={href(locale, `/${ty!.slug}`)} className="no-underline text-ink hover:text-accent">{tn(ty!, locale)} →</Link></li>)}</ul></div>}
    {otherGuides.length > 0 && <div className="card p-4"><div className="eyebrow mb-2">{L.otherGuides}</div><ul className="grid gap-1.5 text-[13.5px]">{otherGuides.map((g) => <li key={g.id}><Link href={href(locale, `/vodic/${g.slug}`)} className="no-underline text-ink hover:text-accent">{content(g, locale).c.title ?? g.name_lat}</Link></li>)}</ul></div>}
  </>);
  return (
    <main id="main">
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-12">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { href: href(locale, "/vodici"), label: L.guides }, { label: guide.category_name }]} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-end mt-4">
          <div>
            <div className="eyebrow text-accent-ink">{guide.category_name}</div>
            <h1 className="font-serif text-[30px] sm:text-[40px] font-semibold leading-[1.1] mt-1">{title}</h1>
            {(c.summary ?? guide.summary) && <p className="text-muted mt-3 text-[16px] max-w-2xl">{c.summary ?? guide.summary}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
              {guide.status === "full" && guide.checked_at && <span className="rounded-full bg-gold-soft text-gold px-2.5 py-1 font-medium">✓ {L.checked} {guide.checked_at}</span>}
              {guide.typical_duration && <span className="rounded-full bg-surface-2 px-2.5 py-1"><Icon.clock /> {guide.typical_duration}</span>}
              {guide.euprava_url && <a href={guide.euprava_url} rel="noopener" target="_blank" className="rounded-full bg-accent-soft text-accent-ink px-2.5 py-1 no-underline">{L.euprava} ↗</a>}
              {lang !== locale && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">{lang.toUpperCase()}</span>}
            </div>
          </div>
          <div className="card plinth p-4">
            <MunicipalityPicker units={allJls.map((u) => ({ slug: u.slug, name_lat: u.name_lat, jls_kind: u.jls_kind }))} value={jls?.slug ?? null} basePath={basePath} label={L.yourMunicipality} placeholder={L.choose} />
            {!jls && <p className="text-[12.5px] text-muted mt-2">{L.pickHint}</p>}
          </div>
        </div>
      </div></section>

      <div className="shell py-8 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 items-start">
        <div className="jstage-col lg:col-start-2 lg:row-start-1 self-start">
          <JourneyBoard stations={stations} emblem={emblem} pin={jls ? (jls.seat_name_lat ?? jls.name_lat) : null} labels={{ hint: L.scrollHint, stage: L.journey }} />
          <div className="jstage-aside grid gap-4">{sideCards}<AdSlot code="svc_jls_sidebar_sponsor" w={300} h={250} label={d.sponsor} /></div>
        </div>
        <article className="grid gap-9 min-w-0 lg:col-start-1 lg:row-start-1">
          {/* Where to go */}
          <div className="read-rail" aria-hidden><i /></div>
          <section id="gde" data-reveal data-fx="flip">
            <SectionTitle>{L.whereToGo}</SectionTitle>
            {c.where_note && <p className="text-[14.5px] mb-3">{c.where_note}</p>}
            {jls && serving.length > 0 ? (
              <ul className="grid gap-3">
                {serving.map((s, i) => { const ph = contacts.filter((x) => x.location_id === s.location_id && (x.kind === "phone" || x.kind === "mobile")); const hr = compactHours(hours.filter((h) => h.location_id === s.location_id), locale); const url = href(locale, `/${s.org_type_slug}/${s.org_slug}/${s.location_slug}`); return (
                  <li key={s.location_id} data-reveal data-fx={i % 2 ? "wing-r" : "wing-l"} style={{ "--d": `${i * 90}ms` } as React.CSSProperties} className="card stack is-contact p-4 sm:p-5 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <div className="min-w-0">
                      <div className="eyebrow">{s.org_name_lat}</div>
                      <Link href={url} className="font-serif text-[19px] font-semibold no-underline text-ink hover:text-accent">{s.unit_name_lat}</Link>
                      <div className="text-[12.5px] text-muted mt-0.5">{L.servingFor}: {jls.name_lat}</div>
                      <dl className="mt-3 grid gap-1.5 text-[14px]">
                        <div className="flex gap-2"><dt className="text-muted shrink-0 w-5"><Icon.pin /></dt><dd>{s.address_display ? `${s.address_display}, ${s.jls_name_lat ?? ""}` : <span className="text-muted">{s.jls_name_lat} · {locale === "sr" ? "tačna adresa još nije uneta" : locale === "en" ? "exact address not yet entered" : locale === "ru" ? "точный адрес ещё не внесён" : "genaue Adresse folgt"}</span>}</dd></div>
                        <div className="flex gap-2"><dt className="text-muted shrink-0 w-5"><Icon.phone /></dt><dd className="tabular">{ph.length ? ph.map((p) => <a key={p.value} href={`tel:${p.value}`} className="mr-3">{p.value_display ?? p.value}</a>) : <span className="text-muted">—</span>}</dd></div>
                        <div className="flex gap-2"><dt className="text-muted shrink-0 w-5"><Icon.clock /></dt><dd>{hr.length ? hr.join(" · ") : s.hours_text ?? <span className="text-muted">—</span>}</dd></div>
                      </dl>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">{ph[0] && <a href={`tel:${ph[0].value}`} className="btn-primary">{L.call}</a>}<Link href={url} className="quick-chip justify-center">{L.open} →</Link></div>
                  </li>); })}
              </ul>
            ) : (
              <div className="card p-5 text-[14px]">
                <p className="text-muted">{jls ? L.noServing : L.pickHint}</p>
                <div className="mt-3 flex flex-wrap gap-2">{types.filter(Boolean).map((ty) => <Link key={ty!.id} href={href(locale, `/${ty!.slug}`)} className="quick-chip">{tn(ty!, locale)} →</Link>)}</div>
              </div>
            )}
          </section>

          {guide.status === "short" && <div className="rounded-xl border border-dashed border-line bg-surface-2/60 p-4 text-[13.5px] text-muted">{L.shortNotice}</div>}

          {c.who?.length ? <section id="ko" data-reveal data-fx="flip"><SectionTitle>{L.whoCan}</SectionTitle><ul className="grid gap-1.5 text-[14.5px] list-disc pl-5">{c.who.map((w, i) => <li key={i}>{w}</li>)}</ul></section> : null}

          {c.documents?.length ? <section id="dokumenta" data-reveal data-fx="flip"><SectionTitle>{L.documents}</SectionTitle>
            <ul className="grid gap-2">{c.documents.map((doc, i) => (
              <li key={i} data-reveal data-fx={i % 2 ? "wing-r" : "wing-l"} style={{ "--d": `${i * 70}ms` } as React.CSSProperties} className="card slip p-3.5 flex gap-3 items-start"><span className="mt-0.5 inline-grid place-items-center w-5 h-5 rounded border border-line text-[11px] text-muted shrink-0">{i + 1}</span>
                <div className="min-w-0"><div className="font-medium text-[14.5px]">{doc.name}</div>{doc.note && <div className="text-muted text-[13px] mt-0.5">{doc.note}</div>}{doc.variants?.length ? <ul className="mt-1.5 text-[13px] text-muted grid gap-0.5">{doc.variants.map((v, j) => <li key={j}>· {v}</li>)}</ul> : null}</div></li>))}</ul></section> : null}

          {guide.fees?.length ? <section id="takse" data-reveal data-fx="flip"><SectionTitle>{L.fees}</SectionTitle>
            <div className="card overflow-x-auto"><table className="w-full text-[14px]"><thead><tr className="text-left text-muted text-[12px] uppercase tracking-wide"><th className="px-4 py-2.5 font-medium">{L.amount}</th><th className="px-4 py-2.5 font-medium">{L.basis}</th></tr></thead>
              <tbody>{guide.fees.map((f, i) => <tr key={i} className="border-t border-line align-top"><td className="px-4 py-2.5"><div className="font-medium">{f.item}</div><div className="tabular text-[15px]">{f.amount_rsd == null ? <span className="text-muted">—</span> : f.amount_rsd === 0 ? L.free : `${fmtRsd(f.amount_rsd)} ${L.rsd}`}</div>{f.note && <div className="text-muted text-[12.5px] mt-0.5">{f.note}</div>}</td>
                <td className="px-4 py-2.5 text-[13px] text-muted">{f.basis}{f.source_url && <> · <a href={f.source_url} target="_blank" rel="noopener">izvor ↗</a></>}{f.checked_at && <div className="text-[12px]">{L.checked} {f.checked_at}</div>}</td></tr>)}</tbody></table></div></section> : null}

          {c.steps?.length ? <section id="koraci" data-reveal data-fx="flip"><SectionTitle>{L.steps}</SectionTitle>
            <ol className="grid gap-3">{c.steps.map((s, i) => <li key={i} data-reveal style={{ "--d": `${i * 80}ms` } as React.CSSProperties} className="flex gap-3.5"><span className="disc step-disc">{i + 1}</span><p className="text-[14.5px] pt-1">{s}</p></li>)}</ol></section> : null}

          {guide.typical_duration && <section id="trajanje" data-reveal data-fx="flip"><SectionTitle>{L.duration}</SectionTitle><p className="text-[14.5px]">{guide.typical_duration}</p></section>}

          {vertical && <section id="ponuda"><LeadForm locale={locale} vertical={vertical} context={{ page_path: path, location_id: serving[0]?.location_id ?? null, territorial_unit_id: jls?.id ?? null }} /></section>}
          <AdSlot code="svc_in_content_1" w={728} h={90} mobileH={250} label={d.ad} />

          {c.faq?.length ? <section id="faq" data-reveal data-fx="flip"><SectionTitle>{L.faq}</SectionTitle><div className="grid gap-2">{c.faq.map((f, i) => <details key={i} className="card p-4 group"><summary className="cursor-pointer font-medium text-[14.5px] list-none flex justify-between gap-3">{f.q}<span className="text-muted group-open:rotate-45 transition">+</span></summary><p className="text-[14px] text-muted mt-2">{f.a}</p></details>)}</div></section> : null}

          {c.for_foreigners && <section data-reveal data-fx="flip" className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--accent-soft)" }}><div className="eyebrow text-accent-ink flex items-center gap-1.5"><Icon.globe /> {L.forForeigners}</div><p className="text-[14.5px] mt-2 whitespace-pre-line">{c.for_foreigners}</p></section>}

          {guide.sources?.length ? <section data-reveal data-fx="flip"><SectionTitle>{L.sources}</SectionTitle><ul className="text-[13px] text-muted grid gap-1">{guide.sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener" className="break-all">{s.title ?? s.url}</a>{s.checked_at ? ` · ${L.checked} ${s.checked_at}` : ""}</li>)}</ul>{guide.legal_basis && <p className="text-[13px] text-muted mt-2">{guide.legal_basis}</p>}</section> : null}

          <CorrectionBlock locale={locale} entityType="service" entityId={guide.id} pagePath={path} lastChecked={guide.checked_at} sources={guide.sources.map((s) => s.url)} />
        </article>

        <aside className="jstage-mobile-aside grid gap-4">{sideCards}</aside>
      </div>
    </main>
  );
}
