"use client";
/** Globe for a country page: the shared GlobeEngine with the destination selected and the arc from Serbia. */
import { useEffect, useRef } from "react";
import earth from "@/lib/country-centroids.json";
import type { GlobeEngine } from "@/lib/globe-engine";

const DATA = earth as unknown as { centroids: Record<string, [number, number]> };

export default function Globe3D({ iso2, label, homeLabel = "Srbija", className, isos, onReady }: { iso2: string; label: string; homeLabel?: string; className?: string; isos?: string[]; onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null); const readyRef = useRef(onReady); readyRef.current = onReady;
  const isoKey = (isos ?? []).join(",");
  useEffect(() => {
    const el = host.current, cv = canvas.current; if (!el || !cv) return;
    let eng: GlobeEngine | null = null, dead = false;
    import("@/lib/globe-engine").then(({ GlobeEngine }) => {
      if (dead) return;
      try { eng = new GlobeEngine({ canvas: cv, host: el, names: { RS: homeLabel, [iso2]: label }, centroids: DATA.centroids, home: "RS", homeLabel, highlight: new Set(isoKey ? isoKey.split(",") : []), pickable: new Set(), autoRotate: !iso2 || iso2 === "RS", onReady: () => readyRef.current?.() }); } catch { return; }
      eng.setSelection(iso2 && iso2 !== "RS" ? iso2 : null);
    });
    return () => { dead = true; eng?.destroy(); };
  }, [iso2, label, homeLabel, isoKey]);
  return (
    <div ref={host} className={`globe-stage ${className ?? ""}`}>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full block" role="img" aria-label={label} />
    </div>
  );
}
