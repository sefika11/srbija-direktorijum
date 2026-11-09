"use client";
/**
 * SerbiaMap3D — the 25 districts of Serbia extruded in WebGL (Three.js).
 * Height encodes the number of institutions. Districts rise in from the west on load, lift and glow on hover,
 * and open their page on click. Pure Three.js, no post-processing: the glow is emissive top faces plus an additive halo.
 * Falls back to nothing (the parent swaps in the SVG map) when WebGL is unavailable.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OKRUG_SHAPES, MAP_W, MAP_H } from "@/lib/serbia-map";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/i18n";
import type { MapOkrug, MapLabels } from "./SerbiaMap";

const SCALE = 1 / 10;                 // 600×787 viewBox units → 60×78.7 world units
const CX = MAP_W / 2, CY = MAP_H / 2;
const ACCENT = new THREE.Color("#2347e6");
const HOT = new THREE.Color("#3a5ceb");
const EASE_OUT_EXPO = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** "M x,y L x,y … Z M …" → list of rings (already in world x / "south" coordinates). */
function parseRings(d: string): THREE.Vector2[][] {
  const rings: THREE.Vector2[][] = [];
  let cur: THREE.Vector2[] = [];
  const re = /([MLZ])\s*(-?[\d.]+)?,?(-?[\d.]+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    if (cmd === "Z") { if (cur.length > 2) rings.push(cur); cur = []; continue; }
    const x = (parseFloat(m[2]!) - CX) * SCALE, y = -(parseFloat(m[3]!) - CY) * SCALE; // flip y: shape space is y-up
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
    if (parent) { const h = new THREE.Path(r); parent.holes.push(h); } else shapes.push(new THREE.Shape(r));
  }
  return shapes;
}
function haloTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(35,71,230,.45)"); grd.addColorStop(.4, "rgba(35,71,230,.16)"); grd.addColorStop(1, "rgba(35,71,230,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

type District = { slug: string; mesh: THREE.Mesh; edges: THREE.LineSegments; base: number; target: number; cur: number; cx: number; cz: number; top: THREE.MeshStandardMaterial; delay: number; color0: THREE.Color; hot: number };

export default function SerbiaMap3D({ okruzi, locale, labels, onUnavailable, className }: { okruzi: MapOkrug[]; locale: Locale; labels: MapLabels; onUnavailable?: () => void; className?: string }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const okrugBy = useMemo(() => Object.fromEntries(okruzi.map((o) => [o.slug, o])), [okruzi]);
  const maxOrg = Math.max(1, ...okruzi.map((o) => o.org_count));
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = wrap.current, canvas = canvasRef.current; if (!el || !canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { onUnavailable?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, 1, 1, 600);
    const camFinal = new THREE.Vector3(0, 88, 72), camStart = new THREE.Vector3(0, 150, 150), look = new THREE.Vector3(0, 0, 5);
    camera.position.copy(reduced ? camFinal : camStart); camera.lookAt(look);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4c8, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-38, 70, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55; sun.shadow.camera.far = 220; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbfd0ff, .5); fill.position.set(40, 30, -40); scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: .14 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, blending: THREE.NormalBlending, opacity: 0 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .02; scene.add(halo);

    const sideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#d9d6cb"), roughness: .92, metalness: 0 });
    const districts: District[] = [];
    const group = new THREE.Group(); scene.add(group);
    const paper = new THREE.Color("#ffffff"), inkish = new THREE.Color("#b3af a2".replace(" ",""));
    const sorted = [...OKRUG_SHAPES].sort((a, b) => a.cx - b.cx);
    sorted.forEach((s, i) => {
      const o = okrugBy[s.slug]; const share = o ? o.org_count / maxOrg : 0;
      const height = 1.6 + Math.sqrt(share) * 4.2;
      const shapes = toShapes(s.d);
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: true, bevelSize: .06, bevelThickness: .08, bevelSegments: 2, curveSegments: 2 });
      geo.rotateX(-Math.PI / 2); // extrusion now points +y, shape y → -z (north at the back)
      const top = new THREE.MeshStandardMaterial({ color: paper.clone().lerp(inkish, .06 + Math.sqrt(share) * .9), roughness: .85, metalness: 0, emissive: ACCENT, emissiveIntensity: 0 });
      const mesh = new THREE.Mesh(geo, [top, sideMat]); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.scale.y = reduced ? height : 0.001;
      mesh.userData.slug = s.slug;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), new THREE.LineBasicMaterial({ color: 0x7c796e, transparent: true, opacity: .32 }));
      edges.scale.copy(mesh.scale);
      group.add(mesh, edges);
      districts.push({ slug: s.slug, mesh, edges, base: height, target: height, cur: reduced ? height : 0.001, cx: (s.cx - CX) * SCALE, cz: (s.cy - CY) * SCALE, top, delay: i * 42, color0: top.color.clone(), hot: 0 });
    });

    // labels: one absolutely positioned div per district, projected every frame
    const labelEls = new Map<string, HTMLDivElement>();
    const lw = labelsRef.current!; lw.innerHTML = "";
    for (const d of districts) {
      const o = okrugBy[d.slug]; if (!o) continue;
      const div = document.createElement("div"); div.className = "m3-label"; div.textContent = o.seat_name_lat ?? o.name_lat; lw.appendChild(div); labelEls.set(d.slug, div);
    }

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(-2, -2); let hovered: District | null = null; let pointerInside = false;
    const sway = new THREE.Vector2(0, 0), swayT = new THREE.Vector2(0, 0);
    const setPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      swayT.set(ndc.x, ndc.y); pointerInside = true;
    };
    const leave = () => { pointerInside = false; ndc.set(-2, -2); swayT.set(0, 0); };
    let downAt = 0;
    const down = () => { downAt = performance.now(); };
    const click = () => { if (performance.now() - downAt < 250 && hovered) router.push(href(locale, `/okrug/${hovered.slug}`)); };
    canvas.addEventListener("pointermove", setPointer); canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("click", click);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      // keep the whole country in frame on narrow stages
      const fit = Math.max(1, 0.95 / camera.aspect); camFinal.set(0, 88 * fit, 72 * fit);
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let raf = 0, t0 = 0, visible = true, running = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);
    const v3 = new THREE.Vector3();
    const frame = (now: number) => {
      if (!running) return; raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      if (!t0) t0 = now; const t = now - t0;
      // intro
      let allIn = true;
      for (const d of districts) {
        if (!reduced) { const k = EASE_OUT_EXPO(Math.min(1, Math.max(0, (t - 220 - d.delay) / 1400))); if (k < 1) allIn = false; d.target = Math.max(0.001, d.base * k); }
        if (hovered === d) d.target = d.base + 2.2 + Math.sin(now / 420) * .1; else if (allIn || reduced) d.target = d.base;
        d.cur = lerp(d.cur, d.target, hovered === d ? .16 : .1);
        d.mesh.scale.y = d.cur; d.edges.scale.y = d.cur;
        d.hot = lerp(d.hot, hovered === d ? 1 : 0, .14);
        d.top.color.copy(d.color0).lerp(HOT, d.hot * .9); d.top.emissiveIntensity = d.hot * .12;
        (d.edges.material as THREE.LineBasicMaterial).opacity = lerp((d.edges.material as THREE.LineBasicMaterial).opacity, hovered === d ? .9 : .32, .12);
      }
      if (!reduced) {
        const ck = EASE_OUT_EXPO(Math.min(1, t / 2000));
        camera.position.lerpVectors(camStart, camFinal, ck);
      } else camera.position.copy(camFinal);
      // pointer sway (parallax)
      sway.lerp(swayT, .05);
      camera.position.x += sway.x * 5; camera.position.y += -sway.y * 2.5;
      camera.lookAt(look.x + sway.x * 1.5, look.y, look.z);
      // hover
      if (pointerInside) {
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(districts.map((d) => d.mesh), false)[0];
        const d = hit ? districts.find((x) => x.mesh === hit.object) ?? null : null;
        if (d !== hovered) { hovered = d; setHover(d ? d.slug : null); canvas.style.cursor = d ? "pointer" : "default"; }
      } else if (hovered) { hovered = null; setHover(null); canvas.style.cursor = "default"; }
      // halo under hovered district
      const hm = halo.material as THREE.MeshBasicMaterial;
      if (hovered) { halo.position.set(hovered.cx, .02, hovered.cz); const sz = 24 + Math.sin(now / 600) * 1.2; halo.scale.set(sz, sz, 1); hm.opacity = lerp(hm.opacity, 1, .1); }
      else hm.opacity = lerp(hm.opacity, 0, .12);
      // labels
      const w = canvas.clientWidth, h = canvas.clientHeight;
      for (const d of districts) {
        const elb = labelEls.get(d.slug); if (!elb) continue;
        v3.set(d.cx, d.cur + .4, d.cz).project(camera);
        elb.style.transform = `translate(-50%, -100%) translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px)`;
        elb.style.opacity = String((allIn || reduced ? 1 : Math.min(1, Math.max(0, (t - 1500 - d.delay) / 600))) * (hovered && hovered !== d ? .35 : 1));
        elb.classList.toggle("is-hot", hovered === d);
      }
      renderer.render(scene, camera);
      if (!ready && t > 50) setReady(true);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointermove", setPointer); canvas.removeEventListener("pointerleave", leave); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("click", click);
      districts.forEach((d) => { d.mesh.geometry.dispose(); d.top.dispose(); d.edges.geometry.dispose(); (d.edges.material as THREE.Material).dispose(); });
      sideMat.dispose(); (halo.material as THREE.MeshBasicMaterial).map?.dispose(); renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const o = hover ? okrugBy[hover] : null;
  return (
    <div ref={wrap} className={`m3-stage ${ready ? "is-ready" : ""} ${className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={labels.serbia} role="img" />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none" aria-hidden />
      <div className={`m3-tip ${o ? "is-on" : ""}`} aria-live="polite">
        {o && (<>
          <div className="eyebrow plain">{labels.okrug} · {labels.seat}: {o.seat_name_lat ?? "—"}</div>
          <div className="font-serif text-[20px] font-semibold leading-tight mt-1">{o.name_lat}</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-[12.5px]">
            <div><div className="m3-num">{o.org_count.toLocaleString("sr-Latn")}</div><div className="text-muted">{labels.institutions}</div></div>
            <div><div className="m3-num">{o.jls_count}{o.go_count ? ` + ${o.go_count}` : ""}</div><div className="text-muted">{labels.municipalities}</div></div>
          </div>
          <div className="mt-2 text-[12.5px] font-medium">{labels.openOkrug} →</div>
        </>)}
      </div>
    </div>
  );
}
