/**
 * Putokaz (roadmap): the steps a newcomer takes, in order, by situation (lib/roadmaps.ts). The hub lists the situations;
 * each roadmap is one numbered road with a card per step that opens the verified guide, the institution type or the
 * visa pages. Server-rendered, no client code.
 */
import Link from "@/components/Link";
import * as db from "@/lib/db";
import { href, t, tn, type Locale } from "@/lib/i18n";
import { Breadcrumbs } from "./ui";
import Glyph3D from "./Glyph3D";
import { emblemFor } from "@/lib/emblem-map";
import { GUIDE_DOCS } from "@/lib/guide-docs";
import { ROADMAPS, ROAD_GROUPS, ROAD_LABELS, roadsIn, type Roadmap, type RoadGroup, type RoadStep } from "@/lib/roadmaps";

type Resolved = { n: number; kind: "guide" | "type" | "path"; title: string; sub: string | null; why: string; only: string | null; to: string; cta: string; badge: string; icon: string | null };

async function resolveSteps(road: Roadmap, locale: Locale): Promise<Resolved[]> {
  const L = ROAD_LABELS[locale];
  const [guides, types] = await Promise.all([db.getGuides(), db.getOrgTypes()]);
  const out: Resolved[] = [];
  for (const s of road.steps as RoadStep[]) {
    if (s.guide) {
      const g = guides.find((x) => x.slug === s.guide); if (!g) continue; // a guide that is not published is simply not a step
      const c = (g.guide[locale] ?? g.guide.en ?? g.guide.sr ?? {}) as { title?: string; summary?: string };
      out.push({ n: out.length + 1, kind: "guide", title: s.title?.[locale] ?? c.title ?? g.name_lat, sub: g.category_name ?? null, why: s.why[locale], only: s.only?.[locale] ?? null, to: href(locale, `/vodic/${g.slug}`), cta: L.openGuide, badge: L.guide, icon: GUIDE_DOCS[g.slug] ? "file-badge" : "file-text" });
    } else if (s.type) {
      const ty = types.find((x) => x.slug === s.type); if (!ty) continue;
      out.push({ n: out.length + 1, kind: "type", title: s.title?.[locale] ?? tn(ty, locale), sub: null, why: s.why[locale], only: s.only?.[locale] ?? null, to: href(locale, `/${ty.slug}`), cta: L.openPlaces, badge: L.places, icon: emblemFor(ty.slug, ty.icon) ?? null });
    } else if (s.path) {
      out.push({ n: out.length + 1, kind: "path", title: s.title?.[locale] ?? s.path, sub: null, why: s.why[locale], only: s.only?.[locale] ?? null, to: href(locale, s.path), cta: L.open, badge: L.overview, icon: "globe" });
    }
  }
  return out;
}

