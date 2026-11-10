/**
 * JourneyEngine — a bureaucratic process as a board: the responsible institution's building (with the chosen seat pinned)
 * at the first station, then the stations of the procedure along a paper path — document slips fanned out, a fee
 * counter with its ledger, numbered step discs on the path, a clock for the duration, a question mark for the FAQ.
 * The camera is orthographic and eases along the path as the page scrolls (`setProgress`); nothing scroll-jacks.
 * Same look as the emblem stages (stage-kit). Labels are DOM pills projected from the scene.
 */
import * as THREE from "three";
import { SCENES, HUES } from "./emblems/scenes.mjs";
import * as D from "./emblems/dsl.mjs";
import { DIR, addLights, cssVar, disposeTree, fitOrtho, makeRenderer, numberTexture, projectedBounds, reducedMotion, roundedRect, slab, watchVisibility } from "./stage-kit";

export type StationKind = "where" | "who" | "docs" | "fees" | "steps" | "duration" | "faq" | "apply" | "notes";
export type Station = { id: string; kind: StationKind; label: string; n?: number };
export type JourneyOpts = { canvas: HTMLCanvasElement; host: HTMLElement; emblem: string; hue?: string; pin?: string | null; stations: Station[]; onReady?: (ms: number) => void; onActive?: (i: number) => void };

const SPACING = 10.5, WOBBLE = 2.8, FRAME_MARGIN = 0.2;
const { box, cyl, sphere, torus, grp, rod, clockFace, S, T, WHITE, INK, GOLD, STONE } = D;

function slips(n: number, hue: string) {
  const g = grp([box(3.4, 2.8, 0.12, "#d9d4c7")]); const k = Math.max(1, Math.min(6, n));
  for (let i = 0; i < k; i++) {
    const a = (i - (k - 1) / 2) * 0.26;
    g.add(grp([box(1.5, 2.1, 0.05, WHITE, { sharp: true }), box(1.05, 0.2, 0.012, hue, { y: 0.05, z: -0.78, sharp: true }), box(1.0, 0.07, 0.01, "#9a9ea8", { y: 0.05, z: -0.4, sharp: true }), box(0.8, 0.07, 0.01, "#9a9ea8", { y: 0.05, z: -0.15, sharp: true }), box(0.9, 0.07, 0.01, "#9a9ea8", { y: 0.05, z: 0.1, sharp: true })], { x: i * 0.22 - (k - 1) * 0.11, y: 0.12 + i * 0.055, z: 0.3, ry: a }));
  }
  return g;
}
function counter(hue: string) {
  const g = grp([box(3.4, 1.5, 1.1, T(hue, 0.55)), box(3.6, 1.7, 0.12, STONE, { y: 1.1 }), box(3.4, 0.06, 0.22, S(hue, -0.1), { y: 0.5, z: 0.76, sharp: true })]);
  g.add(grp([box(1.2, 1.5, 0.08, WHITE, { x: -0.62, y: 1.26, rz: 0.1 }), box(1.2, 1.5, 0.08, WHITE, { x: 0.62, y: 1.26, rz: -0.1 }), box(0.06, 1.5, 0.14, S(hue, -0.2), { y: 1.22 })], { x: -0.5 }));
  for (let i = 0; i < 4; i++) g.add(cyl(0.3, 0.08, GOLD, { x: 1.25, z: 0.25, y: 1.22 + i * 0.085, seg: 28 }));
  g.add(cyl(0.3, 0.08, GOLD, { x: 1.0, z: -0.35, y: 1.22, seg: 28 }));
  return g;
}
function clock() {
  return grp([cyl(0.55, 0.14, INK, { seg: 32 }), cyl(0.09, 2.5, INK, { seg: 10 }), clockFace(0.9, { y: 2.5 })]);
}
function question(hue: string) {
  const g = grp([cyl(1.2, 0.14, "#e4dfd2", { seg: 40 })]);
  const hook = torus(0.72, 0.2, hue, { arc: Math.PI * 1.35, y: 2.35, rz: -Math.PI * 0.5 }); hook.rotation.y = Math.PI; g.add(hook);
  g.add(rod([0, 1.63, 0], [0, 0.95, 0], 0.2, hue), sphere(0.25, hue, { y: 0.14 }));
  return g;
}
function disc(n: number, hue: string, tex: THREE.Texture[]) {
  const g = grp([cyl(0.62, 0.22, hue, { seg: 36 }), cyl(0.66, 0.05, S(hue, -0.15), { seg: 36 })]);
  const t = numberTexture(n); tex.push(t);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.position.y = 0.23; g.add(plane); return g;
}
function pad(r: number) { return cyl(r, 0.12, "#eee9de", { seg: 48 }); }

export class JourneyEngine {
  private o: JourneyOpts; private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  private points: THREE.Vector3[] = []; private halos: THREE.Mesh[] = []; private labels: HTMLDivElement[] = []; private labelPos: THREE.Vector3[] = []; private pinEl: HTMLDivElement | null = null; private pinPos: THREE.Vector3 | null = null;
  private target = 0; private cur = 0; private active = -1; private px = 0; private py = 0; private hover = false; private tiltY = 0;
  private raf = 0; private alive = true; private visible = true; private reduced = reducedMotion(); private aspect = 1; private frame0: { half: number; cx: number; cy: number }; private bounds: ReturnType<typeof projectedBounds>;
  private ro: ResizeObserver | null = null; private unwatch: (() => void) | null = null; private off: (() => void)[] = []; private tex: THREE.Texture[] = [];

