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
import { DIR, addLights, cssVar, disposeTree, fitOrtho, makeRenderer, projectedBounds, reducedMotion, slab, watchVisibility } from "./stage-kit";
import { applyProp, docsProp, durationProp, faqProp, feesProp, grounds, notesProp, stepsProp, whoProp } from "./journey-props";

export type StationKind = "where" | "who" | "docs" | "fees" | "steps" | "duration" | "faq" | "apply" | "notes";
export type Station = { id: string; kind: StationKind; label: string; n?: number; /** text on the fee counter's sign; "" for a neutral sign (fees not in dinars) */ mark?: string };
export type JourneyOpts = { canvas: HTMLCanvasElement; host: HTMLElement; emblem: string; hue?: string; pin?: string | null; stations: Station[]; onReady?: (ms: number) => void; onActive?: (i: number) => void };

const SPACING = 10.5, WOBBLE = 2.8, FRAME_MARGIN = 0.2;
const { cyl, sphere, torus, grp, INK } = D;

function pad(r: number) { return cyl(r, 0.12, "#eee9de", { seg: 48 }); }

export class JourneyEngine {
  private o: JourneyOpts; private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  private points: THREE.Vector3[] = []; private halos: THREE.Mesh[] = []; private labels: HTMLDivElement[] = []; private labelPos: THREE.Vector3[] = []; private pinEl: HTMLDivElement | null = null; private pinPos: THREE.Vector3 | null = null;
  private target = 0; private cur = 0; private active = -1; private px = 0; private py = 0; private hover = false; private tiltY = 0;
  private raf = 0; private alive = true; private visible = true; private reduced = reducedMotion(); private aspect = 1; private frame0: { half: number; cx: number; cy: number }; private bounds: ReturnType<typeof projectedBounds>;
  private ro: ResizeObserver | null = null; private unwatch: (() => void) | null = null; private off: (() => void)[] = []; private tex: THREE.Texture[] = [];
  private props: (THREE.Group | null)[] = []; private heights: number[] = []; private zooms: number[] = []; private lifts: number[] = []; private sun: THREE.DirectionalLight | null = null; private sunOff = new THREE.Vector3();

