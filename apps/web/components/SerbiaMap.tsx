"use client";
import { useState } from "react";
import Link from "next/link";
import { MAP_VIEWBOX, OKRUG_SHAPES } from "@/lib/serbia-map";
import { href, type Locale } from "@/lib/i18n";

type Okrug = { slug: string; name_lat: string; seat_name_lat: string | null; jls_count: number; org_count: number };

export default function SerbiaMap({ okruzi, locale, labels }: { okruzi: Okrug[]; locale: Locale; labels: { institutions: string; municipalities: string; hint: string } }) {
  const hrefFor = (slug: string) => href(locale, `/okrug/${slug}`);
  const [active, setActive] = useState<string | null>(null);
  const byslug = Object.fromEntries(okruzi.map((o) => [o.slug, o]));
  const max = Math.max(1, ...okruzi.map((o) => o.org_count));
  const a = active ? byslug[active] : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
      <svg viewBox={MAP_VIEWBOX} role="img" aria-label="Mapa okruga Srbije" className="w-full h-auto max-h-[560px]" onMouseLeave={() => setActive(null)}>
        {OKRUG_SHAPES.map((s) => {
          const o = byslug[s.slug];
          const share = o ? o.org_count / max : 0;
          const isActive = active === s.slug;
          return (
            <Link key={s.slug} href={hrefFor(s.slug)} aria-label={o?.name_lat ?? s.slug}>
              <path d={s.d} onMouseEnter={() => setActive(s.slug)} onFocus={() => setActive(s.slug)}
                    style={{ fill: isActive ? "var(--accent)" : `color-mix(in oklab, var(--accent) ${18 + Math.round(share * 55)}%, var(--surface))`, stroke: "var(--surface)", strokeWidth: 1.2, transition: "fill .15s", cursor: "pointer" }} />
            </Link>
          );
        })}
        {OKRUG_SHAPES.map((s) => (
          <text key={`l-${s.slug}`} x={s.cx} y={s.cy} textAnchor="middle" pointerEvents="none" style={{ fontSize: 9, fill: active === s.slug ? "#fff" : "var(--ink)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
            {(byslug[s.slug]?.seat_name_lat ?? "").replace("Sremska Mitrovica", "S. Mitrovica")}
          </text>
        ))}
      </svg>
      <div className="card p-4 min-h-[150px] lg:sticky lg:top-4">
        {a ? (
          <>
            <div className="eyebrow">Okrug</div>
            <div className="font-serif text-[20px] font-semibold leading-tight mt-1">{a.name_lat}</div>
            <div className="text-muted text-[13px] mt-1">Sedište: {a.seat_name_lat}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div><dt className="text-muted">{labels.institutions}</dt><dd className="tabular text-[18px] font-semibold">{a.org_count.toLocaleString("sr-Latn")}</dd></div>
              <div><dt className="text-muted">{labels.municipalities}</dt><dd className="tabular text-[18px] font-semibold">{a.jls_count}</dd></div>
            </dl>
            <Link href={hrefFor(a.slug)} className="inline-block mt-3 rounded-md bg-accent text-white px-3 py-1.5 text-[13px] no-underline">Otvori okrug →</Link>
          </>
        ) : (
          <div className="text-muted text-[13.5px]">{labels.hint}</div>
        )}
      </div>
    </div>
  );
}