  constructor(o: JourneyOpts) {
    this.o = o; const start = performance.now();
    const hue = o.hue ?? HUES[o.emblem] ?? "#8e97b8"; const n = Math.max(1, o.stations.length);
    this.renderer = makeRenderer(o.canvas);
    // station points along a gentle zig-zag
    for (let i = 0; i < n; i++) this.points.push(new THREE.Vector3(i * SPACING, 0, i % 2 ? WOBBLE : -WOBBLE));
    // board
    const w = (n - 1) * SPACING + 16, d = 17; const board = slab(w, d, hue, 0.4, 0.06); board.position.x = ((n - 1) * SPACING) / 2; this.scene.add(board);
    // path ribbon
    if (n > 1) {
      const pts = this.points.map((p, i) => p.clone().setY(0.02).add(new THREE.Vector3(0, 0, i % 2 ? 0.6 : -0.6)));
      const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.6), 24 * n, 0.5, 10, false), D.mat("#d8d2c4"));
      ribbon.scale.y = 0.22; ribbon.receiveShadow = true; ribbon.castShadow = false; this.scene.add(ribbon);
    }
    // building at the first station
    const build = SCENES[o.emblem] ?? SCENES.landmark; const subject = build(hue); subject.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(subject); subject.position.x -= (bb.min.x + bb.max.x) / 2; subject.position.z -= (bb.min.z + bb.max.z) / 2; subject.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(subject);
    const ext = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, (bb.max.y - bb.min.y) * 1.15); const sc = Math.min(0.72, 7.2 / ext);
    const house = grp([subject], { scale: sc }); house.position.copy(this.points[0]); this.scene.add(house);
    const topY = (bb.max.y - bb.min.y) * sc;
    if (o.pin) {
      const px = this.points[0].x + ((bb.max.x - bb.min.x) / 2) * sc + 0.9, pz = this.points[0].z + ((bb.max.z - bb.min.z) / 2) * sc + 0.3, ph = Math.max(3.2, topY * 0.55);
      const red = cssVar("--red", "#c6363c");
      this.scene.add(grp([cyl(0.07, ph, INK, { seg: 10 }), sphere(0.34, red, { y: ph }), torus(0.7, 0.05, red, { rx: Math.PI / 2, y: 0.03 })], { x: px, z: pz }));
      this.pinPos = new THREE.Vector3(px, ph + 0.9, pz); this.pinEl = this.mkLabel("jstage-pin", o.pin);
    }
    // stations
    o.stations.forEach((s, i) => {
      const p = this.points[i]; let prop: THREE.Group | null = null; let labelY = 4.4;
      if (i > 0) this.scene.add(grp([pad(2.7)], { x: p.x, z: p.z }));
      switch (s.kind) {
        case "where": labelY = topY + 1.2; break;
        case "docs": prop = slips(s.n ?? 3, hue); labelY = 3.2; break;
        case "fees": prop = counter(hue); labelY = 3.6; break;
        case "duration": prop = clock(); labelY = 5.0; break;
        case "faq": prop = question(hue); labelY = 4.6; break;
        case "who": prop = grp([SCENES.users(hue)], { scale: 0.42 }); labelY = 3.4; break;
        case "notes": prop = grp([SCENES["file-text"](hue)], { scale: 0.42 }); labelY = 3.8; break;
        case "apply": prop = grp([SCENES.stamp(hue)], { scale: 0.42 }); labelY = 3.6; break;
        case "steps": {
          // numbered discs as stepping stones inside the station: one row up to 4, two staggered rows above that
          const k = Math.max(1, Math.min(8, s.n ?? 3)); const rows = k > 4 ? 2 : 1, per = Math.ceil(k / rows), gap = 1.45;
          for (let j = 0; j < k; j++) { const r = Math.floor(j / per), col = j % per, inRow = Math.min(per, k - r * per); const x = p.x + (col - (inRow - 1) / 2) * gap + (rows === 2 && r === 1 ? gap * 0.5 : 0), z = p.z + (rows === 2 ? (r ? 0.95 : -0.95) : 0); const dsc = disc(j + 1, hue, this.tex); dsc.position.set(x, 0.12, z); this.scene.add(dsc); }
          labelY = 3.0; break;
        }
      }
      if (prop) { prop.position.set(p.x, 0.12, p.z); this.scene.add(prop); }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(i === 0 ? Math.max(3.4, (ext * sc) / 2 + 1.1) : 2.95, 0.09, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar("--red", "#c6363c")), transparent: true, opacity: 0 }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(p.x, 0.16, p.z); this.scene.add(halo); this.halos.push(halo);
      this.labels.push(this.mkLabel("jstage-label", `${String(i + 1).padStart(2, "0")} · ${s.label}`)); this.labelPos.push(new THREE.Vector3(p.x, labelY, p.z));
    });
    this.scene.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(this.scene).getBoundingSphere(new THREE.Sphere()); addLights(this.scene, sph.center, sph.radius, 2048);
    // frame: fit the first station (building + pad + pin) once, then keep that frame size while the target moves
    const fitRoot = new THREE.Group(); fitRoot.add(house.clone()); fitRoot.position.set(0, 0, 0); this.scene.add(fitRoot);
    this.camera.position.copy(this.points[0]).addScaledVector(DIR, 80); this.camera.lookAt(this.points[0]); this.camera.updateMatrixWorld(true);
    this.bounds = projectedBounds(this.camera, fitRoot); this.scene.remove(fitRoot);
    const pb = this.bounds; const pr = (ext * sc) / 2 + 2.4; pb.minX = Math.min(pb.minX, -pr); pb.maxX = Math.max(pb.maxX, pr);
    this.frame0 = fitOrtho(this.camera, this.bounds, 1, FRAME_MARGIN); this.resize();
    this.bind();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(o.host);
    this.unwatch = watchVisibility(o.host, (on) => { this.visible = on; if (on && !this.raf) this.raf = requestAnimationFrame(this.frame); });
    this.setActive(0); this.render(performance.now()); o.onReady?.(performance.now() - start);
    this.raf = requestAnimationFrame(this.frame);
  }

  /** continuous station index: 0 = building, n-1 = last station */
  setProgress(p: number) { this.target = Math.max(0, Math.min(this.points.length - 1, p)); if (this.reduced) this.cur = this.target; const a = Math.round(this.target); if (a !== this.active) this.setActive(a); }
  destroy() {
    this.alive = false; cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.unwatch?.(); this.off.forEach((f) => f());
    this.labels.forEach((l) => l.remove()); this.pinEl?.remove(); this.halos.forEach((h) => (h.material as THREE.Material).dispose());
    disposeTree(this.scene); this.tex.forEach((t) => t.dispose()); this.scene.traverse((ob) => { const m = ob as THREE.Mesh; if (m.isMesh && (m.material as THREE.MeshBasicMaterial).map) (m.material as THREE.Material).dispose(); }); this.renderer.dispose();
  }

  private setActive(i: number) { this.active = i; this.labels.forEach((l, k) => l.classList.toggle("is-active", k === i)); this.o.onActive?.(i); }
  private mkLabel(cls: string, text: string) { const d = document.createElement("div"); d.className = cls; d.textContent = text; this.o.host.appendChild(d); return d; }
  private resize() {
    const w = this.o.host.clientWidth, h = this.o.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.aspect = w / h; this.frame0 = fitOrtho(this.camera, this.bounds, this.aspect, FRAME_MARGIN);
  }
  private bind() {
    const cv = this.o.canvas;
    const move = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); this.px = ((e.clientX - r.left) / r.width) * 2 - 1; this.py = ((e.clientY - r.top) / r.height) * 2 - 1; this.hover = true; };
    const leave = () => { this.hover = false; };
    cv.addEventListener("pointermove", move); cv.addEventListener("pointerleave", leave);
    this.off.push(() => { cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerleave", leave); });
  }
  private project(p: THREE.Vector3) { const s = p.clone().project(this.camera); const w = this.o.host.clientWidth, h = this.o.host.clientHeight; return { x: ((s.x + 1) / 2) * w, y: ((1 - s.y) / 2) * h }; }
  private place(el: HTMLDivElement, p: THREE.Vector3) { const { x, y } = this.project(p); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }

  private render(now: number) {
    const i = Math.floor(this.cur), f = this.cur - i; const a = this.points[i], b = this.points[Math.min(this.points.length - 1, i + 1)];
    const e = f * f * (3 - 2 * f); const t = a.clone().lerp(b, e);
    const ty = this.reduced || !this.hover ? 0 : this.px * 0.06; this.tiltY += (ty - this.tiltY) * (this.reduced ? 1 : 0.08);
    const dir = DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.tiltY);
    this.camera.position.copy(t).addScaledVector(dir, 80); this.camera.lookAt(t); this.camera.updateMatrixWorld(true);
    const pulse = this.reduced ? 1 : 1 + Math.sin(now / 420) * 0.05;
    this.halos.forEach((h, k) => { const on = k === this.active; const m = h.material as THREE.MeshBasicMaterial; m.opacity += ((on ? 0.85 : 0) - m.opacity) * (this.reduced ? 1 : 0.12); h.scale.setScalar(on ? pulse : 1); h.visible = m.opacity > 0.01; });
    this.labels.forEach((l, k) => this.place(l, this.labelPos[k])); if (this.pinEl && this.pinPos) this.place(this.pinEl, this.pinPos);
    this.renderer.render(this.scene, this.camera);
  }
  private frame = (now: number) => {
    if (!this.alive) return; if (!this.visible) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(this.frame);
    this.cur += (this.target - this.cur) * (this.reduced ? 1 : 0.09); if (Math.abs(this.target - this.cur) < 0.0005) this.cur = this.target;
    this.render(now);
  };
}
