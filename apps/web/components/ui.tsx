import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t, href, LOCALES, LOCALE_LABEL } from "@/lib/i18n";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Putanja" className="text-[12.5px] text-muted flex flex-wrap gap-x-1.5 gap-y-0.5">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>›</span>}
          {it.href ? <Link href={it.href} className="text-muted hover:text-ink no-underline hover:underline">{it.label}</Link> : <span className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "moss" | "brick" | "accent" }) {
  const cls = { neutral: "bg-surface-2 text-muted", moss: "bg-moss-soft text-moss", brick: "bg-brick-soft text-brick", accent: "bg-accent-soft text-accent-ink" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>{children}</span>;
}

export function VerificationChip({ state, locale }: { state: string; locale: Locale }) {
  const d = t(locale);
  if (state === "human_verified") return <Chip tone="moss">✓ {d.verified}</Chip>;
  if (state === "auto_verified") return <Chip tone="accent">{d.autoVerified}</Chip>;
  return <Chip>{d.unverified}</Chip>;
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h2 id={id} className="text-[17px] font-semibold mb-3 scroll-mt-24">{children}</h2>;
}

/** Reserved-size ad container. Programmatic units mount here client-side; never shifts layout. */
export function AdSlot({ code, w, h, label, mobileH }: { code: string; w?: number; h?: number; label: string; mobileH?: number }) {
  return (
    <div className="my-5 flex justify-center" data-ad-slot={code}>
      <div className="relative rounded-md border border-dashed border-ad/40 bg-ad-soft text-ad text-[11px] font-mono grid place-items-center w-full"
           style={{ maxWidth: w ? `${w}px` : "100%", minHeight: `${mobileH ?? h ?? 100}px` }}>
        <span className="absolute -top-2 left-3 bg-surface px-1.5 text-[10px] uppercase tracking-wider">{label}</span>
        <span className="opacity-70">{code}{w && h ? ` · ${w}×${h}` : ""}</span>
      </div>
    </div>
  );
}

export function SponsorCard({ label, sponsor, compact = false }: {
  label: string; compact?: boolean;
  sponsor: { partner_name: string; headline: string | null; body: string | null; cta_text: string | null; landing_url: string; image_url: string | null; sponsorship_id: number } | null;
}) {
  if (!sponsor) {
    return (
      <div className={`relative rounded-lg border border-dashed border-brick/40 bg-brick-soft/50 p-4 ${compact ? "min-h-[250px]" : "min-h-[120px]"} grid place-items-center text-center`}>
        <span className="absolute -top-2 left-3 bg-surface px-1.5 text-[10px] uppercase tracking-wider text-brick">{label}</span>
        <div className="text-[13px] text-brick/80">Ovo mesto je slobodno za lokalnog sponzora.<br /><Link href="/partneri" className="text-brick underline">Saznajte više</Link></div>
      </div>
    );
  }
  return (
    <div className={`relative rounded-lg bg-brick-soft p-4 ${compact ? "min-h-[250px]" : ""}`}>
      <span className="absolute -top-2 left-3 bg-surface px-1.5 text-[10px] uppercase tracking-wider text-brick">{label}</span>
      <div className={`flex gap-3 ${compact ? "flex-col" : "items-start"}`}>
        <div className="w-11 h-11 rounded-md bg-surface border border-line shrink-0 overflow-hidden">
          {sponsor.image_url && <img src={sponsor.image_url} alt="" className="w-full h-full object-contain" />}
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{sponsor.headline ?? sponsor.partner_name}</div>
          {sponsor.body && <div className="text-[13px] text-muted">{sponsor.body}</div>}
          <a href={`/go/${sponsor.sponsorship_id}`} rel="sponsored nofollow" className="inline-block mt-2 rounded-md border border-brick text-brick px-3 py-1 text-[13px] no-underline">{sponsor.cta_text ?? "Sajt ↗"}</a>
        </div>
      </div>
    </div>
  );
}

export function LanguageSwitch({ locale, path }: { locale: Locale; path: string }) {
  return (
    <div className="flex items-center gap-1 text-[12.5px]">
      {LOCALES.map((l) => (
        <Link key={l} href={href(l, path)} hrefLang={l} aria-current={l === locale ? "true" : undefined}
              className={`px-2 py-1 rounded-md no-underline ${l === locale ? "bg-ink text-bg" : "text-muted hover:text-ink hover:bg-surface-2"}`}>
          {LOCALE_LABEL[l]}
        </Link>
      ))}
    </div>
  );
}
