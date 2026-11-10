// Landmarks: one recognizable sight per city and municipality, built from archetypes ("kind" + "style" + options) so
// 170+ places share a small, consistent vocabulary. Each builder: (hue, style, o) => Group, base slab top at y = 0.3,
// footprint about 8.6 × 6.4, facade toward +z. Table of places: landmark-table.mjs. Rendered like every other emblem.
import * as D from "./dsl.mjs";
import { BUILDINGS } from "./buildings.mjs";
const { THREE, box, cyl, cone, sphere, torus, capsule, dome, tube, rod, shape2d, plan, prism, pitchedRoof, pyramid, vault, colonnade, steps, windowGrid, block, door, arch, flagMast, clockFace, tree, cypress, lamp, bench, fence, grp, S, T,
  CREAM, STONE, DARK, DOOR, GOLD, RED, WOOD, GREEN, GLASS, GREY, WHITE, INK, BLUE, AMBER } = D;

export const P = { grass: "#b9cba4", grassD: "#9db886", water: "#9cc3e6", waterD: "#7dafdb", sand: "#e7d8ae", rock: "#aaa59c", rockD: "#8c877f", brick: "#b5523f", tile: "#b9563f", lead: "#8a8f98", verdigris: "#6fa79a",
  log: "#6b4a2e", bronze: "#6d5a3a", snow: "#f5f7f9", concrete: "#cbc9c2", wheat: "#e3c56c", vine: "#6f9a52", ochre: "#c98b5a", thatch: "#c9b27a", yellow: "#ead38e", pine: "#4b6b4c", pine2: "#587b5c", steel: "#7d8590" };
const Y = 0.3, PI = Math.PI;
/** deterministic 0..1 from a seed and an index, so two places of the same kind do not look identical */
const R = (seed, i = 0) => { const x = Math.sin((seed + 1) * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x); };
const ground = (col = STONE, w = 8.6, d = 6.4) => box(w, d, Y, col, { sharp: true });
const lawn = (w, d, o = {}) => box(w, d, 0.06, o.col ?? P.grass, { y: Y, sharp: true, ...o });
const pond = (w, d, o = {}) => box(w, d, 0.05, o.col ?? P.water, { y: Y, sharp: true, ...o });
const disc = (r, col, o = {}) => cyl(r, 0.05, col, { y: Y, seg: 40, ...o });
const cross = (o = {}, s = 1) => grp([box(0.09 * s, 0.09 * s, 0.9 * s, GOLD, { sharp: true }), box(0.5 * s, 0.09 * s, 0.09 * s, GOLD, { y: 0.55 * s, sharp: true })], o);
const pine = (h, o = {}) => grp([cyl(h * 0.05, h * 0.25, WOOD, { seg: 8 }), cone(h * 0.28, h * 0.5, P.pine, { y: h * 0.2, seg: 12 }), cone(h * 0.2, h * 0.42, P.pine2, { y: h * 0.52, seg: 12 })], o);
const hill = (r, h, col, o = {}) => { const m = dome(r, col, o); m.scale.y = h / r; if (o.sx) m.scale.x = o.sx; if (o.sz) m.scale.z = o.sz; return m; };
const peak = (r, h, col, o = {}, snow = 0) => grp([cone(r, h, col, { seg: o.seg ?? 6 }), snow ? cone(r * snow * 1.02, h * snow, P.snow, { y: h * (1 - snow) + 0.01, seg: o.seg ?? 6 }) : null], o);
const drum = (r, h, wall, cap, o = {}, cr = true) => grp([cyl(r, h, wall, { seg: 24 }), cyl(r * 1.08, 0.1, S(wall, -0.08), { y: h, seg: 24 }), dome(r * 1.04, cap, { y: h + 0.1 }), cr ? cross({ y: h + 0.1 + r * 1.0 }, Math.max(0.6, r * 0.9)) : null], o);
const crenels = (w, col, o = {}, axis = "x") => grp(Array.from({ length: Math.max(2, Math.round(w / 0.5)) }, (_, i) => { const n = Math.max(2, Math.round(w / 0.5)), t = (i - (n - 1) / 2) * (w / n); return box(axis === "x" ? 0.26 : 0.34, axis === "x" ? 0.34 : 0.26, 0.26, col, axis === "x" ? { x: t, sharp: true } : { z: t, sharp: true }); }), o);
const towerSq = (w, h, col, cap = "cren", o = {}, capCol) => grp([box(w, w, h, col), cap === "cren" ? [box(w + 0.18, w + 0.18, 0.16, S(col, -0.05), { y: h, sharp: true }), crenels(w, col, { y: h + 0.16, z: w / 2 }), crenels(w, col, { y: h + 0.16, z: -w / 2 }), crenels(w, col, { y: h + 0.16, x: w / 2 }, "z"), crenels(w, col, { y: h + 0.16, x: -w / 2 }, "z")] : cap === "pyr" ? pyramid(w + 0.25, w + 0.25, w * 0.9, capCol ?? P.tile, { y: h }) : cone(w * 0.75, w * 1.1, capCol ?? P.tile, { y: h, seg: 24 }), box(w * 0.22, 0.05, 0.5, DARK, { y: h * 0.62, z: w / 2 + 0.01, sharp: true })], o);
const wallRun = (len, h, col, o = {}) => grp([box(len, 0.5, h, col, { sharp: true }), crenels(len, col, { y: h })], o);
const person = (col, s = 1, o = {}) => grp([cyl(0.2 * s, 0.9 * s, S(col, -0.1), { seg: 12 }), capsule(0.24 * s, 0.5 * s, col, { y: 1.3 * s }), sphere(0.19 * s, col, { y: 1.75 * s })], o);
const boat = (col, o = {}, mast = 0) => grp([box(1.5, 0.55, 0.22, col), box(0.5, 0.4, 0.2, WHITE, { y: 0.22, x: -0.2 }), mast ? [cyl(0.03, mast, WOOD, { y: 0.22, x: 0.25, seg: 8 }), shape2d([[0, 0], [0.7, 0], [0, mast * 0.85]], 0.03, WHITE, { y: 0.4, x: 0.62, bevel: 0 })] : null], o);
const haystack = (r, o = {}) => grp([cyl(r, r * 0.7, P.thatch, { seg: 16 }), cone(r * 1.05, r * 1.1, S(P.thatch, -0.06), { y: r * 0.7, seg: 16 }), cyl(0.03, r * 0.5, WOOD, { y: r * 1.7, seg: 6 })], o);
const rows = (n, len, gap, col, o = {}, h = 0.18) => grp(Array.from({ length: n }, (_, i) => box(len, 0.22, h, i % 2 ? S(col, 0.04) : col, { z: (i - (n - 1) / 2) * gap, sharp: true })), o);
const greens = (seed, spots) => spots.map(([x, z], i) => (R(seed, i) > 0.5 ? tree(1.5 + R(seed, i + 9) * 0.9, i % 2 ? GREEN : S(GREEN, 0.05), { x, z, y: Y }) : cypress(2.1 + R(seed, i + 5) * 1.2, i % 2 ? "#4b6b4c" : "#56795a", { x, z, y: Y })));

