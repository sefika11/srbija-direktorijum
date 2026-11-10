/**
 * EmblemEngine — a live version of one rendered emblem: the same declarative scene (lib/emblems), slab, lights and
 * orthographic frame as the poster PNG, on a turntable. Slow idle sway, pointer parallax, drag with inertia (like the
 * globe), paused off-screen and in hidden tabs, static under prefers-reduced-motion. One renderer per stage.
 */
import * as THREE from "three";
import { SCENES, HUES } from "./emblems/scenes.mjs";
import { DIR, MARGIN, addLights, disposeTree, fitOrtho, makeRenderer, projectedBounds, reducedMotion, slab, watchVisibility } from "./stage-kit";

export type EmblemOpts = { canvas: HTMLCanvasElement; host: HTMLElement; key: string; hue?: string; interactive?: boolean; onReady?: (firstFrameMs: number) => void };
export const canLive = (key: string | null | undefined) => !!key && key in SCENES;

export class EmblemEngine {
  private o: EmblemOpts; private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  private table = new THREE.Group(); private bounds: ReturnType<typeof projectedBounds>; private aspect = 1;
  private user = 0; private vel = 0; private lastMove = 0; private dragging = false; private px = 0; private py = 0; private tiltX = 0; private tiltY = 0; private hover = false;
  private raf = 0; private alive = true; private visible = true; private reduced = reducedMotion(); private dirty = true; private t0 = 0;
  private ro: ResizeObserver | null = null; private unwatch: (() => void) | null = null; private off: (() => void)[] = [];

  constructor(o: EmblemOpts) {
    this.o = o; const start = performance.now();
    const build = SCENES[o.key]; if (!build) throw new Error("no scene " + o.key);
    const hue = o.hue ?? HUES[o.key] ?? "#8e97b8";
    this.renderer = makeRenderer(o.canvas);
    const subject = build(hue); subject.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(subject); subject.position.x -= (bb.min.x + bb.max.x) / 2; subject.position.z -= (bb.min.z + bb.max.z) / 2;
    subject.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(subject);
    const side = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 1.12 + 1.0;
    this.table.add(subject, slab(side, side, hue)); this.scene.add(this.table); this.scene.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(this.scene).getBoundingSphere(new THREE.Sphere()); const C = sph.center.clone(), R = sph.radius;
    addLights(this.scene, C, R, 1024);
    this.camera.position.copy(C).addScaledVector(DIR, R * 6); this.camera.lookAt(C); this.camera.updateMatrixWorld(true);
    this.bounds = projectedBounds(this.camera, this.scene);
    this.resize(); this.bind();
    this.ro = new ResizeObserver(() => { this.resize(); this.dirty = true; }); this.ro.observe(o.host);
    this.unwatch = watchVisibility(o.host, (on) => { this.visible = on; if (on && !this.raf) this.raf = requestAnimationFrame(this.frame); });
    this.t0 = performance.now();
    this.render(); o.onReady?.(performance.now() - start);
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.alive = false; cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.unwatch?.(); this.off.forEach((f) => f());
    disposeTree(this.scene); this.renderer.dispose();
  }

  private resize() {
    const w = this.o.host.clientWidth, h = this.o.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.aspect = w / h; fitOrtho(this.camera, this.bounds, this.aspect, MARGIN, 1.03);
  }
  private bind() {
    if (this.o.interactive === false) return;
    const cv = this.o.canvas; let moved = 0, lx = 0;
    const down = (e: PointerEvent) => { if (e.pointerType === "mouse" && e.button !== 0) return; this.dragging = true; moved = 0; lx = e.clientX; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect(); this.px = ((e.clientX - r.left) / r.width) * 2 - 1; this.py = ((e.clientY - r.top) / r.height) * 2 - 1; this.hover = true; this.dirty = true;
      if (!this.dragging) return; const dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx); if (moved > 3) { this.vel = dx * 0.008; this.user += this.vel; this.lastMove = performance.now(); }
    };
    const up = () => { this.dragging = false; if (performance.now() - this.lastMove > 80) this.vel = 0; };
    const leave = () => { this.hover = false; this.dirty = true; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("pointerleave", leave);
    cv.style.touchAction = "pan-y";
    this.off.push(() => { cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); cv.removeEventListener("pointerleave", leave); });
  }
  private render() { this.renderer.render(this.scene, this.camera); this.dirty = false; }

  private frame = (now: number) => {
    if (!this.alive) return;
    if (!this.visible) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(this.frame);
    const t = (now - this.t0) / 1000;
    if (!this.dragging && Math.abs(this.vel) > 0.0004) { this.user += this.vel; this.vel *= 0.93; this.dirty = true; }
    const sway = this.reduced ? 0 : Math.sin(t * 0.26) * 0.2;
    const tx = this.reduced || !this.hover ? 0 : this.py * 0.05, ty = this.reduced || !this.hover ? 0 : this.px * 0.11;
    const k = this.reduced ? 1 : 0.08; this.tiltX += (tx - this.tiltX) * k; this.tiltY += (ty - this.tiltY) * k;
    const ry = this.user + sway + this.tiltY, rx = this.tiltX;
    if (!this.reduced || this.dirty || Math.abs(ry - this.table.rotation.y) > 1e-4 || Math.abs(rx - this.table.rotation.x) > 1e-4) { this.table.rotation.set(rx, ry, 0); this.render(); }
  };
}