  constructor(o: JourneyOpts) {
    this.o = o; const start = performance.now();
    const hue = o.hue ?? HUES[o.emblem] ?? "#8e97b8"; const n = Math.max(1, o.stations.length);
    this.renderer = makeRenderer(o.canvas);
    // station points along a gentle zig-zag
    for (let i = 0; i < n; i++) this.points.push(new THREE.Vector3(i * SPACING, 0, i % 2 ? WOBBLE : -WOBBLE));
    // board
    const w = (n - 1) * SPACING + 22, d = 26; const board = slab(w, d, hue, 0.4, 0.06); board.position.x = ((n - 1) * SPACING) / 2; this.scene.add(board);
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
    const yard = grounds(((bb.max.x - bb.min.x) / 2) * sc, ((bb.max.z - bb.min.z) / 2) * sc); yard.position.copy(this.points[0]); this.scene.add(yard);
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
        case "docs": prop = docsProp(s.n ?? 3, hue); labelY = 1.9; break;
        case "fees": prop = feesProp(hue, this.tex, s.mark ?? "RSD"); labelY = 4.2; break;
        case "duration": prop = durationProp(hue, this.tex); labelY = 3.3; break;
        case "faq": prop = faqProp(hue, this.tex); labelY = 4.3; break;
        case "who": prop = whoProp(hue); labelY = 3.7; break;
        case "notes": prop = notesProp(hue); labelY = 3.4; break;
        case "apply": prop = applyProp(hue); labelY = 3.4; break;
        case "steps": prop = stepsProp(s.n ?? 3, hue, this.tex); labelY = 3.6; break;
      }
      this.props.push(prop);
      // label above the model, camera centred on it (a little low, so the dock at the bottom never covers it)
      const H = prop ? new THREE.Box3().setFromObject(prop).max.y : 0; if (prop) labelY = Math.max(2.5, H + 0.85); this.heights.push(H);
      if (prop) { prop.position.set(p.x, 0.12, p.z); this.scene.add(prop); }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(i === 0 ? Math.max(3.4, (ext * sc) / 2 + 1.1) : 2.95, 0.09, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar("--red", "#c6363c")), transparent: true, opacity: 0 }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(p.x, 0.16, p.z); this.scene.add(halo); this.halos.push(halo);
      this.labels.push(this.mkLabel("jstage-label", `${String(i + 1).padStart(2, "0")} · ${s.label}`)); this.labelPos.push(new THREE.Vector3(p.x, labelY, p.z));
    });
    this.scene.updateMatrixWorld(true);
    // the sun's shadow frustum follows the camera target with a tight extent, so shadows stay crisp when the camera is close
    const sph = new THREE.Box3().setFromObject(this.scene).getBoundingSphere(new THREE.Sphere()); const sun = addLights(this.scene, sph.center, sph.radius, 2048);
    this.sun = sun; this.sunOff.copy(sun.position).sub(sph.center).normalize().multiplyScalar(60);
    const scam = sun.shadow.camera; scam.left = -13; scam.right = 13; scam.top = 13; scam.bottom = -13; scam.near = 1; scam.far = 160; scam.updateProjectionMatrix(); sun.shadow.radius = 5;
    // frame: fit the first station (building + pad + pin) once, then keep that frame size while the target moves
    const fitRoot = new THREE.Group(); fitRoot.add(house.clone()); fitRoot.position.set(0, 0, 0); this.scene.add(fitRoot);
    this.camera.position.copy(this.points[0]).addScaledVector(DIR, 80); this.camera.lookAt(this.points[0]); this.camera.updateMatrixWorld(true);
    this.bounds = projectedBounds(this.camera, fitRoot); this.scene.remove(fitRoot);
    const pb = this.bounds; const pr = (ext * sc) / 2 + 2.4; pb.minX = Math.min(pb.minX, -pr); pb.maxX = Math.max(pb.maxX, pr);
    this.frame0 = fitOrtho(this.camera, this.bounds, 1, FRAME_MARGIN); this.resize();
    // per-station close-up: the building keeps the full frame, every other station fills it with its own model
    const near = 3.9; o.stations.forEach((s, i) => { const z = i === 0 || s.kind === "where" ? 1 : Math.max(1, this.frame0.half / near); this.zooms.push(z); this.lifts.push(z > 1 ? Math.max(-0.35, Math.min(1.7, this.heights[i] * 0.5 - 0.4)) : 0); });
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
    // dwell: the camera stays on a station for the first half of its section and travels in the second half
    const gg = Math.max(0, (f - 0.5) / 0.5); const e = gg * gg * (3 - 2 * gg); const t = a.clone().lerp(b, e); const i2 = Math.min(this.points.length - 1, i + 1);
    // pull back a little while travelling between two stations, then settle in close
    const zoom = (this.zooms[i] + (this.zooms[i2] - this.zooms[i]) * e) * (1 - 0.16 * Math.sin(Math.PI * e)); t.y += this.lifts[i] + (this.lifts[i2] - this.lifts[i]) * e;
    if (Math.abs(this.camera.zoom - zoom) > 1e-4) { this.camera.zoom = zoom; this.camera.updateProjectionMatrix(); }
    if (this.sun) { this.sun.position.copy(t).add(this.sunOff); this.sun.target.position.copy(t); this.sun.target.updateMatrixWorld(); }
    // the model at the active station is alive: a slow turn and a small lift
    this.props.forEach((pr, k) => { if (!pr) return; const on = k === this.active && !this.reduced; const ry = on ? Math.sin(now / 1700) * 0.16 : 0, py = 0.12 + (on ? 0.1 + Math.sin(now / 1100) * 0.05 : 0); pr.rotation.y += (ry - pr.rotation.y) * 0.08; pr.position.y += (py - pr.position.y) * 0.08; });
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
