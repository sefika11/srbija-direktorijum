/**
 * GlobeEngine — one globe for the whole site. Solid country shapes (Natural Earth 110 m polygons painted into an
 * equirectangular texture), a transparent overlay sphere for selection/hover highlights, HTML labels for the home and the
 * destination, an arc between them, drag/wheel/auto-rotate, hover tooltip and click-to-pick through an ID texture.
 * Colours come from the page's CSS variables so light and dark both read.
 */
import * as THREE from "three";

export type GlobeOpts = {
  canvas: HTMLCanvasElement; host: HTMLElement;
  names: Record<string, string>;            // iso2 → display name (for tooltip + labels)
  centroids: Record<string, [number, number]>;
  home: string; homeLabel: string;
  highlight?: Set<string>;                   // e.g. countries whose citizens enter visa-free
  pickable?: Set<string>;                    // countries that can be picked (have a page)
  onPick?: (iso: string) => void; onHover?: (iso: string | null) => void;
  autoRotate?: boolean;
};
type Geo = Record<string, [number, number][][]>;
let geoPromise: Promise<Geo> | null = null;
export const loadGeo = () => (geoPromise ??= fetch("/geo/countries-110m.json").then((r) => r.json() as Promise<Geo>));

const R = 1;
const toVec = (lat: number, lon: number, r = R) => { const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon + 180); return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
const cssVar = (n: string, fb: string) => (typeof window === "undefined" ? fb : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb);
const isDark = () => document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);

export class GlobeEngine {
  private o: GlobeOpts; private geo: Geo | null = null;
  private renderer!: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  private group = new THREE.Group(); private base!: THREE.Mesh; private overlay!: THREE.Mesh; private hitSphere!: THREE.Mesh;
  private baseTex!: THREE.CanvasTexture; private overTex!: THREE.CanvasTexture; private baseCv!: HTMLCanvasElement; private overCv!: HTMLCanvasElement; private idCv!: HTMLCanvasElement; private idData: ImageData | null = null; private idMap: string[] = [];
  private sel: string | null = null; private hov: string | null = null; private targetQ = new THREE.Quaternion(); private camDist = 3.35; private touched = false; private dragging = false;
  private arc: THREE.Mesh | null = null; private arcDraw = 0; private pinHome!: THREE.Group; private pinDest!: THREE.Group;
  private labelHome!: HTMLDivElement; private labelDest!: HTMLDivElement; private tip!: HTMLDivElement;
  private raf = 0; private alive = true; private ro: ResizeObserver | null = null; private mq: MediaQueryList | null = null; private reduced = false;
  private dispose: (() => void)[] = [];

