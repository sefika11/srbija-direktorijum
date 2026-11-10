// Institution buildings. Facade faces +z. Each scene: (hue) => Group.
import * as D from "./dsl.mjs";
const { THREE, box, cyl, cone, sphere, torus, capsule, dome, tube, rod, shape2d, plan, ellipseShape, rrectShape, prism, pitchedRoof, pyramid, vault, colonnade, steps, windowGrid, block, door, arch, flagMast, clockFace, crossSign, sign, books, tree, cypress, wheel, carBody, lamp, bench, fence, grp, S, T,
  CREAM, STONE, DARK, DOOR, GOLD, RED, WOOD, GREEN, GLASS, GREY, WHITE, INK, BLUE, AMBER } = D;

const wall = (c, t = 0.62, b = CREAM) => T(c, t * 0.8, b);
/** classical portico: n columns, entablature, pediment. front at z = zf. returns group */
function portico({ n = 6, sp = 1.0, r = 0.28, h = 2.6, color = CREAM, roof, depth = 1.5, zf = 0, y = 0, pedH = 1.0, disc }) {
  const w = (n - 1) * sp + r * 4;
  const k = [colonnade(n, sp, r, h, color, { z: zf + depth - 0.3, y }), colonnade(n, sp, r, h, color, { z: zf + 0.3, y: y }),
    box(w + 0.5, depth + 0.4, 0.34, S(color, -0.02), { y: y + h, z: zf + depth / 2 }),
    prism(w + 0.5, depth + 0.4, pedH, S(CREAM, -0.02), { ridge: "z", y: y + h + 0.34, z: zf + depth / 2 })];
  if (disc) k.push(cyl(0.32, 0.1, GOLD, { rx: Math.PI / 2, y: y + h + 0.34 + pedH * 0.38, z: zf + depth + 0.2 }));
  return grp(k);
}
const base = (w, d, c = STONE, h = 0.35) => box(w, d, h, c, { y: 0 });

