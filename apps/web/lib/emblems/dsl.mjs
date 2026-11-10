// Tiny declarative DSL on Three.js. Conventions: y is up, the facade faces +z, x is to the right.
// Every helper takes size args, a colour, and an options bag {x,y,z,ry,rx,rz}: x/z = centre on the ground plane, y = bottom.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export { THREE };

// ---- palette -------------------------------------------------------------
export const CREAM = "#f1ece0", STONE = "#e2ddd0", DARK = "#39425a", DOOR = "#2a2f40", GOLD = "#c9a84a", RED = "#c8313a",
  WOOD = "#8a6a3a", GREEN = "#5f8f4a", GLASS = "#a9c8e8", GREY = "#6b6e76", WHITE = "#f6f4ee", INK = "#2b2d33", BLUE = "#2f52ea", AMBER = "#e2a03a";

const _c = new THREE.Color(), _h = {};
/** shift lightness (and saturation) of a hex colour in sRGB-HSL */
export function S(hex, dl = 0, ds = 0) {
  _c.set(hex); _c.getHSL(_h, THREE.SRGBColorSpace);
  _c.setHSL(_h.h, Math.max(0, Math.min(1, _h.s + ds)), Math.max(0, Math.min(1, _h.l + dl)), THREE.SRGBColorSpace);
  return "#" + _c.getHexString();
}
/** mix colour a toward b by t */
export function T(a, t = 0.5, b = CREAM) { const x = new THREE.Color(a), y = new THREE.Color(b); x.lerp(y, t); return "#" + x.getHexString(); }

const mats = new Map();
export function mat(color) {
  const k = String(color);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.85, metalness: 0 }));
  return mats.get(k);
}

function place(o3, o = {}) {
  o3.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rx) o3.rotation.x = o.rx; if (o.ry) o3.rotation.y = o.ry; if (o.rz) o3.rotation.z = o.rz;
  if (o.scale) o3.scale.setScalar(o.scale);
  return o3;
}
function mesh(geo, color, o) {
  const m = new THREE.Mesh(geo, mat(color)); m.castShadow = true; m.receiveShadow = true; return place(m, o);
}

export const grp = (children = [], o = {}) => { const g = new THREE.Group(); for (const c of children.flat(Infinity)) if (c) g.add(c); return place(g, o); };

// ---- primitives ------------------------------------------------------------
/** w = x size, d = z size, h = y size */
export function box(w, d, h, color, o = {}) {
  const small = Math.min(w, d, h);
  const geo = (o.sharp || small < 0.2) ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(0.07, small * 0.3));
  geo.translate(0, h / 2, 0); return mesh(geo, color, o);
}
export function cyl(r, h, color, o = {}) {
  const geo = new THREE.CylinderGeometry(o.rTop ?? r, r, h, o.seg ?? 48);
  // horizontal cylinders (rz = PI/2, i.e. axis along x) are centred on their position so y is the axis height
  if (!(o.rz === Math.PI / 2 || o.axis)) geo.translate(0, h / 2, 0);
  const m = mesh(geo, color, o); if (o.axis === "x") m.rotation.z = Math.PI / 2; if (o.axis === "z") m.rotation.x = Math.PI / 2; return m;
}
export function cone(r, h, color, o = {}) {
  const geo = new THREE.ConeGeometry(r, h, o.seg ?? 48); geo.translate(0, h / 2, 0); return mesh(geo, color, o);
}
export function sphere(r, color, o = {}) {
  const geo = new THREE.SphereGeometry(r, 40, 24); geo.translate(0, r, 0);
  const m = mesh(geo, color, o); if (o.sx || o.sy || o.sz) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); return m;
}
export function torus(R, r, color, o = {}) {
  const geo = new THREE.TorusGeometry(R, r, 16, o.seg ?? 48, o.arc ?? Math.PI * 2); return mesh(geo, color, o);
}
export function capsule(r, len, color, o = {}) { const geo = new THREE.CapsuleGeometry(r, len, 8, 24); return mesh(geo, color, o); }
/** hemisphere dome; base circle at y */
export function dome(r, color, o = {}) {
  const geo = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2); return mesh(geo, color, o);
}
/** tube along points [[x,y,z],...] */
export function tube(points, r, color, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, o.seg ?? 48, r, 12, false), color, o);
}
/** thin rod between two points */
export function rod(a, b, r, color) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
  const geo = new THREE.CylinderGeometry(r, r, len, 10); const m = mesh(geo, color, {});
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); return m;
}

