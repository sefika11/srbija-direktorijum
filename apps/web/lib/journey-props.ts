/**
 * Station models for the journey board (lib/journey-stage.ts): one small diorama per kind of step, built from the same
 * paper-and-ink primitives as the emblems. Each fits a pad of radius ~2.7 with its base at y = 0, and is detailed
 * enough to hold the frame on its own, because the camera now moves in close on every station.
 */
import * as THREE from "three";
import * as D from "./emblems/dsl.mjs";
import { numberTexture } from "./stage-kit";

const { box, cyl, cone, sphere, torus, capsule, grp, rod, clockFace, tree, lamp, S, T, WHITE, INK, GOLD, STONE, WOOD, RED, GREEN, AMBER, BLUE } = D;
const SKIN = ["#e8cdb0", "#d6ab86", "#b98a64"], HAIR = ["#3a2f2a", "#6b4a2e", "#1f1f24"];
const PAPER = "#fbfaf5", LINE = "#9a9ea8";

const cache = new Map<string, THREE.Material>();
const special = (k: string, make: () => THREE.Material) => { if (!cache.has(k)) cache.set(k, make()); return cache.get(k)!; };
const glassMat = () => special("glass", () => new THREE.MeshStandardMaterial({ color: "#cfe3f5", roughness: 0.1, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false }));
const metalMat = (c: string) => special("metal" + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.45 }));
const glowMat = () => special("glow", () => new THREE.MeshStandardMaterial({ color: "#ffe9a8", emissive: "#ffcf5a", emissiveIntensity: 0.85, roughness: 0.3 }));
const as = <M extends THREE.Mesh>(m: M, mt: THREE.Material, shadow = true) => { m.material = mt; m.castShadow = shadow; return m; };

/** small text or pictogram painted on a canvas, laid flat or stood up as a decal */
function decal(draw: (ctx: CanvasRenderingContext2D, s: number) => void, w: number, h: number, tex: THREE.Texture[], size = 192) {
  const cv = document.createElement("canvas"); cv.width = size; cv.height = Math.round((size * h) / w); const ctx = cv.getContext("2d")!; draw(ctx, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex.push(t);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}
const glyph = (ch: string, ink: string, w: number, tex: THREE.Texture[]) => decal((ctx, s) => { ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `400 ${Math.round(s * 0.7)}px "Unbounded Variable", "Unbounded", system-ui, sans-serif`; ctx.fillText(ch, s / 2, s / 2 + s * 0.03); }, w, w, tex);
const flat = (m: THREE.Mesh, x: number, y: number, z: number, ry = 0) => { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, y, z); return m; };

export function person(col: string, s = 1, o: { x?: number; z?: number; ry?: number; skin?: number; hair?: number } = {}) {
  const skin = SKIN[o.skin ?? 0], hair = HAIR[o.hair ?? 0], leg = S(col, -0.24);
  return grp([
    cyl(0.15 * s, 0.98 * s, leg, { x: -0.17 * s, seg: 14 }), cyl(0.15 * s, 0.98 * s, leg, { x: 0.17 * s, seg: 14 }),
    box(0.22 * s, 0.4 * s, 0.11 * s, INK, { x: -0.17 * s, z: 0.07 * s }), box(0.22 * s, 0.4 * s, 0.11 * s, INK, { x: 0.17 * s, z: 0.07 * s }),
    capsule(0.35 * s, 0.6 * s, col, { y: 1.5 * s }),
    capsule(0.11 * s, 0.6 * s, S(col, -0.07), { x: -0.46 * s, y: 1.5 * s, rz: -0.13 }), capsule(0.11 * s, 0.6 * s, S(col, -0.07), { x: 0.46 * s, y: 1.5 * s, rz: 0.13 }),
    sphere(0.085 * s, skin, { x: -0.52 * s, y: 1.0 * s }), sphere(0.085 * s, skin, { x: 0.52 * s, y: 1.0 * s }),
    cyl(0.11 * s, 0.16 * s, skin, { y: 2.1 * s, seg: 14 }), sphere(0.29 * s, skin, { y: 2.18 * s }),
    sphere(0.305 * s, hair, { y: 2.36 * s, z: -0.07 * s, sy: 0.7 }),
  ], { x: o.x, z: o.z, ry: o.ry });
}