// ---------------------------------------------------------------------------
function parliament(c) {
  const b = wall(c, 0.4), k = [];
  k.push(box(10, 5.2, 0.5, STONE, { sharp: true }));
  k.push(block(9.4, 4.6, 3.3, b, { y: 0.5, z: -0.2, front: { cols: 7, rows: 2, w: 8.2 }, side: { cols: 3, rows: 2 }, y0: 0.4, top: 0.3 }));
  k.push(steps(4, 6.2, 0.38, 0.14, STONE, { y: 0, z: 2.3 }));
  k.push(portico({ n: 8, sp: 0.88, r: 0.26, h: 2.6, color: CREAM, roof: S(b, -0.02), depth: 1.3, zf: 1.0, y: 0.5, pedH: 1.0, disc: true }));
  k.push(cyl(1.5, 1.2, wall(c, 0.5), { y: 3.8, z: -0.5, seg: 48 }));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.push(box(0.22, 0.12, 0.8, DARK, { x: Math.sin(a) * 1.52, z: -0.5 + Math.cos(a) * 1.52, y: 4.15, ry: a, sharp: true })); }
  k.push(dome(1.7, S(c, -0.04), { y: 5.0, z: -0.5 }), cyl(0.5, 0.7, CREAM, { y: 6.7, z: -0.5 }), cone(0.5, 0.7, GOLD, { y: 7.4, z: -0.5 }), flagMast(1.6, [RED, BLUE, WHITE], { y: 8.0, z: -0.5, x: 0 }));
  for (const sx of [-1, 1]) k.push(flagMast(2.6, [RED, BLUE, WHITE], { x: sx * 4.6, z: 2.4, y: 0.35 }));
  return grp(k);
}
function court(c) {
  const b = wall(c, 0.38), k = [];
  k.push(box(8.6, 5.4, 0.4, STONE, { sharp: true }));
  k.push(block(7.8, 4.6, 3.8, b, { y: 0.4, z: -0.2, front: { cols: 5, rows: 2, w: 6.6 }, side: { cols: 3, rows: 2 }, y0: 0.5, top: 0.4 }));
  k.push(steps(5, 5.2, 0.42, 0.13, STONE, { z: 2.35 }));
  k.push(portico({ n: 6, sp: 0.95, r: 0.32, h: 3.0, color: CREAM, roof: S(b, 0.0), depth: 1.5, zf: 0.95, y: 0.4, pedH: 1.15, disc: true }));
  k.push(door(1.1, 1.9, DOOR, { y: 0.4, z: 2.05 }));
  k.push(box(8.2, 4.8, 0.3, S(b, -0.06), { y: 4.2, z: -0.2 }));
  return grp(k);
}
function townhall(c) {
  const b = wall(c, 0.6), k = [];
  k.push(box(8.4, 5, 0.3, STONE, { sharp: true }));
  k.push(block(7.4, 3.8, 3.4, b, { y: 0.3, z: 0, front: { cols: 5, rows: 2, w: 6.4 }, side: { cols: 3, rows: 2 }, y0: 0.4 }));
  k.push(pitchedRoof(7.4, 3.8, 1.5, S(c, -0.14), { y: 3.7, z: 0 }));
  // clock tower
  k.push(box(2.1, 2.1, 6.0, S(b, 0.02), { y: 0.3, z: 1.2 }));
  k.push(box(2.3, 2.3, 0.3, S(b, -0.06), { y: 6.3, z: 1.2 }));
  k.push(clockFace(0.7, { y: 4.6, z: 2.27 }), clockFace(0.7, { y: 4.6, x: 1.07, z: 1.2, ry: Math.PI / 2 }));
  k.push(windowGrid(1, 1, 1.0, 1.2, { y: 2.6, z: 2.25, x: 0 }));
  k.push(pyramid(2.3, 2.3, 2.2, S(c, -0.16), { y: 6.6, z: 1.2 }), sphere(0.14, GOLD, { y: 8.75, z: 1.2 }), flagMast(1.0, [RED, BLUE, WHITE], { y: 8.8, z: 1.2 }));
  k.push(door(1.2, 1.6, DOOR, { y: 0.3, z: 2.25 }), steps(3, 2.2, 0.4, 0.1, STONE, { z: 2.3, y: 0.3 }));
  return grp(k);
}
function police(c) {
  const b = wall(c, 0.5), k = [];
  k.push(box(9.4, 5.4, 0.3, STONE, { sharp: true }));
  k.push(block(7.0, 3.6, 3.0, b, { y: 0.3, x: -0.8, z: -0.4, front: { cols: 4, rows: 1, w: 5.4, x: 0 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.3 }));
  k.push(box(7.3, 3.9, 0.35, c, { y: 3.3, x: -0.8, z: -0.4 }));
  k.push(box(7.1, 0.12, 0.5, c, { y: 0.9 + 1.45, x: -0.8, z: 1.46, sharp: true }));
  k.push(door(1.3, 1.7, S(c, -0.2), { y: 0.3, x: -0.8, z: 1.4 }));
  // shield emblem
  const s = new THREE.Shape(); s.moveTo(-1, 1.2); s.lineTo(1, 1.2); s.lineTo(1, 0.1); s.bezierCurveTo(1, -0.7, 0.4, -1.2, 0, -1.5); s.bezierCurveTo(-0.4, -1.2, -1, -0.7, -1, 0.1); s.closePath();
  k.push(shape2d(s, 0.18, c, { y: 1.9, x: -3.1, z: 1.5, scale: 0.8 }));
  // light bar
  k.push(box(1.8, 0.7, 0.25, INK, { y: 3.65, x: -0.8, z: -0.4 }), box(0.8, 0.6, 0.35, "#3a63ff", { y: 3.9, x: -1.25, z: -0.4 }), box(0.8, 0.6, 0.35, RED, { y: 3.9, x: -0.35, z: -0.4 }));
  k.push(grp([carBody(WHITE), box(3.2, 0.06, 0.25, c, { y: 0.55, z: 0.86, sharp: true }), box(0.7, 0.35, 0.18, "#3a63ff", { y: 1.75, x: -0.2 })], { x: 2.9, z: 0.4, ry: -0.35, scale: 0.6 }));
  k.push(flagMast(3.6, [BLUE, WHITE, RED], { x: -4.2, z: 1.9, y: 0.3 }));
  return grp(k);
}
function post(c) {
  const b = wall(c, 0.7), k = [];
  k.push(box(8.4, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(7.4, 3.6, 3.0, b, { y: 0.3, z: -0.2, front: { cols: 5, rows: 1, w: 6.2 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.4 }));
  k.push(prism(7.8, 4.0, 0.9, S(c, -0.1), { y: 3.3, z: -0.2 }));
  k.push(colonnade(4, 1.4, 0.2, 2.5, CREAM, { y: 0.3, z: 1.9 }), box(5.6, 1.0, 0.3, S(b, -0.05), { y: 2.8, z: 1.45 }), steps(2, 4.8, 0.45, 0.1, STONE, { z: 2.0, y: 0.3 }));
  k.push(door(1.1, 1.6, DOOR, { y: 0.3, z: 1.55 }));
  // horn sign
  k.push(box(0.1, 0.1, 1.0, INK, { y: 3.3, x: 0, z: 2.5 }));
  k.push(cyl(0.85, 0.18, c, { rx: Math.PI / 2, y: 4.6, z: 2.5 }), torus(0.4, 0.09, INK, { y: 4.6, z: 2.62 }), box(0.25, 0.1, 0.25, INK, { y: 4.62, x: 0.3, z: 2.62 }), box(0.7, 0.1, 0.18, INK, { y: 4.4, x: 0.0, z: 2.62, sharp: true }));
  // mailbox
  k.push(grp([box(0.9, 0.9, 1.0, RED, { y: 0.0 }), cyl(0.45, 0.9, RED, { rx: Math.PI / 2, y: 1.0, z: -0.45 }).translateZ(0), box(0.5, 0.1, 0.12, INK, { y: 0.7, z: 0.46, sharp: true }), box(0.1, 0.1, 0.8, INK, { y: -0.4, sharp: true })], { x: 3.4, z: 2.5, y: 0.8 }));
  return grp(k);
}
function hospital(c) {
  const b = wall("#c8d8e8", 0.45), k = [];
  k.push(box(9.2, 5.4, 0.3, STONE, { sharp: true }));
  k.push(block(4.6, 3.6, 5.8, WHITE, { y: 0.3, x: -1.2, z: -0.4, front: { cols: 3, rows: 4, w: 3.8 }, side: { cols: 2, rows: 4 }, y0: 0.45, wh: 5.0 }));
  k.push(block(3.6, 3.0, 3.4, S(WHITE, -0.03), { y: 0.3, x: 2.9, z: -0.4, front: { cols: 2, rows: 2, w: 2.6 }, side: { cols: 2, rows: 2 }, y0: 0.5 }));
  k.push(box(4.9, 3.9, 0.3, c, { y: 6.1, x: -1.2, z: -0.4 }));
  k.push(crossSign(1.9, c, { y: 3.9, x: -1.2, z: 1.46 }));
  k.push(box(0.1, 0.1, 0.1, c)); // noop spacer
  // ambulance bay canopy + ambulance
  k.push(box(3.4, 1.8, 0.2, c, { y: 2.2, x: 2.9, z: 2.0 }), box(0.14, 0.14, 1.9, STONE, { y: 0.3, x: 1.4, z: 2.8, sharp: true }), box(0.14, 0.14, 1.9, STONE, { y: 0.3, x: 4.4, z: 2.8, sharp: true }));
  k.push(grp([carBody(WHITE), box(3.4, 0.06, 0.28, c, { y: 0.6, z: 0.86, sharp: true }), crossSign(0.5, c, { y: 0.5, z: 0.88, depth: 0.05 }), box(0.7, 0.3, 0.16, c, { y: 1.75, x: -0.2 })], { x: 2.9, z: 1.9, scale: 0.5 }));
  k.push(door(1.4, 1.6, DARK, { y: 0.3, x: -1.2, z: 1.4 }));
  return grp(k);
}
function clinic(c) {
  const b = wall(c, 0.78), k = [];
  k.push(box(9, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(7.4, 3.4, 2.7, b, { y: 0.3, z: -0.3, front: { cols: 5, rows: 1, w: 6.2 }, side: { cols: 2, rows: 1 }, y0: 0.7, wh: 1.4 }));
  k.push(box(7.9, 3.9, 0.3, S(c, -0.08), { y: 3.0, z: -0.3 }));
  k.push(box(3.2, 1.5, 0.18, c, { y: 2.45, x: 0, z: 1.9 }), box(0.12, 0.12, 2.15, STONE, { y: 0.3, x: -1.5, z: 2.5, sharp: true }), box(0.12, 0.12, 2.15, STONE, { y: 0.3, x: 1.5, z: 2.5, sharp: true }));
  k.push(door(1.5, 1.7, GLASS, { y: 0.3, z: 1.43 }));
  k.push(crossSign(1.5, c, { y: 3.5, z: 0.1 }), box(1.1, 0.1, 0.1, c, { y: 3.4, sharp: true }));
  k.push(box(4, 1.3, 0.12, STONE, { y: 0.3, z: 2.4, x: 0 })); // ramp slab
  k.push(tree(2.4, GREEN, { x: -3.9, z: 1.4 }), tree(1.8, S(GREEN, 0.05), { x: 3.9, z: 2.0 }));
  return grp(k);
}
function school(c) {
  const b = wall(c, 0.55), k = [];
  k.push(box(9, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(8.0, 3.2, 3.4, b, { y: 0.3, z: -0.4, front: { cols: 6, rows: 2, w: 7.2 }, side: { cols: 2, rows: 2 }, y0: 0.4 }));
  k.push(pitchedRoof(8.0, 3.2, 1.3, S(c, -0.16), { y: 3.7, z: -0.4 }));
  k.push(box(2.6, 1.4, 4.6, S(b, 0.04), { y: 0.3, z: 1.0 }));
  k.push(prism(2.9, 1.5, 1.1, S(c, -0.16), { ridge: "z", y: 4.9, z: 1.0 }));
  k.push(door(1.2, 1.7, DOOR, { y: 0.3, z: 1.72 }), steps(3, 2.0, 0.4, 0.1, STONE, { y: 0.3, z: 1.75 }), windowGrid(1, 1, 1.0, 1.2, { y: 2.7, z: 1.72 }));
  // bell cupola
  k.push(box(1.0, 1.0, 0.9, S(b, 0.04), { y: 6.0, z: 1.0 }), pyramid(1.3, 1.3, 1.2, S(c, -0.2), { y: 6.9, z: 1.0 }), sphere(0.28, GOLD, { y: 6.25, z: 1.0 }), sphere(0.1, GOLD, { y: 8.05, z: 1.0 }));
  k.push(flagMast(3.4, [RED, BLUE, WHITE], { x: -3.8, z: 2.0, y: 0.3 }));
  return grp(k);
}
function kindergarten(c) {
  const k = [];
  k.push(box(9.4, 5.4, 0.3, STONE, { sharp: true }));
  const cols = ["#e2a03a", "#e2532e", "#5f8f4a", "#2f7fd0"];
  const defs = [[-2.7, 0.0, 2.7, 2.6, 2.1, 0], [0.3, -0.5, 3.0, 2.8, 2.5, 1], [3.0, 0.2, 2.4, 2.6, 2.0, 2]];
  defs.forEach(([x, z, w, d, h, i], n) => {
    const col = cols[(i + n) % 4];
    k.push(box(w, d, h, T(col, 0.25, CREAM), { y: 0.3, x, z }), prism(w + 0.3, d + 0.3, 1.0 + n * 0.1, col, { y: 0.3 + h, x, z }), door(0.7, 1.1, S(col, -0.2), { y: 0.3, x: x - w * 0.18, z: z + d / 2 }));
    k.push(cyl(0.38, 0.1, GLASS, { rx: Math.PI / 2, y: 1.2, x: x + w * 0.2, z: z + d / 2 + 0.02 }), torus(0.38, 0.06, CREAM, { y: 1.58, x: x + w * 0.2, z: z + d / 2 + 0.06 }));
  });
  k.push(tree(2.0, "#79a45e", { x: -4.3, z: 2.0 }));
  // toys
  k.push(sphere(0.35, RED, { x: 0.8, z: 2.2, y: 0.3 }), box(0.6, 0.6, 0.6, c, { x: 1.7, z: 2.3, y: 0.3, ry: 0.5 }), box(0.6, 0.6, 0.6, AMBER, { x: 1.6, z: 2.35, y: 0.9, ry: 0.2 }));
  k.push(sphere(0.55, "#f3d37a", { x: -3.2, z: 2.4, y: 0.3 }));
  return grp(k);
}
function university(c) {
  const b = wall(c, 0.45), k = [];
  k.push(box(11, 5.2, 0.35, STONE, { sharp: true }));
  k.push(block(3.5, 3.6, 4.2, b, { y: 0.35, x: -3.6, z: -0.3, front: { cols: 2, rows: 3, w: 2.6 }, side: { cols: 2, rows: 3 }, y0: 0.5, wh: 3.4 }));
  k.push(block(3.5, 3.6, 4.2, b, { y: 0.35, x: 3.6, z: -0.3, front: { cols: 2, rows: 3, w: 2.6 }, side: { cols: 2, rows: 3 }, y0: 0.5, wh: 3.4 }));
  k.push(box(3.8, 3.8, 0.3, S(c, -0.06), { y: 4.55, x: -3.6, z: -0.3 }), box(3.8, 3.8, 0.3, S(c, -0.06), { y: 4.55, x: 3.6, z: -0.3 }));
  k.push(block(3.8, 3.4, 5.0, wall(c, 0.58), { y: 0.35, z: -0.2, front: false, side: false }));
  k.push(steps(4, 3.2, 0.36, 0.13, STONE, { z: 2.2, y: 0.35 }));
  k.push(portico({ n: 4, sp: 1.0, r: 0.27, h: 3.0, color: CREAM, roof: S(b, -0.04), depth: 1.3, zf: 1.0, y: 0.35, pedH: 0.9 }));
  k.push(door(1.1, 1.8, DOOR, { y: 0.35, z: 1.5 }));
  // tower + mortarboard
  k.push(box(2.2, 2.2, 1.6, wall(c, 0.5), { y: 5.35, z: -0.2 }), windowGrid(1, 1, 0.8, 1.0, { y: 5.55, z: 0.91 }));
  k.push(box(3.3, 3.3, 0.22, c, { y: 6.95, z: -0.2, ry: Math.PI / 4 }), cyl(0.7, 0.4, S(c, -0.08), { y: 6.6, z: -0.2 }));
  k.push(rod([1.2, 7.15, -0.2], [1.2, 6.2, 1.1], 0.03, GOLD), sphere(0.15, GOLD, { x: 1.2, y: 6.0, z: 1.1 }));
  return grp(k);
}
function library(c) {
  const b = wall(c, 0.6), k = [];
  k.push(box(9.2, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(8.2, 3.6, 4.0, b, { y: 0.3, z: -0.3, front: false, side: { cols: 3, rows: 2 }, y0: 0.5 }));
  k.push(box(8.6, 4.0, 0.3, S(c, -0.1), { y: 4.3, z: -0.3 }));
  // book-stack facade: dark alcove with 3 shelves of spines
  k.push(box(5.6, 0.2, 3.2, S(DARK, -0.04), { y: 0.7, z: 1.52, sharp: true }));
  const bc = [c, S(c, 0.1), BLUE, RED, GOLD, GREEN, S(c, -0.12), AMBER];
  for (let r = 0; r < 3; r++) { const bk = books(14, 0.82, bc.slice(r % 3).concat(bc.slice(0, r % 3)), { y: 0.78 + r * 1.0, z: 1.73 }); bk.children.forEach((x) => x.scale.set(1, 1, 0.45)); k.push(bk); k.push(box(5.4, 0.55, 0.08, WOOD, { y: 0.7 + r * 1.0, z: 1.76, sharp: true })); }
  k.push(box(0.25, 0.4, 3.2, STONE, { x: -3.0, y: 0.7, z: 1.5 }), box(0.25, 0.4, 3.2, STONE, { x: 3.0, y: 0.7, z: 1.5 }));
  k.push(prism(6.8, 0.8, 0.9, S(b, -0.04), { ridge: "z", y: 3.95, z: 1.5 }));
  k.push(steps(3, 5.0, 0.4, 0.12, STONE, { z: 1.85, y: 0.3 }));
  // book stack on the steps
  k.push(box(1.1, 0.8, 0.22, RED, { x: 3.7, z: 2.2, y: 0.3, ry: 0.25 }), box(1.0, 0.7, 0.22, BLUE, { x: 3.7, z: 2.2, y: 0.52, ry: -0.1 }), box(1.0, 0.7, 0.2, GOLD, { x: 3.7, z: 2.2, y: 0.74, ry: 0.15 }));
  return grp(k);
}
function theater(c) {
  const b = wall(c, 0.5), k = [];
  k.push(box(9.4, 5.6, 0.3, STONE, { sharp: true }));
  k.push(box(8.0, 4.0, 4.4, b, { y: 0.3, z: -0.5 }));
  k.push(prism(8.4, 4.4, 1.5, S(c, -0.12), { y: 4.7, z: -0.5 }));
  k.push(box(8.0, 0.2, 0.55, S(c, -0.05), { y: 3.4, z: 1.55, sharp: true }));
  for (let i = 0; i < 4; i++) k.push(box(0.9, 0.1, 1.9, T(c, 0.15, WHITE), { x: -2.8 + i * 1.87, y: 0.9, z: 1.54, sharp: true }));
  k.push(arch(1.6, 2.4, "#6e1520", { y: 0.3, z: 1.52 }), arch(1.1, 1.8, "#8a1f26", { y: 0.3, z: 1.6, x: 0 }));
  // curved marquee
  const mar = cyl(2.4, 0.28, c, { y: 2.9, z: 1.5, seg: 64 }); mar.geometry.dispose(); mar.geometry = new THREE.CylinderGeometry(2.4, 2.4, 0.28, 64, 1, false, -Math.PI / 2, Math.PI); mar.geometry.translate(0, 0.14, 0); mar.scale.set(1.25, 1, 0.8);
  k.push(mar);
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; k.push(sphere(0.1, "#f7e7a8", { x: Math.sin(a) * 3.0, z: 1.5 + Math.cos(a) * 1.92, y: 3.2 })); }
  k.push(cyl(0.12, 2.6, CREAM, { x: -2.9, z: 3.1, y: 0.3 }), cyl(0.12, 2.6, CREAM, { x: 2.9, z: 3.1, y: 0.3 }));
  // banners
  k.push(box(0.9, 0.08, 1.6, "#8a1f26", { x: -3.2, y: 1.8, z: 1.55, sharp: true }), box(0.9, 0.08, 1.6, "#8a1f26", { x: 3.2, y: 1.8, z: 1.55, sharp: true }));
  // masks: two discs
  k.push(cyl(0.55, 0.12, GOLD, { rx: Math.PI / 2, y: 5.2, z: 1.7, x: -0.6 }), cyl(0.55, 0.12, S(GOLD, -0.12), { rx: Math.PI / 2, y: 5.2, z: 1.7, x: 0.6 }));
  return grp(k);
}
function museum(c) {
  const b = wall(c, 0.42), k = [];
  k.push(box(10.2, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(9.2, 3.6, 3.5, b, { y: 0.3, z: -0.3, front: { cols: 3, rows: 1, w: 8 }, side: { cols: 3, rows: 1 }, y0: 1.4, wh: 1.4, top: 0.2 }));
  k.push(box(9.6, 4.0, 0.35, S(c, -0.08), { y: 3.8, z: -0.3 }));
  k.push(steps(6, 5.4, 0.3, 0.1, STONE, { z: 1.9, y: 0.3 }));
  k.push(portico({ n: 6, sp: 1.0, r: 0.3, h: 3.0, color: CREAM, roof: S(b, -0.04), depth: 1.3, zf: 1.0, y: 0.3, pedH: 0.8 }));
  k.push(door(1.6, 2.0, GLASS, { y: 0.3, z: 1.52 }));
  k.push(box(0.9, 0.08, 2.2, "#b8413e", { x: -3.6, y: 1.2, z: 1.55, sharp: true }), box(0.9, 0.08, 2.2, "#2f7fd0", { x: 3.6, y: 1.2, z: 1.55, sharp: true }));
  k.push(box(0.6, 0.6, 0.8, STONE, { x: -4.2, z: 2.6, y: 0.3 }), sphere(0.32, S(c, -0.05), { x: -4.2, z: 2.6, y: 1.1 }));
  return grp(k);
}
function bankHouse(c) {
  const b = wall(c, 0.36), k = [];
  k.push(box(8.4, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(7.4, 4.0, 4.4, b, { y: 0.3, z: -0.3, front: false, side: { cols: 3, rows: 2 }, y0: 0.5, wh: 3.4 }));
  k.push(steps(3, 4.0, 0.4, 0.12, STONE, { z: 2.0, y: 0.3 }));
  k.push(portico({ n: 4, sp: 1.55, r: 0.4, h: 3.4, color: CREAM, roof: S(b, -0.03), depth: 1.5, zf: 0.8, y: 0.3, pedH: 1.0, disc: true }));
  k.push(box(5.6, 0.2, 3.3, S(DARK, -0.03), { y: 0.3, z: 1.2, sharp: true }));
  // vault door
  k.push(cyl(1.15, 0.25, "#7c8190", { rx: Math.PI / 2, y: 1.7, z: 1.4 }), torus(1.0, 0.1, "#a9aebb", { y: 1.7, z: 1.56 }), cyl(0.25, 0.3, "#a9aebb", { rx: Math.PI / 2, y: 1.7, z: 1.6 }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.push(rod([Math.cos(a) * 0.3, 1.7 + Math.sin(a) * 0.3, 1.72], [Math.cos(a) * 0.85, 1.7 + Math.sin(a) * 0.85, 1.72], 0.05, "#a9aebb")); }
  k.push(cyl(0.3, 0.1, GOLD, { x: -3.6, z: 2.6, y: 0.3 }), cyl(0.3, 0.1, GOLD, { x: -3.6, z: 2.6, y: 0.4 }), cyl(0.3, 0.1, GOLD, { x: -3.6, z: 2.6, y: 0.5 }), cyl(0.3, 0.1, GOLD, { x: -3.0, z: 2.9, y: 0.3 }));
  return grp(k);
}
function embassy(c) {
  const b = wall(c, 0.5), k = [];
  k.push(box(9.6, 6.0, 0.3, STONE, { sharp: true }));
  k.push(block(6.4, 3.4, 3.8, b, { y: 0.3, z: -0.8, front: { cols: 4, rows: 2, w: 5.2 }, side: { cols: 2, rows: 2 }, y0: 0.45 }));
  k.push(pyramid(7.2, 4.2, 1.8, S(c, -0.18), { y: 4.1, z: -0.8 }));
  k.push(box(2.0, 0.9, 3.8, S(b, 0.03), { y: 0.3, z: 1.35 }), prism(2.4, 1.1, 0.9, S(c, -0.18), { ridge: "z", y: 4.1, z: 1.35 }));
  k.push(door(1.1, 1.8, DOOR, { y: 0.3, z: 1.82 }), windowGrid(1, 1, 0.9, 1.0, { y: 2.6, z: 1.82 }), steps(3, 1.8, 0.3, 0.1, STONE, { y: 0.3, z: 1.85 }));
  k.push(box(0.5, 0.5, 2.2, STONE, { x: -3.4, z: 2.7, y: 0.3 }), box(0.5, 0.5, 2.2, STONE, { x: 3.4, z: 2.7, y: 0.3 }), sphere(0.22, GOLD, { x: -3.4, z: 2.7, y: 2.5 }), sphere(0.22, GOLD, { x: 3.4, z: 2.7, y: 2.5 }));
  k.push(fence(2.5, INK, { x: -2.1, z: 2.7, y: 0.3 }), fence(2.5, INK, { x: 2.1, z: 2.7, y: 0.3 }));
  k.push(flagMast(5.4, [c, WHITE, S(c, -0.2)], { x: -4.1, z: 1.0, y: 0.3 }), flagMast(4.8, [RED, WHITE, BLUE], { x: 4.2, z: 1.0, y: 0.3 }));
  return grp(k);
}
function tax(c) {
  const b = wall(c, 0.55, "#e4e1da"), k = [];
  k.push(box(8.8, 5.0, 0.3, STONE, { sharp: true }));
  k.push(block(7.8, 4.0, 4.6, b, { y: 0.3, z: -0.2, front: { cols: 7, rows: 4, w: 7.0 }, side: { cols: 4, rows: 4 }, y0: 0.9, wh: 3.4, pw: 0.5, ph: 0.55 }));
  k.push(box(8.3, 4.5, 0.4, S(c, -0.1), { y: 4.9, z: -0.2 }));
  k.push(box(8.0, 0.25, 0.7, S(c, -0.14), { y: 0.3, z: 1.85, sharp: true }));
  k.push(box(1.9, 0.5, 1.1, S(b, -0.05), { y: 0.3, z: 2.0 }), door(1.1, 1.8, DOOR, { y: 0.3, z: 2.26 }));
  k.push(cyl(0.5, 0.18, GOLD, { rx: Math.PI / 2, y: 3.0, z: 1.9 + 0.2, x: 0 }));
  return grp(k);
}
function cadastre(c) {
  const k = [];
  k.push(box(9, 7, 0.1, STONE, { sharp: true }));
  const cols = [c, S(c, 0.1), "#c4a98a", S(c, -0.08), "#e2c94a", "#a9c48a", S(c, 0.16), "#d9b88f", "#8fa9c4"];
  const cells = [[-2.9, 2.0, 2.6, 1.6], [-0.2, 2.2, 2.6, 1.8], [2.6, 2.0, 2.8, 1.6], [-3.0, -0.2, 2.2, 2.4], [-0.9, -0.1, 2.0, 2.4], [1.7, -0.2, 3.6, 2.4], [-2.9, -2.4, 3.2, 1.7], [0.5, -2.4, 2.6, 1.7], [3.1, -2.4, 1.8, 1.7]];
  cells.forEach(([x, z, w, d], i) => k.push(box(w, d, 0.12 + (i % 3) * 0.04, cols[i], { x, z, y: 0.1 })));
  // house footprints
  k.push(box(1.0, 1.0, 0.7, CREAM, { x: -3.0, z: 2.0, y: 0.22 }), prism(1.2, 1.2, 0.5, S(c, -0.2), { y: 0.92, x: -3.0, z: 2.0 }), box(0.9, 0.9, 0.6, CREAM, { x: 2.6, z: -0.2, y: 0.22 }), prism(1.1, 1.1, 0.45, RED, { y: 0.82, x: 2.6, z: -0.2 }));
  // tripod + theodolite
  const top = [0, 3.9, 0], tp = grp([], { x: -0.4, z: 0.4 });
  for (const [x, z] of [[-1.3, 0.9], [1.3, 0.9], [0, -1.4]]) tp.add(rod(top, [x, 0.2, z], 0.07, WOOD));
  tp.add(cyl(0.45, 0.2, "#4a4b52", { y: 3.85 }), box(0.7, 0.55, 0.9, "#3b3f4a", { y: 4.05 }), cyl(0.2, 1.1, "#3b3f4a", { y: 4.1, rx: Math.PI / 2, z: 0.2 }), sphere(0.2, GOLD, { y: 4.6, z: -0.1 }));
  k.push(tp);
  // ranging pole
  const pole = grp([]); for (let i = 0; i < 6; i++) pole.add(cyl(0.07, 0.45, i % 2 ? WHITE : RED, { y: i * 0.45, seg: 12 })); k.push(grp([pole, cone(0.07, 0.2, INK, { y: 2.7, seg: 12 })], { x: 3.4, z: 2.7 }));
  return grp(k);
}
function fire(c) {
  const b = wall("#d8d2c4", 0.3, CREAM), k = [];
  k.push(box(9.6, 5.4, 0.3, STONE, { sharp: true }));
  k.push(box(6.6, 3.8, 3.6, T(c, 0.45, CREAM), { y: 0.3, x: -0.7, z: -0.2 }));
  k.push(box(7.0, 4.1, 0.4, S(c, -0.14), { y: 3.9, x: -0.7, z: -0.2 }));
  // big doors
  for (let i = 0; i < 3; i++) { const x = -2.5 + i * 1.8; k.push(box(1.5, 0.12, 2.5, "#b02a2f", { x, y: 0.3, z: 1.72, sharp: true }), arch(1.5, 2.9, "#9a2328", { x, y: 0.3, z: 1.66 })); for (let j = 0; j < 4; j++) k.push(box(1.3, 0.05, 0.08, "#c8444a", { x, y: 0.8 + j * 0.5, z: 1.84, sharp: true })); }
  k.push(box(5.6, 0.3, 0.3, WHITE, { x: -0.7, y: 3.35, z: 1.8, sharp: true }));
  // hose tower
  k.push(box(1.9, 1.9, 6.0, T(c, 0.35, CREAM), { y: 0.3, x: 3.5, z: -0.2 }), pyramid(2.2, 2.2, 1.0, S(c, -0.14), { y: 6.3, x: 3.5, z: -0.2 }), windowGrid(1, 3, 0.6, 3.2, { x: 3.5, y: 2.0, z: 0.76, pw: 1.0, ph: 0.6 }));
  // beacon
  k.push(sphere(0.35, "#ff6a3a", { x: 3.5, z: -0.2, y: 7.3 }));
  // hydrant
  k.push(grp([cyl(0.22, 0.75, RED, {}), sphere(0.25, RED, { y: 0.6 }), cyl(0.1, 0.5, RED, { rz: Math.PI / 2, y: 0.4, x: -0.25 })], { x: -4.2, z: 2.4, y: 0.3 }));
  return grp(k);
}
function pharmacy(c) {
  const b = wall(c, 0.78), k = [];
  k.push(box(8.4, 5.0, 0.3, STONE, { sharp: true }));
  k.push(block(6.8, 3.6, 3.2, b, { y: 0.3, z: -0.2, front: false, side: { cols: 2, rows: 1 }, y0: 0.8, wh: 1.5 }));
  k.push(prism(7.2, 4.0, 1.0, S(c, -0.15), { y: 3.5, z: -0.2 }));
  k.push(box(2.2, 0.1, 1.9, GLASS, { x: -1.9, y: 0.7, z: 1.62, sharp: true }), box(2.2, 0.1, 1.9, GLASS, { x: 1.9, y: 0.7, z: 1.62, sharp: true }), door(1.2, 2.0, DARK, { y: 0.3, z: 1.62 }));
  // striped awning
  for (let i = 0; i < 8; i++) k.push(box(0.86, 1.1, 0.12, i % 2 ? WHITE : c, { x: -3.0 + i * 0.86, y: 2.7, z: 2.15, rx: -0.45 }));
  k.push(crossSign(2.0, c, { y: 4.4, z: 0.7, x: 0 }), box(0.18, 0.18, 0.4, STONE, { y: 4.0, z: 0.7 }));
  k.push(tree(2.0, GREEN, { x: -3.8, z: 2.3 }));
  return grp(k);
}
function church(c) {
  const b = wall(c, 0.55), k = [];
  k.push(box(8.6, 6.8, 0.3, STONE, { sharp: true }));
  k.push(block(3.8, 5.4, 3.4, b, { y: 0.3, z: -0.4, front: false, side: { cols: 3, rows: 1 }, y0: 1.0, wh: 1.6, pw: 0.4 }));
  k.push(prism(3.8, 5.8, 1.7, S(c, -0.2), { ridge: "z", y: 3.7, z: -0.4 }));
  k.push(cyl(1.0, 1.8, b, { y: 0.3, z: -3.1, seg: 32 }), cone(1.12, 1.0, S(c, -0.2), { y: 2.1, z: -3.1 }));
  // tower
  k.push(box(2.3, 2.3, 6.2, S(b, 0.03), { y: 0.3, x: 0, z: 2.0 }));
  k.push(arch(1.0, 1.9, DOOR, { y: 0.3, z: 3.15 }), steps(3, 1.8, 0.3, 0.1, STONE, { z: 3.2, y: 0.3 }));
  k.push(cyl(0.45, 0.1, GLASS, { rx: Math.PI / 2, y: 3.8, z: 3.18 }), torus(0.45, 0.07, CREAM, { y: 4.25, z: 3.2 }));
  k.push(arch(0.8, 1.3, DOOR, { y: 5.0, z: 3.14 }), arch(0.8, 1.3, DOOR, { y: 5.0, x: 1.14, z: 2.0, ry: Math.PI / 2 }));
  k.push(box(2.5, 2.5, 0.3, S(c, -0.12), { y: 6.5, z: 2.0 }), pyramid(2.4, 2.4, 3.0, S(c, -0.22), { y: 6.8, z: 2.0 }));
  k.push(box(0.1, 0.1, 1.0, GOLD, { y: 9.7, z: 2.0 }), box(0.55, 0.1, 0.1, GOLD, { y: 10.4, z: 2.0 }));
  k.push(cypress(3.4, "#4b6b4c", { x: -3.3, z: 2.8 }), cypress(2.6, "#56795a", { x: 3.5, z: 3.0 }));
  return grp(k);
}
function sports(c) {
  const k = [];
  k.push(plan(ellipseShape(5.0, 3.6, [3.6, 2.3]), 1.7, wall(c, 0.5), {}));
  k.push(plan(ellipseShape(5.15, 3.75, [4.9, 3.5]), 2.0, S(c, -0.05), {}));
  k.push(plan(ellipseShape(3.7, 2.4), 0.12, "#6aa05a", { y: 0 }));
  k.push(box(0.06, 3.9, 0.05, WHITE, { y: 0.12, sharp: true }), box(4.8, 0.06, 0.05, WHITE, { y: 0.12, sharp: true }), box(0.9, 0.9, 0.05, "#6aa05a", { y: 0.12 }));
  k.push(torus(0.5, 0.03, WHITE, { rx: -Math.PI / 2, y: 0.14 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.push(cyl(0.08, 4.0, GREY, { x: sx * 4.3, z: sz * 3.0, y: 0, seg: 10 }), box(0.9, 0.2, 0.5, WHITE, { x: sx * 4.3, z: sz * 3.0, y: 4.0, sharp: true })); }
  k.push(arch(1.3, 1.7, DOOR, { y: 0, z: 3.8 }));
  return grp(k);
}
function market(c) {
  const k = [];
  k.push(box(9.2, 6.2, 0.2, STONE, { sharp: true }));
  const cols = [c, "#e2532e", "#5f8f4a"];
  const stall = (x, z, col, i) => {
    const g = grp([]);
    for (const [px, pz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) g.add(cyl(0.05, 2.2, WOOD, { x: px, z: pz, seg: 8 }));
    for (let n = 0; n < 6; n++) g.add(box(0.47, 1.9, 0.1, n % 2 ? WHITE : col, { x: -1.2 + n * 0.48 + 0.12, y: 2.2 - 0.02, z: 0, rx: 0.0, sharp: true }));
    g.add(box(2.4, 0.9, 0.9, WOOD, { y: 0, z: 0.7 }));
    for (let n = 0; n < 5; n++) g.add(sphere(0.2, [RED, AMBER, GREEN, "#e2c94a", "#c05030"][(n + i) % 5], { x: -0.9 + n * 0.45, z: 0.7, y: 0.9 }));
    g.add(box(0.9, 0.5, 0.5, T(col, 0.3, WOOD), { x: 1.0, z: 0.0, y: 0 }));
    return grp([g], { x, z });
  };
  k.push(stall(-2.4, -1.0, cols[0], 0), stall(2.4, -1.0, cols[1], 1), stall(0, 1.8, cols[2], 2));
  k.push(grp([cyl(0.4, 0.8, WOOD, { seg: 16 }), sphere(0.4, GREEN, { y: 0.7 }), sphere(0.4, GREEN, { y: 0.7, x: 0.35 })], { x: -4.0, z: 2.2 }));
  return grp(k);
}
function busstation(c) {
  const k = [];
  k.push(box(9.6, 5.6, 0.2, "#c9c6bb", { sharp: true }));
  k.push(box(9.0, 3.2, 0.3, S(c, -0.04), { y: 3.0, z: -0.8, rx: 0.06 }));
  k.push(box(9.0, 0.3, 0.45, S(c, -0.14), { y: 2.95, z: 0.8, sharp: true }));
  for (const x of [-4, -1.3, 1.3, 4]) k.push(cyl(0.12, 3.0, GREY, { x, z: 0.5, seg: 12 }));
  k.push(box(8.5, 0.12, 2.0, GLASS, { y: 0.6, z: -2.2, sharp: true }));
  k.push(box(1.6, 0.9, 1.6, wall(c, 0.7), { x: -3.4, z: -1.9 })); // kiosk
  // bus
  const bus = grp([box(7.2, 2.0, 2.2, c, { y: 0.6 }), box(6.9, 0.06, 0.8, GLASS, { y: 1.5, z: 1.01, sharp: true }), box(0.06, 1.7, 0.8, GLASS, { y: 1.5, x: 3.62, sharp: true }), box(7.2, 2.0, 0.3, S(c, -0.15), { y: 2.8 }), box(7.2, 0.06, 0.3, WHITE, { y: 0.95, z: 1.01, sharp: true })], { x: 0, z: 1.0 });
  for (const x of [-2.3, 2.3]) for (const z of [-0.9, 0.9]) bus.add(wheel(0.5, { x, y: 0.5, z }));
  bus.scale.setScalar(0.62); bus.position.set(0.3, 0, 1.9); k.push(bus);
  k.push(bench(1.8, { x: 3.4, z: -0.9 }));
  k.push(cyl(0.05, 2.4, INK, { x: -4.2, z: 2.3, seg: 8 }), cyl(0.5, 0.1, c, { rx: Math.PI / 2, x: -4.2, y: 2.7, z: 2.3 }));
  return grp(k);
}
function trainstation(c) {
  const b = wall(c, 0.6), k = [];
  k.push(box(10.6, 7.2, 0.2, "#c9c6bb", { sharp: true }));
  k.push(block(9.0, 2.6, 2.6, b, { y: 0.2, z: -2.2, front: { cols: 6, rows: 1, w: 8.0 }, side: { cols: 1, rows: 1 }, y0: 0.5, wh: 1.4 }));
  k.push(box(9.4, 3.0, 0.2, S(c, -0.12), { y: 2.8, z: -2.2 }));
  k.push(box(3.6, 3.4, 3.6, S(b, 0.04), { y: 0.2, z: -2.2 }), vault(1.8, 3.4, S(c, -0.1), { y: 3.8, z: -2.2 }), arch(2.6, 3.0, GLASS, { y: 0.2, z: -0.47 }));
  k.push(clockFace(0.65, { y: 4.4, z: -0.47 }));
  k.push(box(9.4, 1.6, 0.25, "#d4d1c6", { y: 0.2, z: -0.1 }));
  for (const z of [1.6, 2.5]) k.push(box(10, 0.1, 0.1, GREY, { z, y: 0.2, sharp: true }));
  for (let i = 0; i < 18; i++) k.push(box(0.16, 1.1, 0.07, WOOD, { x: -4.6 + i * 0.55, z: 2.05, y: 0.15, sharp: true }));
  k.push(box(6.0, 1.5, 1.3, S(c, -0.05), { y: 0.5, z: 2.05, x: -1.8 }), box(5.8, 0.06, 0.5, GLASS, { y: 1.1, z: 2.72, x: -1.8, sharp: true }), box(0.9, 1.5, 1.3, S(c, -0.2), { y: 0.5, z: 2.05, x: 1.7 }), box(2.6, 1.9, 1.3, c, { y: 0.5, z: 2.05, x: 3.4 }), box(1.4, 0.06, 0.5, GLASS, { y: 1.3, z: 2.72, x: 3.5, sharp: true }), box(5.6, 0.1, 0.1, WHITE, { y: 1.8, z: 2.72, x: -1.8, sharp: true }));
  return grp(k);
}
function airport(c) {
  const k = [];
  k.push(box(10.6, 7.0, 0.2, "#c9c6bb", { sharp: true }));
  k.push(box(8.0, 3.0, 2.2, GLASS, { y: 0.2, z: 0.2, x: -0.6 }));
  for (let i = 0; i <= 8; i++) k.push(box(0.1, 0.12, 2.3, WHITE, { x: -4.6 + i * 1.0, y: 0.2, z: 1.72, sharp: true }));
  k.push(box(8.6, 3.8, 0.3, c, { y: 2.4, x: -0.6, z: 0.4, rx: 0.07 }));
  k.push(box(8.4, 0.3, 0.5, WHITE, { y: 2.3, x: -0.6, z: 2.1, sharp: true }));
  // tower
  k.push(cyl(0.55, 5.4, wall(c, 0.5), { x: 4.1, z: -1.4, y: 0.2 }), cyl(1.15, 0.5, S(c, -0.1), { x: 4.1, z: -1.4, y: 5.4 }), cyl(1.05, 0.9, GLASS, { x: 4.1, z: -1.4, y: 5.9 }), cyl(1.3, 0.2, S(c, -0.14), { x: 4.1, z: -1.4, y: 6.8 }), cyl(0.05, 0.9, GREY, { x: 4.1, z: -1.4, y: 7.0, seg: 8 }));
  // plane
  const pl = grp([capsule(0.5, 3.4, WHITE, { rz: Math.PI / 2, y: 0.8 }), box(0.9, 4.6, 0.12, S(c, 0.0), { y: 0.75, x: 0.2 }), box(0.7, 1.5, 0.1, S(c, 0.0), { y: 0.95, x: -1.9 }), box(0.1, 0.12, 0.9, c, { y: 1.1, x: -2.0 }), box(2.2, 0.02, 0.14, c, { y: 0.8, z: 0.5, x: 0, sharp: true }), cyl(0.2, 0.5, GREY, { rz: Math.PI / 2, y: 0.55, z: 1.4, x: 0.5 }), cyl(0.2, 0.5, GREY, { rz: Math.PI / 2, y: 0.55, z: -1.4, x: 0.5 })], { x: -0.6, z: 3.4, ry: -0.5, scale: 0.8 });
  k.push(pl);
  return grp(k);
}
function prison(c) {
  const b = wall(c, 0.35, "#d8d4c8"), k = [];
  k.push(box(10, 7.4, 0.2, "#c9c6bb", { sharp: true }));
  const wh = 1.5, t = 0.4;
  k.push(box(8.6, t, wh, b, { y: 0.2, z: 3.3, x: 0 }));
  k.push(box(8.6, t, wh, b, { y: 0.2, z: -3.3 }), box(t, 6.6, wh, b, { y: 0.2, x: -4.3 }), box(t, 6.6, wh, b, { y: 0.2, x: 4.3 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.push(box(1.1, 1.1, 3.4, S(b, -0.04), { x: sx * 4.3, z: sz * 3.3, y: 0.2 }), box(1.4, 1.4, 0.3, S(c, -0.12), { x: sx * 4.3, z: sz * 3.3, y: 3.6 }), pyramid(1.6, 1.6, 0.8, S(c, -0.2), { x: sx * 4.3, z: sz * 3.3, y: 3.9 }), box(0.5, 0.06, 0.4, DARK, { x: sx * 4.3, z: sz * 3.3 + sz * 0.55 * 0 + 0.56, y: 2.6, sharp: true })); }
  k.push(block(5.2, 3.4, 3.4, b, { y: 0.2, z: -0.4, front: { cols: 5, rows: 3, w: 4.4 }, side: { cols: 3, rows: 3 }, y0: 0.6, wh: 2.4, pw: 0.25, ph: 0.45, sill: false }));
  k.push(box(5.6, 3.8, 0.3, S(c, -0.1), { y: 3.6, z: -0.4 }));
  k.push(arch(1.6, 2.1, INK, { y: 0.2, z: 3.52 })); for (let i = 0; i < 5; i++) k.push(box(0.05, 0.06, 1.9, GREY, { x: -0.6 + i * 0.3, y: 0.2, z: 3.62, sharp: true }));
  return grp(k);
}
function registry(c) {
  const b = wall(c, 0.65), k = [];
  k.push(box(8.6, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(5.6, 3.6, 3.0, b, { y: 0.3, x: -0.6, z: -0.5, front: { cols: 3, rows: 1, w: 4.4 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.5 }));
  k.push(pitchedRoof(5.6, 3.6, 1.4, S(c, -0.14), { y: 3.3, x: -0.6, z: -0.5 }));
  k.push(colonnade(2, 1.8, 0.2, 2.4, CREAM, { y: 0.3, x: -0.6, z: 1.7 }), box(3.0, 1.0, 0.25, S(b, -0.04), { y: 2.7, x: -0.6, z: 1.6 }), door(1.0, 1.7, DOOR, { y: 0.3, x: -0.6, z: 1.3 }), steps(2, 2.4, 0.4, 0.1, STONE, { x: -0.6, z: 2.0, y: 0.3 }));
  // big open register book
  const bk = grp([box(1.9, 1.5, 0.2, c, { y: 0 }), box(1.8, 1.4, 0.12, WHITE, { y: 0.2, x: -0.9 + 0.0, z: 0, sharp: true }).translateX(0), box(1.8, 1.4, 0.12, WHITE, { y: 0.2, x: 0.95, sharp: true })], { x: 3.2, z: 2.0, ry: -0.3, y: 0.3 });
  bk.children[1].position.x = -0.05; bk.children[1].scale.x = 0.5; bk.children[2].visible = false;
  const lines = []; for (let i = 0; i < 4; i++) lines.push(box(1.2, 0.04, 0.03, c, { y: 0.33, z: -0.45 + i * 0.3, x: -0.05, sharp: true }));
  k.push(grp([box(2.4, 1.8, 0.25, c), box(2.2, 1.6, 0.1, WHITE, { y: 0.25, sharp: true }), box(0.06, 1.6, 0.12, S(c, -0.2), { y: 0.25, sharp: true }), ...[0, 1, 2, 3, 4].flatMap((i) => [box(0.8, 0.03, 0.04, "#8f93a8", { y: 0.36, x: -0.6, z: -0.6 + i * 0.3, sharp: true }), box(0.8, 0.03, 0.04, "#8f93a8", { y: 0.36, x: 0.6, z: -0.6 + i * 0.3, sharp: true })])], { x: 3.1, z: 1.9, y: 0.3, ry: -0.35 }));
  return grp(k);
}
function employment(c) {
  const b = wall(c, 0.6), k = [];
  k.push(box(9, 5.4, 0.3, STONE, { sharp: true }));
  k.push(block(6.4, 3.6, 3.8, b, { y: 0.3, x: -0.8, z: -0.4, front: { cols: 4, rows: 3, w: 5.4 }, side: { cols: 2, rows: 3 }, y0: 0.5, wh: 3.0 }));
  k.push(box(6.8, 4.0, 0.3, c, { y: 4.1, x: -0.8, z: -0.4 }), door(1.6, 1.8, GLASS, { y: 0.3, x: -0.8, z: 1.4 }), box(2.6, 1.2, 0.15, c, { y: 2.3, x: -0.8, z: 1.9 }));
  // signpost
  k.push(cyl(0.08, 4.2, GREY, { x: 3.5, z: 2.2, y: 0.3, seg: 10 }));
  const arrow = [[-0.9, -0.28], [0.5, -0.28], [0.5, -0.5], [1.0, 0], [0.5, 0.5], [0.5, 0.28], [-0.9, 0.28]];
  [[0, c, 1], [1, "#e2a03a", -1], [2, "#2f9e6a", 1]].forEach(([i, col, dir]) => k.push(shape2d(arrow.map(([x, y]) => [x * dir, y]), 0.14, col, { x: 3.5 + dir * 0.45, z: 2.2, y: 1.2 + i * 1.0, ry: 0.0, scale: 1 })));
  k.push(grp([box(0.8, 0.4, 0.55, "#8a6a3a", { y: 0 }), box(0.3, 0.35, 0.08, "#c9a84a", { y: 0.2, z: 0.2, sharp: true }), torus(0.18, 0.04, "#6b4a28", { y: 0.62, rx: 0 })], { x: 3.5, z: 3.4, y: 0.3 }));
  return grp(k);
}
function pension(c) {
  const b = wall(c, 0.7), k = [];
  k.push(box(9, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(6.4, 3.4, 3.0, b, { y: 0.3, x: -0.8, z: -0.3, front: { cols: 4, rows: 1, w: 5.4 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.5 }));
  k.push(pitchedRoof(6.4, 3.4, 1.3, S(c, -0.14), { y: 3.3, x: -0.8, z: -0.3 }));
  k.push(colonnade(4, 1.4, 0.2, 2.4, CREAM, { y: 0.3, x: -0.8, z: 1.9 }), box(5.0, 1.1, 0.25, S(b, -0.04), { y: 2.7, x: -0.8, z: 1.8 }), door(1.0, 1.7, DOOR, { y: 0.3, x: -0.8, z: 1.4 }));
  k.push(bench(1.6, { x: -3.2, z: 2.5, y: 0.3 }));
  // hourglass
  const hg = grp([cyl(0.7, 0.14, WOOD, { seg: 24 }), cyl(0.7, 0.14, WOOD, { y: 3.0, seg: 24 }), cone(0.55, 1.35, "#cfe3f2", { y: 1.55, rx: Math.PI }).translateY(0), cone(0.55, 1.35, "#cfe3f2", { y: 0.14 }), cone(0.45, 0.9, GOLD, { y: 0.14 }), cone(0.55, 1.35, "#cfe3f2", {}).translateY(0)], { x: 3.5, z: 1.4, y: 0.3 });
  hg.children[2].position.y = 1.5 + 1.35; hg.children[2].rotation.x = Math.PI; hg.children[5].visible = false; hg.children[3].position.y = 0.14;
  hg.add(cyl(0.05, 3.0, WOOD, { x: 0.6, seg: 8 }), cyl(0.05, 3.0, WOOD, { x: -0.6, seg: 8 }), cyl(0.05, 3.0, WOOD, { z: 0.6, seg: 8 }));
  hg.scale.setScalar(0.8);
  k.push(hg);
  return grp(k);
}
function insurance(c) {
  const b = wall(c, 0.65), k = [];
  k.push(box(8.8, 6.0, 0.3, STONE, { sharp: true }));
  k.push(block(4.6, 3.2, 2.6, b, { y: 0.3, x: -1.6, z: 0.8, front: { cols: 3, rows: 1, w: 3.6 }, side: { cols: 2, rows: 1 }, y0: 0.8, wh: 1.3 }));
  k.push(pitchedRoof(4.6, 3.2, 1.2, S("#8a93a8", -0.12), { y: 2.9, x: -1.6, z: 0.8 }), door(1.0, 1.6, DOOR, { y: 0.3, x: -1.6, z: 2.4 }));
  const u = grp([], { x: 1.2, z: -1.4, rz: -0.14 });
  const R = 3.6, th = Math.PI / 2.5, top = 6.6;
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(R, 12, 16, (i * Math.PI) / 4, Math.PI / 4, 0, th), new THREE.MeshStandardMaterial({ color: new THREE.Color(i % 2 ? WHITE : c), roughness: 0.85, metalness: 0, side: THREE.DoubleSide }));
    m.scale.y = 0.55; m.position.y = top - R * 0.55; m.castShadow = true; m.receiveShadow = true; u.add(m);
  }
  u.add(cyl(0.09, top + 0.1, INK, { y: 0, seg: 10 }), sphere(0.16, GOLD, { y: top + 0.05 }), torus(0.3, 0.07, INK, { y: -0.05, arc: Math.PI, rz: Math.PI }).translateX(0));
  u.children.at(-1).visible = false;
  k.push(u);
  return grp(k);
}
function telecom(c) {
  const b = wall(c, 0.7), k = [];
  k.push(box(9, 5.6, 0.3, STONE, { sharp: true }));
  k.push(block(5.2, 3.2, 3.0, b, { y: 0.3, x: -1.5, z: 0.4, front: false, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.4 }));
  k.push(box(5.6, 3.6, 0.28, c, { y: 3.3, x: -1.5, z: 0.4 }));
  k.push(box(4.0, 0.1, 1.9, GLASS, { y: 0.7, x: -1.5, z: 2.04, sharp: true }), door(1.0, 1.9, DARK, { y: 0.3, x: -0.2, z: 2.05 }));
  // phone sign
  k.push(shape2d(rrectShape(0.9, 1.5, 0.2), 0.15, INK, { y: 3.9, x: -1.5, z: 2.4 }), box(0.7, 0.18, 1.0, c, { y: 4.25, x: -1.5, z: 2.4 }));
  // mast
  const m = grp([], { x: 3.0, z: -1.2, y: 0.3 });
  const hh = 8.0; for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) m.add(rod([x, 0, z], [x * 0.25, hh, z * 0.25], 0.05, "#a8abb3"));
  for (let i = 1; i < 9; i++) { const f = i / 9, w = 0.45 * (1 - f * 0.75), y = hh * f; m.add(rod([-w, y, -w], [w, y, w], 0.025, "#a8abb3"), rod([w, y, -w], [-w, y, w], 0.025, "#a8abb3")); }
  m.add(cyl(0.12, 0.6, GREY, { y: hh, seg: 8 }));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), D.mat(WHITE)); dish.position.set(0.35, hh - 1.2, 0.55); dish.rotation.x = Math.PI / 2 * 1.0; dish.castShadow = true; m.add(dish);
  for (let i = 0; i < 3; i++) m.add(torus(0.5 + i * 0.4, 0.04, c, { arc: Math.PI * 0.9, y: hh + 0.2, rz: Math.PI / 2 + 0.0, ry: Math.PI / 2, x: 0 }));
  m.children.slice(-3).forEach((t, i) => { t.rotation.set(0, 0, 0.4 + 0); t.rotation.z = -Math.PI * 0.45; t.position.set(0.3, hh + 0.4, 0); t.scale.setScalar(1); });
  k.push(m);
  return grp(k);
}
function notary(c) {
  const b = wall(c, 0.62), k = [];
  k.push(box(8.6, 5.4, 0.3, STONE, { sharp: true }));
  k.push(block(5.6, 3.6, 3.2, b, { y: 0.3, x: -0.8, z: -0.4, front: { cols: 3, rows: 1, w: 4.4 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.5 }));
  k.push(box(6.0, 4.0, 0.3, S(c, -0.1), { y: 3.5, x: -0.8, z: -0.4 }));
  k.push(colonnade(2, 2.0, 0.24, 2.5, CREAM, { y: 0.3, x: -0.8, z: 1.7 }), box(3.2, 1.0, 0.25, S(b, -0.04), { y: 2.8, x: -0.8, z: 1.6 }), prism(3.4, 1.2, 0.6, S(c, -0.1), { ridge: "z", y: 3.05, x: -0.8, z: 1.6 }), door(1.0, 1.7, DOOR, { y: 0.3, x: -0.8, z: 1.3 }));
  // big stamp
  k.push(grp([cyl(1.0, 0.25, "#b9b5a8", {}), cyl(0.55, 0.15, c, { y: 0.0 }).translateY(0.0), cyl(0.28, 1.2, c, { y: 0.25 }), sphere(0.5, S(c, 0.05), { y: 1.3 })].map((m, i) => (i === 1 ? (m.visible = false, m) : m)), { x: 3.3, z: 2.0, y: 0.3, scale: 0.9 }));
  k.push(cyl(0.9, 0.06, "#d9d6cb", { x: 3.3, z: 2.0, y: 0.3 }), cyl(0.5, 0.04, c, { x: 3.3, z: 2.0, y: 0.35 }));
  return grp(k);
}
function utility(c) {
  const b = wall("#d8d4c8", 0.4), k = [];
  k.push(box(9.6, 6.0, 0.3, "#c9c6bb", { sharp: true }));
  k.push(block(4.6, 3.2, 2.8, b, { y: 0.3, x: -2.2, z: 0.8, front: { cols: 3, rows: 1, w: 3.6 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.2 }));
  k.push(box(4.9, 3.5, 0.25, S(c, -0.12), { y: 3.1, x: -2.2, z: 0.8 }));
  const bolt = [[0.1, 1.2], [-0.7, -0.1], [-0.1, -0.1], [-0.5, -1.2], [0.7, 0.2], [0.1, 0.2], [0.5, 1.2]];
  k.push(shape2d(bolt, 0.18, c, { y: 1.0, x: -2.2, z: 2.45, scale: 1.0 }));
  // transformer boxes + fence
  k.push(box(1.2, 1.2, 1.4, GREY, { x: 1.2, z: 2.3, y: 0.3 }), box(1.2, 1.2, 1.4, "#7f838c", { x: 2.8, z: 2.3, y: 0.3 }), cyl(0.12, 0.5, WHITE, { x: 1.0, z: 2.3, y: 1.7 }), cyl(0.12, 0.5, WHITE, { x: 1.4, z: 2.3, y: 1.7 }), cyl(0.12, 0.5, WHITE, { x: 2.6, z: 2.3, y: 1.7 }), cyl(0.12, 0.5, WHITE, { x: 3.0, z: 2.3, y: 1.7 }));
  // pylon
  const p = grp([], { x: 2.6, z: -1.6, y: 0.3 });
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) p.add(rod([x, 0, z], [x * 0.3, 6.2, z * 0.3], 0.07, "#8f939c"));
  for (let i = 1; i < 6; i++) { const f = i / 6, w = 0.7 * (1 - f * 0.7), y = 6.2 * f; p.add(rod([-w, y, -w], [w, y, w], 0.035, "#8f939c"), rod([w, y, -w], [-w, y, w], 0.035, "#8f939c")); }
  p.add(box(3.6, 0.12, 0.12, "#8f939c", { y: 5.8, sharp: true }), box(2.8, 0.12, 0.12, "#8f939c", { y: 4.6, sharp: true }));
  for (const x of [-1.8, 1.8]) p.add(cyl(0.06, 0.5, "#cfe3f2", { x, y: 5.3, seg: 8 }));
  k.push(p);
  return grp(k);
}
function water(c) {
  const k = [];
  k.push(box(9, 6.0, 0.3, "#c9c6bb", { sharp: true }));
  // tower
  const tw = grp([], { x: -1.2, z: -0.4, y: 0.3 });
  for (const [x, z] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) tw.add(rod([x * 1.15, 0, z * 1.15], [x * 0.9, 4.2, z * 0.9], 0.1, "#8f939c"));
  for (const y of [1.4, 2.8]) { const f = 1 - y / 4.2 * 0.22; tw.add(box(2.0 * f * 1.1, 2.0 * f * 1.1, 0.08, "#8f939c", { y, sharp: true })); }
  tw.add(cyl(1.9, 2.4, c, { y: 4.2 }), cyl(1.95, 0.18, S(c, -0.15), { y: 4.8 }), cyl(1.95, 0.18, S(c, -0.15), { y: 5.9 }), cone(1.95, 1.2, S(c, -0.18), { y: 6.6 }), cyl(0.12, 0.5, GREY, { y: 7.8, seg: 8 }));
  k.push(tw);
  // pump house
  k.push(block(3.0, 2.6, 2.2, wall(c, 0.65), { y: 0.3, x: 3.0, z: 0.5, front: { cols: 2, rows: 1, w: 2.2 }, side: { cols: 1, rows: 1 }, y0: 0.8, wh: 0.9 }), prism(3.3, 2.9, 0.9, S(c, -0.2), { y: 2.5, x: 3.0, z: 0.5 }));
  // pipes
  k.push(cyl(0.22, 3.6, "#7fa0b8", { rz: Math.PI / 2, x: 0.6, z: 2.4, y: 0.7 }).translateX(0.0), cyl(0.28, 0.2, "#6a8aa0", { rz: Math.PI / 2, x: -1.0, z: 2.4, y: 0.7 }), cyl(0.28, 0.2, "#6a8aa0", { rz: Math.PI / 2, x: 2.0, z: 2.4, y: 0.7 }));
  k.push(cyl(0.22, 1.0, "#7fa0b8", { x: 3.6, z: 2.4, y: 0.7 }), cyl(0.16, 0.3, RED, { x: 0.6, z: 2.4, y: 1.4, seg: 12 }));
  // drop
  const dr = grp([sphere(0.5, "#6fb0ee", {}), cone(0.46, 1.0, "#6fb0ee", { y: 0.82 })], { x: -4.0, z: 2.4, y: 0.3 }); k.push(dr);
  return grp(k);
}
function heating(c) {
  const b = wall("#d8d0c4", 0.35), k = [];
  k.push(box(9.4, 5.8, 0.3, "#c9c6bb", { sharp: true }));
  k.push(block(5.6, 3.8, 3.4, b, { y: 0.3, x: -1.2, z: 0.6, front: { cols: 3, rows: 1, w: 4.2 }, side: { cols: 2, rows: 1 }, y0: 1.0, wh: 1.4 }));
  k.push(box(6.0, 4.2, 0.3, S(c, -0.14), { y: 3.7, x: -1.2, z: 0.6 }));
  k.push(arch(1.3, 2.0, DOOR, { y: 0.3, x: -1.2, z: 2.52 }));
  // chimneys
  for (const [x, z, h] of [[2.8, -1.6, 7.5], [4.0, -0.6, 6.0]]) { for (let i = 0; i < 6; i++) k.push(cyl(0.65 - h * 0.012 + (6 - i) * 0.0, h / 6, i % 2 ? WHITE : c, { x, z, y: 0.3 + i * (h / 6), rTop: 0.55 - h * 0.012 * 0.0, seg: 40 })); k.push(cyl(0.6, 0.18, GREY, { x, z, y: 0.3 + h })); }
  // steam
  k.push(sphere(0.55, "#f2f1ee", { x: 2.9, z: -1.6, y: 8.1 }), sphere(0.75, "#f6f5f2", { x: 3.5, z: -1.7, y: 8.6 }), sphere(0.5, "#f2f1ee", { x: 4.1, z: -1.5, y: 8.5 }));
  // pipes
  k.push(cyl(0.2, 4.4, "#a9afba", { rz: Math.PI / 2, x: 0.0, z: 3.4, y: 0.8 }), cyl(0.2, 4.4, c, { rz: Math.PI / 2, x: 0.0, z: 3.0, y: 0.8 }));
  for (const x of [-1.8, 0, 1.8]) k.push(torus(0.26, 0.05, GREY, { x, y: 1.0, z: 3.4, ry: Math.PI / 2 }));
  return grp(k);
}
function waste(c) {
  const k = [];
  k.push(box(9, 5.6, 0.3, STONE, { sharp: true }));
  k.push(block(7.6, 2.6, 2.8, wall(c, 0.7), { y: 0.3, z: -1.7, front: { cols: 4, rows: 1, w: 6.4 }, side: { cols: 1, rows: 1 }, y0: 1.0, wh: 1.0 }));
  k.push(prism(8.0, 3.0, 0.9, S(c, -0.15), { y: 3.1, z: -1.7 }));
  const bin = (x, col) => grp([cyl(0.6, 1.6, col, { rTop: 0.72, seg: 32 }), cyl(0.78, 0.2, S(col, -0.14), { y: 1.6, seg: 32 }), box(0.7, 0.3, 0.16, S(col, -0.2), { y: 1.75, z: 0.2 }), box(1.0, 0.1, 0.5, S(col, -0.1), { y: 0.8, z: 0.65, sharp: true }), wheel(0.2, { x: -0.3, y: 0.2, z: -0.5 }), wheel(0.2, { x: 0.3, y: 0.2, z: -0.5 })], { x, z: 1.1, y: 0.3 });
  k.push(bin(-2.5, "#5f8f4a"), bin(0, "#2f7fd0"), bin(2.5, "#e2c94a"));
  k.push(shape2d([[0, 0.55], [-0.5, -0.3], [0.5, -0.3]], 0.05, WHITE, { x: -2.5, z: 1.1 + 0.74, y: 1.0 }));
  return grp(k);
}
function parking(c) {
  const k = [];
  k.push(box(9.2, 6.2, 0.3, "#c9c6bb", { sharp: true }));
  const W = 7.2, Dp = 4.2;
  for (const [x, z] of [[-W / 2, -Dp / 2], [W / 2, -Dp / 2], [-W / 2, Dp / 2], [W / 2, Dp / 2], [0, -Dp / 2], [0, Dp / 2]]) k.push(box(0.4, 0.4, 5.2, "#b7b4a9", { x, z, y: 0.3 }));
  for (let i = 0; i < 3; i++) {
    const y = 0.3 + 1.7 * (i + 1) - 0.3; k.push(box(W + 0.6, Dp + 0.6, 0.3, "#d4d1c6", { y }));
    k.push(box(W + 0.6, 0.12, 0.55, c, { y: y + 0.0, z: Dp / 2 + 0.3, sharp: true }));
    if (i < 3) for (let n = 0; n < 3; n++) { const col = [RED, WHITE, "#2f7fd0", AMBER, "#5f8f4a"][(i * 3 + n) % 5]; k.push(grp([carBody(col)], { x: -2.3 + n * 2.3 + (i % 2) * 0.3, z: -0.2, y: y + 0.3, scale: 0.34 })); }
  }
  k.push(box(W + 1.0, Dp + 1.0, 0.3, S(c, -0.1), { y: 5.4 }));
  // P sign
  const psq = grp([box(1.8, 0.12, 1.8, c, { y: 0 }), box(0.28, 0.06, 1.1, WHITE, { x: -0.3, y: 0.35, z: 0.09, sharp: true }), box(0.8, 0.06, 0.26, WHITE, { x: 0.1, y: 1.2, z: 0.09, sharp: true }), box(0.8, 0.06, 0.26, WHITE, { x: 0.1, y: 0.7, z: 0.09, sharp: true }), box(0.26, 0.06, 0.8, WHITE, { x: 0.42, y: 0.75, z: 0.09, sharp: true })], { x: -4.0, z: 3.0, y: 2.0 });
  k.push(cyl(0.06, 2.0, GREY, { x: -4.0, z: 3.0, y: 0.3, seg: 8 }), psq);
  // barrier
  k.push(box(0.4, 0.4, 0.9, GREY, { x: 3.9, z: 3.0, y: 0.3 }), box(2.4, 0.12, 0.12, RED, { x: 2.8, z: 3.0, y: 1.0, sharp: true }), box(0.5, 0.12, 0.13, WHITE, { x: 2.3, z: 3.0, y: 1.0, sharp: true }), box(0.5, 0.12, 0.13, WHITE, { x: 3.2, z: 3.0, y: 1.0, sharp: true }));
  return grp(k);
}
function cemetery(c) {
  const k = [];
  k.push(box(8.0, 5.8, 0.2, "#c9d0c0", { sharp: true }));
  k.push(box(2.6, 0.4, 1.1, "#cfcabb", { x: -2.7, z: 2.6, y: 0.2 }), box(2.6, 0.4, 1.1, "#cfcabb", { x: 2.7, z: 2.6, y: 0.2 }));
  k.push(box(0.9, 0.9, 3.0, STONE, { x: -1.15, z: 2.6, y: 0.2 }), box(0.9, 0.9, 3.0, STONE, { x: 1.15, z: 2.6, y: 0.2 }), box(3.2, 0.9, 0.5, STONE, { y: 3.2, z: 2.6 }));
  k.push(box(0.16, 0.16, 1.2, GREY, { y: 3.7, z: 2.6 }), box(0.7, 0.16, 0.16, GREY, { y: 4.4, z: 2.6 }));
  for (let i = 0; i < 6; i++) k.push(box(0.05, 0.07, 2.3, INK, { x: -0.7 + i * 0.28, y: 0.4, z: 2.6, sharp: true }));
  const stone = (x, z, h, col) => grp([box(1.2, 0.4, h, col), cyl(0.6, 0.4, col, { rx: Math.PI / 2, y: h, z: -0.0, seg: 24 }).translateZ(0.0), box(1.5, 1.1, 0.14, S(col, -0.05), { z: 0.6 })], { x, z, y: 0.2 });
  [[-2.6, 0.5, 1.5], [-0.5, 0.0, 1.9], [1.6, 0.7, 1.3], [3.1, 0.0, 1.7], [-2.4, -1.9, 1.4], [-0.3, -1.8, 1.8], [1.9, -1.8, 1.4]].forEach(([x, z, h], i) => k.push(stone(x, z, h, i % 2 ? "#d3d1ca" : "#e8e6e0")));
  k.push(box(0.2, 0.2, 2.2, GREY, { x: 1.0, z: -0.7, y: 0.2 }), box(0.9, 0.2, 0.2, GREY, { x: 1.0, z: -0.7, y: 1.6 }));
  k.push(cypress(6.0, "#4b6b4c", { x: -3.7, z: -1.6 }), cypress(5.0, "#56795a", { x: 3.8, z: -2.1 }), cypress(4.0, "#4b6b4c", { x: 3.7, z: 1.6 }));
  return grp(k);
}
function vet(c) {
  const b = wall(c, 0.75), k = [];
  k.push(box(8.6, 5.2, 0.3, STONE, { sharp: true }));
  k.push(block(6.2, 3.6, 2.8, b, { y: 0.3, x: -0.6, z: -0.3, front: { cols: 3, rows: 1, w: 4.6 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.3 }));
  k.push(pitchedRoof(6.2, 3.6, 1.4, S(c, -0.16), { y: 3.1, x: -0.6, z: -0.3 }), door(1.1, 1.8, DOOR, { y: 0.3, x: -0.6, z: 1.52 }));
  // paw sign
  const paw = grp([sphere(0.55, c, { sy: 0.8 }), sphere(0.22, c, { x: -0.62, y: 0.45, z: 0.0 }), sphere(0.22, c, { x: -0.25, y: 0.9, z: 0.0 }), sphere(0.22, c, { x: 0.25, y: 0.9, z: 0.0 }), sphere(0.22, c, { x: 0.62, y: 0.45, z: 0.0 })]);
  paw.children.forEach((m) => { m.scale.z = 0.5; });
  k.push(cyl(1.15, 0.2, WHITE, { rx: Math.PI / 2, y: 2.35, x: -0.6, z: 1.85, seg: 48 }), grp([paw], { x: -0.6, y: 1.65, z: 2.0, scale: 0.85 }));
  k.push(tree(2.4, GREEN, { x: 3.6, z: 1.2 }));
  // doghouse
  k.push(box(1.1, 1.0, 0.8, WOOD, { x: 3.2, z: 2.4, y: 0.3 }), prism(1.3, 1.2, 0.6, RED, { ridge: "z", x: 3.2, z: 2.4, y: 1.1 }), arch(0.4, 0.55, INK, { x: 3.2, z: 2.92, y: 0.3 }));
  return grp(k);
}
function elderly(c) {
  const b = wall(c, 0.7), k = [];
  k.push(box(10, 5.6, 0.3, STONE, { sharp: true }));
  k.push(block(8.4, 3.2, 3.6, b, { y: 0.3, z: -0.5, front: { cols: 5, rows: 2, w: 7.2 }, side: { cols: 2, rows: 2 }, y0: 0.4, wh: 3.0 }));
  k.push(pitchedRoof(8.4, 3.2, 1.2, S(c, -0.14), { y: 3.9, z: -0.5 }));
  // balconies
  for (const x of [-2.6, 2.6]) k.push(box(1.6, 0.6, 0.12, STONE, { x, y: 2.1, z: 1.4 }), box(1.6, 0.05, 0.5, "#b9b5a8", { x, y: 2.2, z: 1.7, sharp: true }));
  k.push(door(1.2, 1.7, DOOR, { y: 0.3, z: 1.12 }));
  // ramp
  k.push(box(2.6, 1.4, 0.3, STONE, { z: 2.1, y: 0.3, rx: 0.0, x: 1.4 }));
  k.push(bench(1.6, { x: -2.8, z: 2.4, y: 0.3 }), tree(2.6, "#79a45e", { x: -4.3, z: 1.4 }));
  k.push(grp([cyl(0.35, 0.25, "#a9c48a", {}), sphere(0.22, c, { y: 0.1, x: 0.1 }), sphere(0.18, "#e2c94a", { y: 0.15, x: -0.12, z: 0.1 })], { x: 3.9, z: 2.4, y: 0.3 }));
  return grp(k);
}
function translator(c) {
  const b = wall(c, 0.72), k = [];
  k.push(box(8.8, 5.4, 0.3, STONE, { sharp: true }));
  k.push(block(5.2, 3.2, 2.8, b, { y: 0.3, x: 0, z: 0.8, front: { cols: 3, rows: 1, w: 3.8 }, side: { cols: 2, rows: 1 }, y0: 0.9, wh: 1.3 }));
  k.push(pitchedRoof(5.2, 3.2, 1.2, S(c, -0.12), { y: 3.1, x: 0, z: 0.8 }), door(1.0, 1.7, DOOR, { y: 0.3, z: 2.42 }));
  const bub = (w, h, tail) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2, r = 0.35; s.moveTo(x + r, y); s.lineTo(tail * 1 - 0.6 + 0, y); s.lineTo(tail, y - 0.7); s.lineTo(tail + 0.7, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  k.push(shape2d(bub(2.8, 1.8, -0.8), 0.3, c, { x: -2.4, y: 4.6, z: -0.6 }), shape2d(bub(2.8, 1.8, 1.6), 0.3, S(c, -0.16), { x: 2.2, y: 5.5, z: -0.8 }));
  for (let i = 0; i < 3; i++) k.push(box(1.7 - i * 0.3, 0.08, 0.14, WHITE, { x: -2.4, y: 5.1 + i * 0.3, z: -0.4, sharp: true }), box(1.7 - i * 0.2, 0.08, 0.14, WHITE, { x: 2.2, y: 6.0 + i * 0.3, z: -0.6, sharp: true }));
  return grp(k);
}
function driving(c) {
  const b = wall(c, 0.72), k = [];
  k.push(box(9.6, 6.0, 0.2, "#c9c6bb", { sharp: true }));
  k.push(block(4.8, 2.8, 2.8, b, { y: 0.2, x: -2.2, z: -1.2, front: { cols: 3, rows: 1, w: 3.6 }, side: { cols: 1, rows: 1 }, y0: 0.9, wh: 1.2 }));
  k.push(box(5.2, 3.2, 0.3, c, { y: 3.0, x: -2.2, z: -1.2 }), door(1.0, 1.7, DOOR, { y: 0.2, x: -2.2, z: 0.22 }));
  k.push(box(9, 2.0, 0.08, "#4a4b52", { y: 0.2, z: 2.0, sharp: true }));
  for (let i = 0; i < 6; i++) k.push(box(0.8, 0.12, 0.04, WHITE, { x: -3.6 + i * 1.4, y: 0.27, z: 2.0, sharp: true }));
  // car with roof sign
  const car = grp([carBody(c), box(0.9, 0.35, 0.22, WHITE, { y: 1.75, x: -0.2 }), box(0.55, 0.06, 0.16, c, { y: 1.9, x: -0.2, z: 0.18, sharp: true })], { x: 2.2, z: 1.2, y: 0.27, ry: 0.0, scale: 0.8 });
  k.push(car);
  for (const [x, z] of [[-0.6, 3.1], [0.2, 3.3], [1.0, 3.1]]) k.push(cone(0.28, 0.65, "#e2532e", { x: x - 0.8, z, y: 0.2 }), cyl(0.28, 0.06, WHITE, { x: x - 0.8, z, y: 0.5, rTop: 0.2 }));
  k.push(tree(2.2, GREEN, { x: -4.2, z: 2.6 }));
  return grp(k);
}
// ---- generic / legacy keys --------------------------------------------------
function landmark(c) {
  const b = wall(c, 0.55), k = [];
  k.push(box(8.4, 5.4, 0.3, STONE, { sharp: true }));
  k.push(box(7.2, 4.0, 3.4, b, { y: 0.3, z: -0.4 }), steps(4, 4.8, 0.4, 0.12, STONE, { z: 2.3, y: 0.3 }));
  k.push(portico({ n: 6, sp: 0.95, r: 0.3, h: 3.2, color: CREAM, roof: S(b, 0), depth: 1.5, zf: 0.8, y: 0.3, pedH: 1.1 }));
  k.push(door(1.2, 2.0, DOOR, { y: 0.3, z: 1.6 }), box(7.6, 4.4, 0.3, S(b, -0.06), { y: 3.7, z: -0.4 }));
  return grp(k);
}
function building(c) {
  const b = wall(c, 0.5), k = [];
  k.push(box(7.6, 6.0, 0.3, STONE, { sharp: true }));
  k.push(block(5.0, 4.2, 7.0, b, { y: 0.3, front: { cols: 3, rows: 5, w: 3.8 }, side: { cols: 3, rows: 5 }, y0: 0.9, wh: 6.0 }));
  k.push(box(5.3, 4.5, 0.3, S(c, -0.1), { y: 7.3 }), door(1.1, 1.6, GLASS, { y: 0.3, z: 2.12 }), box(5.2, 4.4, 0.8, S(b, 0.03), { y: 0.3, z: 0 }).translateY(0));
  return grp(k.slice(0, -1));
}
function building2(c) {
  const b = wall(c, 0.55), k = [];
  k.push(box(9.6, 6.0, 0.3, STONE, { sharp: true }));
  k.push(block(3.6, 3.4, 4.6, b, { y: 0.3, x: -2.6, z: 0.2, front: { cols: 2, rows: 3, w: 2.6 }, side: { cols: 2, rows: 3 }, y0: 0.7, wh: 3.4 }));
  k.push(block(4.0, 3.6, 7.0, wall(c, 0.45), { y: 0.3, x: 1.8, z: -0.6, front: { cols: 2, rows: 5, w: 2.8 }, side: { cols: 3, rows: 5 }, y0: 0.7, wh: 5.8 }));
  k.push(box(3.9, 3.7, 0.3, S(c, -0.1), { y: 4.9, x: -2.6, z: 0.2 }), box(4.3, 3.9, 0.3, S(c, -0.1), { y: 7.3, x: 1.8, z: -0.6 }), door(1.0, 1.5, GLASS, { y: 0.3, x: -2.6, z: 1.9 }));
  return grp(k);
}
function factory(c) {
  const b = wall(c, 0.5), k = [];
  k.push(box(9.4, 6.0, 0.3, "#c9c6bb", { sharp: true }));
  k.push(block(7.2, 4.0, 2.6, b, { y: 0.3, x: -0.6, front: { cols: 4, rows: 1, w: 5.6 }, side: { cols: 2, rows: 1 }, y0: 1.0, wh: 1.0 }));
  for (let i = 0; i < 3; i++) { const x = -2.4 + i * 2.4; const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(2.4, 0); s.lineTo(2.4, 1.3); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 4.0, bevelEnabled: false }); g.translate(-1.2, 0, -2.0); const m = new THREE.Mesh(g, D.mat(S(c, -0.12))); m.position.set(x - 0.6, 2.9, 0); m.castShadow = m.receiveShadow = true; k.push(m); k.push(box(0.05, 3.6, 1.0, GLASS, { x: x - 0.6 + 1.22, y: 2.9, z: 0, sharp: true }).translateY(0)); }
  for (let i = 0; i < 5; i++) k.push(cyl(0.7 - i * 0.04, 1.1, i % 2 ? WHITE : c, { x: 3.3, z: -1.6, y: 0.3 + i * 1.1, seg: 36 }));
  k.push(sphere(0.6, "#f2f1ee", { x: 3.5, z: -1.6, y: 6.1 }), sphere(0.45, "#f2f1ee", { x: 4.0, z: -1.5, y: 6.6 }));
  k.push(door(1.8, 2.0, S(DARK, -0.02), { y: 0.3, x: -0.6, z: 2.02 }));
  return grp(k);
}
function home(c) {
  const b = wall(c, 0.68), k = [];
  k.push(box(8.0, 6.0, 0.3, STONE, { sharp: true }));
  k.push(block(5.4, 3.8, 3.0, b, { y: 0.3, front: { cols: 3, rows: 1, w: 4.2 }, side: { cols: 2, rows: 1 }, y0: 1.0, wh: 1.4 }));
  k.push(pitchedRoof(5.4, 3.8, 2.2, S(c, -0.18), { y: 3.3 }), box(0.7, 0.7, 1.6, "#b9967a", { x: 1.6, z: -0.8, y: 4.0 }), door(1.0, 1.9, WOOD, { y: 0.3, x: 0, z: 1.92 }), steps(2, 1.5, 0.3, 0.1, STONE, { y: 0.3, z: 1.95 }));
  k.push(tree(2.6, GREEN, { x: 3.6, z: 1.8 }), fence(3.0, CREAM, { x: -2.6, z: 2.6, y: 0.3 }));
  return grp(k);
}

export const BUILDINGS = {
  parliament, court, townhall, police, post, hospital, clinic, school, kindergarten, university, library, "theater-house": theater, museum, "bank-house": bankHouse, embassy, tax, cadastre, fire, "pharmacy-house": pharmacy, church, sports, market, busstation, trainstation, airport, prison, registry, employment, pension, insurance, telecom, notary, utility, water, heating, waste, parking, cemetery, vet, "elderly-home": elderly, translator, driving,
  landmark, building, "building-2": building2, factory, home, bank: bankHouse, theater,
};
export const BUILDING_HUES = {
  parliament: "#8e97b8", court: "#8a6a3a", townhall: "#a9a3b8", police: "#2f52ea", post: "#e2c94a", hospital: "#c8313a", clinic: "#2f9e6a", school: "#8e97b8", kindergarten: "#e2a03a", university: "#1f2a5b", library: "#8a6a3a",
  "theater-house": "#8a1f26", museum: "#c4a98a", "bank-house": "#8e97b8", embassy: "#2f52ea", tax: "#6b6e76", cadastre: "#5f8f4a", fire: "#e2532e", "pharmacy-house": "#2f9e6a", church: "#c4a98a", sports: "#2f52ea", market: "#c4a98a", busstation: "#e2a03a", trainstation: "#6b6e76", airport: "#2f7fd0",
  prison: "#6b6e76", registry: "#a9a3b8", employment: "#2f52ea", pension: "#b89a6b", insurance: "#2f7fd0", telecom: "#2f52ea", notary: "#8a6a3a", utility: "#e2c94a", water: "#2f7fd0", heating: "#e2532e", waste: "#5f8f4a", parking: "#2f52ea", cemetery: "#6b6e76", vet: "#c06a8a", "elderly-home": "#c4a98a", translator: "#2f52ea", driving: "#c8313a",
  landmark: "#8e97b8", building: "#a9a3b8", "building-2": "#a9a3b8", factory: "#9a9aa8", home: "#c4a98a", bank: "#8e97b8", theater: "#8a1f26",
};
