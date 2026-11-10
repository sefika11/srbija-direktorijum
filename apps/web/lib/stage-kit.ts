/**
 * Stage kit — the paper-and-ink look shared by every live 3D stage (emblem stages, journey boards): the same camera
 * direction, lights, paper slab and frame fit as the offline emblem renderer (tools/emblems/render.html), so a live
 * stage can cross-fade from its poster PNG without a jump. Orthographic, elevation 32°, azimuth 38°, matte materials.
 */
import * as THREE from "three";

export const EL = (32 * Math.PI) / 180, AZ = (38 * Math.PI) / 180, MARGIN = 0.08;
/** unit vector from the scene toward the camera */
export const DIR = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
export const RIGHT = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ));

export const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const cssVar = (n: string, fb: string) => (typeof window === "undefined" ? fb : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb);

export function makeRenderer(canvas: HTMLCanvasElement) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setClearColor(0x000000, 0);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

/** hemisphere + warm sun with shadows + cool fill, placed relative to the content's bounding sphere (C, R) */
export function addLights(scene: THREE.Scene, C: THREE.Vector3, R: number, shadowSize = 1024) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6e6, 0.9));
  const sun = new THREE.DirectionalLight(0xfff6ea, 4.4);
  sun.position.copy(C).addScaledVector(RIGHT, -0.75 * R * 3).addScaledVector(DIR, 0.45 * R * 3).add(new THREE.Vector3(0, 1.5 * R * 3, 0));
  sun.target.position.copy(C); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.radius = 4; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const sc = sun.shadow.camera, e = R * 1.15; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 0.1; sc.far = R * 12;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xe8eeff, 0.6);
  fill.position.copy(C).addScaledVector(RIGHT, 2 * R).addScaledVector(DIR, 2 * R).add(new THREE.Vector3(0, R, 0)); fill.target.position.copy(C); scene.add(fill, fill.target);
  return sun;
}

export function roundedRect(w: number, d: number, r: number) {
  const hw = w / 2, hd = d / 2, s = new THREE.Shape();
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0); s.lineTo(hw, hd - r); s.absarc(hw - r, hd - r, r, 0, Math.PI / 2);
  s.lineTo(-hw + r, hd); s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI); s.lineTo(-hw, -hd + r); s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
/** paper slab lying on the ground: top face at y = 0, tinted 10 % toward the hue like the rendered emblems */
export function slab(w: number, d: number, hue: string, thick = 0.3, tint = 0.1) {
  const color = new THREE.Color("#f6f4ef").lerp(new THREE.Color(hue), tint);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(w, d, Math.min(1.2, Math.min(w, d) * 0.1)), { depth: thick, bevelEnabled: false, curveSegments: 16 }), new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -thick; m.receiveShadow = true; return m;
}

/** bounds of every mesh vertex of `root` in the camera's view space (call after updateMatrixWorld) */
export function projectedBounds(cam: THREE.Camera, root: THREE.Object3D) {
  cam.updateMatrixWorld(true); const inv = cam.matrixWorldInverse; const v = new THREE.Vector3();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.visible) return; const pos = m.geometry.attributes.position as THREE.BufferAttribute | undefined; if (!pos) return;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x; if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y; }
  });
  return { minX, maxX, minY, maxY };
}
/** square frame (like the poster) kept on the shorter canvas axis; the longer axis shows more paper */
export function fitOrtho(cam: THREE.OrthographicCamera, b: ReturnType<typeof projectedBounds>, aspect: number, margin = MARGIN, grow = 1) {
  const half = (Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2 / (1 - 2 * margin)) * grow, cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const hx = aspect >= 1 ? half * aspect : half, hy = aspect >= 1 ? half : half / aspect;
  cam.left = cx - hx; cam.right = cx + hx; cam.top = cy + hy; cam.bottom = cy - hy; cam.updateProjectionMatrix();
  return { half, cx, cy };
}

export function disposeTree(root: THREE.Object3D, materials = false) {
  root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.geometry?.dispose?.(); if (materials) { const mt = m.material as THREE.Material | THREE.Material[]; if (Array.isArray(mt)) mt.forEach((x) => x.dispose()); else mt?.dispose?.(); } });
}

/** Observe the host and the tab: `cb(true)` when the stage should run, `cb(false)` when it may sleep. */
export function watchVisibility(host: HTMLElement, cb: (on: boolean) => void) {
  let inView = true, hidden = document.hidden;
  const io = new IntersectionObserver((es) => { for (const e of es) inView = e.isIntersecting; cb(inView && !hidden); }, { threshold: 0.02 });
  io.observe(host);
  const onVis = () => { hidden = document.hidden; cb(inView && !hidden); }; document.addEventListener("visibilitychange", onVis);
  return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
}

/** number painted on a small canvas, used for step discs and station markers (Unbounded if the page has it) */
export function numberTexture(n: number | string, ink = "#ffffff", size = 128) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size; const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, size, size); ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `400 ${Math.round(size * 0.56)}px "Unbounded Variable", "Unbounded", system-ui, sans-serif`; ctx.fillText(String(n), size / 2, size / 2 + size * 0.02);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