/** who: three people of different ages behind a queue rope, one with a suitcase */
export function whoProp(hue: string) {
  const post = (x: number, z: number) => grp([cyl(0.2, 0.06, INK, { seg: 20 }), as(cyl(0.05, 1.05, GOLD, { seg: 12 }), metalMat(GOLD)), as(sphere(0.09, GOLD, { y: 1.02 }), metalMat(GOLD))], { x, z });
  return grp([
    person(hue, 1, { x: -0.25, z: -0.35, ry: 0.35 }), person(AMBER, 0.6, { x: 0.75, z: 0.35, ry: 0.5, skin: 1, hair: 1 }), person(GREEN, 0.94, { x: -1.35, z: 0.45, ry: 0.2, skin: 2, hair: 2 }),
    grp([box(0.62, 0.3, 0.8, S(RED, -0.05)), box(0.5, 0.32, 0.06, INK, { y: 0.36, sharp: true }), rod([-0.14, 0.8, 0], [-0.14, 1.2, 0], 0.025, INK), rod([0.14, 0.8, 0], [0.14, 1.2, 0], 0.025, INK), rod([-0.14, 1.2, 0], [0.14, 1.2, 0], 0.03, INK)], { x: -2.05, z: 0.9, ry: 0.3 }),
    post(1.55, -0.9), post(1.95, 1.25), rod([1.55, 0.98, -0.9], [1.95, 0.98, 1.25], 0.045, RED),
  ]);
}

function sheet(hue: string, stamp: boolean) {
  return grp([box(1.5, 2.1, 0.035, PAPER, { sharp: true }), box(0.9, 0.16, 0.012, hue, { y: 0.035, z: -0.78, sharp: true }),
    ...[-0.44, -0.2, 0.04, 0.28].map((z, i) => box(i % 2 ? 0.86 : 1.08, 0.055, 0.008, LINE, { y: 0.035, z, x: i % 2 ? -0.11 : 0, sharp: true })),
    stamp ? torus(0.2, 0.035, RED, { rx: Math.PI / 2, y: 0.05, x: 0.4, z: 0.68, seg: 28 }) : null]);
}
/** documents: an open folder with fanned sheets, a passport, an ID card, two photos and a pen */
export function docsProp(n: number, hue: string) {
  const k = Math.max(2, Math.min(5, n)); const g = grp([box(4.1, 3.0, 0.08, "#c8a468"), box(4.1, 0.1, 0.5, "#b8935a", { z: -1.5, rx: -0.5 }), box(1.1, 0.5, 0.05, "#d9b77c", { x: 1.2, y: 0.08, z: -1.3, sharp: true })]);
  for (let i = 0; i < k; i++) { const sh = sheet(hue, i === k - 1); sh.position.set(-0.75 + i * 0.2 - (k - 1) * 0.1, 0.09 + i * 0.045, 0.1); sh.rotation.y = (i - (k - 1) / 2) * 0.2; g.add(sh); }
  g.add(as(torus(0.13, 0.025, STONE, { rx: Math.PI / 2, y: 0.12 + k * 0.045, x: -1.25, z: -0.85, seg: 20 }), metalMat("#b9bcc4")));
  // passport, card, photos, pen
  g.add(grp([box(0.92, 1.26, 0.13, "#5c1b25"), box(0.86, 1.2, 0.02, "#f1ece0", { y: 0.055, x: 0.03, sharp: true }), as(cyl(0.2, 0.012, GOLD, { y: 0.13, seg: 28, z: -0.1 }), metalMat(GOLD)), box(0.42, 0.06, 0.008, GOLD, { y: 0.13, z: 0.34, sharp: true })], { x: 1.25, y: 0.08, z: -0.15, ry: -0.28 }));
  g.add(grp([box(1.05, 0.66, 0.035, T(hue, 0.72, "#ffffff")), box(0.28, 0.36, 0.006, T(hue, 0.3), { y: 0.035, x: -0.32, z: 0.06, sharp: true }), box(0.5, 0.05, 0.006, INK, { y: 0.035, x: 0.18, z: -0.1, sharp: true }), box(0.4, 0.05, 0.006, LINE, { y: 0.035, x: 0.13, z: 0.06, sharp: true }), box(0.46, 0.05, 0.006, LINE, { y: 0.035, x: 0.16, z: 0.2, sharp: true })], { x: 1.1, y: 0.1, z: 1.0, ry: 0.22 }));
  [0, 1].forEach((i) => g.add(grp([box(0.42, 0.52, 0.02, WHITE, { sharp: true }), box(0.32, 0.4, 0.006, T(hue, 0.45), { y: 0.02, sharp: true }), sphere(0.08, "#e8cdb0", { y: 0.02, z: -0.04, sy: 0.3 })], { x: -1.55 + i * 0.5, y: 0.09, z: 1.12, ry: 0.12 - i * 0.3 })));
  g.add(grp([cyl(0.055, 1.5, BLUE, { axis: "x", seg: 12 }), cone(0.055, 0.16, INK, { seg: 12, x: 0.83, rz: -Math.PI / 2 }), cyl(0.06, 0.2, STONE, { axis: "x", seg: 12, x: -0.7 })], { x: 0.15, y: 0.15, z: 1.72, ry: 0.12 }));
  return g;
}

