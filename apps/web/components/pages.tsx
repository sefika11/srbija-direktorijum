import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import * as db from "@/lib/db";
import { Breadcrumbs, Chip, VerificationChip, SectionTitle, AdSlot, SponsorCard } from "./ui";
import SearchBox from "./SearchBox";
import SerbiaMap, { type MapLabels } from "./SerbiaMap";
import { Icon, GROUP_ICON } from "./icons";
import { LeadForm, CorrectionBlock } from "./forms";
import { GUIDE } from "@/lib/guide";

const GROUPS: db.Group[] = ["lokalna_samouprava", "republicki_organi", "javne_ustanove", "javna_preduzeca", "pravosudje_i_javna_ovlascenja"];

export function tuLabel(u: { level: string; jls_kind: string | null; name_lat: string; official_name_lat: string | null }) {
  return u.official_name_lat ?? u.name_lat;
}
const orgHref = (l: Locale, o: { type_slug: string; slug: string }) => href(l, `/${o.type_slug}/${o.slug}`);
const tuHref = (l: Locale, u: { level: string; slug: string }, parentSlug?: string | null) =>
  u.level === "okrug" ? href(l, `/okrug/${u.slug}`) : u.level === "gradska_opstina" && parentSlug ? href(l, `/${parentSlug}/${u.slug}`) : href(l, `/${u.slug}`);

