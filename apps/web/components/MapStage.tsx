"use client";
/** Hero map stage: 3D WebGL map on capable screens, the interactive SVG map (with municipality drill-down) as the 2D mode and as the fallback. */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import SerbiaMap, { type MapOkrug, type MapJls, type MapLabels } from "./SerbiaMap";
import type { Locale } from "@/lib/i18n";

const SerbiaMap3D = dynamic(() => import("./SerbiaMap3D"), { ssr: false, loading: () => <div className="m3-stage" aria-hidden /> });

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

export default function MapStage({ okruzi, jls, locale, labels }: { okruzi: MapOkrug[]; jls: MapJls[]; locale: Locale; labels: MapLabels }) {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    setMode(wide && webglOk() ? "3d" : "2d");
  }, []);
  const L = { sr: { d3: "3D", d2: "2D", hint3: "Pređite preko okruga. Klik otvara okrug. Visina = broj institucija." }, en: { d3: "3D", d2: "2D", hint3: "Hover a district. Click opens it. Height = number of institutions." }, ru: { d3: "3D", d2: "2D", hint3: "Наведите на округ. Клик открывает его. Высота = число учреждений." }, de: { d3: "3D", d2: "2D", hint3: "Bezirk überfahren. Klick öffnet ihn. Höhe = Zahl der Einrichtungen." } }[locale];
  if (mode === null) return <div className="m3-stage" aria-hidden />;
  return (
    <div className="relative">
      {mode === "3d" ? (
        <>
          <SerbiaMap3D okruzi={okruzi} locale={locale} labels={labels} onUnavailable={() => setMode("2d")} />
          <div className="absolute left-3 bottom-3 hidden sm:block pointer-events-none"><div className="map-chip text-[11.5px] text-muted">{L.hint3}</div></div>
        </>
      ) : (
        <SerbiaMap okruzi={okruzi} jls={jls} locale={locale} labels={labels} variant="light" height="hero" />
      )}
      <div className="absolute right-3 bottom-3 z-20 flex gap-1 m3-toggle" role="tablist" aria-label="Map mode">
        <button type="button" role="tab" aria-selected={mode === "3d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "3d" ? "is-on" : ""}`} onClick={() => setMode("3d")}>{L.d3}</button>
        <button type="button" role="tab" aria-selected={mode === "2d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "2d" ? "is-on" : ""}`} onClick={() => setMode("2d")}>{L.d2}</button>
      </div>
    </div>
  );
}