/** fees: a counter with a glass screen, card terminal, receipt, coins and banknotes under an RSD sign */
export function feesProp(hue: string, tex: THREE.Texture[], mark = "RSD") {
  const g = grp([box(4.0, 1.7, 1.15, T(hue, 0.5)), box(4.2, 1.9, 0.12, STONE, { y: 1.15 }), box(4.0, 0.06, 0.2, S(hue, -0.12), { y: 0.55, z: 0.86, sharp: true }), box(4.0, 0.06, 0.08, S(hue, -0.12), { y: 0.2, z: 0.86, sharp: true })]);
  // glass screen with a frame and a speaking slot
  g.add(as(box(3.6, 0.05, 1.5, "#cfe3f5", { y: 1.27, z: -0.55, sharp: true }), glassMat(), false), box(0.09, 0.09, 1.6, INK, { x: -1.84, y: 1.27, z: -0.55, sharp: true }), box(0.09, 0.09, 1.6, INK, { x: 1.84, y: 1.27, z: -0.55, sharp: true }), box(3.77, 0.09, 0.09, INK, { y: 2.83, z: -0.55, sharp: true }));
  g.add(box(1.9, 0.12, 0.8, hue, { y: 2.95, z: -0.55 }));
  const rsd = decal((ctx, s) => { ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `400 ${Math.round(s * 0.24)}px "Unbounded Variable", "Unbounded", system-ui, sans-serif`; if (mark) ctx.fillText(mark, s / 2, (s * 0.7) / 1.8 / 2 + 3); else [0.3, 0.5, 0.7].forEach((x) => { ctx.beginPath(); ctx.arc(s * x, (s * 0.7) / 1.8 / 2, s * 0.045, 0, Math.PI * 2); ctx.fill(); }); }, 1.8, 0.7, tex, 256); rsd.position.set(0, 3.35, -0.485); g.add(rsd);
  // terminal, receipt, coins, notes, payment slip
  g.add(grp([box(0.5, 0.82, 0.16, INK), box(0.4, 0.3, 0.02, "#9fd6b4", { y: 0.16, z: -0.2, sharp: true }), ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => box(0.09, 0.09, 0.02, LINE, { y: 0.16, x: -0.13 + c * 0.13, z: 0.06 + r * 0.12, sharp: true }))), box(0.34, 0.02, 0.5, PAPER, { y: 0.1, z: -0.5, rx: -0.5, sharp: true })], { x: -1.25, y: 1.27, z: 0.35, ry: 0.25 }));
  for (let i = 0; i < 5; i++) g.add(as(cyl(0.26, 0.07, GOLD, { x: 1.45, z: 0.15, y: 1.27 + i * 0.075, seg: 28 }), metalMat(GOLD)));
  for (let i = 0; i < 3; i++) g.add(as(cyl(0.22, 0.07, GOLD, { x: 0.95, z: 0.55, y: 1.27 + i * 0.075, seg: 28 }), metalMat("#cfd2d9")));
  g.add(as(cyl(0.26, 0.07, GOLD, { x: 1.6, z: 0.72, y: 1.27, seg: 28 }), metalMat(GOLD)));
  g.add(grp([box(1.0, 0.52, 0.16, "#86b58a"), box(0.2, 0.54, 0.165, PAPER, { sharp: true }), box(1.0, 0.52, 0.02, "#74a479", { y: 0.16, x: 0.04, z: 0.03, ry: 0.06 })], { x: 0.05, y: 1.27, z: 0.35, ry: -0.18 }));
  g.add(grp([box(1.5, 0.75, 0.02, PAPER, { sharp: true }), box(0.5, 0.75, 0.006, T(RED, 0.72, "#ffffff"), { y: 0.02, x: 0.5, sharp: true }), box(0.7, 0.045, 0.006, LINE, { y: 0.02, x: -0.3, z: -0.18, sharp: true }), box(0.6, 0.045, 0.006, LINE, { y: 0.02, x: -0.35, z: 0.02, sharp: true })], { x: -0.2, y: 0.0, z: 1.75, ry: 0.2 }));
  return g;
}

