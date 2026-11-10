"use client";
/** Globe for a country page: the shared GlobeEngine with the destination selected and the arc from Serbia. */
import { useEffect, useRef } from "react";
import earth from "@/lib/earth-dots.json";
import { GlobeEngine } from "@/lib/globe-engine";

const DATA = earth as unknown as { centroids: Record<string, [number, number]> };

export default function Globe3D({ iso2, label, homeLabel = "Srbija", className, isos }: { iso2: string; label: string; homeLabel?: string; className?: string; isos?: string[] }) {
  const host = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null);
  const isoKey = (isos ?? []).join(",");
  useEffect(() => {
    const el = host.current, cv = canvas.current; if (!el || !cv) return;
    let eng: GlobeEngine | null = null;
    try { eng = new GlobeEngine({ canvas: cv, host: el, names: { RS: homeLabel, [iso2]: label }, centroids: DATA.centroids, home: "RS", homeLabel, highlight: new Set(isoKey ? isoKey.split(",") : []), pickable: new Set(), autoRotate: !iso2 || iso2 === "RS" }); } catch { return; }
    eng.setSelection(iso2 && iso2 !== "RS" ? iso2 : null);
    return () => eng?.destroy();
  }, [iso2, label, homeLabel, isoKey]);
  return (
    <div ref={host} className={`globe-stage ${className ?? ""}`}>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full block" role="img" aria-label={label} />
    </div>
  );
}