/** extrude a 2D shape (THREE.Shape or [[x,y],...]) upright, facing +z. Centred on x, bottom at y, centred on z. */
export function shape2d(shape, depth, color, o = {}) {
  let s = shape;
  if (Array.isArray(shape)) { s = new THREE.Shape(); shape.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); }
  const bev = o.bevel ?? Math.min(0.08, depth * 0.25);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, depth - bev * 2), bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 24 });
  geo.computeBoundingBox(); const b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return mesh(geo, color, o);
}
/** extrude a shape drawn in the XZ ground plane (x, z) upward by h; base at y */
export function plan(shape, h, color, o = {}) {
  let s = shape;
  if (Array.isArray(shape)) { s = new THREE.Shape(); shape.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2); // shape (x,y) -> ground (x,-z); extrusion -> up
  return mesh(geo, color, o);
}
export function ellipseShape(rx, ry, hole) {
  const s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  if (hole) { const p = new THREE.Path(); p.absellipse(0, 0, hole[0], hole[1], 0, Math.PI * 2, true, 0); s.holes.push(p); }
  return s;
}
export function rrectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}

// ---- architecture helpers --------------------------------------------------
/** triangular prism. ridge:'z' => gable seen from front (pediment); ridge:'x' (default) => roof ridge runs along x. */
export function prism(w, d, h, color, o = {}) {
  const s = new THREE.Shape();
  if ((o.ridge ?? "x") === "z") { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2); return mesh(geo, color, o); }
  s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-w / 2, 0, 0); return mesh(geo, color, o);
}
export const pitchedRoof = (w, d, h, color, o = {}) => prism(w + 0.4, d + 0.4, h, color, o);
/** hip/pyramid roof */
export function pyramid(w, d, h, color, o = {}) {
  const geo = new THREE.ConeGeometry(0.5, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w * Math.SQRT2, 1, d * Math.SQRT2); geo.translate(0, h / 2, 0); return mesh(geo, color, o);
}
/** semi-circular vault along z (barrel roof) */
export function vault(r, len, color, o = {}) {
  const s = new THREE.Shape(); s.moveTo(-r, 0); s.absarc(0, 0, r, Math.PI, 0, true); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 40 }); geo.translate(0, 0, -len / 2); return mesh(geo, color, o);
}
/** n columns along x, centred. Includes base + capital blocks. */
export function colonnade(n, spacing, radius, height, color = CREAM, o = {}) {
  const kids = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing;
    kids.push(cyl(radius, height, color, { x, seg: 28 }), box(radius * 2.7, radius * 2.7, 0.14, S(color, -0.03), { x, sharp: true }), box(radius * 2.9, radius * 2.9, 0.16, S(color, -0.03), { x, y: height - 0.16, sharp: true }));
  }
  return grp(kids, o);
}
/** n steps toward +z. Back edge of the top step at z=0; first step is widest. returns group; top is at n*rise */
export function steps(n, w, depth, rise, color = STONE, o = {}) {
  const kids = [];
  for (let i = 0; i < n; i++) { const sd = depth * (n - i); kids.push(box(w + (n - 1 - i) * 0.5, sd, rise * (i + 1), S(color, -i * 0.012), { z: sd / 2, sharp: true })); }
  return grp(kids, o);
}
/** dark inset panes on a facade. Group origin = bottom-centre of the area, facing +z. cell area = w x h. */
export function windowGrid(cols, rows, w, h, o = {}) {
  const kids = [], cw = w / cols, ch = h / rows;
  const pw = (o.pw ?? 0.52) * cw, ph = (o.ph ?? 0.58) * ch, col = o.color ?? DARK, sill = o.sill ?? true, frame = o.frame;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = -w / 2 + cw * (i + 0.5), y = ch * j + ch * 0.2;
    if (frame) kids.push(box(pw + 0.14, 0.05, ph + 0.14, frame, { x, y: y - 0.07, z: 0.005, sharp: true }));
    kids.push(box(pw, 0.07, ph, col, { x, y, z: 0.012, sharp: true }));
    if (sill) kids.push(box(pw + 0.18, 0.12, 0.07, o.sillColor ?? STONE, { x, y: y - 0.07, z: 0.05, sharp: true }));
  }
  return grp(kids, o);
}
/** a building mass with windows on front (+z) and right (+x) faces */
export function block(w, d, h, color, o = {}) {
  const kids = [box(w, d, h, color, { sharp: o.sharp })];
  const fr = o.front ?? { cols: Math.max(2, Math.round(w / 1.3)), rows: Math.max(1, Math.round(h / 1.4)) };
  const sd = o.side ?? { cols: Math.max(1, Math.round(d / 1.5)), rows: fr.rows };
  const pad = o.pad ?? 0.5, y0 = o.y0 ?? 0.25, wh = (o.wh ?? h - y0 - 0.15 - (o.top ?? 0));
  if (fr) kids.push(windowGrid(fr.cols, fr.rows, (fr.w ?? w - pad * 2), fr.h ?? wh, { y: y0, z: d / 2, color: o.pane, frame: o.frame, sill: o.sill, pw: o.pw, ph: o.ph, x: fr.x || 0 }));
  if (sd && sd !== false) kids.push(windowGrid(sd.cols, sd.rows, sd.w ?? d - pad * 2, sd.h ?? wh, { y: y0, z: 0, x: w / 2, ry: Math.PI / 2, color: o.pane, frame: o.frame, sill: o.sill, pw: o.pw, ph: o.ph }));
  return grp(kids, o);
}
/** door with frame, facing +z, bottom-centre origin */
export function door(w, h, color = DOOR, o = {}) {
  return grp([box(w + 0.3, 0.1, h + 0.15, o.frame ?? STONE, { sharp: true }), box(w, 0.14, h, color, { z: 0.02, sharp: true }), box(0.07, 0.17, 0.5, GOLD, { x: w * 0.3, y: h * 0.45, z: 0.04, sharp: true })], o);
}
/** arched door/window (dark), facing +z */
export function arch(w, h, color = DOOR, o = {}) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: o.depth ?? 0.12, bevelEnabled: false, curveSegments: 24 }); return mesh(geo, color, o);
}
export function flagMast(h, flagColors = [RED, WHITE, BLUE], o = {}) {
  const kids = [cyl(0.06, h, "#b9b5a8", { seg: 12 }), sphere(0.1, GOLD, { y: h })];
  const fh = h * 0.2, fw = h * 0.32, n = flagColors.length;
  flagColors.forEach((c, i) => kids.push(box(fw, 0.05, fh / n, c, { x: fw / 2 + 0.06, y: h - fh + (n - 1 - i) * (fh / n) - 0.1, sharp: true })));
  return grp(kids, o);
}
/** round clock face on a +z facade */
export function clockFace(r, o = {}) {
  const f = cyl(r, 0.14, WHITE, { rx: Math.PI / 2, seg: 40, y: r, z: 0.0 });
  const rim = torus(r, r * 0.09, GOLD, { y: r, z: 0.07 });
  return grp([f, rim, box(r * 0.12, 0.04, r * 0.8, INK, { y: r, z: 0.17, sharp: true }), box(r * 0.7, 0.04, r * 0.12, INK, { x: r * 0.3, y: r - r * 0.06, z: 0.17, sharp: true })], o);
}
/** plus-sign flat sign facing +z. size = overall width */
export function crossSign(size, color, o = {}) {
  const t = size * 0.34; return grp([box(size, o.depth ?? 0.22, t, color, { y: (size - t) / 2 }), box(t, o.depth ?? 0.22, size, color)], o);
}
export function sign(w, h, color, o = {}) { return box(w, o.depth ?? 0.14, h, color, o); }
/** stack of rows of coloured spines */
export function books(n, h, colors, o = {}) {
  const kids = []; let x = 0;
  for (let i = 0; i < n; i++) { const w = 0.16 + ((i * 37) % 5) * 0.03, hh = h * (0.78 + ((i * 53) % 4) * 0.07); kids.push(box(w, 0.5, hh, colors[i % colors.length], { x: x + w / 2, sharp: true })); x += w + 0.015; }
  const g = grp(kids, o); g.userData.width = x; kids.forEach((k) => (k.position.x -= x / 2)); return g;
}
export function tree(h, color = GREEN, o = {}) {
  return grp([cyl(h * 0.06, h * 0.45, WOOD, { seg: 10 }), sphere(h * 0.3, color, { y: h * 0.32 }), sphere(h * 0.2, S(color, 0.05), { y: h * 0.62, x: h * 0.05 })], o);
}
export function cypress(h, color = "#4b6b4c", o = {}) { return grp([cyl(h * 0.04, h * 0.2, WOOD, { seg: 8 }), cone(h * 0.16, h * 0.85, color, { y: h * 0.15, seg: 24 })], o); }
export function wheel(r, o = {}) {
  const a = new THREE.CylinderGeometry(r, r, r * 0.6, 28); a.rotateX(Math.PI / 2);
  const b = new THREE.CylinderGeometry(r * 0.55, r * 0.55, r * 0.66, 20); b.rotateX(Math.PI / 2);
  const t = new THREE.Mesh(a, mat("#2a2c33")), h = new THREE.Mesh(b, mat("#b9b5a8")); t.castShadow = h.castShadow = true;
  return grp([t, h], { ...o, y: o.y || r });
}
export function carBody(c, o = {}) {
  const k = [];
  k.push(box(3.6, 1.7, 0.75, c, { y: 0.35 }), box(2.0, 1.55, 0.7, S(c, -0.04), { y: 1.05, z: -0.05, x: -0.2 }));
  k.push(box(1.7, 0.06, 0.45, GLASS, { y: 1.15, z: 0.74, x: -0.2, sharp: true }), box(0.06, 1.3, 0.45, GLASS, { y: 1.15, x: 0.82, z: -0.05, sharp: true }), box(0.06, 1.3, 0.45, GLASS, { y: 1.15, x: -1.2, z: -0.05, sharp: true }));
  for (const [x, z] of [[-1.1, 0.85], [1.1, 0.85], [-1.1, -0.85], [1.1, -0.85]]) k.push(wheel(0.38, { x: x, y: 0.38, z, ry: x > 0 ? 0 : 0 }));
  return grp(k, o);
}
export function lamp(o = {}) { return grp([cyl(0.05, 2.2, INK, { seg: 8 }), sphere(0.18, "#f3e6b0", { y: 2.15 })], o); }
export function bench(w, o = {}) { return grp([box(w, 0.5, 0.12, WOOD, { y: 0.45 }), box(w, 0.1, 0.45, WOOD, { y: 0.55, z: -0.22 }), box(0.1, 0.4, 0.45, INK, { x: -w / 2 + 0.2, sharp: true }), box(0.1, 0.4, 0.45, INK, { x: w / 2 - 0.2, sharp: true })], o); }
export function fence(w, c = STONE, o = {}) {
  const k = [box(w, 0.06, 0.08, c, { y: 0.28, sharp: true }), box(w, 0.06, 0.08, c, { y: 0.6, sharp: true })];
  const n = Math.round(w / 0.3); for (let i = 0; i <= n; i++) k.push(box(0.07, 0.07, 0.8, c, { x: -w / 2 + (w * i) / n, sharp: true }));
  return grp(k, o);
}
