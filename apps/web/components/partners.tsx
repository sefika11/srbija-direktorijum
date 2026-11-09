import Link from "next/link";
import * as db from "@/lib/db";
import { href, t, type Locale } from "@/lib/i18n";
import { Breadcrumbs, SectionTitle } from "./ui";
import { LeadForm } from "./forms";
import { Icon } from "./icons";

const L = {
  sr: { title: "Partnerstvo i oglašavanje", lead: "Gde da idem? je besplatan za građane i finansira se sponzorstvima lokalnih firmi i upitima koje prosleđujemo proverenim partnerima. Svaki plaćeni sadržaj je obeležen i uvek stoji ispod informacije koju je čitalac tražio.",
        how: "Kako funkcioniše", models: "Tri modela", sponsor: "Sponzorsko mesto", sponsorBody: "Vaša firma kao jedini sponzor na stranicama institucija u vašem gradu: npr. knjigovodstvena agencija na stranicama APR-a i Poreske uprave u Nišu, auto-škola na vodiču za vozačku dozvolu u Kragujevcu.",
        leads: "Upiti korisnika", leadsBody: "Čitalac koji na stranici institucije ili vodiča traži ponudu popunjava kratak obrazac; upit stiže vama, naplaćuje se po upitu, bez ugovora o minimumu.", ads: "Oglašavanje na vodičima", adsBody: "Natpisi i native kartice na vodičima po životnim situacijama, zakup po vodiču i okrugu.",
        inventory: "Inventar", verticals: "Oblasti za upite", slots: "Pozicije", pricing: "Okvirne cene", pricingNote: "Konačna cena zavisi od posećenosti stranica koje vas zanimaju; prikazujemo vam podatke o poseti pre ponude.", tier1: "Jedna stranica institucije", tier2: "Sve stranice jednog grada", tier3: "Jedna oblast na vodiču, nacionalno", monthly: "mesečno", negotiated: "po dogovoru",
        rules: "Pravila koja važe za sve partnere", rule1: "Informacija koju je čitalac tražio uvek je iznad svakog plaćenog sadržaja.", rule2: "Plaćeni sadržaj je vidljivo obeležen (Sponzor, Oglas, Lokalni partner).", rule3: "Jedan sponzor po stranici; nema aukcija za istu poziciju.", rule4: "Podaci iz upita čuvaju se 180 dana i prosleđuju samo partneru kome je upit upućen.", contact: "Javite se", perLead: "po upitu" },
  en: { title: "Partnership and advertising", lead: "Gde da idem? is free for citizens and funded by local business sponsorships and inquiries we route to verified partners. Every paid element is labelled and always sits below the information the reader came for.",
        how: "How it works", models: "Three models", sponsor: "Sponsored placement", sponsorBody: "Your company as the single sponsor on institution pages in your city: an accounting firm on the APR and Tax Administration pages in Niš, a driving school on the driving-licence guide in Kragujevac.",
        leads: "Reader inquiries", leadsBody: "A reader asking for an offer on an institution page or guide fills a short form; the inquiry goes to you and is billed per inquiry, no minimum contract.", ads: "Advertising on guides", adsBody: "Banners and native cards on life-situation guides, booked per guide and district.",
        inventory: "Inventory", verticals: "Inquiry verticals", slots: "Placements", pricing: "Indicative prices", pricingNote: "Final pricing depends on the traffic of the pages you want; we show you visit data before quoting.", tier1: "One institution page", tier2: "All pages of one city", tier3: "One vertical on a guide, nationwide", monthly: "per month", negotiated: "negotiated",
        rules: "Rules that apply to every partner", rule1: "The information the reader came for always sits above any paid element.", rule2: "Paid content is visibly labelled (Sponsor, Ad, Local partner).", rule3: "One sponsor per page; no auctions for the same placement.", rule4: "Inquiry data is kept 180 days and shared only with the partner it was addressed to.", contact: "Get in touch", perLead: "per inquiry" },
} as const;