/** Situations as tiles. `group` limits them to one topic; `roads` gives an explicit list. */
export function RoadTiles({ locale, group, roads }: { locale: Locale; group?: RoadGroup; roads?: Roadmap[] }) {
  const L = ROAD_LABELS[locale]; const list = roads ?? (group ? roadsIn(group) : ROADMAPS);
  return (
    <ul className="road-hub">
      {list.map((r, i) => (
        <li key={r.slug}>
          <Link href={href(locale, `/putokaz/${r.slug}`)} className="road-tile card card-hover plinth no-underline text-ink">
            <span className="road-tile-n">{String(i + 1).padStart(2, "0")}</span>
            <Glyph3D icon={r.emblem} size={84} className="road-tile-img" />
            <span className="road-tile-title">{r.title[locale]}</span>
            <span className="road-tile-lead">{r.lead[locale]}</span>
            <span className="road-tile-foot"><span>{r.steps.length} {L.steps}</span><span className="road-tile-go">{L.open} →</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The topics as compact tiles (home page, foreigners page): each opens its section of the hub. */
export function RoadGroupTiles({ locale }: { locale: Locale }) {
  const L = ROAD_LABELS[locale];
  return (
    <ul className="road-groups">
      {ROAD_GROUPS.map((g) => { const list = roadsIn(g.key); if (!list.length) return null; return (
        <li key={g.key}>
          <Link href={`${href(locale, "/putokaz")}#${g.key}`} className="road-group card card-hover no-underline text-ink">
            <Glyph3D icon={g.emblem} size={56} className="road-group-img" />
            <span className="min-w-0"><span className="road-group-name">{g.name[locale]}</span><span className="road-group-sub">{list.slice(0, 3).map((r) => r.title[locale]).join(" · ")}</span></span>
            <span className="road-group-n tabular">{list.length} →</span>
          </Link>
        </li>); })}
    </ul>
  );
}

export async function RoadmapHub({ locale }: { locale: Locale }) {
  const d = t(locale); const L = ROAD_LABELS[locale];
  const groups = ROAD_GROUPS.filter((g) => roadsIn(g.key).length);
  return (
    <main id="main">
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-12">
        <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { label: L.nav }]} />
        <div className="eyebrow mt-4">{L.nav} · {ROADMAPS.length} {L.count} · {groups.length} {L.topics}</div>
        <h1 className="display-sm text-[32px] sm:text-[44px] mt-1 max-w-3xl">{L.title}</h1>
        <p className="text-muted mt-3 text-[16px] max-w-2xl">{L.lead}</p>
        <nav className="road-jump" aria-label={L.byTopic}>{groups.map((g) => <a key={g.key} href={`#${g.key}`}><b>{roadsIn(g.key).length}</b>{g.name[locale]}</a>)}</nav>
      </div></section>
      <div className="shell py-8 grid gap-10">
        {groups.map((g) => (
          <section key={g.key} id={g.key} className="scroll-mt-24">
            <h2 className="road-group-head"><Glyph3D icon={g.emblem} size={40} />{g.name[locale]}<span className="tabular">{roadsIn(g.key).length}</span></h2>
            <RoadTiles locale={locale} group={g.key} />
          </section>
        ))}
        <p className="road-note">{L.note} <Link href={href(locale, "/za-strance")}>{L.foreigners} →</Link></p>
      </div>
    </main>
  );
}

export async function RoadmapPage({ locale, road }: { locale: Locale; road: Roadmap }) {
  const d = t(locale); const L = ROAD_LABELS[locale];
  const steps = await resolveSteps(road, locale);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const ld = { "@context": "https://schema.org", "@type": "HowTo", name: road.title[locale], description: road.lead[locale], inLanguage: locale === "sr" ? "sr-Latn" : locale,
    step: steps.map((s) => ({ "@type": "HowToStep", position: s.n, name: s.title, text: s.why, url: `${base}${s.to}` })) };
  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="hero-light border-b border-line"><div className="shell py-8 sm:py-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <Breadcrumbs locale={locale} items={[{ href: href(locale, "/"), label: d.home }, { href: href(locale, "/putokaz"), label: L.nav }, { href: `${href(locale, "/putokaz")}#${road.group}`, label: ROAD_GROUPS.find((g) => g.key === road.group)?.name[locale] ?? L.nav }, { label: road.title[locale] }]} />
          <div className="eyebrow mt-4">{L.nav} · {steps.length} {L.steps}</div>
          <h1 className="display-sm text-[32px] sm:text-[44px] mt-1">{road.title[locale]}</h1>
          <p className="text-muted mt-3 text-[16px] max-w-2xl">{road.lead[locale]}</p>
          <nav className="road-jump" aria-label={L.steps}>{steps.map((s) => <a key={s.n} href={`#korak-${s.n}`}><b>{s.n}</b>{s.title}</a>)}</nav>
        </div>
        <Glyph3D icon={road.emblem} size={200} className="road-hero-img" />
      </div></section>
      <div className="shell py-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <ol className="road">
          {steps.map((s) => (
            <li key={s.n} id={`korak-${s.n}`} className="road-step">
              <span className="road-node" aria-hidden>{s.n}</span>
              <div className="road-card card card-hover">
                <div className="road-card-top">
                  <span className={`road-badge is-${s.kind}`}>{L.step} {s.n} · {s.badge}</span>
                  {s.only && <span className="road-only">{s.only}</span>}
                </div>
                <div className="road-card-main">
                  {s.icon && <Glyph3D icon={s.icon} size={56} className="road-card-img" />}
                  <div className="min-w-0">
                    <h2 className="road-card-title"><Link href={s.to} className="hit no-underline text-ink hover:text-accent">{s.title}</Link></h2>
                    <p className="road-card-why">{s.why}</p>
                  </div>
                </div>
                <span className="road-card-cta">{s.cta} →</span>
              </div>
            </li>
          ))}
        </ol>
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="card p-4">
            <div className="eyebrow mb-2">{ROAD_GROUPS.find((g) => g.key === road.group)?.name[locale] ?? L.other}</div>
            <ul className="grid gap-2 text-[14px]">{roadsIn(road.group).filter((r) => r.slug !== road.slug).map((r) => <li key={r.slug}><Link href={href(locale, `/putokaz/${r.slug}`)} className="no-underline text-ink hover:text-accent">{r.title[locale]} →</Link></li>)}</ul>
            <Link href={href(locale, "/putokaz")} className="inline-block mt-3 text-[13.5px] font-medium">{L.byTopic} →</Link>
          </div>
          <p className="road-note">{L.note}</p>
          {road.group === "dolazak" && <Link href={href(locale, "/za-strance")} className="text-[14px] font-medium">{L.foreigners} →</Link>}
        </aside>
      </div>
    </main>
  );
}
