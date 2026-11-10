"use client";
/**
 * SerbiaMap3D — territorial units extruded in WebGL (Three.js). Generic: the home page passes the 25 districts,
 * a district page passes its municipalities, a municipality page passes itself (and its city districts).
 * Height encodes the number of institutions. Units rise in on load, lift and tint on hover, open their page on click.
 * No post-processing: on a paper canvas, additive bloom is invisible and emissive clips to white under ACES,
 * so the hover glow is material colour plus a normal-blended halo under the unit.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { MAP_W, MAP_H, MAP_VIEWBOX } from "@/lib/serbia-map";

export type BBox = [number, number, number, number];
export type Feature3D = { key: string; d: string; cx: number; cy: number; bbox: BBox; name: string; sub?: string; label?: string; count: number; href: string; stats: { v: string; l: string }[] };
export type Context3D = { key: string; d: string };
export type Labels3D = { open: string; stage: string; hint?: string };

const SCALE = 1 / 10;                 // 600×787 viewBox units → 60×78.7 world units
const CX = MAP_W / 2, CY = MAP_H / 2;
const HOT = new THREE.Color("#2f52ea");
const LOW = new THREE.Color("#f2f0e8"), HIGH = new THREE.Color("#8d9ede");      // paper → desaturated cobalt by share
const SIDE_LOW = new THREE.Color("#cfcbbe"), SIDE_HIGH = new THREE.Color("#7e8bbf");
const CTX_TOP = new THREE.Color("#e4e1d7"), CTX_SIDE = new THREE.Color("#cbc7ba");
const EASE_OUT_EXPO = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wx = (px: number) => (px - CX) * SCALE, wz = (py: number) => (py - CY) * SCALE;

function parseRings(d: string): THREE.Vector2[][] {
  const rings: THREE.Vector2[][] = []; let cur: THREE.Vector2[] = [];
  const re = /([MLZ])\s*(-?[\d.]+)?,?(-?[\d.]+)?/g; let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    if (cmd === "Z") { if (cur.length > 2) rings.push(cur); cur = []; continue; }
    const x = wx(parseFloat(m[2]!)), y = -wz(parseFloat(m[3]!)); // shape space is y-up
    if (cmd === "M") { if (cur.length > 2) rings.push(cur); cur = []; }
    cur.push(new THREE.Vector2(x, y));
  }
  if (cur.length > 2) rings.push(cur);
  return rings;
}
function pointInRing(p: THREE.Vector2, ring: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function toShapes(d: string): THREE.Shape[] {
  const rings = parseRings(d).sort((a, b) => Math.abs(THREE.ShapeUtils.area(b)) - Math.abs(THREE.ShapeUtils.area(a)));
  const shapes: THREE.Shape[] = [];
  for (const r of rings) {
    const parent = shapes.find((s) => pointInRing(r[0], s.getPoints()));
    if (parent) parent.holes.push(new THREE.Path(r)); else shapes.push(new THREE.Shape(r));
  }
  return shapes;
}
function radialTexture(rgb: string, a0: number, a1: number) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, `rgba(${rgb},${a0})`); grd.addColorStop(.45, `rgba(${rgb},${a1})`); grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

type Unit = { f: Feature3D; mesh: THREE.Mesh; edges: THREE.LineSegments; base: number; target: number; cur: number; cx: number; cz: number; top: THREE.MeshStandardMaterial; delay: number; color0: THREE.Color; hot: number; lw?: number };

export default function SerbiaMap3D({ features, context = [], fit, labels, onUnavailable, className }: { features: Feature3D[]; context?: Context3D[]; fit?: BBox; labels: Labels3D; onUnavailable?: () => void; className?: string }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const byKey = useMemo(() => Object.fromEntries(features.map((f) => [f.key, f])), [features]);
  const sig = features.map((f) => f.key).join("|");

  useEffect(() => {
    const el = wrap.current, canvas = canvasRef.current; if (!el || !canvas || !features.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { onUnavailable?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // scene frame: the fitted bbox (or the union of the features) decides centre, radius and scale of everything
    const bb: BBox = fit ?? features.reduce<BBox>((a, f) => [Math.min(a[0], f.bbox[0]), Math.min(a[1], f.bbox[1]), Math.max(a[2], f.bbox[2]), Math.max(a[3], f.bbox[3])], [1e9, 1e9, -1e9, -1e9]);
    const center = new THREE.Vector3(wx((bb[0] + bb[2]) / 2), 0, wz((bb[1] + bb[3]) / 2));
    const radius = Math.max(4, Math.hypot(wx(bb[2]) - wx(bb[0]), wz(bb[3]) - wz(bb[1])) / 2);
    const hs = THREE.MathUtils.clamp(radius / 49, .22, 1);            // whole country ≈ radius 49 → heights scale with the frame
    const dir = new THREE.Vector3(0, .77, .64).normalize();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, .5, 2000);
    const camFinal = new THREE.Vector3(), camStart = new THREE.Vector3();
    const look = center.clone().add(new THREE.Vector3(0, 0, radius * .04));

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcabc, .95));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.copy(center).add(new THREE.Vector3(-radius * .9, radius * 1.6, radius * .8)); sun.target.position.copy(center); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -radius * 1.3; sc.right = radius * 1.3; sc.top = radius * 1.3; sc.bottom = -radius * 1.3; sc.near = 1; sc.far = radius * 6; sun.shadow.bias = -0.0005; sun.shadow.radius = 5;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0xaec0ff, .7); rim.position.copy(center).add(new THREE.Vector3(radius, radius * .6, -radius)); scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: .2 }));
    ground.rotation.x = -Math.PI / 2; ground.position.copy(center); ground.receiveShadow = true; scene.add(ground);
    // soft "table" shade under the model so it sits on the page
    const table = new THREE.Mesh(new THREE.PlaneGeometry(radius * 3.2, radius * 3.2), new THREE.MeshBasicMaterial({ map: radialTexture("40,40,36", .16, .05), transparent: true, depthWrite: false }));
    table.rotation.x = -Math.PI / 2; table.position.copy(center).setY(.01); scene.add(table);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTexture("47,82,234", .5, .18), transparent: true, depthWrite: false, opacity: 0 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .03; scene.add(halo);

    const group = new THREE.Group(); scene.add(group);
    const disposables: { dispose(): void }[] = [];
    // context units: flat, quiet, not interactive
    if (context.length) {
      const ctxTop = new THREE.MeshStandardMaterial({ color: CTX_TOP, roughness: .95 }), ctxSide = new THREE.MeshStandardMaterial({ color: CTX_SIDE, roughness: .95 });
      const ctxLine = new THREE.LineBasicMaterial({ color: 0x8f8b7f, transparent: true, opacity: .35 });
      disposables.push(ctxTop, ctxSide, ctxLine);
      for (const c of context) {
        const geo = new THREE.ExtrudeGeometry(toShapes(c.d), { depth: 1, bevelEnabled: false, curveSegments: 2 }); geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, [ctxTop, ctxSide]); m.scale.y = .5 * hs; m.receiveShadow = true; m.castShadow = true;
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), ctxLine); e.scale.y = m.scale.y;
        group.add(m, e); disposables.push(geo, e.geometry);
      }
    }
    const maxCount = Math.max(1, ...features.map((f) => f.count));
    const units: Unit[] = [];
    const sorted = [...features].sort((a, b) => a.cx - b.cx);
    const stagger = Math.min(42, 900 / Math.max(1, sorted.length));
    sorted.forEach((f, i) => {
      const share = Math.sqrt(f.count / maxCount);
      const height = (1.6 + share * 4.6) * hs;
      const geo = new THREE.ExtrudeGeometry(toShapes(f.d), { depth: 1, bevelEnabled: true, bevelSize: .05 * hs, bevelThickness: .07 * hs, bevelSegments: 2, curveSegments: 2 });
      geo.rotateX(-Math.PI / 2);
      const top = new THREE.MeshStandardMaterial({ color: LOW.clone().lerp(HIGH, share), roughness: .78, metalness: 0, emissive: HOT, emissiveIntensity: 0 });
      const side = new THREE.MeshStandardMaterial({ color: SIDE_LOW.clone().lerp(SIDE_HIGH, share), roughness: .9, metalness: 0 });
      const mesh = new THREE.Mesh(geo, [top, side]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.scale.y = reduced ? height : 0.001;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), new THREE.LineBasicMaterial({ color: 0x3b3a44, transparent: true, opacity: .5 })); edges.scale.copy(mesh.scale);
      group.add(mesh, edges); disposables.push(geo, top, side, edges.geometry, edges.material as THREE.Material);
      units.push({ f, mesh, edges, base: height, target: height, cur: mesh.scale.y, cx: wx(f.cx), cz: wz(f.cy), top, delay: i * stagger, color0: top.color.clone(), hot: 0 });
    });

    // labels: one absolutely positioned chip per unit, projected every frame
    const labelEls = new Map<string, HTMLDivElement>();
    const lw = labelsRef.current!; lw.innerHTML = "";
    for (const u of units) { const div = document.createElement("div"); div.className = "m3-label"; div.textContent = u.f.label ?? u.f.name; lw.appendChild(div); labelEls.set(u.f.key, div); }

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(-2, -2); let hovered: Unit | null = null; let pointerInside = false;
    const sway = new THREE.Vector2(), swayT = new THREE.Vector2();
    const setPointer = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); swayT.set(ndc.x, ndc.y); pointerInside = true; };
    const leave = () => { pointerInside = false; ndc.set(-2, -2); swayT.set(0, 0); };
    let downAt = 0; const down = () => { downAt = performance.now(); };
    const click = () => { if (performance.now() - downAt < 250 && hovered) router.push(hovered.f.href); };
    canvas.addEventListener("pointermove", setPointer); canvas.addEventListener("pointerleave", leave); canvas.addEventListener("pointerdown", down); canvas.addEventListener("click", click);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      // distance so the projected bounding box fills ~92% of the frame: start from the sphere fit, then correct by projection
      const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      let dist = (radius * .86) / Math.sin(Math.min(vfov, hfov) / 2);
      const probe = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
      const corners = [wx(bb[0]), wx(bb[2])].flatMap((x) => [wz(bb[1]), wz(bb[3])].flatMap((z) => [0, 4 * hs].map((y) => new THREE.Vector3(x, y, z))));
      for (let i = 0; i < 3; i++) {
        probe.position.copy(look).addScaledVector(dir, dist); probe.lookAt(look); probe.updateMatrixWorld(); probe.updateProjectionMatrix();
        let minX = 1, maxX = -1, minY = 1, maxY = -1;
        for (const c of corners) { const p = c.clone().project(probe); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
        const extent = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
        dist *= extent / .97;
      }
      camFinal.copy(look).addScaledVector(dir, dist); camStart.copy(look).addScaledVector(dir, dist * 1.75);
      if (reduced) camera.position.copy(camFinal);
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    if (!reduced) camera.position.copy(camStart);
    camera.lookAt(look);

    let raf = 0, t0 = 0, visible = true, running = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }); io.observe(el);
    const v3 = new THREE.Vector3();
    const frame = (now: number) => {
      if (!running) return; raf = requestAnimationFrame(frame);
      // pause only once the intro has finished; never leave the stage stuck before its first frames
      if (document.hidden || (!visible && t0 && now - t0 > 4000)) return;
      if (!t0) {
        // hold the rise while the opener curtain covers the page
        const rc = document.documentElement.classList;
        if (rc.contains("has-opener") && !rc.contains("opener-done")) { renderer.render(scene, camera); return; }
        t0 = now;
      }
      const t = now - t0;
      let allIn = true;
      for (const u of units) {
        if (!reduced) { const k = EASE_OUT_EXPO(Math.min(1, Math.max(0, (t - 200 - u.delay) / 1400))); if (k < 1) allIn = false; u.target = Math.max(0.001, u.base * k); }
        if (hovered === u) u.target = u.base + (2.2 + Math.sin(now / 420) * .1) * hs; else if (allIn || reduced) u.target = u.base;
        u.cur = lerp(u.cur, u.target, hovered === u ? .16 : .1);
        u.mesh.scale.y = u.cur; u.edges.scale.y = u.cur;
        u.hot = lerp(u.hot, hovered === u ? 1 : 0, .14);
        u.top.color.copy(u.color0).lerp(HOT, u.hot * .9); u.top.emissiveIntensity = u.hot * .1;
        (u.edges.material as THREE.LineBasicMaterial).opacity = lerp((u.edges.material as THREE.LineBasicMaterial).opacity, hovered === u ? .95 : .5, .12);
      }
      if (!reduced) camera.position.lerpVectors(camStart, camFinal, EASE_OUT_EXPO(Math.min(1, t / 2000)));
      else camera.position.copy(camFinal);
      sway.lerp(swayT, .05);
      camera.position.x += sway.x * radius * .1; camera.position.y += -sway.y * radius * .05;
      camera.lookAt(look.x + sway.x * radius * .03, look.y, look.z);
      if (pointerInside) {
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(units.map((u) => u.mesh), false)[0];
        const u = hit ? units.find((x) => x.mesh === hit.object) ?? null : null;
        if (u !== hovered) { hovered = u; setHover(u ? u.f.key : null); canvas.style.cursor = u ? "pointer" : "default"; }
      } else if (hovered) { hovered = null; setHover(null); canvas.style.cursor = "default"; }
      const hm = halo.material as THREE.MeshBasicMaterial;
      if (hovered) { halo.position.set(hovered.cx, .03, hovered.cz); const sz = (hovered.f.bbox[2] - hovered.f.bbox[0]) * SCALE * 2.6 + Math.sin(now / 600) * hs; halo.scale.set(sz, sz, 1); hm.opacity = lerp(hm.opacity, 1, .1); }
      else hm.opacity = lerp(hm.opacity, 0, .12);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const placed: { x: number; y: number; hw: number; hh: number }[] = [];
      const order = [...units].sort((a, b) => (b === hovered ? 1 : 0) - (a === hovered ? 1 : 0) || b.f.count - a.f.count);
      for (const u of order) {
        const elb = labelEls.get(u.f.key); if (!elb) continue;
        v3.set(u.cx, u.cur + .4 * hs, u.cz).project(camera);
        const x = ((v3.x + 1) / 2) * w, y = ((1 - v3.y) / 2) * h;
        if (!u.lw) u.lw = elb.offsetWidth || 60;
        const hw = u.lw / 2 + 3, hh = 13; // chip half-size in px (label sits above its anchor)
        const cy = y - hh;
        const collides = placed.some((p) => Math.abs(p.x - x) < p.hw + hw && Math.abs(p.y - cy) < p.hh + hh);
        if (!collides) placed.push({ x, y: cy, hw, hh });
        elb.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        const fade = allIn || reduced ? 1 : Math.min(1, Math.max(0, (t - 1400 - u.delay) / 600));
        elb.style.opacity = String(collides && hovered !== u ? 0 : fade * (hovered && hovered !== u ? .45 : 1));
        elb.classList.toggle("is-hot", hovered === u);
      }
      renderer.render(scene, camera);
      if (t > 50 && !el.classList.contains("is-ready")) { el.classList.add("is-ready"); setReady(true); }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointermove", setPointer); canvas.removeEventListener("pointerleave", leave); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("click", click);
      disposables.forEach((d) => d.dispose()); (halo.material as THREE.MeshBasicMaterial).map?.dispose(); (table.material as THREE.MeshBasicMaterial).map?.dispose(); renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const f = hover ? byKey[hover] : null;
  return (
    <div ref={wrap} className={`m3-stage ${ready ? "is-ready" : ""} ${className ?? ""}`}>
      <svg viewBox={MAP_VIEWBOX} className="m3-poster-svg absolute inset-0 w-full h-full p-8" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {context.map((c) => <path key={c.key} d={c.d} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="1" />)}
        {features.map((s) => <path key={s.key} d={s.d} fill="var(--line)" stroke="var(--line-strong)" strokeWidth="1" />)}
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={labels.stage} role="img" />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none" aria-hidden />
      <div className={`m3-dock ${f ? "is-on" : ""}`} aria-live="polite">
        {f ? (<>
          <div className="m3-dock-main">
            {f.sub && <div className="eyebrow plain">{f.sub}</div>}
            <div className="m3-dock-title">{f.name}</div>
          </div>
          <div className="m3-dock-stats">{f.stats.map((s) => <div key={s.l}><div className="m3-num">{s.v}</div><div className="m3-dock-lbl">{s.l}</div></div>)}</div>
          <div className="m3-dock-cta">{labels.open} →</div>
        </>) : (
          <div className="m3-dock-hint">{labels.hint}</div>
        )}
      </div>
    </div>
  );
}
