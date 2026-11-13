"use client";
/** Map stage used by the home page and the district / municipality hubs.
 *  3D WebGL on ≥768 px screens with WebGL; otherwise the given 2D fallback (the interactive SVG map on the home page,
 *  a static linked SVG on the hubs). The 3D/2D toggle sits bottom-right so it never covers the SVG zoom buttons. */
import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/Link";
import { pick, type Locale } from "@/lib/i18n";
import { MAP_VIEWBOX } from "@/lib/serbia-map";
import type { Feature3D, Context3D, BBox, Labels3D } from "./SerbiaMap3D";

function Poster({ features, context, cls }: { features: Feature3D[]; context: Context3D[]; cls?: string }) {
  return (
    <div className={`m3-stage m3-poster ${cls ?? ""}`} aria-hidden>
      <svg viewBox={MAP_VIEWBOX} className="absolute inset-0 w-full h-full p-8" preserveAspectRatio="xMidYMid meet">
        {context.map((c) => <path key={c.key} d={c.d} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="1" />)}
        {features.map((s) => <path key={s.key} d={s.d} fill="var(--line)" stroke="var(--line-strong)" strokeWidth="1" />)}
      </svg>
    </div>
  );
}
const load3D = () => import("./SerbiaMap3D");
// Start fetching the WebGL chunk as soon as this module evaluates on a wide screen, before hydration finishes.
if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) void load3D();
const SerbiaMap3D = dynamic(load3D, { ssr: false, loading: () => <div className="m3-stage" aria-hidden /> });

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/** Static linked SVG: the hub fallback for phones and no-WebGL browsers. */
export function StaticMap({ features, context, fit, cls }: { features: Feature3D[]; context: Context3D[]; fit?: BBox; cls?: string }) {
  const bb: BBox = fit ?? features.reduce<BBox>((a, f) => [Math.min(a[0], f.bbox[0]), Math.min(a[1], f.bbox[1]), Math.max(a[2], f.bbox[2]), Math.max(a[3], f.bbox[3])], [1e9, 1e9, -1e9, -1e9]);
  const pad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * .08;
  const vb = `${bb[0] - pad} ${bb[1] - pad} ${bb[2] - bb[0] + pad * 2} ${bb[3] - bb[1] + pad * 2}`;
  const max = Math.max(1, ...features.map((f) => f.count));
  const fs = (bb[2] - bb[0] + pad * 2) / 42;
  return (
    <div className={`m3-stage m3-static ${cls ?? ""}`}>
      <svg viewBox={vb} className="absolute inset-0 w-full h-full p-3" preserveAspectRatio="xMidYMid meet" role="img">
        {context.map((c) => <path key={c.key} d={c.d} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={fs * .06} />)}
        {features.map((f) => (
          <Link key={f.key} href={f.href} aria-label={f.label ?? f.name}>
            <path d={f.d} className="m3-static-unit" style={{ fill: `color-mix(in oklab, var(--accent) ${Math.round(10 + Math.sqrt(f.count / max) * 45)}%, var(--surface))` }} stroke="var(--ink)" strokeWidth={fs * .08} strokeLinejoin="round" />
            <text x={f.cx} y={f.cy} textAnchor="middle" fontSize={fs} fontFamily="var(--font-mono)" fill="var(--ink)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={fs * .28} strokeLinejoin="round">{(f.label ?? f.name).toUpperCase()}</text>
          </Link>
        ))}
      </svg>
    </div>
  );
}

export default function MapStage({ features, context = [], fit, locale, labels, fallback, cls, hint, padTop, padBottom }: { features: Feature3D[]; context?: Context3D[]; fit?: BBox; locale: Locale; labels: Labels3D; fallback?: ReactNode; cls?: string; hint?: string; padTop?: number; padBottom?: number }) {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  useEffect(() => { setMode(window.matchMedia("(min-width: 768px)").matches && webglOk() ? "3d" : "2d"); }, []);
  const L = { sr: { d3: "3D", d2: "2D" }, en: { d3: "3D", d2: "2D" }, ru: { d3: "3D", d2: "2D" }, de: { d3: "3D", d2: "2D" } }[locale];
  if (mode === null) return <Poster features={features} context={context} cls={cls} />;
  const twoD = fallback ?? <StaticMap features={features} context={context} fit={fit} cls={cls} />;
  return (
    <div className="relative">
      {mode === "3d" ? (
        <>
          <SerbiaMap3D features={features} context={context} fit={fit} labels={{ ...labels, hint: hint ?? labels.hint }} className={cls} padTop={padTop} padBottom={padBottom} onUnavailable={() => setMode("2d")} />
        </>
      ) : twoD}
      <div className="absolute right-3 bottom-3 z-20 flex gap-1 m3-toggle" role="tablist" aria-label={pick(locale, "Prikaz mape", "Map mode", "Режим карты", "Kartenansicht")}>
        <button type="button" role="tab" aria-selected={mode === "3d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "3d" ? "is-on" : ""}`} onClick={() => setMode("3d")}>{L.d3}</button>
        <button type="button" role="tab" aria-selected={mode === "2d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "2d" ? "is-on" : ""}`} onClick={() => setMode("2d")}>{L.d2}</button>
      </div>
    </div>
  );
}
