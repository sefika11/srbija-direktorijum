"use client";
/**
 * Heritage — the living background behind every page. Three fixed layers, each a Serbian motif drawn as SVG:
 *   far:  the cross with four firesteels (ocila), sparse and faint, drifting with scroll;
 *   mid:  contour lines (the relief of the country) sweeping the top right;
 *   near: a Morava-school interlace ribbon on the right edge, embossed (light + dark offset copies = 2.5D).
 * Layers parallax a few pixels with the pointer and with scroll. Pointer-events none, aria-hidden, reduced-motion aware.
 */
import { useEffect, useRef } from "react";

export default function Heritage() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; if (reduced) return;
    let px = 0, py = 0, sy = 0, raf = 0;
    const apply = () => { raf = 0; el.style.setProperty("--hx", px.toFixed(3)); el.style.setProperty("--hy", py.toFixed(3)); el.style.setProperty("--hs", sy.toFixed(1)); };
    const onMove = (e: PointerEvent) => { px = e.clientX / window.innerWidth - .5; py = e.clientY / window.innerHeight - .5; if (!raf) raf = requestAnimationFrame(apply); };
    const onScroll = () => { sy = window.scrollY; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener("pointermove", onMove, { passive: true }); window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={ref} className="heritage" aria-hidden>
      <div className="hz hz-far" />
      <div className="hz hz-mid">
        <svg viewBox="0 0 900 700" preserveAspectRatio="xMaxYMin slice">
          <g fill="none" stroke="currentColor" strokeWidth="1.1">
            <path d="M120 80c90-60 230-40 300 30s190 60 270 10 140-20 190 40M80 160c110-70 260-40 340 40s200 70 290 20 150-10 190 60M60 250c120-80 290-50 380 50s220 80 320 30 160 0 180 70M60 350c130-80 310-40 400 70s240 90 340 40 160 10 160 80M80 450c130-70 300-20 390 90s250 100 350 60 150 30 150 100" />
            <path d="M560 120c40-30 110-30 150 0s50 80 10 110-120 30-160-5-40-75 0-105zM600 150c25-18 70-18 95 0s30 50 5 70-75 18-100-3-25-48 0-67z" opacity=".8" />
          </g>
        </svg>
      </div>
      <div className="hz hz-near">
        <svg viewBox="0 0 120 1200" preserveAspectRatio="xMidYMin slice">
          <defs>
            <path id="hz-braid" d="M44 0c22 26 22 52 0 78s-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78M76 0c-22 26-22 52 0 78s22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78 22 52 0 78-22 52 0 78" />
          </defs>
          <g fill="none" strokeWidth="3.5" strokeLinecap="round">
            <use href="#hz-braid" className="hz-emboss-dark" transform="translate(1.5 1.5)" />
            <use href="#hz-braid" className="hz-emboss-light" transform="translate(-1 -1)" />
            <use href="#hz-braid" className="hz-emboss-body" />
          </g>
          <g className="hz-emboss-body" fill="none" strokeWidth="2">
            <path d="M60 39a7 7 0 1 0 .01 0M60 195a7 7 0 1 0 .01 0M60 351a7 7 0 1 0 .01 0M60 507a7 7 0 1 0 .01 0M60 663a7 7 0 1 0 .01 0M60 819a7 7 0 1 0 .01 0M60 975a7 7 0 1 0 .01 0M60 1131a7 7 0 1 0 .01 0" />
          </g>
        </svg>
      </div>
      <div className="hz hz-light" />
      <div className="hz hz-grain" />
    </div>
  );
}