  constructor(o: GlobeOpts) {
    this.o = o;
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.scene.add(this.group);
    // canvases
    this.baseCv = document.createElement("canvas"); this.baseCv.width = 4096; this.baseCv.height = 2048;
    this.overCv = document.createElement("canvas"); this.overCv.width = 2048; this.overCv.height = 1024;
    this.idCv = document.createElement("canvas"); this.idCv.width = 2048; this.idCv.height = 1024;
    this.baseTex = new THREE.CanvasTexture(this.baseCv); this.baseTex.colorSpace = THREE.SRGBColorSpace; this.baseTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.overTex = new THREE.CanvasTexture(this.overCv); this.overTex.colorSpace = THREE.SRGBColorSpace;
    const sphere = new THREE.SphereGeometry(R, 128, 96);
    this.base = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: this.baseTex, roughness: .92, metalness: 0 })); this.group.add(this.base);
    this.overlay = new THREE.Mesh(new THREE.SphereGeometry(R * 1.002, 128, 96), new THREE.MeshBasicMaterial({ map: this.overTex, transparent: true, depthWrite: false })); this.group.add(this.overlay);
    this.hitSphere = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshBasicMaterial({ visible: false })); this.group.add(this.hitSphere);
    // atmosphere + lights
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 64, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar("--accent", "#0c4076")), transparent: true, opacity: .10, side: THREE.BackSide, depthWrite: false })); this.scene.add(atm);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa6bd, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, .9); key.position.set(-2.5, 2.5, 3); this.scene.add(key);
    // graticule
    const g: number[] = []; for (let lat = -75; lat <= 75; lat += 15) for (let lon = -180; lon < 180; lon += 3) { g.push(...toVec(lat, lon, R * 1.001).toArray(), ...toVec(lat, lon + 3, R * 1.001).toArray()); }
    for (let lon = -180; lon < 180; lon += 15) for (let lat = -90; lat < 90; lat += 3) { g.push(...toVec(lat, lon, R * 1.001).toArray(), ...toVec(lat + 3, lon, R * 1.001).toArray()); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(g, 3));
    this.group.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: new THREE.Color(cssVar("--ink", "#17181c")), transparent: true, opacity: .06 })));
    // pins
    this.pinHome = this.mkPin(new THREE.Color(cssVar("--red", "#c6363c"))); this.pinDest = this.mkPin(new THREE.Color(cssVar("--accent", "#0c4076"))); this.pinDest.visible = false; this.group.add(this.pinHome, this.pinDest);
    const h = o.centroids[o.home] ?? [44.2, 20.8]; this.place(this.pinHome, h[0], h[1]);
    // labels + tooltip
    this.labelHome = this.mkLabel("globe-label is-home", o.homeLabel); this.labelDest = this.mkLabel("globe-label is-dest", ""); this.labelDest.style.display = "none";
    this.tip = this.mkLabel("globe-tip", ""); this.tip.style.display = "none";
    this.faceTo(h[0], h[1]); this.group.quaternion.copy(this.targetQ); this.camera.position.set(0, 0, this.camDist + (this.reduced ? 0 : .9));
    this.bind(); this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(o.host);
    this.mq = window.matchMedia("(prefers-color-scheme: dark)"); const onTheme = () => this.paintBase(); this.mq.addEventListener("change", onTheme); this.dispose.push(() => this.mq?.removeEventListener("change", onTheme));
    const mo = new MutationObserver(onTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); this.dispose.push(() => mo.disconnect());
    loadGeo().then((geo) => { if (!this.alive) return; this.geo = geo; this.paintBase(); this.paintId(); this.paintOverlay(); });
    this.raf = requestAnimationFrame(this.frame);
  }

  // ----- public
  setSelection(iso: string | null) {
    this.sel = iso; this.paintOverlay(); this.touched = false;
    const c = iso ? this.o.centroids[iso] : null;
    if (c) { this.pinDest.visible = true; this.place(this.pinDest, c[0], c[1]); this.labelDest.textContent = this.o.names[iso!] ?? iso; this.labelDest.style.display = ""; this.setArc(c); const h = this.o.centroids[this.o.home] ?? [44.2, 20.8]; const ang = toVec(h[0], h[1]).angleTo(toVec(c[0], c[1])); this.camDist = THREE.MathUtils.clamp(2.75 + ang * .3, 2.85, 3.35); this.faceTo(c[0], c[1]); }
    else { this.pinDest.visible = false; this.labelDest.style.display = "none"; this.setArc(null); this.camDist = 3.35; const h = this.o.centroids[this.o.home] ?? [44.2, 20.8]; this.faceTo(h[0], h[1]); }
  }
  setHighlight(set: Set<string>) { this.o.highlight = set; this.paintBase(); }
  destroy() {
    this.alive = false; cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.dispose.forEach((f) => f());
    [this.labelHome, this.labelDest, this.tip].forEach((e) => e.remove());
    this.scene.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.(); });
    this.baseTex.dispose(); this.overTex.dispose(); this.renderer.dispose();
  }

  // ----- painting
  private colors() {
    const dark = isDark(); const ink = cssVar("--ink", "#17181c"), accent = cssVar("--accent", "#0c4076"), red = cssVar("--red", "#c6363c"), bg = cssVar("--bg", "#f7f5f0"), surface = cssVar("--surface", "#fff");
    return {
      ocean: dark ? "#1b1f27" : "#c9d8e8", land: dark ? "#3a3d45" : "#f6f2e8", landHi: dark ? "#2a3a52" : "#b7cde9", border: dark ? "rgba(242,240,235,.35)" : "rgba(23,24,28,.5)",
      home: red, sel: accent, hover: dark ? "rgba(255,255,255,.28)" : "rgba(23,24,28,.14)", ink, bg, surface,
    };
  }
  private pathPolys(ctx: CanvasRenderingContext2D, polys: [number, number][][], W: number, H: number) {
    ctx.beginPath();
    for (const ring of polys) { ring.forEach(([lon, lat], i) => { const x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.closePath(); }
  }
  private polysFor(iso: string): [number, number][][] | null {
    if (!this.geo) return null; const p = this.geo[iso]; if (p) return p;
    const c = this.o.centroids[iso]; if (!c) return null; // tiny states: a 0.8° disc at the centroid
    const ring: [number, number][] = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ring.push([c[1] + Math.cos(a) * .8 / Math.max(.3, Math.cos(THREE.MathUtils.degToRad(c[0]))), c[0] + Math.sin(a) * .8]); } return [ring];
  }
  private allIsos() { return new Set([...Object.keys(this.geo ?? {}), ...Object.keys(this.o.centroids)]); }
  private paintBase() {
    if (!this.geo) return; const C = this.colors(); const ctx = this.baseCv.getContext("2d")!; const W = this.baseCv.width, H = this.baseCv.height;
    ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
    // faint ocean grain
    ctx.save(); ctx.globalAlpha = .06; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; for (let y = 0; y < H; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore();
    for (const iso of this.allIsos()) { const polys = this.polysFor(iso); if (!polys) continue; this.pathPolys(ctx, polys, W, H); ctx.fillStyle = iso === this.o.home ? C.home : this.o.highlight?.has(iso) ? C.landHi : C.land; ctx.fill("evenodd"); }
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.border; ctx.lineJoin = "round";
    for (const iso of this.allIsos()) { const polys = this.polysFor(iso); if (!polys) continue; this.pathPolys(ctx, polys, W, H); ctx.stroke(); }
    this.baseTex.needsUpdate = true;
  }
  private paintOverlay() {
    const C = this.colors(); const ctx = this.overCv.getContext("2d")!; const W = this.overCv.width, H = this.overCv.height; ctx.clearRect(0, 0, W, H);
    if (this.hov && this.hov !== this.sel) { const p = this.polysFor(this.hov); if (p) { this.pathPolys(ctx, p, W, H); ctx.fillStyle = C.hover; ctx.fill("evenodd"); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke(); } }
    if (this.sel) { const p = this.polysFor(this.sel); if (p) { this.pathPolys(ctx, p, W, H); ctx.fillStyle = C.sel; ctx.globalAlpha = .9; ctx.fill("evenodd"); ctx.globalAlpha = 1; ctx.lineWidth = 2.6; ctx.strokeStyle = C.surface; ctx.stroke(); } }
    this.overTex.needsUpdate = true;
  }
  private paintId() {
    const ctx = this.idCv.getContext("2d", { willReadFrequently: true })!; const W = this.idCv.width, H = this.idCv.height; ctx.clearRect(0, 0, W, H); this.idMap = [];
    let i = 1; for (const iso of this.allIsos()) { const p = this.polysFor(iso); if (!p) continue; this.idMap[i] = iso; ctx.fillStyle = `rgb(${(i >> 8) & 255},${i & 255},0)`; this.pathPolys(ctx, p, W, H); ctx.fill("evenodd"); i++; }
    this.idData = ctx.getImageData(0, 0, W, H);
  }
  private isoAtUv(u: number, v: number): string | null {
    if (!this.idData) return null; const x = Math.min(this.idCv.width - 1, Math.max(0, Math.floor(u * this.idCv.width))), y = Math.min(this.idCv.height - 1, Math.max(0, Math.floor((1 - v) * this.idCv.height)));
    const d = this.idData.data, k = (y * this.idCv.width + x) * 4; if (d[k + 3] === 0) return null; return this.idMap[(d[k] << 8) | d[k + 1]] ?? null;
  }

  // ----- scene helpers
  private mkPin(c: THREE.Color) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(.018, 16, 16), new THREE.MeshBasicMaterial({ color: c }))); const ring = new THREE.Mesh(new THREE.RingGeometry(.028, .044, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); ring.name = "halo"; g.add(ring); return g; }
  private place(g: THREE.Group, lat: number, lon: number) { const p = toVec(lat, lon, R + .012); g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2)); }
  private mkLabel(cls: string, text: string) { const d = document.createElement("div"); d.className = cls; d.textContent = text; this.o.host.appendChild(d); return d; }
  private faceTo(lat: number, lon: number) { const v = toVec(lat, lon).normalize(); const t = new THREE.Vector3(0, .12, 1).normalize(); this.targetQ = new THREE.Quaternion().setFromUnitVectors(v, t); }
  private setArc(dest: [number, number] | null) {
    if (this.arc) { this.group.remove(this.arc); this.arc.geometry.dispose(); (this.arc.material as THREE.Material).dispose(); this.arc = null; }
    if (!dest) return; const h = this.o.centroids[this.o.home] ?? [44.2, 20.8]; const a = toVec(h[0], h[1]), b = toVec(dest[0], dest[1]); const ang = a.angleTo(b); const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) { const t = i / 96; pts.push(a.clone().lerp(b, t).normalize().multiplyScalar(R * (1 + Math.sin(Math.PI * t) * Math.min(.42, ang * .28)))); }
    this.arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, .0055, 8, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar("--accent", "#0c4076")) })); this.arcDraw = 0; this.group.add(this.arc);
  }
  private project(lat: number, lon: number) {
    const p = toVec(lat, lon, R + .02).applyQuaternion(this.group.quaternion); const facing = p.clone().normalize().dot(this.camera.position.clone().normalize()) > .15;
    const s = p.clone().project(this.camera); const w = this.o.host.clientWidth, h = this.o.host.clientHeight; return { x: (s.x + 1) / 2 * w, y: (1 - s.y) / 2 * h, facing };
  }
  private placeLabel(el: HTMLDivElement, iso: string | null) {
    const c = iso ? this.o.centroids[iso] : null; if (!c) { el.style.opacity = "0"; return; } const { x, y, facing } = this.project(c[0], c[1]); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; el.style.opacity = facing ? "1" : "0";
  }

  // ----- input
  private bind() {
    const cv = this.o.canvas; const ray = new THREE.Raycaster(); let moved = 0, lx = 0, ly = 0;
    const ndc = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); };
    const hit = (e: PointerEvent) => { ray.setFromCamera(ndc(e), this.camera); const h = ray.intersectObject(this.hitSphere)[0]; return h?.uv ? this.isoAtUv(h.uv.x, h.uv.y) : null; };
    const down = (e: PointerEvent) => { this.dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (this.dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); if (moved > 4) { this.touched = true; const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * .005), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * .005); this.group.quaternion.premultiply(qy).premultiply(qx); this.targetQ.copy(this.group.quaternion); } return; }
      const iso = hit(e); const pick = iso && (!this.o.pickable || this.o.pickable.has(iso)) ? iso : null;
      if (pick !== this.hov) { this.hov = pick; this.paintOverlay(); this.o.onHover?.(pick); cv.style.cursor = pick ? "pointer" : "grab"; }
      if (pick) { const r = cv.getBoundingClientRect(); this.tip.textContent = this.o.names[pick] ?? pick; this.tip.style.display = ""; this.tip.style.transform = `translate(${(e.clientX - r.left + 14).toFixed(0)}px, ${(e.clientY - r.top - 10).toFixed(0)}px)`; } else this.tip.style.display = "none";
    };
    const up = (e: PointerEvent) => { const was = this.dragging; this.dragging = false; if (!was || moved > 4) return; const iso = hit(e); if (iso && (!this.o.pickable || this.o.pickable.has(iso))) { this.touched = false; this.o.onPick?.(iso); } };
    const leave = () => { if (this.hov) { this.hov = null; this.paintOverlay(); this.o.onHover?.(null); } this.tip.style.display = "none"; cv.style.cursor = "grab"; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * .0025, 2.0, 3.8); };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointerleave", leave); cv.addEventListener("pointercancel", () => { this.dragging = false; }); cv.addEventListener("wheel", wheel, { passive: false });
    cv.style.cursor = "grab"; cv.style.touchAction = "none";
    this.dispose.push(() => { cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointerleave", leave); cv.removeEventListener("wheel", wheel); });
  }
  private resize() { const w = this.o.host.clientWidth, h = this.o.host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  // ----- loop
  private frame = (now: number) => {
    if (!this.alive) return; this.raf = requestAnimationFrame(this.frame); if (document.hidden) return;
    if (!this.dragging) { if (!this.touched) this.group.quaternion.slerp(this.targetQ, this.reduced ? 1 : .07); else if (!this.sel && this.o.autoRotate !== false) this.group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), .0009); }
    this.camera.position.z += (this.camDist - this.camera.position.z) * (this.reduced ? 1 : .06);
    if (this.arc) { this.arcDraw = Math.min(1, this.arcDraw + (this.reduced ? 1 : .03)); const idx = (this.arc.geometry as THREE.BufferGeometry).index!; (this.arc.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor(this.arcDraw * idx.count)); }
    const pulse = 1 + Math.sin(now / 480) * .14; (this.pinHome.getObjectByName("halo") as THREE.Mesh).scale.setScalar(pulse); (this.pinDest.getObjectByName("halo") as THREE.Mesh).scale.setScalar(pulse);
    this.placeLabel(this.labelHome, this.o.home); this.placeLabel(this.labelDest, this.sel);
    this.renderer.render(this.scene, this.camera);
  };
}
