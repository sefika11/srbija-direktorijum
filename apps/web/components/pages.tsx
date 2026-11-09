import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href } from "@/lib/i18n";
import * as db from "@/lib/db";
import { Breadcrumbs, Chip, VerificationChip, SectionTitle, AdSlot, SponsorCard } from "./ui";
import { SearchBox } from "./chrome";
import SerbiaMap from "./SerbiaMap";
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
        <li key={o.id} className="card px-3.5 py-2.5 hover:border-accent/60 transition-colors">
          <Link href={orgHref(locale, o)} className="no-underline text-ink font-medium text-[14px] leading-snug block">{o.name_lat}</Link>
          <div className="text-[12px] text-muted mt-0.5 truncate">{o.type_name}{o.place_name && o.place_name !== o.founder_name ? ` · ${o.place_name}` : ""}</div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Home
export async function Home({ locale }: { locale: Locale }) {
  const d = t(locale);
  const [okruzi, types, stats] = await Promise.all([db.getOkruzi(), db.getOrgTypes(), db.getStats()]);
  const byGroup = GROUPS.map((g) => ({ g, types: types.filter((x) => x.group === g && x.org_count > 0) }));
  return (
    <main>
      <section className="bg-surface border-b border-line">
        <div className="shell py-10 sm:py-14">
          <h1 className="font-serif text-[30px] sm:text-[40px] font-semibold leading-[1.1] max-w-3xl">{d.tagline}</h1>
          <p className="text-muted mt-3 text-[15px] tabular">{stats.orgs.toLocaleString("sr-Latn")} {d.institutions} · {stats.jls} {d.municipalities} · {stats.types} {locale === "sr" ? "vrsta institucija" : locale === "en" ? "institution types" : locale === "ru" ? "типов учреждений" : "Einrichtungsarten"}</p>
          <div className="mt-6"><SearchBox locale={locale} large /></div>
        </div>
      </section>
      <section className="shell py-10">
        <div className="eyebrow">{d.browseByRegion}</div>
        <h2 className="font-serif text-[24px] font-semibold mt-1 mb-5">{locale === "sr" ? "25 okruga, 145 gradova i opština" : locale === "en" ? "25 districts, 145 cities and municipalities" : locale === "ru" ? "25 округов, 145 городов и общин" : "25 Bezirke, 145 Städte und Gemeinden"}</h2>
        <SerbiaMap okruzi={okruzi.map((o) => ({ slug: o.slug, name_lat: o.name_lat, seat_name_lat: o.seat_name_lat, jls_count: o.jls_count, org_count: o.org_count }))}
                   locale={locale} labels={{ institutions: d.institutions, municipalities: d.municipalities, hint: d.mapHint }} />
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
          {okruzi.map((o) => <li key={o.id}><Link href={href(locale, `/okrug/${o.slug}`)}>{o.name_lat}</Link> <span className="text-muted tabular">{o.org_count}</span></li>)}
        </ul>
      </section>
      <section className="bg-surface border-y border-line">
        <div className="shell py-10">
          <div className="eyebrow">{d.browseByCategory}</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {byGroup.map(({ g, types }) => (
              <div key={g}>
                <h3 className="font-semibold text-[15px] mb-2">{d.groups[g]}</h3>
                <ul className="text-[13.5px] grid gap-1">
                  {types.map((x) => <li key={x.id} className="flex justify-between gap-3"><Link href={href(locale, `/${x.slug}`)}>{x.name_plural_lat ?? x.name_lat}</Link><span className="text-muted tabular">{x.org_count.toLocaleString("sr-Latn")}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="shell py-10">
        <div className="card p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-4 items-center" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
          <div>
            <div className="eyebrow text-accent-ink">{d.forForeigners}</div>
            <h2 className="font-serif text-[22px] font-semibold mt-1">{d.forForeignersLead}</h2>
          </div>
          <Link href={href(locale, "/za-strance")} className="rounded-md bg-accent text-white px-4 py-2.5 no-underline font-medium text-[14px] justify-self-start">{d.forForeigners} →</Link>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------- Okrug hub
export async function OkrugHub({ locale, okrug }: { locale: Locale; okrug: db.TU }) {
  const d = t(locale);
  const jls = await db.getJlsInOkrug(okrug.id);
  return (
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: okrug.name_lat }]} />
      <div className="eyebrow mt-4">{d.okrug}</div>
      <h1 className="font-serif text-[30px] font-semibold leading-tight">{okrug.official_name_lat ?? okrug.name_lat}</h1>
      {okrug.seat_name_lat && <p className="text-muted mt-1">{d.seat}: {okrug.seat_name_lat}</p>}
      <AdSlot code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
        {jls.map((j) => (
          <li key={j.id} className="card p-4 hover:border-accent/60 transition-colors">
            <div className="eyebrow">{j.jls_kind === "grad" ? d.city : d.municipality}</div>
            <Link href={href(locale, `/${j.slug}`)} className="font-serif text-[19px] font-semibold no-underline text-ink">{j.name_lat}</Link>
            <div className="text-[13px] text-muted mt-1 tabular">{j.org_count} {d.institutions}</div>
          </li>
        ))}
      </ul>
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
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, ...(okrug ? [{ href: href(locale, `/okrug/${okrug.slug}`), label: okrug.name_lat }] : []), ...(parent ? [{ href: href(locale, `/${parent.slug}`), label: parent.name_lat }] : []), { label: unit.name_lat }]} />
      <div className="eyebrow mt-4">{unit.level === "gradska_opstina" ? d.gradskaOpstina : unit.jls_kind === "grad" ? d.city : d.municipality}{okrug && unit.level === "jls" ? ` · ${okrug.name_lat}` : ""}</div>
      <h1 className="font-serif text-[30px] font-semibold leading-tight">{tuLabel(unit)}</h1>
      <p className="text-muted mt-1 tabular">{orgs.length.toLocaleString("sr-Latn")} {d.institutions}{unit.website ? <> · <a href={unit.website} rel="noopener">{d.website} ↗</a></> : null}</p>
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
                      <li key={type.id} className="card px-3.5 py-2.5">
                        <Link href={href(locale, `/${type.slug}`)} className="font-medium text-[14px] no-underline text-ink">{type.name_lat}</Link>
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
        <aside className="lg:sticky lg:top-4 grid gap-5">
          <SponsorCard label={d.sponsor} sponsor={null} compact />
          <div className="card p-4 text-[13.5px]">
            <div className="eyebrow mb-2">{d.okrug}</div>
            {okrug && <Link href={href(locale, `/okrug/${okrug.slug}`)} className="font-medium">{okrug.name_lat}</Link>}
            {unit.seat_name_lat && unit.level === "jls" && <div className="text-muted mt-2">{d.seat}: {unit.seat_name_lat}</div>}
            <div className="text-muted mt-2">{locale === "sr" ? "Ovu stranicu možete deliti: " : "Share: "}<span className="font-mono text-[12px] break-all">{path}</span></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Org type hub
export async function OrgTypeHub({ locale, type }: { locale: Locale; type: db.OrgType }) {
  const d = t(locale);
  const orgs = await db.getOrgsOfType(type.slug, 5000);
  const groups = new Map<string, db.OrgRow[]>();
  for (const o of orgs) { const k = o.founder_name ?? o.place_name ?? "—"; groups.set(k, [...(groups.get(k) ?? []), o]); }
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, "sr-Latn"));
  return (
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.groups[type.group] }, { label: type.name_plural_lat ?? type.name_lat }]} />
      <div className="eyebrow mt-4">{d.groups[type.group]}</div>
      <h1 className="font-serif text-[30px] font-semibold leading-tight">{type.name_plural_lat ?? type.name_lat}</h1>
      <p className="text-muted mt-1 tabular">{orgs.length.toLocaleString("sr-Latn")} {d.institutions} · {keys.length} {d.municipalities}</p>
      {type.description_md && <div className="prose max-w-3xl mt-3 text-[14.5px]">{type.description_md}</div>}
      <AdSlot code="jls_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div className="grid gap-5">
          {keys.map((k, i) => {
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
        <aside className="lg:sticky lg:top-4"><SponsorCard label={d.sponsor} sponsor={null} compact /></aside>
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
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, ...(jls ? [{ href: href(locale, `/${jls.slug}`), label: jls.name_lat }] : []), { href: href(locale, `/${org.type_slug}`), label: type.name_lat }, ...(loc && !loc.is_primary ? [{ href: orgHref(locale, org), label: org.name_lat }, { label: loc.unit_name_lat }] : [{ label: org.name_lat }])]} />
      <AdSlot code="loc_top_leaderboard" w={728} h={90} mobileH={100} label={d.ad} />
      <h1 className="font-serif text-[28px] sm:text-[32px] font-semibold leading-[1.15]">{title}</h1>
      <p className="text-muted mt-1 text-[14px]">{org.official_name_lat && org.official_name_lat.toLowerCase() !== org.name_lat.toLowerCase() ? org.official_name_lat : type.name_lat}{org.founder_name ? ` · ${d.founder}: ` : ""}{org.founder_slug && org.founder_name ? <Link href={href(locale, `/${org.founder_slug}`)}>{org.founder_name}</Link> : null}</p>
      <div className="mt-2 flex items-center gap-3 flex-wrap"><VerificationChip state={loc?.verification ?? org.verification} locale={locale} /><a href="#izmeni" className="text-[12.5px]">{d.editData}</a></div>
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 mt-4 bg-bg/95 backdrop-blur border-b border-line lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:m-0 lg:mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {phones[0] ? <a href={`tel:${phones[0].value}`} className="rounded-md bg-ink text-bg px-3.5 py-2 text-[13.5px] font-medium no-underline">📞 {d.call} {phones[0].value_display ?? phones[0].value}</a>
                     : <span className="rounded-md bg-surface-2 text-muted px-3.5 py-2 text-[13.5px]">📞 {locale === "sr" ? "Telefon nije poznat" : "Phone unknown"}</span>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} rel="noopener nofollow" target="_blank" className="rounded-md border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium no-underline text-ink">{d.directions}</a>
          {site && <a href={site.startsWith("http") ? site : `https://${site}`} rel="noopener" target="_blank" className="rounded-md border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium no-underline text-ink">{d.website} ↗</a>}
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start mt-5">
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
        <aside className="lg:sticky lg:top-4 grid gap-5">
          <SponsorCard label={d.sponsor} sponsor={null} compact />
          {jls && <div className="card p-4 text-[13.5px]"><div className="eyebrow mb-2">{d.otherUnits}</div><Link href={href(locale, `/${org.type_slug}`)}>{type.name_plural_lat ?? type.name_lat}</Link><div className="mt-1"><Link href={href(locale, `/${jls.slug}`)}>{d.allInstitutions} · {jls.name_lat}</Link></div>{okrug && <div className="mt-1"><Link href={href(locale, `/okrug/${okrug.slug}`)}>{okrug.name_lat}</Link></div>}</div>}
          <div className="hidden xl:block"><AdSlot code="loc_sidebar_programmatic" w={300} h={600} label={d.ad} /></div>
        </aside>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Search
export async function SearchPage({ locale, q }: { locale: Locale; q: string }) {
  const d = t(locale);
  const hits = q.trim().length >= 2 ? await db.search(q.trim()) : [];
  return (
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.search }]} />
      <h1 className="font-serif text-[26px] font-semibold mt-4">{d.results} „{q}“</h1>
      <div className="mt-4"><SearchBox locale={locale} defaultValue={q} large /></div>
      {hits.length === 0 ? <p className="text-muted mt-6">{d.noResults}</p> : (
        <ul className="mt-6 grid gap-2 max-w-3xl">
          {hits.map((h, i) => (
            <li key={i} className="card px-4 py-3">
              <Link href={h.kind === "tu" ? href(locale, `/${h.slug}`) : href(locale, `/${h.type_slug}/${h.slug}`)} className="font-medium no-underline text-ink text-[15px]">{h.name_lat}</Link>
              <div className="text-[12.5px] text-muted">{h.kind === "tu" ? (h.sub ?? d.municipality) : h.sub}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// ---------------------------------------------------------------- For foreigners
export async function ForForeigners({ locale }: { locale: Locale }) {
  const d = t(locale); const g = GUIDE[locale];
  const types = await db.getOrgTypes();
  return (
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: d.forForeigners }]} />
      <h1 className="font-serif text-[30px] font-semibold mt-4 max-w-3xl">{g.title}</h1>
      <p className="text-muted mt-2 max-w-3xl text-[15px]">{g.lead}</p>
      <ol className="mt-8 grid md:grid-cols-2 gap-4">
        {g.steps.map((s, i) => {
          const ty = types.find((x) => x.slug === s.type);
          return (
            <li key={i} className="card p-5">
              <div className="eyebrow">{String(i + 1).padStart(2, "0")} · {s.where}</div>
              <h2 className="font-semibold text-[17px] mt-1">{s.title}</h2>
              <p className="text-[14px] text-muted mt-1.5">{s.body}</p>
              {ty && <Link href={href(locale, `/${ty.slug}`)} className="inline-block mt-3 text-[14px] font-medium">{ty.name_plural_lat ?? ty.name_lat} ({ty.org_count}) →</Link>}
            </li>
          );
        })}
      </ol>
      <p className="text-[12.5px] text-muted mt-8 max-w-3xl">{g.disclaimer}</p>
    </main>
  );
}

export function StaticPage({ locale, slug }: { locale: Locale; slug: string }) {
  const d = t(locale);
  const pages: Record<string, { title: string; body: string[] }> = {
    "o-sajtu": { title: d.aboutSite, body: ["Adresar uprave je nezavisni, privatni imenik svih institucija u Srbiji: republičkih organa, lokalne samouprave, javnih preduzeća, ustanova, sudova, javnih beležnika i izvršitelja.", "Podaci potiču iz zvaničnih registara (Uprava za trezor – Evidencija KJS, RZS, RGZ) i zvaničnih sajtova institucija, i dopunjuju se prijavama korisnika. Sajt nije državni servis i ne zastupa nijednu instituciju.", "Finansira se oglasima, sponzorstvima lokalnih firmi i posredovanjem upita ka proverenim partnerima; svaki plaćeni sadržaj je obeležen."] },
    partneri: { title: d.becomePartner, body: ["Lokalne firme mogu zakupiti sponzorsko mesto na stranicama institucija u svom gradu (jedan sponzor po stranici), ili primati upite korisnika iz svoje oblasti (knjigovodstvo, advokatura, geodezija, osiguranje, prevodi).", "Cenovnik zavisi od posećenosti stranica koje vas zanimaju; javite se preko kontakt forme ili na email naveden u podnožju."] },
    privatnost: { title: d.privacy, body: ["Sajt ne koristi kolačiće za praćenje; analitika je anonimna. Oglasne mreže (Google AdSense) mogu koristiti kolačiće u skladu sa svojim politikama; posetiocima iz EU prikazuje se izbor saglasnosti.", "Podaci iz forme za upit (ime, telefon, email, poruka) prosleđuju se jednom partneru radi odgovora i brišu se najkasnije 180 dana od slanja. Rukovalac podacima je operator sajta; zahtev za brisanje pošaljite na email u podnožju.", "Podaci o institucijama su javni podaci o organima javne vlasti; zahtev za ispravku možete poslati sa svake stranice."] },
  };
  const p = pages[slug];
  if (!p) return null;
  return (
    <main className="shell py-6">
      <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: p.title }]} />
      <h1 className="font-serif text-[30px] font-semibold mt-4">{p.title}</h1>
      <div className="prose max-w-3xl mt-3 text-[15px]">{p.body.map((x, i) => <p key={i}>{x}</p>)}</div>
    </main>
  );
}
