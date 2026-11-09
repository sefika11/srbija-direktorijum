"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAP_H, MAP_W, OKRUG_SHAPES } from "@/lib/serbia-map";
import type { JlsShape } from "@/lib/serbia-map-jls";
import { href, type Locale } from "@/lib/i18n";

export type MapOkrug = { slug: string; name_lat: string; seat_name_lat: string | null; jls_count: number; org_count: number };
export type MapJls = { slug: string; name_lat: string; okrug_slug: string; org_count: number; jls_kind: "grad" | "opstina" | null };
export type MapLabels = {
  institutions: string; municipalities: string; hint: string; hintZoomed: string; zoomIn: string; zoomOut: string; reset: string;
  back: string; openOkrug: string; openUnit: string; city: string; municipality: string; serbia: string; okrug: string; seat: string;
};
type View = { x: number; y: number; w: number; h: number };
type BBox = [number, number, number, number];

const MIN_W = MAP_W / 9; // max zoom ≈ 9×
const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

function fitBox(b: BBox, aspect: number, pad = 0.08): View {
  let w = (b[2] - b[0]) * (1 + pad * 2), h = (b[3] - b[1]) * (1 + pad * 2);
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
const intersects = (b: BBox, v: View) => b[2] >= v.x && b[0] <= v.x + v.w && b[3] >= v.y && b[1] <= v.y + v.h;

export default function SerbiaMap({ okruzi, jls, locale, labels, variant = "light", height = "tall" }: { okruzi: MapOkrug[]; jls: MapJls[]; locale: Locale; labels: MapLabels; variant?: "light" | "dark"; height?: "tall" | "hero" }) {
  const dark = variant === "dark";
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 600, h: 787 });
  const aspect = size.w / size.h;
  const base = useMemo(() => fitBox([0, 0, MAP_W, MAP_H], aspect, 0.05), [aspect]);
  const [view, setView] = useState<View>(base);
  const viewRef = useRef(view); viewRef.current = view;
  const [focused, setFocused] = useState<string | null>(null);
  const [hoverOkrug, setHoverOkrug] = useState<string | null>(null);
  const [hoverJls, setHoverJls] = useState<string | null>(null);
  const [shapes, setShapes] = useState<JlsShape[] | null>(null);
  const anim = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinchDist = useRef<number | null>(null);

  const okrugBy = useMemo(() => Object.fromEntries(okruzi.map((o) => [o.slug, o])), [okruzi]);
  const jlsBy = useMemo(() => Object.fromEntries(jls.map((j) => [j.slug, j])), [jls]);
  const maxOrg = Math.max(1, ...okruzi.map((o) => o.org_count));
  const maxJls = Math.max(1, ...jls.map((j) => j.org_count));

  // container size → aspect-correct viewBox so 1 unit maps to a known number of pixels
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => { const r = e.contentRect; if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => { if (!focused) setView(base); }, [base, focused]);

  const loadShapes = useCallback(() => { if (!shapes) import("@/lib/serbia-map-jls").then((m) => setShapes(m.JLS_SHAPES)); }, [shapes]);

  const animateTo = useCallback((target: View) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = viewRef.current;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setView(target); return; }
    const t0 = performance.now(), dur = 320;
    const step = (now: number) => {
      const k = EASE(Math.min(1, (now - t0) / dur));
      setView({ x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, w: from.w + (target.w - from.w) * k, h: from.h + (target.h - from.h) * k });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const clampView = useCallback((v: View): View => {
    const w = Math.min(Math.max(v.w, MIN_W), base.w * 1.15), h = w / aspect;
    const margin = 0.6; // allow panning until 60% of the viewport is off-map
    const x = Math.min(Math.max(v.x, -w * margin), MAP_W - w * (1 - margin));
    const y = Math.min(Math.max(v.y, -h * margin), MAP_H - h * (1 - margin));
    return { x, y, w, h };
  }, [aspect, base.w]);

  const zoomAt = useCallback((factor: number, px: number, py: number, animate = false) => {
    const v = viewRef.current;
    const mx = v.x + (px / size.w) * v.w, my = v.y + (py / size.h) * v.h;
    const w = v.w / factor, h = v.h / factor;
    const nv = clampView({ x: mx - (px / size.w) * w, y: my - (py / size.h) * h, w, h });
    if (nv.w / base.w < 0.62) loadShapes();
    if (animate) animateTo(nv); else setView(nv);
  }, [size, clampView, base.w, loadShapes, animateTo]);

  // wheel zoom needs a non-passive listener
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const focusOkrug = useCallback((slug: string) => {
    const s = OKRUG_SHAPES.find((o) => o.slug === slug); if (!s) return;
    loadShapes(); setFocused(slug); setHoverJls(null);
    animateTo(clampView(fitBox(s.bbox, aspect, 0.1)));
  }, [aspect, animateTo, clampView, loadShapes]);
  const reset = useCallback(() => { setFocused(null); setHoverJls(null); animateTo(base); }, [animateTo, base]);

  // pointer: pan, pinch, click-vs-drag
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = 0; pinchDist.current = null;
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = pointers.current.get(e.pointerId); if (!p) return;
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const [a, b] = pts; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svgRef.current!.getBoundingClientRect();
      if (pinchDist.current) zoomAt(d / pinchDist.current, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinchDist.current = d; moved.current = 99;
    } else {
      const dx = e.clientX - p.x, dy = e.clientY - p.y; moved.current += Math.abs(dx) + Math.abs(dy);
      const v = viewRef.current;
      setView(clampView({ x: v.x - dx * (v.w / size.w), y: v.y - dy * (v.h / size.h), w: v.w, h: v.h }));
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinchDist.current = null; };
  const isClick = () => moved.current < 6;

  const scale = size.w / view.w;                 // px per map unit
  const zoom = base.w / view.w;                  // 1 = whole country
  const showJls = !!shapes && (!!focused || zoom >= 1.7);
  const okrugLabelPx = size.w < 520 ? 11 : 12.5, jlsLabelPx = size.w < 520 ? 10.5 : 11.5;
  const f = (px: number) => px / scale;
  const a = focused ? okrugBy[focused] : hoverOkrug ? okrugBy[hoverOkrug] : null;
  const hj = hoverJls ? jlsBy[hoverJls] : null;
  const focusedJls = focused ? jls.filter((j) => j.okrug_slug === focused) : [];
  const unitKind = (k: MapJls["jls_kind"]) => (k === "grad" ? labels.city : labels.municipality);
  const fmt = (n: number) => n.toLocaleString(locale === "sr" ? "sr-Latn" : locale);

  const stageH = height === "hero" ? "h-[420px] sm:h-[520px] lg:h-[620px]" : "h-[440px] sm:h-[560px] lg:h-[680px]";
  const panel = (
      <aside className={`card p-4 lg:p-5 flex flex-col min-h-[150px] ${height === "hero" ? "lg:absolute lg:left-4 lg:bottom-4 lg:w-[300px] lg:max-h-[60%] lg:z-10" : "lg:min-h-0 lg:max-h-[680px]"}`}>
        {hj ? (
          <>
            <div className="eyebrow">{unitKind(hj.jls_kind)} · {okrugBy[hj.okrug_slug]?.name_lat}</div>
            <div className="font-serif text-[22px] font-semibold leading-tight mt-1">{hj.name_lat}</div>
            <div className="mt-3 text-[13px] text-muted">{labels.institutions}</div>
            <div className="tabular text-[26px] font-semibold leading-none">{fmt(hj.org_count)}</div>
            <Link href={href(locale, `/${hj.slug}`)} className="btn-primary mt-4 self-start">{labels.openUnit} →</Link>
          </>
        ) : a ? (
          <>
            <div className="eyebrow">{labels.okrug}</div>
            <div className="font-serif text-[22px] font-semibold leading-tight mt-1">{a.name_lat}</div>
            {a.seat_name_lat && <div className="text-muted text-[13px] mt-1">{labels.seat}: {a.seat_name_lat}</div>}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <div><dt className="text-muted">{labels.institutions}</dt><dd className="tabular text-[22px] font-semibold leading-tight">{fmt(a.org_count)}</dd></div>
              <div><dt className="text-muted">{labels.municipalities}</dt><dd className="tabular text-[22px] font-semibold leading-tight">{a.jls_count}</dd></div>
            </dl>
            <Link href={href(locale, `/okrug/${a.slug}`)} className="btn-primary mt-4 self-start">{labels.openOkrug} →</Link>
            {focused && focusedJls.length > 0 && (
              <ul className="mt-4 pt-4 border-t border-line grid gap-1 text-[13.5px] overflow-y-auto">
                {focusedJls.map((j) => (
                  <li key={j.slug} onMouseEnter={() => setHoverJls(j.slug)} onMouseLeave={() => setHoverJls(null)}>
                    <Link href={href(locale, `/${j.slug}`)} className="flex justify-between gap-3 no-underline text-ink hover:text-accent rounded px-1 -mx-1">
                      <span>{j.name_lat}</span><span className="text-muted tabular">{j.org_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="text-muted text-[13.5px] leading-relaxed">{labels.hint}</div>
        )}
      </aside>
  );
  return (
    <div className={height === "hero" ? "relative grid gap-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-stretch"}>
      <div ref={wrapRef} className={`map-stage relative ${stageH} rounded-2xl overflow-hidden border border-line select-none`} style={{ touchAction: "none" }}>
        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="absolute inset-0 w-full h-full"
             role="img" aria-label="Mapa Srbije po okruzima i opštinama" preserveAspectRatio="xMidYMid meet"
             onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
             onMouseLeave={() => { setHoverOkrug(null); setHoverJls(null); }} style={{ cursor: pointers.current.size ? "grabbing" : "grab" }}>
          {/* okrug fills */}
          {OKRUG_SHAPES.map((s) => {
            const o = okrugBy[s.slug]; const share = o ? o.org_count / maxOrg : 0;
            const isHot = hoverOkrug === s.slug && !focused; const dim = focused && focused !== s.slug;
            return (
              <path key={s.slug} d={s.d} data-okrug={s.slug}
                    onPointerEnter={() => { if (!focused) setHoverOkrug(s.slug); }}
                    onClick={() => { if (isClick()) focusOkrug(s.slug); }}
                    style={{
                      fill: isHot ? (dark ? "#fff" : "var(--accent)") : dark ? `rgb(255 255 255 / ${(0.07 + share * 0.30).toFixed(2)})` : `color-mix(in oklab, var(--accent) ${14 + Math.round(share * 50)}%, var(--surface))`,
                      opacity: dim ? 0.32 : showJls && focused === s.slug ? 0 : 1,
                      stroke: dark ? "rgb(6 16 31 / .9)" : "var(--surface)", strokeWidth: f(1.2), strokeLinejoin: "round", transition: "fill .15s, opacity .25s", cursor: "pointer",
                    }} />
            );
          })}
          {/* municipality layer */}
          {showJls && shapes!.map((u) => {
            if (!intersects(u.bbox, view)) return null;
            if (focused && u.okrug !== focused && zoom < 2.4) return null;
            const j = jlsBy[u.slug]; const share = j ? j.org_count / maxJls : 0; const hot = hoverJls === u.slug;
            return (
              <path key={u.slug} d={u.d} data-jls={u.slug}
                    onPointerEnter={() => { setHoverJls(u.slug); setHoverOkrug(u.okrug); }}
                    onClick={() => { if (isClick()) router.push(href(locale, `/${u.slug}`)); }}
                    style={{ fill: hot ? (dark ? "#fff" : "var(--accent)") : dark ? `rgb(255 255 255 / ${(0.06 + Math.sqrt(share) * 0.26).toFixed(2)})` : `color-mix(in oklab, var(--accent) ${10 + Math.round(Math.sqrt(share) * 42)}%, var(--surface))`,
                             stroke: dark ? "rgb(6 16 31 / .9)" : "var(--surface)", strokeWidth: f(1), strokeLinejoin: "round", cursor: "pointer", transition: "fill .12s" }} />
            );
          })}
          {/* okrug outlines on top */}
          {showJls && OKRUG_SHAPES.map((s) => (
            <path key={`o-${s.slug}`} d={s.d} fill="none" pointerEvents="none"
                  style={{ stroke: focused === s.slug ? (dark ? "#fff" : "var(--accent-ink)") : dark ? "rgb(255 255 255 / .35)" : "var(--line)", strokeWidth: f(focused === s.slug ? 2 : 1), strokeLinejoin: "round" }} />
          ))}
          {/* labels */}
          {!showJls && OKRUG_SHAPES.map((s) => {
            const o = okrugBy[s.slug]; if (!o) return null;
            const txt = (o.seat_name_lat ?? o.name_lat).replace("Sremska Mitrovica", "S. Mitrovica");
            // label must fit inside its okrug at this scale (0.56em average glyph width), else drop it
            if ((s.bbox[2] - s.bbox[0]) * scale < txt.length * okrugLabelPx * 0.56 + 6) return null;
            return (
              <text key={`l-${s.slug}`} x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                    style={{ fontSize: f(okrugLabelPx), fontFamily: "var(--font-sans)", fontWeight: 600, fill: hoverOkrug === s.slug ? (dark ? "var(--navy-1)" : "#fff") : dark ? "#fff" : "var(--ink)",
                             paintOrder: "stroke", stroke: hoverOkrug === s.slug ? "transparent" : dark ? "rgb(6 16 31 / .85)" : "var(--surface)", strokeWidth: f(3), strokeLinejoin: "round", letterSpacing: f(0.2) }}>
                {txt}
              </text>
            );
          })}
          {showJls && shapes!.map((u) => {
            if (!intersects(u.bbox, view)) return null;
            if (focused && u.okrug !== focused && zoom < 2.4) return null;
            const wpx = (u.bbox[2] - u.bbox[0]) * scale; if (wpx < 44) return null;
            const hot = hoverJls === u.slug;
            return (
              <text key={`jl-${u.slug}`} x={u.cx} y={u.cy} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                    style={{ fontSize: f(jlsLabelPx), fontFamily: "var(--font-sans)", fontWeight: 500, fill: hot ? (dark ? "var(--navy-1)" : "#fff") : dark ? "#fff" : "var(--ink)",
                             paintOrder: "stroke", stroke: hot ? "transparent" : dark ? "rgb(6 16 31 / .85)" : "var(--surface)", strokeWidth: f(3), strokeLinejoin: "round" }}>
                {u.name}
              </text>
            );
          })}
        </svg>

        {/* overlays */}
        <div className="absolute left-3 top-3 flex items-center gap-2 text-[12.5px]">
          <div className="map-chip">
            <button type="button" onClick={reset} className="font-medium hover:underline">{labels.serbia}</button>
            {a && focused && <><span aria-hidden className="text-muted">›</span><span className="font-medium">{a.name_lat}</span></>}
          </div>
          {focused && <button type="button" onClick={reset} className="map-chip hover:bg-surface-2">← {labels.back}</button>}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button type="button" aria-label={labels.zoomIn} onClick={() => zoomAt(1.6, size.w / 2, size.h / 2, true)} className="map-btn">+</button>
          <button type="button" aria-label={labels.zoomOut} onClick={() => zoomAt(1 / 1.6, size.w / 2, size.h / 2, true)} className="map-btn">−</button>
          <button type="button" aria-label={labels.reset} onClick={reset} className="map-btn text-[13px]">⌂</button>
        </div>
        <div className={`absolute left-3 bottom-3 ${height === "hero" ? "hidden" : "hidden sm:block"}`}><div className="map-chip text-[11.5px] text-muted">{showJls ? labels.hintZoomed : labels.hint}</div></div>
      </div>
      {panel}

    </div>
  );
}