/** steps: a numbered staircase with a flag at the top and someone starting to climb */
export function stepsProp(n: number, hue: string, tex: THREE.Texture[]) {
  const k = Math.max(2, Math.min(8, n)), w = 0.92, rise = 0.3, depth = 1.9, total = k * w; const g = grp([]);
  for (let j = 0; j < k; j++) {
    const h = rise * (j + 1), x = -total / 2 + w * (j + 0.5);
    g.add(box(w - 0.04, depth, h, j % 2 ? T(hue, 0.28) : hue, { x }), box(w - 0.04, depth + 0.06, 0.05, T(hue, 0.82, "#ffffff"), { x, y: h, sharp: true }));
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: (() => { const t = numberTexture(j + 1, "#17181c"); tex.push(t); return t; })(), transparent: true, depthWrite: false }));
    g.add(flat(num, x, h + 0.056, 0.2));
  }
  const top = rise * k, fx = total / 2 - w / 2;
  g.add(cyl(0.045, 1.5, INK, { x: fx + 0.2, y: top, z: -0.6, seg: 10 }), box(0.7, 0.04, 0.42, RED, { x: fx + 0.57, y: top + 1.05, z: -0.6, sharp: true }), sphere(0.07, GOLD, { x: fx + 0.2, y: top + 1.46, z: -0.6 }));
  g.add(person(AMBER, 0.52, { x: -total / 2 - 0.55, z: 0.35, ry: Math.PI / 2 - 0.2, skin: 1, hair: 1 }));
  const s = Math.min(1, 5.3 / (total + 1.1)); g.scale.setScalar(s); g.position.x = 0.3 * s; return g;
}