function OrgList({ orgs, locale, dense = false }: { orgs: db.OrgRow[]; locale: Locale; dense?: boolean }) {
  if (!orgs.length) return <p className="text-muted text-[13.5px]">{t(locale).noData}</p>;
  return (
    <ul className={`grid gap-2 ${dense ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
      {orgs.map((o) => (
        <li key={o.id} className="card card-hover px-3.5 py-2.5">
          <Link href={orgHref(locale, o)} className="no-underline text-ink font-medium text-[14px] leading-snug block hover:text-accent">{o.name_lat}</Link>
          <div className="text-[12px] text-muted mt-0.5 truncate">{o.is_private && <span className="inline-block rounded-full bg-surface-2 px-1.5 py-px text-[10.5px] uppercase tracking-wider font-semibold mr-1.5 align-middle">{locale === "sr" ? "privatno" : locale === "en" ? "private" : locale === "ru" ? "частное" : "privat"}</span>}{o.type_name}{o.place_name && o.place_name !== o.founder_name ? ` · ${o.place_name}` : ""}</div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Home
const MAP_LABELS: Record<Locale, MapLabels> = {
  sr: { institutions: "Institucije", municipalities: "Gradovi i opštine", hint: "Pređite preko okruga za podatke. Klik na okrug uvećava mapu i prikazuje opštine; točkić miša ili dva prsta za zum.",
        hintZoomed: "Klik na opštinu otvara njene institucije. Prevucite za pomeranje, točkić ili dva prsta za zum.", zoomIn: "Uvećaj", zoomOut: "Umanji", reset: "Cela Srbija",
        back: "Cela Srbija", openOkrug: "Otvori okrug", openUnit: "Otvori", city: "Grad", municipality: "Opština", serbia: "Srbija", okrug: "Okrug", seat: "Sedište" },
  en: { institutions: "Institutions", municipalities: "Cities and municipalities", hint: "Hover a district for figures. Click a district to zoom in and see its municipalities; scroll or pinch to zoom.",
        hintZoomed: "Click a municipality to open its institutions. Drag to pan, scroll or pinch to zoom.", zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Whole country",
        back: "Whole country", openOkrug: "Open district", openUnit: "Open", city: "City", municipality: "Municipality", serbia: "Serbia", okrug: "District", seat: "Seat" },
  ru: { institutions: "Учреждения", municipalities: "Города и общины", hint: "Наведите на округ. Клик по округу увеличивает карту и показывает общины; колесо мыши или два пальца для масштаба.",
        hintZoomed: "Клик по общине открывает её учреждения. Перетаскивайте для прокрутки, колесо или два пальца для масштаба.", zoomIn: "Увеличить", zoomOut: "Уменьшить", reset: "Вся Сербия",
        back: "Вся Сербия", openOkrug: "Открыть округ", openUnit: "Открыть", city: "Город", municipality: "Община", serbia: "Сербия", okrug: "Округ", seat: "Центр" },
  de: { institutions: "Einrichtungen", municipalities: "Städte und Gemeinden", hint: "Bezirk überfahren für Zahlen. Klick auf einen Bezirk zoomt hinein und zeigt die Gemeinden; Scrollen oder Pinch zum Zoomen.",
        hintZoomed: "Klick auf eine Gemeinde öffnet ihre Einrichtungen. Ziehen zum Verschieben, Scrollen oder Pinch zum Zoomen.", zoomIn: "Vergrößern", zoomOut: "Verkleinern", reset: "Ganz Serbien",
        back: "Ganz Serbien", openOkrug: "Bezirk öffnen", openUnit: "Öffnen", city: "Stadt", municipality: "Gemeinde", serbia: "Serbien", okrug: "Bezirk", seat: "Sitz" },
};

export async function Home({ locale }: { locale: Locale }) {
  const d = t(locale);
  const [okruzi, allJls, types, stats, guides] = await Promise.all([db.getOkruzi(), db.getAllJls(), db.getOrgTypes(), db.getStats(), db.getGuides()]);
  const topGuides = [...guides].sort((a, b) => (a.status === "full" ? 0 : 1) - (b.status === "full" ? 0 : 1) || a.sort_order - b.sort_order).slice(0, 6);
  const mapLabels = MAP_LABELS[locale];
  const byGroup = GROUPS.map((g) => ({ g, types: types.filter((x) => x.group === g && x.org_count > 0) }));
  const QUICK: Record<Locale, { q: string; label: string }[]> = {
    sr: [{ q: "/vodic/licna-karta", label: "Lična karta" }, { q: "/vodic/pasos", label: "Pasoš" }, { q: "/vodic/vozacka-dozvola", label: "Vozačka dozvola" }, { q: "/vodic/zdravstvena-knjizica", label: "Zdravstvena kartica" }, { q: "/vodic/privremeni-boravak-stranci", label: "Boravak za strance" }, { q: "/pretraga?q=katastar", label: "Katastar" }],
    en: [{ q: "/vodic/licna-karta", label: "ID card" }, { q: "/vodic/pasos", label: "Passport" }, { q: "/vodic/vozacka-dozvola", label: "Driving licence" }, { q: "/vodic/zdravstvena-knjizica", label: "Health insurance" }, { q: "/vodic/privremeni-boravak-stranci", label: "Residence permit" }, { q: "/pretraga?q=katastar", label: "Cadastre" }],
    ru: [{ q: "/vodic/licna-karta", label: "Личная карта" }, { q: "/vodic/pasos", label: "Паспорт" }, { q: "/vodic/vozacka-dozvola", label: "Водительские права" }, { q: "/vodic/zdravstvena-knjizica", label: "Мед. страхование" }, { q: "/vodic/privremeni-boravak-stranci", label: "ВНЖ" }, { q: "/pretraga?q=katastar", label: "Кадастр" }],
    de: [{ q: "/vodic/licna-karta", label: "Personalausweis" }, { q: "/vodic/pasos", label: "Reisepass" }, { q: "/vodic/vozacka-dozvola", label: "Führerschein" }, { q: "/vodic/zdravstvena-knjizica", label: "Krankenversicherung" }, { q: "/vodic/privremeni-boravak-stranci", label: "Aufenthaltstitel" }, { q: "/pretraga?q=katastar", label: "Kataster" }],
  };
  const guidesTitle = locale === "sr" ? "Kako se šta rešava" : locale === "en" ? "How things get done" : locale === "ru" ? "Как всё оформить" : "So geht es";
  const guidesLead = locale === "sr" ? "Dokumenta, takse, rokovi i tačno mesto gde idete u vašoj opštini." : locale === "en" ? "Documents, fees, deadlines and the exact office in your municipality." : locale === "ru" ? "Документы, пошлины, сроки и точное место в вашей общине." : "Unterlagen, Gebühren, Fristen und die genaue Stelle in Ihrer Gemeinde.";
  const allGuides = locale === "sr" ? "Svi vodiči" : locale === "en" ? "All guides" : locale === "ru" ? "Все инструкции" : "Alle Anleitungen";
  const typesLabel = locale === "sr" ? "vrsta institucija" : locale === "en" ? "institution types" : locale === "ru" ? "типов учреждений" : "Einrichtungsarten";
  const mapTitle = locale === "sr" ? "25 okruga, 145 gradova i opština" : locale === "en" ? "25 districts, 145 cities and municipalities" : locale === "ru" ? "25 округов, 145 городов и общин" : "25 Bezirke, 145 Städte und Gemeinden";
  const popular = locale === "sr" ? "Najčešće traženo" : locale === "en" ? "Most searched" : locale === "ru" ? "Часто ищут" : "Häufig gesucht";
  const byGroupAll = GROUPS.map((g) => ({ g, types: types.filter((x) => x.group === g && x.org_count > 0), total: types.filter((x) => x.group === g).reduce((n, x) => n + x.org_count, 0) }));
  const maxGroup = Math.max(1, ...byGroupAll.map((x) => x.total));
  const T = {
    sr: { open: "Otvori", browse: "Istražite", bySituation: "Po životnoj situaciji", langsTitle: "Isti sadržaj na četiri jezika", langsLead: "Za sve koji žive, rade ili tek stižu u Srbiju.", stats: "U brojkama", since: "Podaci iz zvaničnih registara, dopunjeni svakodnevno." },
    en: { open: "Open", browse: "Explore", bySituation: "By life situation", langsTitle: "The same content in four languages", langsLead: "For everyone who lives, works or is just arriving in Serbia.", stats: "In numbers", since: "Data from official registers, updated continuously." },
    ru: { open: "Открыть", browse: "Смотреть", bySituation: "По жизненной ситуации", langsTitle: "Один и тот же контент на четырёх языках", langsLead: "Для всех, кто живёт, работает или только приезжает в Сербию.", stats: "В цифрах", since: "Данные из официальных реестров, обновляются постоянно." },
    de: { open: "Öffnen", browse: "Entdecken", bySituation: "Nach Lebenslage", langsTitle: "Derselbe Inhalt in vier Sprachen", langsLead: "Für alle, die in Serbien leben, arbeiten oder gerade ankommen.", stats: "In Zahlen", since: "Daten aus amtlichen Registern, laufend aktualisiert." },
  }[locale];
  const LANGS: { l: Locale; name: string; sub: string }[] = [{ l: "sr", name: "Srpski", sub: "latinica" }, { l: "en", name: "English", sub: "for residents and visitors" }, { l: "ru", name: "Русский", sub: "для жителей и гостей" }, { l: "de", name: "Deutsch", sub: "für Bewohner und Gäste" }];
  return (
    <main>
      {/* Opening */}
      <section className="hero-dark border-b border-white/10 -mt-[57px] pt-[57px]" data-hero>
        <div className="shell pt-10 pb-14 sm:pt-14 sm:pb-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center">
          <div data-reveal>
            <div className="eyebrow mb-5">Republika Srbija · {d.siteName}</div>
            <h1 className="display text-[40px] sm:text-[56px] xl:text-[64px] max-w-[14ch]">{d.tagline.split(":")[0]}.</h1>
            <p className="lede text-white/70 mt-5 max-w-[48ch]">{d.tagline.includes(":") ? d.tagline.split(":")[1].trim().replace(/^./, (c) => c.toUpperCase()) : ""}</p>
            <div className="mt-8"><SearchBox locale={locale} large placeholder={d.searchPlaceholder} submitLabel={d.search} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-white/55 mr-1">{popular}:</span>
              {QUICK[locale].map((x) => <Link key={x.q} href={href(locale, x.q)} className="quick-chip">{x.label}</Link>)}
            </div>
            <div className="stat-strip mt-9">
              {[{ n: stats.orgs, l: d.institutions }, { n: stats.jls, l: d.municipalities }, { n: stats.types, l: typesLabel }].map((x) => (
                <div key={x.l}><div className="num">{x.n.toLocaleString("sr-Latn")}</div><div className="lbl">{x.l}</div></div>
              ))}
            </div>
          </div>
          <div data-reveal style={{ "--d": "120ms" } as React.CSSProperties}>
            <SerbiaMap okruzi={okruzi.map((o) => ({ slug: o.slug, name_lat: o.name_lat, seat_name_lat: o.seat_name_lat, jls_count: o.jls_count, org_count: o.org_count }))}
                       jls={allJls.map((j) => ({ slug: j.slug, name_lat: j.name_lat, okrug_slug: j.okrug_slug, org_count: j.org_count, jls_kind: j.jls_kind }))}
                       locale={locale} labels={mapLabels} variant="dark" height="hero" />
          </div>
        </div>
      </section>

      {/* Guides */}
      {topGuides.length > 0 && (
        <section className="shell py-16 sm:py-20">
          <div className="section-head" data-reveal>
            <div><div className="eyebrow">01 · {guidesTitle}</div><h2 className="display-sm mt-2">{guidesLead}</h2></div>
            <Link href={href(locale, "/vodici")} className="quick-chip">{allGuides} →</Link>
          </div>
          <div className="rail">
            {topGuides.map((g, i) => { const c = g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}; return (
              <Link key={g.id} href={href(locale, `/vodic/${g.slug}`)} className="guide-card no-underline text-ink" data-reveal style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
                <span className="num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <div className="eyebrow">{g.category_name}</div>
                <div className="font-serif text-[22px] font-semibold leading-[1.15] mt-3 pr-14 tracking-[-0.01em]">{c.title ?? g.name_lat}</div>
                <p className="text-muted text-[13.5px] mt-2 flex-1 leading-relaxed">{c.summary ?? g.summary}</p>
                <div className="mt-4 flex items-center justify-between text-[12.5px]">
                  {g.status === "full" ? <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5 font-medium">✓ {locale === "sr" ? "Provereno" : locale === "en" ? "Verified" : locale === "ru" ? "Проверено" : "Geprüft"} {g.checked_at}</span> : <span className="text-muted">{locale === "sr" ? "kratki vodič" : locale === "en" ? "short guide" : locale === "ru" ? "кратко" : "Kurzfassung"}</span>}
                  <span className="text-accent font-medium">{T.open} →</span>
                </div>
              </Link>); })}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-y border-line bg-surface">
        <div className="shell py-16 sm:py-20">
          <div className="section-head" data-reveal>
            <div><div className="eyebrow">02 · {d.browseByCategory}</div><h2 className="display-sm mt-2">{stats.orgs.toLocaleString("sr-Latn")} {d.institutions}, {stats.types} {typesLabel}</h2></div>
          </div>
          <div className="bento">
            {byGroupAll.map(({ g, types: ts, total }, i) => { const I = Icon[GROUP_ICON[g] ?? "landmark"]; return (
              <div key={g} className="bento-card" data-reveal style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
                <div className="flex items-start justify-between gap-3">
                  <span className="icon-badge"><I /></span>
                  <div className="big">{total.toLocaleString("sr-Latn")}</div>
                </div>
                <h3 className="font-semibold text-[16px] mt-4">{d.groups[g]}</h3>
                <div className="bar"><i style={{ "--w": (total / maxGroup).toFixed(3) } as React.CSSProperties} /></div>
                <ul className="text-[13.5px] grid gap-1.5 mt-4">
                  {ts.slice(0, i < 2 ? 6 : 4).map((x) => <li key={x.id} className="flex justify-between gap-3"><Link href={href(locale, `/${x.slug}`)} className="no-underline text-ink hover:text-accent truncate">{x.name_plural_lat ?? x.name_lat}</Link><span className="text-muted tabular shrink-0">{x.org_count.toLocaleString("sr-Latn")}</span></li>)}
                </ul>
              </div>); })}
          </div>
        </div>
      </section>

      {/* Districts */}
      <section className="shell py-16 sm:py-20">
        <div className="section-head" data-reveal>
          <div><div className="eyebrow">03 · {d.browseByRegion}</div><h2 className="display-sm mt-2">{mapTitle}</h2></div>
        </div>
        <ul className="flex flex-wrap gap-2 text-[13.5px]" data-reveal>
          {okruzi.map((o) => <li key={o.id}><Link href={href(locale, `/okrug/${o.slug}`)} className="quick-chip">{o.name_lat}<span className="text-muted tabular ml-1.5">{o.org_count}</span></Link></li>)}
        </ul>
      </section>

      {/* Languages */}
      <section className="hero-dark"><div className="shell py-16 sm:py-20" data-reveal>
        <div className="eyebrow mb-3">04 · {d.forForeigners}</div>
        <h2 className="display-sm text-white max-w-[20ch]">{T.langsTitle}</h2>
        <p className="lede text-white/70 mt-3 max-w-[52ch]">{T.langsLead}</p>
        <div className="lang-tiles mt-8">
          {LANGS.map((x) => <Link key={x.l} href={href(x.l, "/za-strance")} hrefLang={x.l} className="lang-tile"><span className="big">{x.name}</span><span className="text-white/60 text-[13px]">{x.sub}</span></Link>)}
        </div>
      </div></section>
    </main>
  );
}

// ---------------------------------------------------------------- Okrug hub
export async function OkrugHub({ locale, okrug }: { locale: Locale; okrug: db.TU }) {
  const d = t(locale);
  const jls = await db.getJlsInOkrug(okrug.id);
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-8 sm:py-10">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: okrug.name_lat }]} />
        <div className="eyebrow mt-4">{d.okrug}</div>
        <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold leading-tight">{okrug.official_name_lat ?? okrug.name_lat}</h1>
        <p className="text-muted mt-2 tabular">{okrug.seat_name_lat ? `${d.seat}: ${okrug.seat_name_lat} · ` : ""}{jls.length} {d.municipalities} · {jls.reduce((n, j) => n + j.org_count, 0).toLocaleString("sr-Latn")} {d.institutions}</p>
      </div></section>
      <div className="shell py-6">
      <AdSlot code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {jls.map((j) => (
          <li key={j.id} className="card card-hover p-5">
            <div className="eyebrow">{j.jls_kind === "grad" ? d.city : d.municipality}{j.okrug_seat ? ` · ${d.seat.toLowerCase()} okruga` : ""}</div>
            <Link href={href(locale, `/${j.slug}`)} className="font-serif text-[20px] font-semibold no-underline text-ink hover:text-accent">{j.name_lat}</Link>
            <div className="text-[13px] text-muted mt-1.5 tabular">{j.org_count} {d.institutions}</div>
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
  const [orgs, gos, ancestors, types] = await Promise.all([db.getOrgsInUnit(unit.path), unit.level === "jls" ? db.getChildrenGO(unit.id) : Promise.resolve([]), db.getAncestors(unit.path), db.getOrgTypes()]);
  const okrug = ancestors.find((a) => a.level === "okrug");
  const national = types.filter((x) => x.national_network);
  const serving = await Promise.all(national.map((x) => db.getServingLocations(unit.level === "jls" ? unit.id : (parent?.id ?? unit.id), x.slug).then((r) => ({ type: x, rows: r }))));
  const path = unit.level === "gradska_opstina" && parent ? `/${parent.slug}/${unit.slug}` : `/${unit.slug}`;
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-8 sm:py-10">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, ...(okrug ? [{ href: href(locale, `/okrug/${okrug.slug}`), label: okrug.name_lat }] : []), ...(parent ? [{ href: href(locale, `/${parent.slug}`), label: parent.name_lat }] : []), { label: unit.name_lat }]} />
      <div className="eyebrow mt-4">{unit.level === "gradska_opstina" ? d.gradskaOpstina : unit.jls_kind === "grad" ? d.city : d.municipality}{okrug && unit.level === "jls" ? ` · ${okrug.name_lat}` : ""}</div>
      <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold leading-tight">{tuLabel(unit)}</h1>
      <p className="text-muted mt-2 tabular">{orgs.length.toLocaleString("sr-Latn")} {d.institutions}{unit.website ? <> · <a href={unit.website} rel="noopener">{d.website} ↗</a></> : null}</p>
      </div></section>
      <div className="shell py-6">
      <AdSlot code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div>
          {gos.length > 0 && (
            <section className="mb-8">
              <SectionTitle>{d.gradskeOpstine}</SectionTitle>
              <ul className="flex flex-wrap gap-2">{gos.map((g) => <li key={g.id}><Link href={href(locale, `/${unit.slug}/${g.slug}`)} className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-[13.5px] no-underline text-ink hover:border-accent">{g.name_lat} <span className="text-muted tabular">{g.org_count}</span></Link></li>)}</ul>
            </section>
          )}
          {GROUPS.map((g, i) => {
            const list = orgs.filter((o) => o.group === g);
            if (!list.length && g !== "republicki_organi") return null;
            const mz = g === "lokalna_samouprava" ? list.filter((o) => o.type_slug === "mesna-zajednica") : [];
            const main = g === "lokalna_samouprava" ? list.filter((o) => o.type_slug !== "mesna-zajednica") : list;
            return (
              <section key={g} className="mb-8">
                <SectionTitle id={g}>{d.groups[g]} <span className="text-muted font-normal text-[14px] tabular">{list.length}</span></SectionTitle>
                {g === "republicki_organi" && (
                  <ul className="grid sm:grid-cols-2 gap-2 mb-3">
                    {serving.map(({ type, rows }) => (
                      <li key={type.id} className="card card-hover px-3.5 py-2.5">
                        <Link href={href(locale, `/${type.slug}`)} className="font-medium text-[14px] no-underline text-ink hover:text-accent">{type.name_lat}</Link>
                        <div className="text-[12.5px] text-muted mt-0.5">
                          {rows.length ? rows.map((r, k) => <span key={r.id}>{k > 0 && ", "}<Link href={href(locale, `/${type.slug}/${r.org_slug}/${r.slug}`)}>{r.unit_name_lat}</Link></span>) : <span>{d.noData}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <OrgList orgs={main} locale={locale} />
                {mz.length > 0 && (
                  <details className="mt-3 card p-3.5"><summary className="cursor-pointer font-medium text-[14px]">Mesne zajednice <span className="text-muted tabular font-normal">({mz.length})</span></summary>
                    <ul className="mt-3 columns-2 sm:columns-3 gap-4 text-[13px]">{mz.map((o) => <li key={o.id} className="break-inside-avoid"><Link href={orgHref(locale, o)}>{o.name_lat.replace(/^Mesna zajednica\s+/i, "")}</Link></li>)}</ul></details>
                )}
                {i === 1 && <AdSlot code="jls_inline_1" w={336} h={280} label={d.ad} />}
              </section>
            );
          })}
        </div>
        <aside className="lg:sticky lg:top-20 grid gap-5">
          <SponsorCard label={d.sponsor} sponsor={null} compact />
          <div className="card p-4 text-[13.5px]">
            <div className="eyebrow mb-2">{d.okrug}</div>
            {okrug && <Link href={href(locale, `/okrug/${okrug.slug}`)} className="font-medium">{okrug.name_lat}</Link>}
            {unit.seat_name_lat && unit.level === "jls" && <div className="text-muted mt-2">{d.seat}: {unit.seat_name_lat}</div>}
            <div className="text-muted mt-2">{locale === "sr" ? "Ovu stranicu možete deliti: " : "Share: "}<span className="font-mono text-[12px] break-all">{path}</span></div>
          </div>
        </aside>
      </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Org type hub
export async function OrgTypeHub({ locale, type }: { locale: Locale; type: db.OrgType }) {
  const d = t(locale);
  const orgs = await db.getOrgsOfType(type.slug, 5000);
  // National networks (RFZO, PIO, Poreska uprava...) are one organization with many branches: list the branches by okrug.
  const branchMode = type.national_network && orgs.length <= 3;
  const branches = branchMode ? await db.getLocationsOfType(type.slug) : [];
  const groups = new Map<string, db.OrgRow[]>();
  for (const o of orgs) { const k = o.founder_name ?? o.place_name ?? "—"; groups.set(k, [...(groups.get(k) ?? []), o]); }
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, "sr-Latn"));
  const byOkrug = new Map<string, db.ServingRow[]>();
  for (const b of branches) { const k = b.okrug_name_lat ?? "—"; byOkrug.set(k, [...(byOkrug.get(k) ?? []), b]); }
  const okrugKeys = [...byOkrug.keys()].sort((a, b) => a.localeCompare(b, "sr-Latn"));
  const count = branchMode ? branches.length : orgs.length;
  const places = branchMode ? new Set(branches.map((b) => b.jls_slug)).size : keys.length;
  let faq: { q: string; a: string }[] = [];
  try { const parsed = type.faq_md ? JSON.parse(type.faq_md) : []; if (Array.isArray(parsed)) faq = parsed.filter((x) => x && x.q && x.a); } catch { faq = []; }
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-8 sm:py-10">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.groups[type.group] }, { label: type.name_plural_lat ?? type.name_lat }]} />
        <div className="eyebrow mt-4">{d.groups[type.group]}</div>
        <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold leading-tight">{type.name_plural_lat ?? type.name_lat}</h1>
        <p className="text-muted mt-2 tabular">{count.toLocaleString("sr-Latn")} {branchMode ? (locale === "sr" ? "lokacija" : locale === "en" ? "locations" : locale === "ru" ? "адресов" : "Standorte") : d.institutions} · {places} {d.municipalities}</p>
        {type.description_md && <div className="prose max-w-3xl mt-3 text-[15px] text-white/85">{type.description_md}</div>}
      </div></section>
      <div className="shell py-6">
      {faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />}
      <AdSlot code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div className="grid gap-5">
          {faq.length > 0 && (
            <section className="card p-5">
              <SectionTitle>{locale === "sr" ? "Česta pitanja" : locale === "en" ? "Frequently asked" : locale === "ru" ? "Частые вопросы" : "Häufige Fragen"}</SectionTitle>
              <div className="grid gap-2">{faq.map((f, i) => <details key={i} className="rounded-md border border-line p-3.5 group"><summary className="cursor-pointer font-medium text-[14.5px] list-none flex justify-between gap-3">{f.q}<span className="text-muted group-open:rotate-45 transition">+</span></summary><p className="text-[14px] text-muted mt-2">{f.a}</p></details>)}</div>
            </section>
          )}
          {branchMode ? okrugKeys.map((k, i) => (
            <section key={k}>
              <SectionTitle>{k} <span className="text-muted font-normal text-[13px] tabular">{byOkrug.get(k)!.length}</span></SectionTitle>
              <ul className="grid sm:grid-cols-2 gap-3">
                {byOkrug.get(k)!.map((b) => (
                  <li key={b.location_id} className="card card-hover p-4">
                    <div className="eyebrow">{b.unit_kind === "filijala" ? (locale === "sr" ? "Filijala" : "Branch") : b.unit_kind === "ispostava" ? (locale === "sr" ? "Ispostava" : "Sub-office") : b.unit_kind}</div>
                    <Link href={href(locale, `/${b.org_type_slug}/${b.org_slug}/${b.location_slug}`)} className="font-serif text-[17px] font-semibold no-underline text-ink hover:text-accent">{b.unit_name_lat}</Link>
                    <div className="text-[13px] text-muted mt-1">{b.address_display ? `${b.address_display}, ` : ""}{b.jls_name_lat}</div>
                  </li>
                ))}
              </ul>
              {i === 2 && <AdSlot code="jls_inline_1" w={336} h={280} label={d.ad} />}
            </section>
          )) : keys.map((k, i) => {
            const list = groups.get(k)!;
            const body = <OrgList orgs={list} locale={locale} dense />;
            return (
              <section key={k}>
                {list.length > 12 ? (
                  <details className="card p-3.5"><summary className="cursor-pointer font-semibold text-[15px]">{k} <span className="text-muted tabular font-normal">({list.length})</span></summary><div className="mt-3">{body}</div></details>
                ) : (<><SectionTitle>{k} <span className="text-muted font-normal text-[13px] tabular">{list.length}</span></SectionTitle>{body}</>)}
                {i === 2 && <AdSlot code="jls_inline_1" w={336} h={280} label={d.ad} />}
              </section>
            );
          })}
        </div>
        <aside className="lg:sticky lg:top-20"><SponsorCard label={d.sponsor} sponsor={null} compact /></aside>
      </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Institution page (Part 2 layout)
export async function OrgPage({ locale, org, locSlug, path }: { locale: Locale; org: db.OrgRow; locSlug?: string; path: string }) {
  const d = t(locale);
  const [locations, children, vertical, types] = await Promise.all([db.getLocations(org.id), db.getOrgChildren(org.id), db.getVertical(org.type_slug), db.getOrgTypes()]);
  const type = types.find((x) => x.slug === org.type_slug)!;
  const loc = (locSlug ? locations.find((l) => l.location_slug === locSlug) : null) ?? locations.find((l) => l.is_primary) ?? locations[0] ?? null;
  const ids = loc ? [loc.location_id] : [];
  const [contacts, hours, coverage, ancestors, sponsor] = await Promise.all([
    db.getContacts(ids), db.getHours(ids), db.getCoverage(ids),
    loc ? db.getAncestors((await db.sql<{ path: string }[]>`select path::text from territorial_units where slug = ${loc.tu_slug} limit 1`)[0]?.path ?? "") : Promise.resolve([]),
    loc ? db.getSponsorship("loc_after_address_native", (await db.sql<{ id: number }[]>`select id from territorial_units where slug = ${loc.tu_slug} limit 1`)[0]?.id ?? 0, type.id, org.id, loc.location_id) : Promise.resolve(null),
  ]);
  const jls = ancestors.find((a) => a.level === "jls"); const okrug = ancestors.find((a) => a.level === "okrug");
  const phones = contacts.filter((c) => ["phone", "mobile"].includes(c.kind)); const emails = contacts.filter((c) => c.kind === "email"); const sites = contacts.filter((c) => c.kind === "website");
  const site = org.website ?? sites[0]?.value ?? null;
  const placeLine = loc ? [loc.address_display, loc.address_extra, [loc.postal_code, loc.settlement_name_lat ?? loc.tu_name_lat].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;
  const mapsQ = encodeURIComponent(`${org.name_lat} ${placeLine ?? ""}`.trim());
  const title = loc && !loc.is_primary ? `${org.name_lat} – ${loc.unit_name_lat}` : org.name_lat;
  const related = jls ? await db.sql<db.OrgRow[]>`select o.id, o.slug, o.name_lat, o.name_cyr, o.official_name_lat, t.slug as type_slug, t.name_lat as type_name, t."group" as group, o.jurisdiction, null::text as founder_slug, null::text as founder_name, null::text as place_name, null::text as place_slug, o.verification, null::text as mb, null::text as pib, null::text as jbkjs, o.website, null::bigint as parent_id, null::text as parent_name, null::text as parent_slug, null::text as parent_type_slug, null::text as last_seen_at
      from organizations o join org_types t on t.id = o.org_type_id join territorial_units f on f.id = o.founder_unit_id
      where t."group" = ${org.group} and o.id <> ${org.id} and o.status = 'active' and f.path <@ ${jls.path}::ltree and t.slug <> 'mesna-zajednica' order by t.sort_order, o.name_lat limit 8` : [];
  const DAYS = locale === "sr" ? ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"] : locale === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : locale === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const regLine = [org.mb && `MB ${org.mb}`, org.pib && `PIB ${org.pib}`, org.jbkjs && `JBKJS ${org.jbkjs}`].filter(Boolean).join(" · ");
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-7 sm:py-9">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, ...(jls ? [{ href: href(locale, `/${jls.slug}`), label: jls.name_lat }] : []), { href: href(locale, `/${org.type_slug}`), label: type.name_lat }, ...(loc && !loc.is_primary ? [{ href: orgHref(locale, org), label: org.name_lat }, { label: loc.unit_name_lat }] : [{ label: org.name_lat }])]} />
      <div className="eyebrow mt-4">{type.name_lat}{jls ? ` · ${jls.name_lat}` : ""}</div>
      <h1 className="font-serif text-[28px] sm:text-[36px] font-semibold leading-[1.12] mt-1">{title}</h1>
      <p className="text-muted mt-2 text-[14px]">{org.official_name_lat && org.official_name_lat.toLowerCase() !== org.name_lat.toLowerCase() ? org.official_name_lat : type.name_lat}{org.founder_name ? ` · ${d.founder}: ` : ""}{org.founder_slug && org.founder_name ? <Link href={href(locale, `/${org.founder_slug}`)}>{org.founder_name}</Link> : null}</p>
      <div className="mt-2 flex items-center gap-3 flex-wrap"><VerificationChip state={loc?.verification ?? org.verification} locale={locale} />{org.is_private && <Chip>{locale === "sr" ? "Privatna ustanova" : locale === "en" ? "Private institution" : locale === "ru" ? "Частное учреждение" : "Private Einrichtung"}</Chip>}<a href="#izmeni" className="text-[12.5px]">{d.editData}</a></div>
      </div></section>
      <div className="shell">
      <div className="sticky top-[57px] z-10 -mx-4 px-4 py-2.5 bg-bg/95 backdrop-blur border-b border-line lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:m-0 lg:mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {phones[0] ? <a href={`tel:${phones[0].value}`} className="btn-primary"><Icon.phone /> {d.call} {phones[0].value_display ?? phones[0].value}</a>
                     : <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-2 text-muted px-3.5 py-2 text-[13.5px]"><Icon.phone /> {locale === "sr" ? "Telefon nije poznat" : "Phone unknown"}</span>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} rel="noopener nofollow" target="_blank" className="quick-chip !py-2 !rounded-[10px] font-medium"><Icon.pin /> {d.directions}</a>
          {site && <a href={site.startsWith("http") ? site : `https://${site}`} rel="noopener" target="_blank" className="quick-chip !py-2 !rounded-[10px] font-medium">{d.website} ↗</a>}
        </div>
      </div>
      <AdSlot code="loc_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start mt-2">
        <div className="min-w-0">
          <section className="card p-4 sm:p-5">
            <SectionTitle>{d.contactAndAddress}</SectionTitle>
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
              <dt className="text-muted">{d.address}</dt><dd>{placeLine ?? <span className="text-muted">{loc ? `${loc.tu_name_lat}${okrug ? `, ${okrug.name_lat}` : ""} · ${locale === "sr" ? "tačna adresa još nije uneta" : "exact address not yet entered"}` : d.noData}</span>}</dd>
              <dt className="text-muted">{d.phone}</dt><dd className="tabular">{phones.length ? phones.map((p) => <div key={p.value}><a href={`tel:${p.value}`}>{p.value_display ?? p.value}</a>{p.label ? <span className="text-muted"> ({p.label})</span> : null}</div>) : <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">{d.email}</dt><dd>{emails.length ? emails.map((e) => <div key={e.value}><a href={`mailto:${e.value}`}>{e.value}</a></div>) : <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">{d.website}</dt><dd className="break-all">{site ? <a href={site.startsWith("http") ? site : `https://${site}`} rel="noopener">{site.replace(/^https?:\/\//, "")}</a> : <span className="text-muted">—</span>}</dd>
              {regLine && <><dt className="text-muted">{d.registry}</dt><dd className="font-mono text-[12.5px] text-muted">{regLine}</dd></>}
            </dl>
          </section>
          <div className="my-5"><SponsorCard label={d.sponsor} sponsor={sponsor} /></div>
          <section className="card p-4 sm:p-5">
            <SectionTitle>{d.hours}</SectionTitle>
            {hours.length ? (
              <table className="text-[14px] tabular w-full max-w-md"><tbody>
                {["rad_sa_strankama", "radno_vreme"].map((ht) => hours.filter((h) => h.hours_type === ht)).filter((x) => x.length).map((rows) => (
                  <tr key={rows[0].hours_type} className="align-top"><th className="text-left font-medium text-muted pr-4 py-1">{rows[0].hours_type === "rad_sa_strankama" ? d.radSaStrankama : d.hours}</th>
                    <td className="py-1">{rows.map((h) => <div key={h.day_of_week}>{DAYS[h.day_of_week - 1]} {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)}{h.note ? ` (${h.note})` : ""}</div>)}</td></tr>
                ))}</tbody></table>
            ) : loc?.hours_text ? <p className="text-[14px]">{loc.hours_text}</p>
              : <p className="text-[14px] text-muted">{locale === "sr" ? "Radno vreme još nije uneto. Ako ga znate, " : "Opening hours not yet entered. If you know them, "}<a href="#izmeni">{d.editData.toLowerCase()}</a>.</p>}
          </section>
          {(coverage.length > 0 || locations.length > 1 || org.parent_name || children.length > 0) && (
            <section className="card p-4 sm:p-5 mt-5">
              <SectionTitle>{d.jurisdiction}</SectionTitle>
              {coverage.length > 0 && <p className="text-[14px]">{d.coveredAreas}: <span className="inline-flex flex-wrap gap-1.5 align-middle">{coverage.map((c) => <Link key={c.slug} href={tuHref(locale, c)} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12.5px] no-underline text-ink">{c.name_lat}</Link>)}</span></p>}
              {locations.length > 1 && <div className="mt-3 text-[14px]"><span className="text-muted">{d.units}:</span> {locations.filter((l) => !loc || l.location_id !== loc.location_id).slice(0, 40).map((l, i) => <span key={l.location_id}>{i > 0 && " · "}<Link href={href(locale, `/${org.type_slug}/${org.slug}/${l.location_slug}`)}>{l.unit_name_lat}</Link></span>)}{locations.length > 41 ? ` … (${locations.length})` : ""}</div>}
              {org.parent_name && org.parent_slug && org.parent_type_slug && <div className="mt-3 text-[14px]"><span className="text-muted">{d.parentUnit}:</span> <Link href={href(locale, `/${org.parent_type_slug}/${org.parent_slug}`)}>{org.parent_name}</Link></div>}
              {children.length > 0 && <div className="mt-3 text-[14px]"><span className="text-muted">{locale === "sr" ? "U sastavu" : "Subordinate bodies"}:</span> {children.slice(0, 30).map((c, i) => <span key={c.id}>{i > 0 && " · "}<Link href={orgHref(locale, c)}>{c.name_lat}</Link></span>)}{children.length > 30 ? ` … (${children.length})` : ""}</div>}
            </section>
          )}
          {vertical && <LeadForm locale={locale} vertical={vertical} context={{ page_path: path, location_id: loc?.location_id ?? null, territorial_unit_id: jls?.id ?? null }} />}
          <AdSlot code="loc_in_content_1" w={336} h={280} label={d.ad} />
          <section className="card p-4 sm:p-5">
            <SectionTitle>{d.about}</SectionTitle>
            <div className="prose text-[14.5px]">
              {type.description_md ? <p>{type.description_md}</p> : (
                <p>{org.name_lat} {locale === "sr" ? `je ${type.name_lat.toLowerCase()}` : locale === "en" ? `is a ${type.name_lat.toLowerCase()}` : locale === "ru" ? `— ${type.name_lat.toLowerCase()}` : `ist ${type.name_lat.toLowerCase()}`}{org.founder_name ? ` (${d.founder.toLowerCase()}: ${org.founder_name})` : ""}{jls ? `, ${d.inPlace} ${jls.name_lat}${okrug ? `, ${okrug.name_lat}` : ""}` : ""}. {locale === "sr" ? "Podaci potiču iz zvanične Evidencije korisnika javnih sredstava Uprave za trezor; adresu, telefon i radno vreme dopunjujemo iz zvaničnih sajtova i prijava korisnika." : "Data comes from the Treasury's official register of public bodies; address, phone and hours are completed from official sites and user reports."}</p>
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
          <CorrectionBlock locale={locale} entityType={loc ? "location" : "organization"} entityId={loc?.location_id ?? org.id} pagePath={path} lastChecked={loc?.last_seen_at ?? org.last_seen_at} sources={["Uprava za trezor (KJS)"]} />
          <AdSlot code="loc_bottom_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
        </div>
        <aside className="lg:sticky lg:top-20 grid gap-5">
          <SponsorCard label={d.sponsor} sponsor={null} compact />
          {jls && <div className="card p-4 text-[13.5px]"><div className="eyebrow mb-2">{d.otherUnits}</div><Link href={href(locale, `/${org.type_slug}`)}>{type.name_plural_lat ?? type.name_lat}</Link><div className="mt-1"><Link href={href(locale, `/${jls.slug}`)}>{d.allInstitutions} · {jls.name_lat}</Link></div>{okrug && <div className="mt-1"><Link href={href(locale, `/okrug/${okrug.slug}`)}>{okrug.name_lat}</Link></div>}</div>}
          <div className="hidden xl:block"><AdSlot code="loc_sidebar_programmatic" w={300} h={600} label={d.ad} /></div>
        </aside>
      </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Search
export async function SearchPage({ locale, q }: { locale: Locale; q: string }) {
  const d = t(locale);
  const hits = q.trim().length >= 2 ? await db.search(q.trim()) : [];
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-8 sm:py-10">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.search }]} />
        <h1 className="font-serif text-[26px] sm:text-[32px] font-semibold mt-4">{q ? <>{d.results} „{q}“</> : d.search}</h1>
        <div className="mt-4"><SearchBox locale={locale} defaultValue={q} large placeholder={d.searchPlaceholder} submitLabel={d.search} /></div>
      </div></section>
      <div className="shell py-8">
      {hits.length === 0 ? <p className="text-muted">{q ? d.noResults : ""}</p> : (
        <ul className="grid gap-2 max-w-3xl">
          {hits.map((h, i) => (
            <li key={i} className="card card-hover px-4 py-3 flex items-start gap-3">
              <span className="icon-badge !w-9 !h-9 shrink-0 mt-0.5">{h.kind === "tu" ? <Icon.pin /> : <Icon.landmark />}</span>
              <div className="min-w-0">
                <Link href={h.kind === "tu" ? href(locale, `/${h.slug}`) : href(locale, `/${h.type_slug}/${h.slug}`)} className="font-medium no-underline text-ink text-[15px] hover:text-accent">{h.name_lat}</Link>
                <div className="text-[12.5px] text-muted">{h.kind === "tu" ? (h.sub ?? d.municipality) : h.sub}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- For foreigners
export async function ForForeigners({ locale }: { locale: Locale }) {
  const d = t(locale); const g = GUIDE[locale];
  const [types, guides] = await Promise.all([db.getOrgTypes(), db.getGuides()]);
  const newcomer = ["privremeni-boravak-stranci", "prijava-prebivalista", "licna-karta", "zdravstvena-knjizica", "pib-za-strance", "otvaranje-firme-preduzetnik"].map((s) => guides.find((x) => x.slug === s)).filter(Boolean) as db.GuideRow[];
  return (
    <main>
      <section className="foreigners-band border-b border-line"><div className="shell py-10 sm:py-14">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.forForeigners }]} />
        <div className="eyebrow plain !text-white/70 mt-4">{d.forForeigners} · English · Русский · Deutsch</div>
        <h1 className="font-serif text-[30px] sm:text-[40px] font-semibold mt-1 max-w-3xl text-white leading-[1.1]">{g.title}</h1>
        <p className="mt-3 max-w-3xl text-[16px] text-white/85">{g.lead}</p>
        {newcomer.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{newcomer.map((x) => { const c = x.guide[locale] ?? x.guide.en ?? x.guide.sr ?? {}; return <Link key={x.id} href={href(locale, `/vodic/${x.slug}`)} className="inline-flex items-center rounded-full bg-white/12 hover:bg-white/22 border border-white/25 text-white px-3.5 py-1.5 text-[13.5px] no-underline">{c.title ?? x.name_lat} →</Link>; })}</div>}
      </div></section>
      <div className="shell py-10">
      <ol className="grid md:grid-cols-2 gap-4">
        {g.steps.map((s, i) => {
          const ty = types.find((x) => x.slug === s.type);
          return (
            <li key={i} className="card card-hover p-5 flex gap-4">
              <span className="shrink-0 w-9 h-9 rounded-full bg-accent text-white grid place-items-center font-semibold text-[13px]">{i + 1}</span>
              <div className="min-w-0">
                <div className="eyebrow">{s.where}</div>
                <h2 className="font-semibold text-[17px] mt-0.5">{s.title}</h2>
                <p className="text-[14px] text-muted mt-1.5">{s.body}</p>
                {ty && <Link href={href(locale, `/${ty.slug}`)} className="inline-block mt-3 text-[14px] font-medium">{ty.name_plural_lat ?? ty.name_lat} ({ty.org_count}) →</Link>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[12.5px] text-muted mt-8 max-w-3xl">{g.disclaimer}</p>
      </div>
    </main>
  );
}

export function StaticPage({ locale, slug }: { locale: Locale; slug: string }) {
  const d = t(locale);
  const pages: Record<string, { title: string; body: string[] }> = {
    "o-sajtu": { title: d.aboutSite, body: ["Gde da idem? je nezavisni, privatni imenik svih institucija u Srbiji: republičkih organa, lokalne samouprave, javnih preduzeća, ustanova, sudova, javnih beležnika i izvršitelja.", "Podaci potiču iz zvaničnih registara (Uprava za trezor – Evidencija KJS, RZS, RGZ) i zvaničnih sajtova institucija, i dopunjuju se prijavama korisnika. Sajt nije državni servis i ne zastupa nijednu instituciju.", "Finansira se oglasima, sponzorstvima lokalnih firmi i posredovanjem upita ka proverenim partnerima; svaki plaćeni sadržaj je obeležen."] },
    partneri: { title: d.becomePartner, body: ["Lokalne firme mogu zakupiti sponzorsko mesto na stranicama institucija u svom gradu (jedan sponzor po stranici), ili primati upite korisnika iz svoje oblasti (knjigovodstvo, advokatura, geodezija, osiguranje, prevodi).", "Cenovnik zavisi od posećenosti stranica koje vas zanimaju; javite se preko kontakt forme ili na email naveden u podnožju."] },
    privatnost: { title: d.privacy, body: ["Sajt ne koristi kolačiće za praćenje; analitika je anonimna. Oglasne mreže (Google AdSense) mogu koristiti kolačiće u skladu sa svojim politikama; posetiocima iz EU prikazuje se izbor saglasnosti.", "Podaci iz forme za upit (ime, telefon, email, poruka) prosleđuju se jednom partneru radi odgovora i brišu se najkasnije 180 dana od slanja. Rukovalac podacima je operator sajta; zahtev za brisanje pošaljite na email u podnožju.", "Podaci o institucijama su javni podaci o organima javne vlasti; zahtev za ispravku možete poslati sa svake stranice."] },
  };
  const p = pages[slug];
  if (!p) return null;
  return (
    <main>
      <section className="hero-dark border-b border-white/10"><div className="shell py-8 sm:py-10">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: p.title }]} />
        <h1 className="font-serif text-[30px] sm:text-[38px] font-semibold mt-4">{p.title}</h1>
      </div></section>
      <div className="shell py-8"><div className="prose max-w-3xl text-[15.5px] leading-relaxed">{p.body.map((x, i) => <p key={i}>{x}</p>)}</div></div>
    </main>
  );
}