// ---------------------------------------------------------------- sacred
function church(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground()];
  if (style === "big-dome") { // a cross-plan temple with one great dome and four corner bell towers (Hram Svetog Save)
    const w = o.wall ?? "#f3f1ea", dm = o.dome ?? P.verdigris;
    k.push(steps(3, 6.6, 0.3, 0.1, STONE, { z: 2.5, y: Y }), box(5.0, 5.0, 3.3, w, { y: Y }), box(6.6, 2.4, 2.9, S(w, -0.02), { y: Y }), box(2.4, 6.6, 2.9, S(w, -0.02), { y: Y }));
    [[0, 3.3, 0], [0, -3.3, PI], [3.3, 0, PI / 2], [-3.3, 0, -PI / 2]].forEach(([x, z]) => { const h = dome(1.2, dm, { x: x * 0.86, z: z * 0.86, y: Y + 2.9 }); h.scale.y = 0.7; k.push(h); });
    k.push(cyl(2.25, 1.5, w, { y: Y + 3.3, seg: 32 }), cyl(2.4, 0.14, S(w, -0.06), { y: Y + 4.8, seg: 32 }), dome(2.35, dm, { y: Y + 4.94 }), cross({ y: Y + 7.2 }, 1.3));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; k.push(box(0.26, 0.08, 0.9, DARK, { x: Math.sin(a) * 2.26, z: Math.cos(a) * 2.26, y: Y + 3.6, ry: a, sharp: true })); }
    [[2.1, 2.1], [-2.1, 2.1], [2.1, -2.1], [-2.1, -2.1]].forEach(([x, z]) => k.push(box(1.2, 1.2, 4.3, w, { x, z, y: Y }), drum(0.55, 0.5, w, dm, { x, z, y: Y + 4.3 })));
    k.push(arch(1.1, 2.0, DOOR, { y: Y + 0.3, z: 3.31 }), ...greens(seed, [[-3.9, 2.4], [3.9, 2.4]]));
    return grp(k);
  }
  if (style === "wooden") { // log church under a tall shingle roof (brvnara)
    k.push(lawn(8.2, 6, {}), box(4.6, 2.9, 0.45, P.rock, { y: Y, z: -0.2 }), box(4.3, 2.6, 1.5, P.log, { y: Y + 0.45, z: -0.2 }), cyl(1.3, 1.5, P.log, { y: Y + 0.45, x: -2.15, z: -0.2, seg: 12 }));
    for (let i = 0; i < 4; i++) k.push(box(4.34, 2.64, 0.05, S(P.log, -0.08), { y: Y + 0.75 + i * 0.33, z: -0.2, sharp: true }));
    k.push(prism(5.2, 3.5, 3.0, "#4a3b30", { y: Y + 1.95, z: -0.2 }), cone(1.6, 2.6, "#4a3b30", { y: Y + 1.95, x: -2.2, z: -0.2, seg: 12 }), cross({ y: Y + 4.9, x: 0.6, z: -0.2 }, 1), door(0.8, 1.3, "#3a2a1e", { y: Y + 0.45, x: 1.2, z: 1.11, frame: P.log }));
    k.push(box(1.6, 1.0, 0.1, P.log, { y: Y + 0.45, x: 1.2, z: 1.6 }), cyl(0.07, 1.3, P.log, { y: Y + 0.5, x: 0.55, z: 2.0, seg: 8 }), cyl(0.07, 1.3, P.log, { y: Y + 0.5, x: 1.85, z: 2.0, seg: 8 }), prism(1.9, 1.2, 0.6, "#4a3b30", { y: Y + 1.8, x: 1.2, z: 1.6 }));
    k.push(pine(3.2, { x: 3.4, z: -1.8, y: Y }), pine(2.4, { x: 3.6, z: 1.6, y: Y }), pine(2.8, { x: -3.6, z: 2.0, y: Y }), fence(3, WOOD, { x: -2.2, z: 2.8, y: Y }));
    return grp(k);
  }
  const morava = style === "morava", w = o.wall ?? (morava ? CREAM : "#f4f1e8"), roof = o.roof ?? (morava ? P.lead : P.tile), dm = o.dome ?? (morava ? P.lead : P.verdigris), nd = o.domes ?? (morava ? 5 : 1);
  const stripe = (bw, bd, h, x, z) => { for (let i = 0; i < Math.floor(h / 0.42); i++) k.push(box(bw + 0.03, bd + 0.03, 0.14, P.brick, { x, z, y: Y + 0.5 + i * 0.42, sharp: true })); };
  k.push(lawn(8.2, 6, {}), box(3.2, 5.2, 3.0, w, { y: Y, z: -0.2 }), cyl(1.6, 3.0, w, { y: Y, z: -2.8, seg: 24 }), morava ? [cyl(1.35, 2.7, w, { y: Y, x: 1.75, z: -0.9, seg: 24 }), cyl(1.35, 2.7, w, { y: Y, x: -1.75, z: -0.9, seg: 24 })] : null);
  if (morava) { stripe(3.2, 5.2, 2.8, 0, -0.2); [[1.75, -0.9], [-1.75, -0.9]].forEach(([x, z]) => { const h = dome(1.4, roof, { x, z, y: Y + 2.7 }); h.scale.y = 0.55; k.push(h); }); }
  k.push(vault(1.72, 5.4, roof, { y: Y + 3.0, z: -0.2 })); { const h = dome(1.66, roof, { z: -2.8, y: Y + 3.0 }); h.scale.y = 0.6; k.push(h); }
  k.push(drum(morava ? 0.95 : 1.05, morava ? 2.3 : 1.5, w, dm, { y: Y + 3.9, z: -0.9 }));
  if (nd >= 5) [[1.05, 1.0], [-1.05, 1.0], [1.05, -2.3], [-1.05, -2.3]].forEach(([x, z]) => k.push(drum(0.42, 1.0, w, dm, { x, z, y: Y + 3.9 })));
  if (!morava && o.tower !== false) { const tc = o.cap ?? "#3f4a55"; k.push(box(1.9, 1.9, 5.6, S(w, 0.01), { y: Y, z: 2.5 }), arch(0.7, 1.2, DOOR, { y: Y + 4.0, z: 3.46 }), arch(0.7, 1.2, DOOR, { y: Y + 4.0, x: 0.96, z: 2.5, ry: PI / 2 }), box(2.1, 2.1, 0.2, S(w, -0.06), { y: Y + 5.6, z: 2.5 }), dome(0.95, tc, { y: Y + 5.8, z: 2.5 }), cyl(0.3, 0.7, tc, { y: Y + 6.6, z: 2.5, seg: 12 }), cone(0.36, 0.8, tc, { y: Y + 7.3, z: 2.5, seg: 12 }), cross({ y: Y + 8.1, z: 2.5 }, 0.9)); }
  k.push(arch(0.9, 1.7, DOOR, { y: Y, z: morava ? 2.41 : 3.46 }), ...greens(seed, [[-3.4, 2.2], [3.5, 1.6], [3.3, -2.2]]));
  return grp(k);
}
function monastery(c, style, o = {}) {
  const seed = o.seed ?? 0, w = o.wall ?? (style === "red" ? "#b5473a" : style === "white-marble" ? "#f1eee6" : style === "stone" ? "#d9d2c2" : "#e9e2d2"), roof = o.roof ?? P.lead, k = [ground()];
  if (style === "walled") { // church inside a ring of high walls and towers (Manasija)
    const st = "#b9b2a4"; k.push(lawn(8.2, 6, {}));
    [[-3.2, -2.2, 3.6], [0, -2.5, 4.2], [3.2, -2.2, 3.4], [-3.4, 1.8, 3.2], [3.4, 1.8, 3.8], [0, 2.4, 4.6]].forEach(([x, z, h], i) => k.push(towerSq(1.15, h, i % 2 ? S(st, 0.03) : st, "cren", { x, z, y: Y })));
    k.push(wallRun(5.6, 2.3, st, { z: -2.4, y: Y }), wallRun(2.4, 2.3, st, { x: -1.7, z: 2.3, y: Y }), wallRun(2.4, 2.3, st, { x: 1.7, z: 2.3, y: Y }), box(0.5, 3.6, 2.3, st, { x: -3.35, z: -0.2, y: Y, sharp: true }), box(0.5, 3.6, 2.3, st, { x: 3.35, z: -0.2, y: Y, sharp: true }));
    k.push(box(1.7, 2.6, 2.0, "#efe9da", { y: Y, z: -0.2 }), vault(0.9, 2.7, P.lead, { y: Y + 2.0, z: -0.2 }), drum(0.6, 1.3, "#efe9da", P.lead, { y: Y + 2.5, z: -0.3 }), arch(0.8, 1.5, DOOR, { y: Y, z: 2.96 }));
    return grp(k);
  }
  k.push(lawn(8.2, 6, {}), box(2.6, 4.2, 2.6, w, { y: Y, x: -1.0, z: -0.2 }), cyl(1.3, 2.6, w, { y: Y, x: -1.0, z: -2.3, seg: 24 }), vault(1.4, 4.4, roof, { y: Y + 2.6, x: -1.0, z: -0.2 }));
  { const h = dome(1.36, roof, { x: -1.0, z: -2.3, y: Y + 2.6 }); h.scale.y = 0.6; k.push(h); }
  k.push(drum(0.95, style === "red" ? 1.9 : 1.5, w, roof, { x: -1.0, y: Y + 3.3, z: -0.7 }), arch(0.8, 1.5, style === "white-marble" ? "#5a4a3a" : DOOR, { y: Y, x: -1.0, z: 1.91 }));
  if (style === "red") k.push(box(2.0, 1.4, 2.0, w, { y: Y, x: -1.0, z: 2.5 }), prism(2.2, 1.6, 0.7, roof, { ridge: "z", y: Y + 2.0, x: -1.0, z: 2.5 }), drum(0.4, 0.8, w, roof, { x: -2.3, y: Y + 2.6, z: 0.6 }), drum(0.4, 0.8, w, roof, { x: 0.3, y: Y + 2.6, z: 0.6 }));
  // konak with a wooden gallery, bell tower, low wall
  k.push(box(2.6, 1.7, 1.2, "#e8e1d0", { y: Y, x: 2.6, z: -1.6 }), box(2.6, 1.9, 1.0, P.log, { y: Y + 1.2, x: 2.6, z: -1.5 }), pyramid(3.2, 2.5, 0.9, P.tile, { y: Y + 2.2, x: 2.6, z: -1.5 }), windowGrid(4, 1, 2.3, 0.8, { y: Y + 1.3, x: 2.6, z: -0.54, color: "#3a2a1e", sill: false }));
  k.push(towerSq(1.0, 3.2, S(w, 0.04), "pyr", { x: 3.0, z: 1.7, y: Y }, roof), wallRun(3.0, 0.9, P.rock, { x: 0.4, z: 2.9, y: Y }), ...greens(seed, [[-3.6, 2.3], [-3.5, -2.4], [1.2, 1.2]]));
  return grp(k);
}
function cathedral(c, style, o = {}) {
  const seed = o.seed ?? 0, w = o.wall ?? P.yellow, roof = o.roof ?? P.tile, sp = o.spire ?? "#4f6a6a", two = style === "two-spires", k = [ground()];
  k.push(steps(3, 4.6, 0.3, 0.1, STONE, { z: 2.3, y: Y }), box(3.6, 5.2, 3.6, w, { y: Y, z: -0.6 }), prism(3.6, 5.4, 1.9, roof, { ridge: "z", y: Y + 3.6, z: -0.6 }), cyl(1.5, 3.2, w, { y: Y, z: -3.2, seg: 6 }), cone(1.6, 1.4, roof, { y: Y + 3.2, z: -3.2, seg: 6 }));
  for (let i = 0; i < 4; i++) k.push(arch(0.5, 1.9, DARK, { y: Y + 0.9, x: 1.81, z: -2.4 + i * 1.2, ry: PI / 2, depth: 0.05 }), box(0.3, 0.5, 2.9, S(w, -0.05), { y: Y, x: 1.95, z: -3.0 + i * 1.2 }));
  const spire = (x, h) => k.push(box(1.5, 1.5, h, S(w, 0.02), { y: Y, x, z: 1.9 }), arch(0.5, 1.1, DARK, { y: Y + h - 1.6, x, z: 2.66, depth: 0.05 }), arch(0.5, 1.1, DARK, { y: Y + h - 1.6, x: x + 0.76, z: 1.9, ry: PI / 2, depth: 0.05 }), clockFace(0.42, { y: Y + h - 2.9, x, z: 2.67 }), box(1.7, 1.7, 0.18, S(w, -0.07), { y: Y + h, x, z: 1.9 }), pyramid(1.55, 1.55, o.spireH ?? 3.4, sp, { y: Y + h + 0.18, x, z: 1.9 }), cross({ y: Y + h + 0.18 + (o.spireH ?? 3.4), x, z: 1.9 }, 0.8));
  if (two) { spire(-1.15, 5.4); spire(1.15, 5.4); k.push(box(0.9, 1.3, 4.4, w, { y: Y, z: 1.9 }), prism(0.9, 1.4, 0.8, roof, { ridge: "z", y: Y + 4.4, z: 1.9 })); } else spire(0, 6.2);
  k.push(arch(1.0, 1.9, DOOR, { y: Y + 0.3, z: 2.67 }), cyl(0.5, 0.06, GLASS, { rx: PI / 2, y: Y + 3.4, z: 2.68 }), torus(0.5, 0.07, CREAM, { y: Y + 3.9, z: 2.7 }), ...greens(seed, [[-3.5, 2.2], [3.6, 2.0], [-3.4, -2.2]]));
  return grp(k);
}
function mosque(c, style, o = {}) {
  const seed = o.seed ?? 0, w = o.wall ?? "#efe9dc", k = [ground(), lawn(8.2, 6, {})];
  k.push(box(4.0, 4.0, 3.0, w, { y: Y, x: -0.6, z: -0.6 }), cyl(2.0, 0.9, w, { y: Y + 3.0, x: -0.6, z: -0.6, seg: 8 }), dome(2.0, P.lead, { y: Y + 3.9, x: -0.6, z: -0.6 }), cyl(0.05, 0.6, GOLD, { y: Y + 5.9, x: -0.6, z: -0.6, seg: 8 }), sphere(0.1, GOLD, { y: Y + 6.4, x: -0.6, z: -0.6 }));
  k.push(box(4.2, 1.4, 0.12, w, { y: Y + 2.2, x: -0.6, z: 2.1 }), colonnade(4, 1.25, 0.14, 2.2, CREAM, { y: Y, x: -0.6, z: 2.6 }));
  [-1.85, -0.6, 0.65].forEach((x) => { const h = dome(0.6, P.lead, { x, z: 2.1, y: Y + 2.32 }); h.scale.y = 0.7; k.push(h); });
  k.push(arch(0.9, 1.7, DOOR, { y: Y, x: -0.6, z: 1.41 }), windowGrid(2, 2, 2.6, 2.2, { y: Y + 0.5, x: 1.41, z: -0.6, ry: PI / 2, sill: false }));
  // minaret
  k.push(cyl(0.42, 6.4, w, { y: Y, x: 2.3, z: 0.6, seg: 16 }), cyl(0.62, 0.28, S(w, -0.07), { y: Y + 5.0, x: 2.3, z: 0.6, seg: 16 }), cyl(0.36, 1.0, w, { y: Y + 6.4, x: 2.3, z: 0.6, seg: 16 }), cone(0.46, 1.7, P.lead, { y: Y + 7.4, x: 2.3, z: 0.6, seg: 16 }), sphere(0.08, GOLD, { y: Y + 9.1, x: 2.3, z: 0.6 }));
  k.push(...greens(seed, [[-3.6, 2.4], [3.6, -2.2]]), cypress(3.0, "#4b6b4c", { x: 3.6, z: 2.4, y: Y }));
  return grp(k);
}