/** tips: a lit bulb standing on a spiral notebook, a pencil beside it */
export function notesProp(hue: string) {
  const g = grp([box(2.7, 2.1, 0.2, hue), box(2.56, 1.98, 0.06, PAPER, { y: 0.18, x: 0.04, sharp: true })]);
  for (let i = 0; i < 7; i++) g.add(as(torus(0.12, 0.025, STONE, { x: -1.3, y: 0.2, z: -0.8 + i * 0.27, ry: Math.PI / 2, seg: 16 }), metalMat("#b9bcc4")));
  [-0.55, -0.3, -0.05].forEach((z, i) => g.add(box(i === 2 ? 1.0 : 1.5, 0.05, 0.008, LINE, { y: 0.24, x: i === 2 ? -0.3 : -0.05, z: z + 1.05, sharp: true })));
  g.add(as(torus(0.2, 0.03, RED, { rx: Math.PI / 2, y: 0.26, x: 0.75, z: 0.62, seg: 24 }), D.mat(RED)));
  const bulb = grp([cyl(0.3, 0.14, "#8d9099", { seg: 24 }), cyl(0.27, 0.3, "#a9acb5", { y: 0.14, seg: 24 }), ...[0.2, 0.3, 0.4].map((y) => torus(0.28, 0.025, "#7d8089", { rx: Math.PI / 2, y, seg: 24 })), as(cyl(0.3, 0.5, WHITE, { y: 0.44, rTop: 0.62, seg: 32 }), glowMat()), as(sphere(0.72, WHITE, { y: 0.72 }), glowMat())], { x: -0.1, y: 0.24, z: -0.25 });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3, r1 = 1.0, r2 = 1.32; bulb.add(rod([Math.cos(a) * r1, 1.44 + Math.sin(a) * r1 * 0.9, 0], [Math.cos(a) * r2, 1.44 + Math.sin(a) * r2 * 0.9, 0], 0.035, GOLD)); }
  bulb.rotation.y = 0.55; g.add(bulb);
  g.add(grp([cyl(0.075, 1.9, AMBER, { axis: "x", seg: 6 }), cone(0.075, 0.24, "#e8cdb0", { seg: 6, x: 1.07, rz: -Math.PI / 2 }), cone(0.03, 0.09, INK, { seg: 6, x: 1.22, rz: -Math.PI / 2 }), cyl(0.08, 0.16, "#d98a94", { axis: "x", seg: 12, x: -1.02 })], { x: 0.5, y: 0.08, z: 1.5, ry: 0.35 }));
  return g;
}

/** duration: a desk calendar and an alarm clock */
export function durationProp(hue: string, tex: THREE.Texture[]) {
  const page = grp([box(1.9, 0.14, 1.85, PAPER), box(1.9, 0.03, 0.44, RED, { y: 1.41, z: 0.065, sharp: true })], { y: 0.12, z: 0.25, rx: -0.3 });
  [-0.55, 0.55].forEach((x) => page.add(as(torus(0.11, 0.03, STONE, { x, y: 1.86, ry: Math.PI / 2, seg: 18 }), metalMat("#b9bcc4"))));
  const grid = decal((ctx, s) => { const cols = 7, rows = 4, cw = s / (cols + 1), h = (s * 1.2) / 1.7; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const hot = r === 2 && c === 3; ctx.fillStyle = hot ? "#c6363c" : "#9a9ea8"; ctx.beginPath(); ctx.arc(cw * (c + 1), (h / (rows + 1)) * (r + 1), hot ? cw * 0.34 : cw * 0.18, 0, Math.PI * 2); ctx.fill(); } }, 1.7, 1.2, tex, 256);
  grid.position.set(0, 0.74, 0.075); page.add(grid);
  const cal = grp([box(2.1, 1.15, 0.14, INK), page], { x: -0.95, z: -0.2, ry: 0.42 });
  const clock = grp([cyl(0.86, 0.5, hue, { axis: "z", seg: 40, y: 1.05 }), clockFace(0.74, { y: 0.31, z: 0.2 }), as(sphere(0.2, GOLD, { x: -0.5, y: 1.72 }), metalMat(GOLD)), as(sphere(0.2, GOLD, { x: 0.5, y: 1.72 }), metalMat(GOLD)), rod([-0.5, 1.95, 0], [0.5, 1.95, 0], 0.035, INK), sphere(0.07, INK, { y: 1.95 }), rod([-0.45, 0.4, 0], [-0.62, 0, 0.05], 0.06, INK), rod([0.45, 0.4, 0], [0.62, 0, 0.05], 0.06, INK)], { x: 1.2, z: 0.75, ry: 0.5 });
  return grp([cal, clock]);
}

