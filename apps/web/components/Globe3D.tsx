"use client";
/**
 * Globe3D — a dotted-earth globe (Three.js points sampled from Natural Earth, public domain) that highlights Serbia and
 * one destination country and draws the travel arc between them. Drag to rotate, scroll to zoom, auto-rotates gently until
 * touched. The 2D mode is a dotted equirectangular SVG of the same data. Loaded lazily from the passport on visa pages.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import earth from "@/lib/earth-dots.json";

type Dot = [number, number, string];
const DATA = earth as unknown as { step: number; dots: Dot[]; centroids: Record<string, [number, number]> };
const R = 1;
const toVec = (lat: number, lon: number, r = R) => { const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon + 180); return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
const cssColor = (name: string, fallback: string) => { if (typeof window === "undefined") return fallback; const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; };

export default function Globe3D({ iso2, label, homeLabel = "Srbija", className }: { iso2: string; label: string; homeLabel?: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [ready, setReady] = useState(false);
  const home = DATA.centroids.RS ?? [44.0, 21.0]; const dest = DATA.centroids[iso2] ?? null;

  useEffect(() => {
    if (mode !== "3d") return;
    const el = wrap.current, canvas = canvasRef.current; if (!el || !canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { setMode("2d"); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100); camera.position.set(0, 0, 3.4);
    const ink = new THREE.Color(cssColor("--ink", "#1a1a18")), accent = new THREE.Color(cssColor("--accent", "#2347e6")), red = new THREE.Color("#c8313a"), surface = new THREE.Color(cssColor("--surface", "#ffffff"));

    // sphere body (paper) + faint atmosphere rim
    const body = new THREE.Mesh(new THREE.SphereGeometry(R * .985, 48, 48), new THREE.MeshBasicMaterial({ color: surface.clone().lerp(ink, .04), transparent: true, opacity: .96 }));
    scene.add(body);
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 48, 48), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .06, side: THREE.BackSide }));
    scene.add(rim);

    // dots: three point clouds (land, home, destination) so sizes and colours differ
    const build = (dots: Dot[], color: THREE.Color, size: number, lift = 0) => {
      const g = new THREE.BufferGeometry(); const pos = new Float32Array(dots.length * 3);
      dots.forEach((d, i) => { const v = toVec(d[0], d[1], R + lift); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: .95, depthWrite: false });
      const p = new THREE.Points(g, m); scene.add(p); return p;
    };
    const land = DATA.dots.filter((d) => d[2] !== "RS" && d[2] !== iso2), homeD = DATA.dots.filter((d) => d[2] === "RS"), destD = DATA.dots.filter((d) => d[2] === iso2);
    build(land, ink.clone().lerp(surface, .45), .015, .002);
    build(homeD, red, .024, .006);
    if (destD.length) build(destD, accent, .022, .006);
    // pins at the label points
    const pin = (lat: number, lon: number, c: THREE.Color) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.022, 16, 16), new THREE.MeshBasicMaterial({ color: c })); m.position.copy(toVec(lat, lon, R + .012)); scene.add(m); const halo = new THREE.Mesh(new THREE.RingGeometry(.03, .05, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .45, side: THREE.DoubleSide })); halo.position.copy(toVec(lat, lon, R + .013)); halo.lookAt(new THREE.Vector3(0, 0, 0)); scene.add(halo); return halo; };
    const homeHalo = pin(home[0], home[1], red); const destHalo = dest ? pin(dest[0], dest[1], accent) : null;
    // arc between Serbia and the destination
    let arcLine: THREE.Line | null = null; let arcTube: THREE.Mesh | null = null; let arcDraw = 0;
    if (dest) {
      const a = toVec(home[0], home[1]), b = toVec(dest[0], dest[1]); const ang = a.angleTo(b); const n = 80; const ptsArr: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) { const t = i / n; const v = a.clone().lerp(b, t).normalize(); const lift = 1 + Math.sin(Math.PI * t) * Math.min(.55, ang * .35); ptsArr.push(v.multiplyScalar(R * lift)); }
      const g = new THREE.BufferGeometry().setFromPoints(ptsArr); g.setDrawRange(0, 0);
      arcLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: .95 })); scene.add(arcLine);
      // a thin tube under the line so the arc has body at any pixel ratio
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsArr), 64, .006, 6, false), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .85 }));
      scene.add(tube); arcTube = tube;
    }
    // orient: the midpoint between the two countries faces the camera
    const mid = dest ? toVec(home[0], home[1]).add(toVec(dest[0], dest[1])).normalize() : toVec(home[0], home[1]).normalize();
    const group = new THREE.Group(); scene.children.slice().forEach((c) => group.add(c)); scene.add(group);
    const targetQ = new THREE.Quaternion().setFromUnitVectors(mid, new THREE.Vector3(0, 0, 1));
    group.quaternion.copy(targetQ);
    const ang = dest ? toVec(home[0], home[1]).angleTo(toVec(dest[0], dest[1])) : 0;
    const camDist = THREE.MathUtils.clamp(2.0 + ang * .45, 2.2, 3.0); camera.position.set(0, 0, reduced ? camDist : camDist + 1.2);

    // interaction: drag rotates, wheel zooms, auto-rotation until first drag
    let dragging = false, lx = 0, ly = 0, touched = false, vx = 0, vy = 0;
    const down = (e: PointerEvent) => { dragging = true; touched = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; vx = dx * .005; vy = dy * .005; group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), vx); group.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), vy); };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * .002, 1.8, 6); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("wheel", wheel, { passive: false });
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let raf = 0, t0 = 0, running = true;
    const frame = (now: number) => {
      if (!running) return; raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (!t0) t0 = now; const t = now - t0;
      if (!reduced) { camera.position.z += (camDist - camera.position.z) * .04; }
      if (!dragging) { if (!touched && !reduced) group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), .0015); else { group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), vx); group.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), vy); vx *= .92; vy *= .92; } }
      if (arcLine) { arcDraw = Math.min(81, arcDraw + (reduced ? 81 : 1.4)); (arcLine.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor(arcDraw)); if (arcTube) { (arcTube.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor((arcDraw / 81) * 64) * 6 * 6); } }
      const pulse = 1 + Math.sin(now / 500) * .12; homeHalo.scale.setScalar(pulse); destHalo?.scale.setScalar(pulse);
      renderer.render(scene, camera);
      if (!ready && t > 50) { setReady(true); }
    };
    raf = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("wheel", wheel); scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | undefined; mat?.dispose?.(); }); renderer.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso2, mode]);

  // 2D: equirectangular dotted map
  const W = 720, H = 360; const px = (lon: number) => ((lon + 180) / 360) * W, py = (lat: number) => ((90 - lat) / 180) * H;
  return (
    <div className={`globe ${className ?? ""} ${ready && mode === "3d" ? "is-ready" : ""}`}>
      {mode === "3d" ? (
        <div ref={wrap} className="globe-stage"><canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={`${homeLabel} → ${label}`} role="img" /></div>
      ) : (
        <div className="globe-stage globe-flat">
          <svg viewBox={`0 ${H * .08} ${W} ${H * .8}`} className="absolute inset-0 w-full h-full" role="img" aria-label={`${homeLabel} → ${label}`}>
            {DATA.dots.map((d, i) => <circle key={i} cx={px(d[1])} cy={py(d[0])} r={d[2] === "RS" || d[2] === iso2 ? 2.1 : 1.1} fill={d[2] === "RS" ? "var(--red)" : d[2] === iso2 ? "var(--accent)" : "color-mix(in oklab, var(--ink) 35%, var(--surface))"} />)}
            {dest && <path d={`M${px(home[1])},${py(home[0])} Q${(px(home[1]) + px(dest[1])) / 2},${Math.min(py(home[0]), py(dest[0])) - Math.abs(px(home[1]) - px(dest[1])) * .25} ${px(dest[1])},${py(dest[0])}`} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="4 3" />}
            <circle cx={px(home[1])} cy={py(home[0])} r="4" fill="var(--red)" stroke="var(--surface)" strokeWidth="1.5" />
            {dest && <circle cx={px(dest[1])} cy={py(dest[0])} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" />}
          </svg>
        </div>
      )}
      <div className="globe-legend"><span><i className="globe-dot is-home" />{homeLabel}</span>{dest && <span><i className="globe-dot is-dest" />{label}</span>}</div>
      <div className="absolute right-3 bottom-3 z-20 flex gap-1 m3-toggle" role="tablist" aria-label="Map mode">
        <button type="button" role="tab" aria-selected={mode === "3d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "3d" ? "is-on" : ""}`} onClick={() => setMode("3d")}>3D</button>
        <button type="button" role="tab" aria-selected={mode === "2d"} className={`map-btn !w-auto px-3 text-[12px] font-medium ${mode === "2d" ? "is-on" : ""}`} onClick={() => setMode("2d")}>2D</button>
      </div>
    </div>
  );
}