// ---------------------------------------------------------------- strongholds, towers, civic pride
function fortress(c, style, o = {}) {
  const seed = o.seed ?? 0, st = o.wall ?? "#c2b8a3", k = [];
  if (style === "river") { // towers of uneven height along the water (Smederevo, Golubac)
    k.push(ground(P.grass), pond(8.6, 2.2, { z: 2.1 }), box(8.6, 0.3, 0.1, P.sand, { y: Y, z: 0.95, sharp: true }));
    const n = o.towers ?? 6; for (let i = 0; i < n; i++) { const x = -3.4 + (6.8 / (n - 1)) * i, h = 2.6 + R(seed, i) * 2.6 + (o.rise ? i * 0.5 : 0); k.push(towerSq(1.0 + R(seed, i + 3) * 0.3, h, i % 2 ? S(st, 0.03) : st, "cren", { x, z: 0.2 - (o.rise ? i * 0.35 : 0), y: Y })); }
    k.push(wallRun(7.0, 1.9, st, { z: 0.2, y: Y }), wallRun(5.0, 1.6, S(st, -0.03), { z: -2.2, y: Y }), towerSq(1.2, 3.6, st, "cren", { x: -3.0, z: -2.2, y: Y }), towerSq(1.2, 4.4, st, "cren", { x: 3.0, z: -2.2, y: Y }), boat("#8a6a3a", { x: 1.6, z: 2.3, y: Y + 0.02 }));
    if (o.rise) k.push(hill(3.6, 2.2, P.rockD, { x: 2.6, z: -2.6, y: Y }));
    return grp(k);
  }
  if (style === "hill" || style === "keep") {
    k.push(ground(P.grass), hill(3.9, style === "keep" ? 2.0 : 2.6, o.hill ?? "#a9b592", { y: Y, z: -0.3, sz: 0.72 }));
    const top = Y + (style === "keep" ? 1.9 : 2.5);
    if (style === "keep") k.push(towerSq(1.9, 4.6, st, "cren", { y: top - 0.1, z: -0.3 }), box(0.5, 0.05, 0.8, DARK, { y: top + 1.2, z: 0.66, sharp: true }), wallRun(3.4, 0.9, st, { y: top - 0.25, z: 0.8 }), flagMast(1.3, [RED, BLUE, WHITE], { y: top + 4.9, z: -0.3 }));
    else k.push(towerSq(1.1, 2.8, st, "cren", { x: -1.9, y: top - 0.5, z: -0.2 }), towerSq(1.3, 3.8, S(st, 0.03), "cren", { x: 0, y: top - 0.15, z: -0.5 }), towerSq(1.1, 2.6, st, "cren", { x: 1.9, y: top - 0.5, z: -0.2 }), wallRun(4.0, 1.3, st, { y: top - 0.2, z: 0.3 }), wallRun(3.6, 1.2, S(st, -0.04), { y: top - 0.3, z: -1.2 }));
    k.push(pine(2.2, { x: -3.5, z: 2.3, y: Y }), pine(2.8, { x: 3.4, z: 2.1, y: Y }), pine(1.9, { x: 2.3, z: 2.6, y: Y }));
    if (o.river) k.push(pond(8.6, 1.3, { z: 2.55 }));
    return grp(k);
  }
  // gate: one gate tower with its arch between crenellated walls (Stambol kapija, Kalemegdan)
  k.push(ground(), lawn(8.2, 2.4, { z: -1.9 }), box(2.2, 6.4, 0.07, P.sand, { y: Y, sharp: true }));
  k.push(box(3.0, 1.9, 4.2, st, { y: Y, z: -0.3 }), arch(1.5, 2.6, "#2f2a26", { y: Y, z: 0.66, depth: 0.1 }), box(3.2, 2.1, 0.2, S(st, -0.06), { y: Y + 4.2, z: -0.3 }), crenels(3.0, st, { y: Y + 4.4, z: 0.6 }), crenels(3.0, st, { y: Y + 4.4, z: -1.2 }), box(1.4, 0.06, 0.5, CREAM, { y: Y + 3.1, z: 0.67, sharp: true }));
  k.push(wallRun(2.7, 2.6, S(st, 0.02), { x: -2.85, z: -0.3, y: Y }), wallRun(2.7, 2.6, S(st, 0.02), { x: 2.85, z: -0.3, y: Y }), o.clock ? [box(1.4, 1.4, 2.4, S(st, 0.04), { y: Y + 4.4, z: -0.3 }), clockFace(0.5, { y: Y + 5.0, z: 0.41 }), pyramid(1.6, 1.6, 1.4, P.lead, { y: Y + 6.8, z: -0.3 })] : flagMast(1.4, [RED, BLUE, WHITE], { y: Y + 4.4, x: 0.9, z: -0.3 }));
  k.push(...greens(seed, [[-3.4, 2.3], [3.4, 2.3], [-3.2, -2.3], [3.3, -2.2]]), lamp({ x: -1.6, z: 2.4, y: Y }), lamp({ x: 1.6, z: 2.4, y: Y }));
  return grp(k);
}
function tower(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [];
  if (style === "tv") { // slender concrete shaft on three legs, pod and a red-white antenna (Avala)
    k.push(ground(P.grass), hill(4.0, 1.0, P.grassD, { y: Y, sz: 0.7 }), ...[0, 1, 2].map((i) => { const a = (i / 3) * PI * 2 + 0.5; return rod([Math.sin(a) * 1.5, Y + 0.7, Math.cos(a) * 1.5], [0, Y + 2.9, 0], 0.16, P.concrete); }));
    k.push(cyl(0.3, 7.6, P.concrete, { y: Y + 1.3, seg: 3, rTop: 0.2 }), cyl(0.62, 0.9, "#d7d5cf", { y: Y + 6.5, seg: 24, rTop: 0.7 }), cyl(0.7, 0.12, DARK, { y: Y + 6.95, seg: 24 }), cyl(0.5, 0.3, P.concrete, { y: Y + 7.4, seg: 24, rTop: 0.2 }));
    for (let i = 0; i < 5; i++) k.push(cyl(0.07, 0.42, i % 2 ? WHITE : RED, { y: Y + 8.9 + i * 0.42, seg: 8 }));
    k.push(pine(2.3, { x: -3.2, z: 1.9, y: Y }), pine(2.9, { x: 3.2, z: 1.2, y: Y }), pine(2.0, { x: 2.4, z: -2.3, y: Y }), pine(2.5, { x: -2.6, z: -2.2, y: Y }));
    return grp(k);
  }
  if (style === "water") {
    const w = o.wall ?? "#e9e2d2"; k.push(ground(), lawn(8.2, 6, {}), cyl(0.9, 4.6, w, { y: Y, seg: 8, rTop: 0.75 }), cyl(1.7, 1.9, S(w, -0.03), { y: Y + 4.6, seg: 8, rTop: 1.8 }), cone(1.95, 1.5, o.roof ?? P.tile, { y: Y + 6.5, seg: 8 }), sphere(0.12, GOLD, { y: Y + 8.0 }), door(0.7, 1.3, DOOR, { y: Y, z: 0.86 }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + PI / 8; k.push(box(0.4, 0.06, 0.8, DARK, { x: Math.sin(a) * 1.66, z: Math.cos(a) * 1.66, y: Y + 5.2, ry: a, sharp: true })); }
    k.push(...greens(seed, [[-3.3, 2.0], [3.3, 2.0], [3.0, -2.2], [-3.0, -2.2]]), bench(1.2, { x: 1.9, z: 2.4, y: Y }));
    return grp(k);
  }
  if (style === "lookout") { // round brick tower with a gallery and a conical cap (Gardoš)
    const w = o.wall ?? "#b46a4e"; k.push(ground(P.grass), hill(3.8, 1.2, P.grassD, { y: Y, sz: 0.75 }), cyl(1.9, 0.9, P.rock, { y: Y + 0.9, seg: 24 }), cyl(1.25, 4.6, w, { y: Y + 1.8, seg: 24 }), cyl(1.6, 0.2, CREAM, { y: Y + 6.4, seg: 24 }), torus(1.55, 0.04, DARK, { rx: PI / 2, y: Y + 6.95 }), cyl(0.95, 1.0, w, { y: Y + 6.6, seg: 24 }), cone(1.25, 1.9, o.roof ?? "#7a3d2c", { y: Y + 7.6, seg: 24 }), sphere(0.1, GOLD, { y: Y + 9.5 }));
    [[-0.6, 0], [0.6, 0]].forEach(([x]) => k.push(arch(0.4, 1.0, DARK, { y: Y + 4.4, x, z: 1.1, depth: 0.2 }))); k.push(arch(0.6, 1.2, DOOR, { y: Y + 1.8, z: 1.16, depth: 0.12 }), ...[-0.6, 0, 0.6].map((x) => cyl(0.35, 1.2, w, { y: Y + 1.4, x: x * 2.6, z: 0.9 - Math.abs(x) * 1.2, seg: 12 })), ...greens(seed, [[-3.6, 2.2], [3.6, 2.0]]));
    return grp(k);
  }
  if (style === "skull") { // the memorial chapel that houses the tower (Ćele kula)
    const w = o.wall ?? "#efe6d2"; k.push(ground(), lawn(8.2, 6, {}), box(2.4, 6.4, 0.07, P.sand, { y: Y, sharp: true }), steps(3, 3.4, 0.3, 0.1, STONE, { z: 1.9, y: Y }), box(4.0, 4.0, 3.3, w, { y: Y + 0.3, z: -0.2 }));
    [[0, 1.81, 0], [2.01, -0.2, PI / 2], [-2.01, -0.2, -PI / 2]].forEach(([x, z, ry]) => k.push(arch(1.5, 2.6, "#3a332c", { y: Y + 0.3, x, z, ry, depth: 0.06 })));
    k.push(box(1.0, 1.0, 2.3, "#8f8370", { y: Y + 0.3, z: -0.2 }), box(4.4, 4.4, 0.25, S(w, -0.06), { y: Y + 3.6, z: -0.2 }), cyl(1.5, 0.8, w, { y: Y + 3.85, z: -0.2, seg: 8 }), dome(1.5, P.lead, { y: Y + 4.65, z: -0.2 }), cross({ y: Y + 6.1, z: -0.2 }, 1), ...[[1.7, 1.5], [-1.7, 1.5], [1.7, -1.9], [-1.7, -1.9]].map(([x, z]) => pyramid(0.8, 0.8, 0.7, P.lead, { x, z, y: Y + 3.85 })));
    k.push(...greens(seed, [[-3.5, 2.2], [3.5, 2.2], [-3.4, -2.2], [3.4, -2.2]]));
    return grp(k);
  }
  if (style === "lighthouse") { // a pair of brick lighthouses either side of a river mouth (Pančevo)
    const w = o.wall ?? "#c79a5a"; k.push(ground(P.grass), pond(2.6, 6.4, {}), box(0.14, 6.4, 0.07, P.sand, { y: Y, x: 1.37, sharp: true }), box(0.14, 6.4, 0.07, P.sand, { y: Y, x: -1.37, sharp: true }));
    [-2.6, 2.6].forEach((x, i) => k.push(cyl(0.9, 0.5, P.rock, { x, z: 0.6, y: Y, seg: 16 }), cyl(0.6, 4.2 - i * 0.5, w, { x, z: 0.6, y: Y + 0.5, seg: 16, rTop: 0.45 }), cyl(0.7, 0.14, "#efe6d2", { x, z: 0.6, y: Y + 4.7 - i * 0.5, seg: 16 }), cyl(0.36, 0.6, GLASS, { x, z: 0.6, y: Y + 4.84 - i * 0.5, seg: 12 }), cone(0.5, 0.6, "#3f4a55", { x, z: 0.6, y: Y + 5.44 - i * 0.5, seg: 12 }), sphere(0.07, GOLD, { x, z: 0.6, y: Y + 6.0 - i * 0.5 }), box(0.2, 0.05, 0.5, DARK, { x, z: 1.2, y: Y + 2.2, sharp: true })));
    k.push(boat("#8a6a3a", { x: 0.1, z: 1.4, y: Y + 0.03, ry: PI / 2 }), boat(WHITE, { x: -0.2, z: -1.6, y: Y + 0.03, ry: PI / 2 }, 1.3), ...greens(seed, [[-3.6, -2.2], [3.6, -2.3], [-3.5, 2.6], [3.5, 2.6]]));
    return grp(k);
  }
  // clock: a white baroque clock tower on a bastion wall (Petrovaradin)
  const w = o.wall ?? "#f1ede2", cap = o.roof ?? "#4a4f57";
  k.push(ground(P.grass), box(8.0, 3.4, 1.5, "#b9a98f", { y: Y, z: -0.6 }), crenels(8.0, "#b9a98f", { y: Y + 1.5, z: 1.0 }), box(8.0, 3.2, 0.06, P.grass, { y: Y + 1.5, z: -0.7, sharp: true }));
  k.push(box(1.9, 1.9, 4.8, w, { y: Y + 1.5, z: -0.5 }), box(2.1, 2.1, 0.2, S(w, -0.07), { y: Y + 6.3, z: -0.5 }), clockFace(0.78, { y: Y + 4.5, z: 0.46 }), clockFace(0.78, { y: Y + 4.5, x: 0.96, z: -0.5, ry: PI / 2 }), arch(0.5, 1.0, DARK, { y: Y + 2.6, z: 0.46, depth: 0.05 }), door(0.7, 1.2, DOOR, { y: Y + 1.5, z: 0.46 }));
  k.push(dome(1.05, cap, { y: Y + 6.5, z: -0.5 }), cyl(0.38, 0.8, w, { y: Y + 7.3, z: -0.5, seg: 8 }), cone(0.5, 1.3, cap, { y: Y + 8.1, z: -0.5, seg: 8 }), sphere(0.09, GOLD, { y: Y + 9.4, z: -0.5 }), box(2.2, 1.4, 1.3, "#e6dcc6", { y: Y + 1.5, x: -2.6, z: -0.8 }), pitchedRoof(2.2, 1.4, 0.7, P.tile, { y: Y + 2.8, x: -2.6, z: -0.8 }), o.river !== false ? pond(8.6, 1.4, { z: 2.5 }) : null, ...greens(seed, [[2.9, -0.9], [3.6, -1.6]]).map((t) => { t.position.y = Y + 1.5; return t; }));
  return grp(k);
}
function cityhall(c, style, o = {}) {
  const seed = o.seed ?? 0, w = o.wall ?? (style === "baroque" ? P.yellow : "#efe6d0"), roof = o.roof ?? (style === "baroque" ? P.tile : "#9c4a3a"), k = [ground()];
  if (style === "baroque") { // wide two-storey seat with a central clock turret and two corner turrets (Sombor, Zrenjanin)
    k.push(block(7.6, 3.4, 3.2, w, { y: Y, z: -0.6, front: { cols: 7, rows: 2, w: 7.0 }, side: { cols: 3, rows: 2 } }), pyramid(8.0, 3.8, 1.5, roof, { y: Y + 3.2, z: -0.6 }), box(2.2, 3.8, 3.9, S(w, 0.02), { y: Y, z: -0.5 }), prism(2.2, 3.9, 0.9, S(w, -0.02), { ridge: "z", y: Y + 3.9, z: -0.5 }));
    k.push(box(1.2, 1.2, 1.5, S(w, 0.03), { y: Y + 4.4, z: -0.5 }), clockFace(0.42, { y: Y + 4.7, z: 0.11 }), dome(0.75, o.cap ?? P.verdigris, { y: Y + 5.9, z: -0.5 }), cyl(0.2, 0.5, o.cap ?? P.verdigris, { y: Y + 6.5, z: -0.5, seg: 8 }), cone(0.26, 0.8, o.cap ?? P.verdigris, { y: Y + 7.0, z: -0.5, seg: 8 }), flagMast(0.9, [RED, BLUE, WHITE], { y: Y + 7.7, z: -0.5 }));
    [-3.5, 3.5].forEach((x) => k.push(box(1.1, 1.1, 3.9, S(w, 0.02), { x, y: Y, z: 0.9 }), cone(0.85, 1.5, o.cap ?? P.verdigris, { x, y: Y + 3.9, z: 0.9, seg: 4, ry: PI / 4 })));
    k.push(colonnade(4, 0.6, 0.12, 1.6, CREAM, { y: Y, z: 1.6 }), box(2.4, 0.5, 0.16, CREAM, { y: Y + 1.6, z: 1.6 }), door(1.0, 1.5, DOOR, { y: Y, z: 1.41 }), ...greens(seed, [[-3.7, 2.6], [3.7, 2.6]]), bench(1.1, { x: -2.0, z: 2.6, y: Y }), lamp({ x: 2.0, z: 2.6, y: Y }));
    return grp(k);
  }
  // central-tower: Art Nouveau town hall, steep patterned roofs and a tall tower with a green spire (Subotica)
  k.push(block(7.0, 3.6, 3.0, w, { y: Y, z: -0.6, front: { cols: 7, rows: 2, w: 6.4 }, side: { cols: 3, rows: 2 }, pane: "#5a3b33" }), prism(7.4, 4.0, 2.0, roof, { y: Y + 3.0, z: -0.6 }));
  for (let i = 0; i < 6; i++) k.push(box(7.42, 0.1, 0.07, i % 2 ? "#3f6f5a" : "#e0b25a", { y: Y + 3.35 + i * 0.26, z: 1.25 - i * 0.29, rx: 0, sharp: true }));
  [-2.6, 2.6].forEach((x) => k.push(box(1.5, 0.4, 3.9, S(w, 0.02), { x, y: Y, z: 1.2 }), prism(1.5, 0.5, 1.3, roof, { ridge: "z", x, y: Y + 3.9, z: 1.2 }), sphere(0.09, GOLD, { x, y: Y + 5.2, z: 1.2 })));
  k.push(box(1.7, 1.7, 6.4, S(w, 0.02), { y: Y, z: 0.4 }), box(1.95, 1.95, 0.25, "#9c4a3a", { y: Y + 5.0, z: 0.4 }), clockFace(0.5, { y: Y + 5.5, z: 1.26 }), clockFace(0.5, { y: Y + 5.5, x: 0.86, z: 0.4, ry: PI / 2 }), torus(1.0, 0.04, DARK, { rx: PI / 2, y: Y + 6.7, z: 0.4 }), box(1.9, 1.9, 0.14, S(w, -0.08), { y: Y + 6.4, z: 0.4 }));
  k.push(pyramid(1.5, 1.5, 1.3, "#3f6f5a", { y: Y + 6.54, z: 0.4 }), cyl(0.3, 0.7, "#3f6f5a", { y: Y + 7.5, z: 0.4, seg: 8 }), cone(0.36, 1.9, "#3f6f5a", { y: Y + 8.2, z: 0.4, seg: 8 }), sphere(0.1, GOLD, { y: Y + 10.1, z: 0.4 }), arch(0.9, 1.6, DOOR, { y: Y, z: 1.26 }));
  k.push(disc(0.9, P.water, { x: 2.6, z: 2.5 }), cyl(1.0, 0.18, STONE, { y: Y, x: 2.6, z: 2.5, seg: 32 }), cyl(0.12, 0.6, P.verdigris, { y: Y, x: 2.6, z: 2.5, seg: 12 }), ...greens(seed, [[-3.6, 2.5]]), lamp({ x: -1.6, z: 2.6, y: Y }));
  return grp(k);
}
function palace(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(), lawn(8.2, 6, {})];
  if (style === "konak") { // Balkan town house: white walls, dark timber bay on brackets, wide hip roof
    const w = "#f3efe4"; k.push(box(5.2, 3.4, 1.4, P.rock, { y: Y, z: -0.4 }), box(5.4, 3.6, 1.9, w, { y: Y + 1.4, z: -0.4 }), pyramid(6.6, 4.8, 1.6, P.tile, { y: Y + 3.3, z: -0.4 }), box(0.5, 0.5, 0.9, w, { y: Y + 4.2, x: 1.6, z: -0.8 }), box(0.7, 0.7, 0.12, P.tile, { y: Y + 5.1, x: 1.6, z: -0.8 }));
    k.push(box(2.2, 1.0, 1.7, w, { y: Y + 1.5, z: 1.6 }), ...[-0.9, 0, 0.9].map((x) => rod([x, Y + 0.9, 1.45], [x, Y + 1.5, 2.0], 0.06, P.log)), windowGrid(3, 1, 2.0, 1.3, { y: Y + 1.8, z: 2.11, color: "#3a2a1e", frame: P.log, sill: false }), windowGrid(2, 1, 1.4, 1.3, { y: Y + 1.8, x: -1.9, z: 1.41, color: "#3a2a1e", frame: P.log, sill: false }), windowGrid(2, 1, 1.4, 1.3, { y: Y + 1.8, x: 1.9, z: 1.41, color: "#3a2a1e", frame: P.log, sill: false }));
    k.push(door(0.9, 1.2, "#3a2a1e", { y: Y, x: -1.5, z: 1.31, frame: P.log }), windowGrid(3, 1, 3.0, 1.3, { y: Y + 1.8, x: 2.71, z: -0.4, ry: PI / 2, color: "#3a2a1e", frame: P.log, sill: false }), wallRun(2.6, 0.8, P.rock, { x: -2.9, z: 2.8, y: Y }), ...greens(seed, [[3.5, 2.3], [-3.6, -2.2], [3.5, -2.3]]));
    return grp(k);
  }
  const w = o.wall ?? (style === "castle" ? P.yellow : "#f1ebdc"), roof = o.roof ?? (style === "castle" ? "#5b5f68" : P.tile);
  k.push(box(2.2, 6.4, 0.07, P.sand, { y: Y, sharp: true }), block(6.2, 3.2, 3.0, w, { y: Y, z: -0.8, front: { cols: 6, rows: 2, w: 5.6 }, side: { cols: 3, rows: 2 } }), pyramid(6.6, 3.6, 1.4, roof, { y: Y + 3.0, z: -0.8 }));
  if (style === "castle") { [[-3.1, 0.8], [3.1, 0.8], [-3.1, -2.4], [3.1, -2.4]].forEach(([x, z], i) => k.push(cyl(0.75, 3.9 + (i < 2 ? 0.6 : 0), S(w, 0.02), { x, z, y: Y, seg: 16 }), cone(0.95, 1.8, roof, { x, z, y: Y + 3.9 + (i < 2 ? 0.6 : 0), seg: 16 }), sphere(0.07, GOLD, { x, z, y: Y + 5.7 + (i < 2 ? 0.6 : 0) }))); k.push(box(1.8, 1.0, 4.2, S(w, 0.02), { y: Y, z: 0.9 }), crenels(1.8, w, { y: Y + 4.2, z: 1.3 }), arch(0.9, 1.6, DOOR, { y: Y, z: 1.41 }), flagMast(1.2, [RED, BLUE, WHITE], { y: Y + 4.2, z: 0.9 })); }
  else k.push(steps(3, 3.4, 0.3, 0.1, STONE, { z: 1.5, y: Y }), colonnade(4, 0.85, 0.16, 2.5, CREAM, { y: Y + 0.3, z: 1.2 }), box(3.2, 1.0, 0.25, CREAM, { y: Y + 2.8, z: 1.0 }), prism(3.2, 1.0, 0.8, S(CREAM, -0.03), { ridge: "z", y: Y + 3.05, z: 1.0 }), door(1.0, 1.7, DOOR, { y: Y + 0.3, z: 0.81 }));
  k.push(...greens(seed, [[-3.7, 2.5], [3.7, 2.5], [-2.2, 2.7], [2.2, 2.7]]));
  return grp(k);
}
function monument(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground()], br = o.metal ?? P.bronze, cn = "#e9e7e1";
  const plinth = (h = 1.6, w = 1.5) => [steps(3, w + 1.6, 0.35, 0.12, STONE, { z: (w + 0.2) / 2, y: Y }), box(w + 1.6, w + 0.2, 0.36, STONE, { y: Y, sharp: true }), box(w, w, h, "#d9d3c5", { y: Y + 0.36 }), box(w + 0.2, w + 0.2, 0.16, "#cfc8b8", { y: Y + 0.36 + h })];
  if (style === "column-figure") { // a bronze figure on a tall column over the rivers (Pobednik)
    k.push(lawn(8.2, 6, {}), ...plinth(1.2, 1.7), cyl(0.5, 5.2, "#e4dfd2", { y: Y + 1.72, seg: 20, rTop: 0.42 }), box(1.1, 1.1, 0.2, "#d9d3c5", { y: Y + 6.92 }), sphere(0.42, "#cfc8b8", { y: Y + 7.0, sy: 0.5 }), person(br, 1.0, { y: Y + 7.3 }), rod([0.26, Y + 8.3, 0.1], [0.5, Y + 7.3, 0.25], 0.03, br), rod([-0.24, Y + 8.6, 0], [-0.55, Y + 8.9, 0.1], 0.07, br), sphere(0.1, br, { x: -0.6, y: Y + 8.85, z: 0.1 }));
    k.push(wallRun(8.0, 0.8, "#c2b8a3", { z: -2.6, y: Y }), ...greens(seed, [[-3.5, 1.9], [3.5, 1.9]]), bench(1.1, { x: 2.2, z: 2.4, y: Y }));
    return grp(k);
  }
  if (style === "wings") { // two white concrete wings in a broken V (Šumarice)
    const wing = (flip) => shape2d([[0, 0], [1.1, 0], [3.3, 5.6], [2.7, 6.6], [1.9, 5.1], [1.5, 3.2], [0.4, 1.6]].map(([x, y]) => [flip ? -x : x, y]), 0.5, cn, { y: Y + 0.1, x: flip ? -0.25 : 0.25, bevel: 0.03 });
    k.push(ground(P.grass), hill(4.0, 0.6, P.grassD, { y: Y, sz: 0.7 }), wing(false), wing(true), box(2.4, 2.0, 0.12, STONE, { y: Y + 0.3, z: 1.4 }), pine(2.6, { x: -3.5, z: -2.0, y: Y }), pine(2.0, { x: 3.6, z: -2.2, y: Y }), tree(1.8, GREEN, { x: 3.4, z: 2.2, y: Y }));
    return grp(k);
  }
  if (style === "shards") { // a field of white concrete blades, the tallest pierced (Kadinjača, Kosmaj)
    k.push(ground(P.grass), hill(4.0, 0.7, P.grassD, { y: Y, sz: 0.72 }));
    if (o.star) for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; const s = shape2d([[0, 0], [0.9, 0], [0.5, 6.2], [0.2, 6.6]], 0.55, cn, { y: Y + 0.3, bevel: 0.03 }); s.position.set(Math.sin(a) * 1.25, Y + 0.3, Math.cos(a) * 1.25); s.rotation.y = a + PI / 2; s.rotation.z = 0; s.rotateX(0); s.lookAt(0, Y + 30, 0); s.rotation.set(0, a - PI / 2, 0.2); k.push(s); }
    else { for (let i = 0; i < 11; i++) { const x = -3.2 + i * 0.64 + (R(seed, i) - 0.5) * 0.2, h = 1.2 + R(seed, i + 20) * 2.2 + (i > 3 && i < 7 ? 2.6 : 0); k.push(box(0.42 + R(seed, i + 3) * 0.2, 0.9 + R(seed, i + 7) * 0.7, h, i % 2 ? cn : S(cn, -0.04), { x, z: (R(seed, i + 40) - 0.5) * 1.4, y: Y + 0.3, ry: (R(seed, i + 50) - 0.5) * 0.5 })); } k.push(sphere(0.34, DARK, { x: -0.02, y: Y + 4.4, z: 0.42, sz: 0.3 })); }
    k.push(pine(2.4, { x: -3.6, z: 2.3, y: Y }), pine(2.0, { x: 3.6, z: 2.2, y: Y }));
    return grp(k);
  }
  if (style === "rings") { // concrete frames with round openings in one line of sight, a pyramid at the end (Popina)
    k.push(ground(P.grass), hill(4.2, 0.6, P.grassD, { y: Y, sz: 0.7 }));
    [[-2.6, 3.4], [-0.9, 2.9], [0.8, 2.4]].forEach(([x, sz]) => { const ring = torus(sz * 0.42, sz * 0.14, cn, { x, y: Y + 0.5 + sz * 0.56, ry: PI / 2 }); k.push(ring, box(0.5, sz * 0.5, 0.5, S(cn, -0.03), { x, y: Y + 0.3 })); });
    k.push(cone(1.1, 1.8, S(cn, -0.02), { x: 2.9, y: Y + 0.4, seg: 4, ry: PI / 4 }), pine(2.4, { x: -3.6, z: 2.3, y: Y }), pine(2.0, { x: 3.6, z: -2.2, y: Y }), pine(2.2, { x: 0.4, z: -2.5, y: Y }));
    return grp(k);
  }
  if (style === "fists") { // three raised concrete fists: man, woman, child (Bubanj)
    k.push(ground(P.grass), lawn(8.2, 6, {}));
    [[-2.2, 0.2, 3.4, 0.8], [0.2, -0.3, 5.2, 1.1], [2.3, 0.5, 2.3, 0.62]].forEach(([x, z, h, s]) => k.push(box(1.0 * s, 1.1 * s, h, cn, { x, z, y: Y }), box(1.7 * s, 1.5 * s, 1.5 * s, S(cn, -0.02), { x, z, y: Y + h }), ...[0, 1, 2, 3].map((i) => box(0.36 * s, 0.5 * s, 0.5 * s, S(cn, -0.05), { x: x - 0.6 * s + i * 0.4 * s, z: z + 0.62 * s, y: Y + h + 0.85 * s })), box(0.5 * s, 0.7 * s, 0.7 * s, S(cn, -0.04), { x: x + 0.95 * s, z: z + 0.2 * s, y: Y + h + 0.3 * s })));
    k.push(pine(2.6, { x: -3.7, z: -2.2, y: Y }), pine(2.2, { x: 3.7, z: -2.3, y: Y }), box(3.6, 0.4, 1.1, S(cn, -0.03), { y: Y, z: 2.3 }));
    return grp(k);
  }
  if (style === "equestrian") {
    k.push(lawn(8.2, 6, {}), ...plinth(2.4, 1.3).map((m) => { m.scale.x = 1.5; return m; }));
    const hy = Y + 2.92; k.push(capsule(0.5, 1.3, br, { y: hy + 1.5, rz: PI / 2 }), ...[[-0.7, 0.25], [-0.7, -0.25], [0.7, 0.25], [0.7, -0.25]].map(([x, z]) => cyl(0.12, 1.15, br, { x, z, y: hy, seg: 10 })), capsule(0.24, 0.8, br, { x: 1.05, y: hy + 2.1, rz: -0.6 }), box(0.7, 0.3, 0.34, br, { x: 1.45, y: hy + 2.45, rz: -0.5 }), rod([-1.1, hy + 1.6, 0], [-1.5, hy + 0.9, 0], 0.06, br), person(br, 0.82, { y: hy + 1.85, x: -0.05 }), rod([0.2, hy + 3.1, 0.2], [0.75, hy + 3.5, 0.3], 0.05, br));
    k.push(...greens(seed, [[-3.5, 2.2], [3.5, 2.2], [-3.4, -2.2], [3.4, -2.2]]), lamp({ x: -2.0, z: 2.5, y: Y }), lamp({ x: 2.0, z: 2.5, y: Y }));
    return grp(k);
  }
  if (style === "pyramid" || style === "chapel") { // memorial ossuary: a stepped mound or a small domed chapel on steps
    k.push(ground(P.grass), lawn(8.2, 6, {}));
    if (style === "pyramid") { for (let i = 0; i < 5; i++) k.push(box(5.0 - i * 0.95, 5.0 - i * 0.95, 0.7, i % 2 ? "#d9d3c5" : "#cfc8b8", { y: Y + i * 0.7 })); k.push(cross({ y: Y + 3.5 }, 1.6), door(0.8, 1.0, DOOR, { y: Y, z: 2.51 })); }
    else k.push(steps(4, 3.6, 0.35, 0.14, STONE, { z: 1.4, y: Y }), box(2.8, 2.8, 2.6, "#efe9dc", { y: Y + 0.56 }), ...[[0, 1.41, 0], [1.41, 0, PI / 2]].map(([x, z, ry]) => arch(1.0, 1.9, DOOR, { y: Y + 0.56, x, z, ry })), box(3.1, 3.1, 0.2, "#d9d3c5", { y: Y + 3.16 }), drum(1.05, 0.9, "#efe9dc", P.lead, { y: Y + 3.36 }));
    k.push(...greens(seed, [[-3.5, 2.2], [3.5, 2.2], [-3.4, -2.2], [3.4, -2.2]]));
    return grp(k);
  }
  if (style === "statue") { k.push(lawn(8.2, 6, {}), ...plinth(2.2, 1.4), person(br, 1.55, { y: Y + 2.72 }), rod([0.3, Y + 4.6, 0.1], [0.75, Y + 5.0, 0.3], 0.07, br), ...greens(seed, [[-3.5, 2.0], [3.5, 2.0], [-3.2, -2.2], [3.2, -2.2]]), bench(1.1, { x: -2.2, z: 2.5, y: Y }), bench(1.1, { x: 2.2, z: 2.5, y: Y })); return grp(k); }
  // obelisk
  k.push(lawn(8.2, 6, {}), ...plinth(1.3, 1.6), cyl(0.62, 5.4, "#e4dfd2", { y: Y + 1.82, seg: 4, rTop: 0.34, ry: PI / 4 }), cone(0.48, 0.7, "#d9d3c5", { y: Y + 7.22, seg: 4, ry: PI / 4 }), torus(0.45, 0.09, "#5f8f4a", { y: Y + 1.2, z: 0.82 }), o.star ? sphere(0.2, RED, { y: Y + 7.9 }) : null, ...greens(seed, [[-3.5, 2.0], [3.5, 2.0], [-3.2, -2.2], [3.2, -2.2]]), lamp({ x: -1.9, z: 2.4, y: Y }), lamp({ x: 1.9, z: 2.4, y: Y }));
  return grp(k);
}
export const PART1 = { church, monastery, cathedral, mosque, fortress, tower, cityhall, palace, monument };
export const H = { P, Y, PI, R, ground, lawn, pond, disc, cross, pine, hill, peak, drum, crenels, towerSq, wallRun, person, boat, haystack, rows, greens, BUILDINGS };
