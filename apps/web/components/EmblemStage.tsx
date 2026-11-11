"use client";
/**
 * EmblemStage — the poster PNG of an institution emblem (always rendered, server-side) with a live Three.js turntable of
 * the same scene cross-faded over it on wide screens with WebGL. Under 768 px or without WebGL the poster is all there is.
 * The engine chunk loads on demand; one renderer per stage, paused off-screen.
 */
import { useEffect, useRef, useState } from "react";
import Glyph3D from "./Glyph3D";

export default function EmblemStage({ emblem, title, size = 400, cls, hue, interactive = true }: { emblem: string | null | undefined; title?: string; size?: number; cls?: string; hue?: string; interactive?: boolean }) {
  const host = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = host.current, cv = canvas.current; if (!el || !cv || !emblem) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    let eng: { destroy(): void } | null = null, dead = false;
    import("@/lib/emblem-stage").then(({ EmblemEngine, canLive }) => {
      if (dead || !canLive(emblem)) return;
      try { eng = new EmblemEngine({ canvas: cv, host: el, key: emblem, hue, interactive, onReady: (ms) => { el.dataset.firstFrame = ms.toFixed(0); setLive(true); } }); } catch { /* poster stays */ }
    });
    return () => { dead = true; eng?.destroy(); setLive(false); };
  }, [emblem, hue, interactive]);
  return (
    <div ref={host} className={`estage ${live ? "is-live" : ""} ${cls ?? ""}`} role="img" aria-label={title}>
      <div className="estage-poster">{/* the emblem at the top of a page is its largest picture: fetched first, not when it scrolls into view */}<Glyph3D icon={emblem} size={size} className="estage-img" eager /></div>
      <canvas ref={canvas} aria-hidden />
    </div>
  );
}
