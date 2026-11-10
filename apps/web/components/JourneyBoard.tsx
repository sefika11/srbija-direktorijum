"use client";
/**
 * JourneyBoard — the sticky stage beside a guide (or a visa instruction): the responsible building with the chosen seat
 * pinned, then the stations of the procedure on an isometric board. Scroll drives the camera (the sections with the
 * station ids are the stations; the page scrolls normally). Under 768 px or without WebGL the board is a flat,
 * layered SVG with the same stations; the active station still follows the scroll.
 */
import { useEffect, useRef, useState } from "react";
import type { Station } from "@/lib/journey-stage";

export type { Station };
type Labels = { hint: string; stage: string };

function Poster({ stations, emblem, active }: { stations: Station[]; emblem: string; active: number }) {
  const n = stations.length, W = 360, H = 240; const step = n > 1 ? 230 / (n - 1) : 0;
  const pt = (i: number) => ({ x: 70 + i * step, y: 150 + (i % 2 ? 22 : -22) });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="jstage-poster" aria-hidden>
      <path d={`M14 160 L190 70 L346 150 L170 240 Z`} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="1" transform="translate(0 -14)" />
      {n > 1 && <polyline points={stations.map((_, i) => `${pt(i).x},${pt(i).y}`).join(" ")} fill="none" stroke="var(--line-strong)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />}
      {stations.map((s, i) => { const p = pt(i); const on = i === active; return (
        <g key={s.id} className={`jp-node ${on ? "is-active" : ""}`}>
          {i === 0 ? <image href={`/emblems/${emblem}@256.png`} x={p.x - 46} y={p.y - 78} width="92" height="92" /> : <circle cx={p.x} cy={p.y} r={on ? 15 : 12} fill={on ? "var(--red)" : "var(--surface)"} stroke={on ? "var(--red)" : "var(--ink)"} strokeWidth="1.5" />}
          {i > 0 && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fill={on ? "#fff" : "var(--ink)"}>{i + 1}</text>}
        </g>); })}
    </svg>
  );
}

export default function JourneyBoard({ stations, emblem, hue, pin, labels, cls }: { stations: Station[]; emblem: string; hue?: string; pin?: string | null; labels: Labels; cls?: string }) {
  const host = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false); const [active, setActive] = useState(0);
  const key = stations.map((s) => `${s.id}:${s.kind}:${s.n ?? ""}`).join("|");
  useEffect(() => {
    const el = host.current, cv = canvas.current; if (!el || !cv || !stations.length) return;
    let eng: { setProgress(p: number): void; destroy(): void } | null = null, dead = false;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const els = () => stations.map((s) => document.getElementById(s.id));
    let tops: number[] = [], raf = 0;
    const measure = () => { const y = window.scrollY; tops = els().map((e) => (e ? e.getBoundingClientRect().top + y : Number.NaN)); };
    const progress = () => {
      const pivot = window.scrollY + window.innerHeight * 0.38; let p = 0;
      for (let i = 0; i < tops.length; i++) { const a = tops[i], b = tops[i + 1]; if (Number.isNaN(a)) continue; if (pivot < a) break; p = b === undefined || Number.isNaN(b) || b <= a ? i : i + Math.min(1, (pivot - a) / (b - a)); }
      return p;
    };
    const tick = () => { raf = 0; const p = progress(); eng?.setProgress(p); setActive(Math.round(p)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onResize = () => { measure(); onScroll(); };
    measure(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onResize); const t = window.setTimeout(onResize, 1200);
    if (wide) import("@/lib/journey-stage").then(({ JourneyEngine }) => {
      if (dead) return;
      try { eng = new JourneyEngine({ canvas: cv, host: el, emblem, hue, pin, stations, onReady: (ms) => { el.dataset.firstFrame = ms.toFixed(0); setLive(true); } }); eng.setProgress(progress()); } catch { /* flat board stays */ }
    });
    return () => { dead = true; eng?.destroy(); setLive(false); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); window.clearTimeout(t); if (raf) cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, emblem, hue, pin]);
  const cur = stations[Math.min(active, stations.length - 1)];
  return (
    <div ref={host} className={`jstage deskframe ${live ? "is-live" : ""} ${cls ?? ""}`} role="img" aria-label={labels.stage}>
      <Poster stations={stations} emblem={emblem} active={active} />
      <canvas ref={canvas} aria-hidden />
      <div className="jstage-dock" aria-live="polite">
        <span className="jstage-dock-n">{String(active + 1).padStart(2, "0")}/{String(stations.length).padStart(2, "0")}</span>
        <span className="jstage-dock-title">{cur?.label}</span>
        <span className="jstage-dock-hint">{labels.hint}</span>
      </div>
    </div>
  );
}