/** questions: someone asks, the clerk answers — two people and their speech bubbles */
export function faqProp(hue: string, tex: THREE.Texture[]) {
  const bubble = (col: string, ch: string, ink: string, w: number, tailX: number) => {
    const g = grp([box(w, 0.46, w * 0.72, col), box(0.34, 0.4, 0.34, col, { x: tailX, y: -0.13, rz: Math.PI / 4 })]);
    const d = glyph(ch, ink, w * 0.56, tex); d.position.set(0, w * 0.36, 0.245); g.add(d); return g;
  };
  const q = bubble(hue, "?", "#ffffff", 1.9, 0.45); q.position.set(-1.25, 2.75, 0.2); q.rotation.y = 0.55;
  const a = bubble(PAPER, "✓", "#2f8f5a", 1.55, -0.4); a.position.set(1.2, 2.95, -0.35); a.rotation.y = 0.55;
  return grp([person(GREEN, 0.86, { x: -0.75, z: 0.55, ry: 0.95, skin: 1, hair: 1 }), person(S(hue, -0.08), 0.92, { x: 0.8, z: -0.3, ry: -0.45, hair: 2 }),
    box(1.5, 0.7, 1.0, T(hue, 0.55), { x: 1.55, z: 0.75, ry: 0.5 }), box(1.6, 0.8, 0.08, STONE, { x: 1.55, y: 1.0, z: 0.75, ry: 0.5 }), q, a]);
}

/** apply: the online form on a laptop, an envelope and the stamp that closes the file */
export function applyProp(hue: string) {
  const screen = grp([box(2.5, 0.09, 1.65, INK), box(2.3, 0.02, 1.45, "#f4f6fb", { y: 0.1, z: 0.05, sharp: true }), box(1.2, 0.012, 0.17, hue, { y: 1.26, x: -0.45, z: 0.07, sharp: true }),
    ...[1.0, 0.8, 0.6].map((y, i) => box(i === 1 ? 1.5 : 1.9, 0.012, 0.07, LINE, { y, x: i === 1 ? -0.3 : -0.1, z: 0.07, sharp: true })), box(0.62, 0.012, 0.22, "#2f8f5a", { y: 0.24, x: 0.7, z: 0.07, sharp: true })], { y: 0.12, z: -0.82, rx: -0.2 });
  const keys = [0, 1, 2].flatMap((r) => Array.from({ length: 9 }, (_, c) => box(0.19, 0.19, 0.02, INK, { x: -0.92 + c * 0.23, y: 0.12, z: -0.5 + r * 0.25, sharp: true })));
  const laptop = grp([box(2.5, 1.7, 0.12, "#c9ccd4"), ...keys, box(0.8, 0.45, 0.01, "#b3b7c1", { y: 0.12, z: 0.5, sharp: true }), screen], { x: -0.55, z: -0.25, ry: 0.3 });
  const env = grp([box(1.3, 0.85, 0.05, PAPER), rod([-0.65, 0.055, -0.42], [0, 0.055, 0.05], 0.012, LINE), rod([0.65, 0.055, -0.42], [0, 0.055, 0.05], 0.012, LINE), box(0.22, 0.26, 0.008, T(RED, 0.4, "#ffffff"), { x: 0.42, y: 0.05, z: 0.2, sharp: true })], { x: 1.55, z: 1.1, ry: -0.3 });
  const stamp = grp([cyl(0.5, 0.16, "#3b3a44", { seg: 32 }), cyl(0.2, 0.75, WOOD, { y: 0.16, rTop: 0.15, seg: 20 }), sphere(0.3, S(WOOD, -0.06), { y: 0.82 }), torus(0.42, 0.04, RED, { rx: Math.PI / 2, y: 0.02, x: -0.95, z: 0.2, seg: 28 }), cyl(0.3, 0.012, T(RED, 0.55, "#ffffff"), { x: -0.95, z: 0.2, seg: 28 })], { x: 1.7, z: -0.55 });
  return grp([laptop, env, stamp]);
}

/** greenery and a street lamp around the building at the first station */
export function grounds(hw: number, hd: number) {
  return grp([tree(1.9, GREEN, { x: -hw - 0.75, z: hd * 0.2 }), tree(1.4, S(GREEN, 0.06), { x: -hw - 0.5, z: -hd - 0.3 }), tree(1.6, GREEN, { x: hw * 0.55, z: -hd - 0.8 }), lamp({ x: -hw - 0.3, z: hd + 0.75 })]);
}