export async function PartnersPage({ locale, path }: { locale: Locale; path: string }) {
  const d = t(locale); const s = L[locale === "en" ? "en" : "sr"];
  const [verticals, slots, partnerVertical] = await Promise.all([
    db.sql<{ slug: string; name_lat: string; pitch_lat: string | null; default_price_rsd: number | null }[]>`select slug, name_lat, pitch_lat, default_price_rsd::float from lead_verticals where is_active and slug <> 'partnerstvo' order by name_lat`,
    db.sql<{ code: string; template: string; kind: string; width: number | null; height: number | null; position_note: string | null }[]>`select code, template::text, kind::text, width, height, position_note from ad_slots where is_active and kind in ('sponsor','lead_form','affiliate') order by template, code`,
    db.sql<{ id: number; slug: string; name_lat: string; pitch_lat: string | null; form_schema: unknown }[]>`select id, slug, name_lat, pitch_lat, form_schema from lead_verticals where slug = 'partnerstvo'`.then((r) => r[0] ?? null),
  ]);
  const fmt = (n: number) => n.toLocaleString("sr-Latn");
  return (
    <main>
      <section className="hero-light border-b border-line"><div className="shell py-10 sm:py-14">
        <Breadcrumbs items={[{ href: href(locale, "/"), label: d.home }, { label: s.title }]} />
        <div className="eyebrow mt-4">{d.becomePartner}</div>
        <h1 className="display-sm text-[34px] sm:text-[44px] mt-2 max-w-[18ch]">{s.title}</h1>
        <p className="lede text-muted mt-4 max-w-[60ch]">{s.lead}</p>
      </div></section>

      <div className="shell py-12 grid gap-14">
        <section>
          <div className="section-head"><div><div className="eyebrow">01 · {s.how}</div><h2 className="display-sm mt-2">{s.models}</h2></div></div>
          <div className="grid md:grid-cols-3 gap-4">
            {[{ i: "landmark", t: s.sponsor, b: s.sponsorBody }, { i: "phone", t: s.leads, b: s.leadsBody }, { i: "search", t: s.ads, b: s.adsBody }].map((x) => (
              <div key={x.t} className="bento-card"><span className="icon-badge">{x.i === "landmark" ? <Icon.landmark /> : x.i === "phone" ? <Icon.phone /> : <Icon.search />}</span><h3 className="font-semibold text-[17px] mt-4">{x.t}</h3><p className="text-muted text-[14px] mt-2 leading-relaxed">{x.b}</p></div>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head"><div><div className="eyebrow">02 · {s.inventory}</div><h2 className="display-sm mt-2">{s.verticals}</h2></div></div>
          <div className="card overflow-x-auto"><table className="w-full text-[14px]"><thead><tr className="text-left text-muted text-[12px] uppercase tracking-wide"><th className="px-4 py-2.5 font-medium">{locale === "en" ? "Vertical" : "Oblast"}</th><th className="px-4 py-2.5 font-medium">{locale === "en" ? "Where the form appears" : "Gde se forma prikazuje"}</th><th className="px-4 py-2.5 font-medium text-right">{s.perLead}</th></tr></thead>
            <tbody>{verticals.map((v) => <tr key={v.slug} className="border-t border-line"><td className="px-4 py-2.5 font-medium">{v.name_lat}</td><td className="px-4 py-2.5 text-muted">{v.pitch_lat}</td><td className="px-4 py-2.5 text-right tabular">{v.default_price_rsd ? `${fmt(v.default_price_rsd)} RSD` : s.negotiated}</td></tr>)}</tbody></table></div>
          <h3 className="font-semibold text-[16px] mt-8 mb-3">{s.slots}</h3>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[13.5px]">
            {slots.map((x) => <li key={x.code} className="card p-3.5"><div className="font-mono text-[12px] text-muted">{x.code}</div><div className="mt-1 font-medium">{x.kind === "sponsor" ? s.sponsor : x.kind === "lead_form" ? s.leads : "Affiliate"}{x.width && x.height ? ` · ${x.width}×${x.height}` : ""}</div>{x.position_note && <div className="text-muted mt-1">{x.position_note}</div>}</li>)}
          </ul>
        </section>

        <section>
          <div className="section-head"><div><div className="eyebrow">03 · {s.pricing}</div><h2 className="display-sm mt-2">{s.pricing}</h2></div></div>
          <div className="grid md:grid-cols-3 gap-4">
            {[{ t: s.tier1, p: "3.000 – 6.000 RSD", m: s.monthly }, { t: s.tier2, p: "10.000 – 25.000 RSD", m: s.monthly }, { t: s.tier3, p: s.negotiated, m: "" }].map((x) => (
              <div key={x.t} className="card p-6"><div className="eyebrow">{x.t}</div><div className="font-serif text-[28px] font-semibold mt-3 leading-none text-accent">{x.p}</div>{x.m && <div className="text-muted text-[13px] mt-1">{x.m}</div>}</div>
            ))}
          </div>
          <p className="text-muted text-[13.5px] mt-4 max-w-2xl">{s.pricingNote}</p>
        </section>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-10 items-start">
          <div>
            <SectionTitle>{s.rules}</SectionTitle>
            <ol className="grid gap-3">{[s.rule1, s.rule2, s.rule3, s.rule4].map((r, i) => <li key={i} className="flex gap-3.5"><span className="shrink-0 w-8 h-8 rounded-full bg-accent text-white grid place-items-center font-semibold text-[13px]">{i + 1}</span><p className="text-[14.5px] pt-1">{r}</p></li>)}</ol>
            <p className="text-[13.5px] text-muted mt-6"><Link href={href(locale, "/privatnost")}>{d.privacy}</Link> · <Link href={href(locale, "/o-sajtu")}>{d.aboutSite}</Link></p>
          </div>
          <div id="kontakt">
            <SectionTitle>{s.contact}</SectionTitle>
            {partnerVertical && <LeadForm locale={locale} vertical={partnerVertical} context={{ page_path: path, location_id: null, territorial_unit_id: null }} />}
          </div>
        </section>
      </div>
    </main>
  );
}
