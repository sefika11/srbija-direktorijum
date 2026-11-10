/**
 * Glyph3D — small isometric "3D rendered" emblems for every institution type, drawn as inline SVG (server-rendered, no JS).
 * One scene per icon key (org_types.icon). Primitives: box, cylinder, sphere, extruded flat shape; three-face shading from one
 * base colour, a soft floor shadow and a top highlight give the rendered look. Colours follow the paper & ink register:
 * one family hue per scene, never saturated fills.
 */
import type { ReactNode } from "react";
import manifest from "@/public/emblems/manifest.json";

/** Keys with a rendered 3D PNG in /public/emblems (built by tools/emblems/render.py). Others fall back to the SVG scenes below. */
const EMBLEMS = new Set<string>(manifest.keys);

type P3 = [number, number, number];
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const S = 11; // world unit → px
function proj([x, y, z]: P3, ox = 80, oy = 104): [number, number] { return [ox + (x - y) * COS * S, oy + (x + y) * SIN * S - z * S]; }
const pts = (arr: P3[], ox?: number, oy?: number) => arr.map((p) => proj(p, ox, oy).map((v) => v.toFixed(1)).join(",")).join(" ");

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100; const k = (n: number) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
const shade = (hex: string, dl: number, ds = 0) => { const [h, s, l] = hsl(hex); return hslToHex(h, Math.max(0, Math.min(100, s + ds)), Math.max(0, Math.min(100, l + dl))); };

type Prim = { depth: number; el: ReactNode };
let uid = 0;
/** axis-aligned box at (x,y,z) with size (w,d,h) */
function box(x: number, y: number, z: number, w: number, d: number, h: number, c: string, key = `b${uid++}`): Prim {
  const top: P3[] = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
  const left: P3[] = [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]];
  const right: P3[] = [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]];
  const g = `g${key}`;
  return { depth: x + y + w / 2 + d / 2 + z / 100, el: (
    <g key={key}>
      <defs>
        <linearGradient id={`${g}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={shade(c, 24, -6)} /><stop offset="1" stopColor={shade(c, 8, -2)} /></linearGradient>
        <linearGradient id={`${g}l`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(c, -2)} /><stop offset="1" stopColor={shade(c, -14)} /></linearGradient>
        <linearGradient id={`${g}r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(c, -14)} /><stop offset="1" stopColor={shade(c, -26)} /></linearGradient>
      </defs>
      <polygon points={pts(left)} fill={`url(#${g}l)`} />
      <polygon points={pts(right)} fill={`url(#${g}r)`} />
      <polygon points={pts(top)} fill={`url(#${g}t)`} />
      <polyline points={pts([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y, z + h]])} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".9" strokeLinejoin="round" />
      <polyline points={pts([[x + w, y + d, z], [x + w, y + d, z + h]])} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".7" />
    </g>) };
}
function cyl(x: number, y: number, z: number, r: number, h: number, c: string, key = `c${uid++}`): Prim {
  const [cx, cy] = proj([x, y, z]); const [tx, ty] = proj([x, y, z + h]);
  const rx = r * COS * S * 1.0, ry = r * SIN * S * 1.0;
  return { depth: x + y + z / 100, el: (
    <g key={key}>
      <path d={`M${(cx - rx).toFixed(1)},${cy.toFixed(1)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 0 ${(cx + rx).toFixed(1)},${cy.toFixed(1)} L${(tx + rx).toFixed(1)},${ty.toFixed(1)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 1 ${(tx - rx).toFixed(1)},${ty.toFixed(1)} Z`} fill={`url(#g-cyl-${key})`} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={shade(c, 14, -4)} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".8" />
      <defs><linearGradient id={`g-cyl-${key}`} x1="0" x2="1"><stop offset="0" stopColor={shade(c, -2)} /><stop offset=".55" stopColor={shade(c, -10)} /><stop offset="1" stopColor={shade(c, -20)} /></linearGradient></defs>
    </g>) };
}
function sphere(x: number, y: number, z: number, r: number, c: string, key = `s${uid++}`): Prim {
  const [cx, cy] = proj([x, y, z + r]);
  return { depth: x + y + z / 100, el: (
    <g key={key}>
      <defs><radialGradient id={`g-sph-${key}`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor={shade(c, 22, -6)} /><stop offset=".6" stopColor={c} /><stop offset="1" stopColor={shade(c, -22)} /></radialGradient></defs>
      <circle cx={cx} cy={cy} r={r * S} fill={`url(#g-sph-${key})`} />
    </g>) };
}
/** flat shape in the vertical x–z plane at depth y, extruded by d along +y (towards the viewer's left face). pts are [x,z]. */
function extrude(shape: [number, number][], y: number, d: number, c: string, key = `e${uid++}`, ox = 0, oz = 0): Prim {
  const front: P3[] = shape.map(([x, z]) => [x + ox, y + d, z + oz]);
  const back: P3[] = shape.map(([x, z]) => [x + ox, y, z + oz]);
  const sides: ReactNode[] = [];
  for (let i = 0; i < shape.length; i++) {
    const a = i, b = (i + 1) % shape.length;
    const quad: P3[] = [back[a], back[b], front[b], front[a]];
    // shade by the edge normal: edges facing up are light, facing right are darker
    const dx = shape[b][0] - shape[a][0], dz = shape[b][1] - shape[a][1];
    const light = dz < 0 ? 12 : dx > 0 ? -16 : -6;
    sides.push(<polygon key={`${key}-${i}`} points={pts(quad)} fill={shade(c, light)} />);
  }
  return { depth: y + d / 2 + ox / 2 + oz / 100, el: (<g key={key}>{sides}<defs><linearGradient id={`gf${key}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={shade(c, 16, -4)} /><stop offset="1" stopColor={shade(c, -2)} /></linearGradient></defs><polygon points={pts(front)} fill={`url(#gf${key})`} /><polygon points={pts(front)} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".8" strokeLinejoin="round" /></g>) };
}
const floor = (c = "#15161a"): Prim => ({ depth: -99, el: <g key="floor"><ellipse cx="80" cy="122" rx="50" ry="15" fill={c} opacity=".07" /><ellipse cx="80" cy="121" rx="34" ry="9" fill={c} opacity=".10" /></g> });

// ---- shapes (x, z) centred near x≈2..4
const HEART: [number, number][] = [[3, 0], [0.6, 2.4], [0.6, 3.6], [1.5, 4.6], [3, 3.6], [4.5, 4.6], [5.4, 3.6], [5.4, 2.4]];
const SHIELD: [number, number][] = [[0.6, 4.8], [5.4, 4.8], [5.4, 2.4], [3, 0], [0.6, 2.4]];
const CROSS: [number, number][] = [[2.1, 0], [3.9, 0], [3.9, 2.1], [6, 2.1], [6, 3.9], [3.9, 3.9], [3.9, 6], [2.1, 6], [2.1, 3.9], [0, 3.9], [0, 2.1], [2.1, 2.1]];
const BOLT: [number, number][] = [[3.2, 6], [0.8, 2.8], [2.6, 2.8], [1.8, 0], [4.6, 3.4], [3, 3.4], [3.6, 6]];
const DROP: [number, number][] = [[3, 6], [1, 3.2], [1, 1.6], [2, 0.4], [3, 0], [4, 0.4], [5, 1.6], [5, 3.2]];
const FLAME: [number, number][] = [[3, 6.4], [1.2, 4.4], [1.2, 2.6], [2.2, 1.2], [2.6, 2.4], [3.4, 0], [4.6, 2], [4.8, 3.8], [4.2, 5.4]];
const TOOTH: [number, number][] = [[1.2, 5.6], [0.6, 3.6], [1, 1.2], [2.4, 0], [3, 0.5], [3.6, 0], [5, 1.2], [5.4, 3.6], [4.8, 5.6], [4, 5.6], [3.6, 3.4], [3, 3.4], [2.6, 5.6], [2, 5.6]];
const BUBBLE: [number, number][] = [[0.6, 2.2], [0.6, 5], [5.4, 5], [5.4, 2.2], [2.6, 2.2], [1.6, 0.8], [1.6, 2.2]];
const ENVELOPE: [number, number][] = [[0.4, 0.4], [5.6, 0.4], [5.6, 3.8], [0.4, 3.8]];
const P_LETTER: [number, number][] = [[1.4, 0], [1.4, 6], [2.8, 6], [2.8, 3.6], [4.2, 3.6], [5.2, 4.6], [5.2, 5], [4.2, 6], [2.8, 6], [2.8, 6], [1.4, 6]];
const STAR: [number, number][] = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 1.3 : 3; return [3 + Math.cos(a) * r, 3 + Math.sin(a) * r] as [number, number]; });

type Scene = (c: string) => Prim[];
const SCENES: Record<string, Scene> = {
  landmark: (c) => [floor(), box(0, 0, 0, 6, 6, 0.6, c), cyl(1, 1, 0.6, 0.45, 3.4, c), cyl(5, 1, 0.6, 0.45, 3.4, c), cyl(1, 5, 0.6, 0.45, 3.4, c), cyl(5, 5, 0.6, 0.45, 3.4, c), box(-0.2, -0.2, 4, 6.4, 6.4, 0.6, c), extrude([[0.2, 4.6], [6.2, 4.6], [3.2, 6.6]], -0.2, 6.4, c)],
  building: (c) => [floor(), box(0.5, 0.5, 0, 5, 5, 6, c), ...[1, 2.6, 4.2].flatMap((z) => [box(5.5, 1.2, z, 0.05, 1, 0.9, "#2b2d33"), box(5.5, 3.3, z, 0.05, 1, 0.9, "#2b2d33"), box(1.2, 5.5, z, 1, 0.05, 0.9, "#2b2d33"), box(3.3, 5.5, z, 1, 0.05, 0.9, "#2b2d33")]), box(2.3, 5.5, 0, 1.4, 0.05, 1.4, "#15161a")],
  "building-2": (c) => [floor(), box(0, 1.5, 0, 3, 4.5, 4, c), box(3.2, 0, 0, 3, 6, 6, shade(c, -6)), box(6.2, 1, 2, 0.05, 1, 0.9, "#2b2d33"), box(6.2, 3.5, 2, 0.05, 1, 0.9, "#2b2d33"), box(6.2, 1, 4, 0.05, 1, 0.9, "#2b2d33"), box(6.2, 3.5, 4, 0.05, 1, 0.9, "#2b2d33"), box(1, 6, 1.5, 1, 0.05, 0.9, "#2b2d33")],
  factory: (c) => [floor(), box(0, 0, 0, 6, 6, 2.6, c), cyl(4.6, 1.4, 2.6, 0.6, 3.2, shade(c, -8)), extrude([[0, 2.6], [2, 4.2], [2, 2.6]], 0, 6, c), extrude([[2, 2.6], [4, 4.2], [4, 2.6]], 0, 6, c)],
  home: (c) => [floor(), box(0.5, 0.5, 0, 5, 5, 3, c), extrude([[0.2, 3], [5.8, 3], [3, 5.4]], 0.2, 5.6, shade(c, -18)), box(2.4, 5.5, 0, 1.2, 0.05, 1.8, "#15161a")],
  receipt: (c) => [floor(), box(0.5, 0.5, 0, 5, 5, 0.3, "#d9d6cb"), box(0.8, 0.8, 0.3, 4.4, 4.4, 0.3, "#e9e6dc"), box(1.1, 1.1, 0.6, 3.8, 3.8, 0.3, "#f4f2ea"), box(1.6, 5, 0.9, 2.8, 0.05, 0.25, c), box(1.6, 4.2, 0.9, 2, 0.05, 0.25, c), cyl(4.4, 1.6, 0.9, 0.7, 0.35, c)],
  "file-text": (c) => [floor(), box(1, 1, 0, 4, 5, 0.35, "#e9e6dc"), box(1.3, 1.3, 0.35, 3.4, 4.4, 0.35, "#f6f4ee"), box(1.8, 5.7, 0.7, 2.4, 0.05, 0.2, c), box(1.8, 4.8, 0.7, 1.6, 0.05, 0.2, c), box(1.8, 3.9, 0.7, 2, 0.05, 0.2, c)],
  folder: (c) => [floor(), box(0.4, 0.6, 0, 5.2, 5, 0.5, shade(c, -8)), box(0.4, 0.6, 0.5, 2.2, 5, 0.5, c), box(0.4, 0.6, 1, 5.2, 4.2, 0.5, c)],
  "file-badge": (c) => [floor(), box(1, 1, 0, 4, 5, 0.35, "#e9e6dc"), box(1.3, 1.3, 0.35, 3.4, 4.4, 0.35, "#f6f4ee"), cyl(3.8, 2.2, 0.7, 0.9, 0.4, c), extrude(STAR.map(([x, z]) => [x * .35 + 2.6, z * .35 + 0.9]), 1.9, 0.3, "#f4f2ea")],
  stamp: (c) => [floor(), box(0.8, 0.8, 0, 4.4, 4.4, 0.3, "#e9e6dc"), cyl(3, 3, 0.3, 2, 0.8, c), cyl(3, 3, 1.1, 0.7, 2.2, shade(c, -10)), sphere(3, 3, 3.3, 0.9, shade(c, 6))],
  briefcase: (c) => [floor(), box(0.2, 1.2, 0, 5.6, 3.6, 3.4, c), box(2.4, 1.2, 3.4, 1.2, 3.6, 0.7, shade(c, -22)), box(0.2, 1.2, 1.8, 5.6, 3.6, 0.25, shade(c, -24)), box(2.6, 4.8, 1.5, 0.8, 0.05, 0.8, "#c9a84a")],
  "piggy-bank": (c) => [floor(), cyl(1.3, 1.3, 0, 0.5, 1.2, shade(c, -10)), cyl(4.7, 1.3, 0, 0.5, 1.2, shade(c, -10)), cyl(1.3, 4.7, 0, 0.5, 1.2, shade(c, -10)), cyl(4.7, 4.7, 0, 0.5, 1.2, shade(c, -10)), sphere(3, 3, 1, 2.6, c), box(2.4, 2.9, 5.9, 1.2, 0.3, 0.3, "#15161a"), cyl(5.6, 3, 2.4, 0.7, 0.4, shade(c, -6))],
  banknote: (c) => [floor(), box(0, 1, 0, 6, 4, 0.3, c), box(0.3, 1.3, 0.3, 6, 4, 0.3, shade(c, 6)), box(0.6, 1.6, 0.6, 6, 4, 0.3, shade(c, 12)), cyl(3.6, 3.6, 0.9, 1, 0.3, shade(c, -16))],
  bank: (c) => [floor(), box(0, 0, 0, 6, 6, 0.5, "#cfcbbe"), box(0.6, 0.6, 0.5, 4.8, 4.8, 0.4, c), cyl(1.3, 1.3, 0.9, 0.4, 3, "#e9e6dc"), cyl(4.7, 1.3, 0.9, 0.4, 3, "#e9e6dc"), cyl(1.3, 4.7, 0.9, 0.4, 3, "#e9e6dc"), cyl(4.7, 4.7, 0.9, 0.4, 3, "#e9e6dc"), box(0.3, 0.3, 3.9, 5.4, 5.4, 0.5, c), cyl(3, 3, 4.4, 0.9, 0.3, "#c9a84a"), cyl(3, 3, 4.7, 0.9, 0.3, "#c9a84a"), cyl(3, 3, 5, 0.9, 0.3, "#d9b95c")],
  calc: (c) => [floor(), box(0.8, 0.5, 0, 4.4, 5.4, 0.8, c), box(1.2, 4.2, 0.8, 3.6, 1.3, 0.2, "#e9e6dc"), ...[0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => box(1.3 + i * 1.25, 0.9 + j * 1, 0.8, 0.9, 0.7, 0.25, j === 0 && i === 2 ? "#c8313a" : "#f4f2ea")))],
  "heart-pulse": (c) => [floor(), extrude(HEART, 2.2, 1.6, c), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc")],
  heart: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(HEART, 2.2, 1.6, c)],
  "hand-heart": (c) => [floor(), box(0.5, 1, 0, 5, 4, 0.8, "#e0d6c6"), cyl(1.4, 3, 0.8, 0.45, 1.6, "#e0d6c6"), cyl(2.4, 2.4, 0.8, 0.45, 1.9, "#e0d6c6"), cyl(3.5, 2.4, 0.8, 0.45, 1.9, "#e0d6c6"), cyl(4.6, 3, 0.8, 0.45, 1.6, "#e0d6c6"), extrude(HEART.map(([x, z]) => [x * .6 + 1.2, z * .6 + 2.2]), 3.2, 1.2, c)],
  map: (c) => [floor(), box(0, 1, 0, 2, 4.4, 0.3, "#e9e6dc"), box(2, 1, 0.3, 2, 4.4, 0.3, "#f4f2ea"), box(4, 1, 0, 2, 4.4, 0.3, "#e9e6dc"), box(0.4, 2.2, 0.3, 1.2, 0.6, 0.08, shade(c, 10)), box(4.4, 3.4, 0.3, 1.2, 0.6, 0.08, shade(c, 10)), box(2.3, 1.6, 0.6, 1.4, 0.5, 0.08, "#2f7fd0"), box(3.1, 3.1, 0.6, 0.16, 0.16, 2.2, "#3b3a44"), sphere(3.18, 3.18, 2.6, 0.75, "#c8313a")],
  shield: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(SHIELD, 2.2, 1.6, c), extrude(SHIELD.map(([x, z]) => [x * .55 + 1.35, z * .55 + 1.1]), 1.6, 0.4, "#f4f2ea")],
  users: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), cyl(1.6, 3.8, 0.3, 0.8, 2.2, c), sphere(1.6, 3.8, 2.6, 0.75, shade(c, 8)), cyl(3.8, 2.2, 0.3, 0.9, 2.6, shade(c, -8)), sphere(3.8, 2.2, 3, 0.85, shade(c, 2)), cyl(4.6, 4.4, 0.3, 0.75, 2, shade(c, 6)), sphere(4.6, 4.4, 2.4, 0.7, shade(c, 12))],
  flame: (c) => [floor(), cyl(3, 3, 0, 2.4, 0.5, "#3b3a44"), extrude(FLAME, 2.3, 1.4, c), extrude(FLAME.map(([x, z]) => [x * .5 + 1.5, z * .5 + 0.5]), 1.6, 0.5, "#f3d37a")],
  droplets: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(DROP, 2.2, 1.6, c), extrude(DROP.map(([x, z]) => [x * .45 + 3.6, z * .45 + 0.3]), 1.2, 0.8, shade(c, 10))],
  "trash-2": (c) => [floor(), cyl(3, 3, 0, 2, 4.2, c), cyl(3, 3, 4.2, 2.3, 0.4, shade(c, -12)), box(2.4, 2.4, 4.6, 1.2, 1.2, 0.5, shade(c, -20)), box(1.6, 5.1, 0.6, 0.25, 0.05, 3, shade(c, -24)), box(2.9, 5.1, 0.6, 0.25, 0.05, 3, shade(c, -24)), box(4.2, 5.1, 0.6, 0.25, 0.05, 3, shade(c, -24))],
  "circle-parking": (c) => [floor(), box(0, 0, 0, 6, 6, 0.4, "#2b2d33"), box(0.4, 0.4, 0.4, 5.2, 5.2, 0.3, c), extrude([[1.5, 0], [1.5, 6], [2.8, 6], [2.8, 3.7], [4.1, 3.7], [5.1, 4.7], [5.1, 5.1], [4.1, 6], [2.8, 6], [2.8, 6], [1.5, 6]], 2.4, 1.2, "#f4f2ea", undefined, 0, 0.7)],
  trees: (c) => [floor(), cyl(2, 2, 0, 0.4, 2.4, "#8a6a3a"), sphere(2, 2, 2.2, 1.9, c), cyl(4.6, 4, 0, 0.35, 1.6, "#8a6a3a"), sphere(4.6, 4, 1.4, 1.4, shade(c, 8))],
  "shopping-basket": (c) => [floor(), box(0.4, 0.4, 0, 5.2, 5.2, 2.6, c), box(0.2, 0.2, 2.6, 5.6, 5.6, 0.4, shade(c, -14)), extrude([[0.2, 3], [5.8, 3], [5.8, 3.6], [0.2, 3.6]], 0.2, 5.6, "#c8313a"), box(1, 1, 3, 1.4, 1.4, 1.2, "#e2a03a"), box(3.2, 1.2, 3, 1.6, 1.6, 0.9, "#5f8f4a"), sphere(2.2, 3.8, 3, 0.8, "#c8313a")],
  "flower-2": (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), cyl(3, 3, 0.3, 0.2, 3, "#5f8f4a"), ...[0, 72, 144, 216, 288].map((a, i) => sphere(3 + Math.cos((a * Math.PI) / 180) * 1.2, 3 + Math.sin((a * Math.PI) / 180) * 1.2, 3, 0.8, shade(c, 6), `pet${i}`)), sphere(3, 3, 3.3, 0.7, "#e2c94a")],
  bus: (c) => [floor(), cyl(1.2, 5.6, -0.3, 0.6, 0.6, "#2b2d33"), cyl(4.8, 5.6, -0.3, 0.6, 0.6, "#2b2d33"), box(0, 0.8, 0.3, 6, 4.4, 3.2, c), box(0.2, 5.2, 1.6, 5.6, 0.05, 1.3, "#9fc3e6"), box(6, 1.2, 1.6, 0.05, 3.6, 1.3, "#9fc3e6"), box(0, 0.8, 3.5, 6, 4.4, 0.3, shade(c, -16))],
  truck: (c) => [floor(), cyl(1.4, 5.6, -0.3, 0.6, 0.6, "#2b2d33"), cyl(4.6, 5.6, -0.3, 0.6, 0.6, "#2b2d33"), box(1.8, 0.6, 0.3, 4.4, 4.8, 3.4, "#e9e6dc"), box(0, 0.8, 0.3, 1.8, 4.4, 2.2, c), box(0.1, 5.2, 1.2, 1.5, 0.05, 1, "#9fc3e6")],
  car: (c) => [floor(), cyl(1.4, 5.4, -0.3, 0.6, 0.6, "#2b2d33"), cyl(4.6, 5.4, -0.3, 0.6, 0.6, "#2b2d33"), box(0, 1, 0.3, 6, 4, 1.4, c), box(1.4, 1.4, 1.7, 3.2, 3.2, 1.3, shade(c, -8)), box(1.5, 4.6, 1.9, 3, 0.05, 0.9, "#9fc3e6")],
  ruler: (c) => [floor(), box(0, 2.2, 0, 6.4, 1.6, 0.5, c), ...[0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6].map((x, i) => box(x, 3.8, 0.5, 0.1, 0.05, i % 2 ? 0.3 : 0.5, "#2b2d33", `tick${i}`)), box(0.4, 0.2, 0, 1.6, 1.6, 2.4, "#e9e6dc"), extrude([[0, 0], [2, 0], [1, 1.8]], 0.2, 1.6, "#2b2d33", undefined, 0.4, 2.4)],
  mail: (c) => [floor(), box(0, 1, 0, 6, 4, 2.4, c), extrude([[0, 2.4], [6, 2.4], [3, 0.8]], 1, 4, shade(c, -14), undefined, 0, 0), box(0, 1, 2.4, 6, 4, 0.2, shade(c, 8))],
  zap: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#2b2d33"), extrude(BOLT, 2.2, 1.6, c)],
  road: (c) => [floor(), box(0, 0, 0, 6, 6, 0.6, "#4a4b52"), box(2.6, 0.6, 0.6, 0.8, 1.4, 0.06, "#f4f2ea"), box(2.6, 2.4, 0.6, 0.8, 1.4, 0.06, "#f4f2ea"), box(2.6, 4.2, 0.6, 0.8, 1.4, 0.06, "#f4f2ea"), box(0, 0, 0.6, 0.4, 6, 0.1, c), box(5.6, 0, 0.6, 0.4, 6, 0.1, c)],
  stethoscope: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(CROSS, 2.2, 1.6, c), cyl(5, 1, 0.3, 0.9, 0.6, "#2b2d33")],
  hospital: (c) => [floor(), box(0.4, 0.4, 0, 5.2, 5.2, 4.6, "#f1efe7"), extrude(CROSS.map(([x, z]) => [x * .55 + 1.3, z * .55 + 1.2]), 0.4, 0.0, c, undefined, 0, 0.6), box(0.4, 0.4, 4.6, 5.2, 5.2, 0.3, "#d9d6cb")],
  pill: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(CROSS, 2.2, 1.6, c)],
  microscope: (c) => [floor(), box(0.6, 0.6, 0, 4.8, 4.8, 0.6, "#2b2d33"), cyl(2.2, 3, 0.6, 0.5, 3.6, "#6b6e76"), box(1.6, 2.6, 4.2, 2.2, 1, 0.6, "#6b6e76"), cyl(3.9, 2.2, 1.8, 0.45, 3.4, c), box(1.4, 1.2, 0.6, 2, 2, 0.3, "#e9e6dc")],
  baby: (c) => [floor(), box(0.4, 0.4, 0, 2.2, 2.2, 2.2, c), box(3.2, 0.6, 0, 2.2, 2.2, 2.2, "#e2a03a"), box(1.8, 3.2, 0, 2.2, 2.2, 2.2, "#5f8f4a"), box(1.8, 1.4, 2.2, 2.2, 2.2, 2.2, "#2347e6")],
  child: (c) => [floor(), box(0.4, 0.4, 0, 2.2, 2.2, 2.2, c), box(3.2, 0.6, 0, 2.2, 2.2, 2.2, "#e2a03a"), box(1.8, 3.2, 0, 2.2, 2.2, 2.2, "#5f8f4a"), sphere(2.9, 2.5, 2.2, 1, "#2347e6")],
  school: (c) => [floor(), box(0, 1, 0, 6, 4, 0.5, "#d9d6cb"), box(0.4, 1.4, 0.5, 5.2, 3.2, 0.9, c), box(0.8, 1.2, 1.4, 4.4, 3.6, 0.9, shade(c, 10)), box(1.2, 1.5, 2.3, 3.6, 3, 0.9, "#c8313a"), box(1.4, 1.7, 3.2, 3.2, 2.6, 0.2, "#f4f2ea")],
  "graduation-cap": (c) => [floor(), box(0.4, 0.6, 0, 5.2, 4.8, 0.7, "#c8313a"), box(0.8, 0.9, 0.7, 4.6, 4.2, 0.7, "#e9e6dc"), cyl(3, 3, 1.4, 1.3, 1.5, shade(c, 18)), box(0.6, 0.6, 2.9, 4.8, 4.8, 0.45, c), box(5.2, 5.2, 1.9, 0.14, 0.14, 1.1, "#c9a84a"), sphere(5.27, 5.27, 1.6, 0.32, "#c9a84a")],
  library: (c) => [floor(), box(0, 1.2, 0, 6, 3.6, 0.5, "#8a6a3a"), ...[0.3, 1.3, 2.3, 3.3, 4.3].map((x, i) => box(x, 1.5, 0.5, 0.9, 3, 4.2 - (i % 2) * 0.5, [c, shade(c, 12), "#2347e6", shade(c, -10), "#c8313a"][i], `bk${i}`)), box(5.3, 1.5, 0.5, 0.6, 3, 3.6, "#e9e6dc")],
  theater: (c) => [floor(), box(0, 0, 0, 6, 6, 0.6, c), cyl(1, 1, 0.6, 0.35, 3.6, "#e9e6dc"), cyl(5, 1, 0.6, 0.35, 3.6, "#e9e6dc"), cyl(1, 5, 0.6, 0.35, 3.6, "#e9e6dc"), cyl(5, 5, 0.6, 0.35, 3.6, "#e9e6dc"), box(-0.2, -0.2, 4.2, 6.4, 6.4, 0.5, c), box(1.6, 5.9, 0.6, 2.8, 0.05, 2.8, "#8a1f26")],
  dumbbell: (c) => [floor(), cyl(1, 3, 0, 1.4, 1.6, "#2b2d33"), cyl(5, 3, 0, 1.4, 1.6, "#2b2d33"), box(1, 2.6, 0.5, 4, 0.8, 0.8, c), cyl(1.9, 3, 0, 1, 1.4, "#4a4b52"), cyl(4.1, 3, 0, 1, 1.4, "#4a4b52")],
  compass: (c) => [floor(), cyl(3, 3, 0, 2.8, 0.6, "#e9e6dc"), cyl(3, 3, 0.6, 2.4, 0.2, "#f6f4ee"), extrude([[2.6, 1.6], [3.4, 1.6], [3, 5.6]], 2.9, 0.3, c, undefined, 0, 0), extrude([[2.6, 1.6], [3.4, 1.6], [3, 1.6 - 3.2]], 2.9, 0.3, "#2b2d33", undefined, 0, 3.4), cyl(3, 3, 0.8, 0.35, 0.5, "#2b2d33")],
  bed: (c) => [floor(), box(0, 0.8, 0, 6, 4.4, 1, "#8a6a3a"), box(0.2, 1, 1, 5.6, 4, 0.9, "#f1efe7"), box(0.2, 1, 1.9, 5.6, 4, 0.7, c), box(0.3, 1.1, 1.9, 1.3, 3.8, 1.1, "#f6f4ee"), box(0, 0.8, 1, 0.3, 4.4, 2.6, "#8a6a3a")],
  scale: (c) => [floor(), box(1, 1, 0, 4, 4, 0.5, "#2b2d33"), cyl(3, 3, 0.5, 0.25, 4.6, c), box(0.2, 2.8, 4.8, 5.6, 0.4, 0.3, c), cyl(0.9, 3, 1.6, 1, 0.3, shade(c, -8)), cyl(5.1, 3, 2.4, 1, 0.3, shade(c, -8)), box(0.85, 2.95, 1.9, 0.1, 0.1, 2.9, "#2b2d33"), box(5.05, 2.95, 2.7, 0.1, 0.1, 2.1, "#2b2d33")],
  gavel: (c) => [floor(), box(0.4, 0.4, 0, 5.2, 5.2, 0.5, "#8a6a3a"), cyl(4.2, 4.2, 0.5, 1.1, 0.5, shade(c, -8)), box(0.4, 2.6, 2.1, 3.6, 0.6, 0.6, "#8a6a3a"), box(3.4, 1.6, 1.4, 1.8, 2.6, 2.2, c)],
  languages: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(BUBBLE, 0.6, 1.4, c, undefined, -0.3, 1.2), extrude(BUBBLE.map(([x, z]) => [6 - x, z - 0.8]), 2.8, 1.4, shade(c, -14), undefined, 0.6, 0.2)],
  globe: (c) => [floor(), cyl(3, 3, 0, 1.7, 0.5, "#3b3a44"), cyl(3, 3, 0.5, 0.3, 0.9, "#6b6e76"), sphere(3, 3, 1.4, 2.3, c), cyl(3, 3, 3.6, 2.35, 0.12, shade(c, 26)), sphere(2.3, 2.2, 3.9, 0.7, shade(c, 14)), sphere(4, 3.6, 3.3, 0.9, shade(c, 10))],
  tooth: (c) => [floor(), box(0, 0, 0, 6, 6, 0.4, "#2f7fd0"), extrude(TOOTH, 2.2, 1.6, c)],
  paw: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), cyl(3, 3.6, 0.3, 1.5, 0.6, c), cyl(1.2, 2.2, 0.3, 0.6, 0.6, c), cyl(2.4, 1.2, 0.3, 0.6, 0.6, c), cyl(3.8, 1.2, 0.3, 0.6, 0.6, c), cyl(5, 2.2, 0.3, 0.6, 0.6, c)],
  star: (c) => [floor(), box(0, 0, 0, 6, 6, 0.3, "#e9e6dc"), extrude(STAR, 2.2, 1.6, c)],
};
SCENES.default = SCENES.landmark;

/** Hue per icon family, all desaturated toward the paper register. */
const HUES: Record<string, string> = {
  landmark: "#8e97b8", building: "#a9a3b8", "building-2": "#a9a3b8", factory: "#9a9aa8", home: "#c4a98a", receipt: "#2f52ea", "file-text": "#2f52ea", folder: "#b89a6b", "file-badge": "#2f52ea", stamp: "#a84b52", briefcase: "#8a6a3a",
  "piggy-bank": "#d08b94", banknote: "#5f8f4a", bank: "#8e97b8", calc: "#6b6e76", "heart-pulse": "#c8313a", heart: "#c8313a", "hand-heart": "#c8313a", map: "#5f8f4a", shield: "#2f52ea", users: "#2f52ea", flame: "#e2532e",
  droplets: "#2f7fd0", "trash-2": "#5f8f4a", "circle-parking": "#2f52ea", trees: "#4f8a46", "shopping-basket": "#c4a98a", "flower-2": "#c06a8a", bus: "#e2a03a", truck: "#2f52ea", car: "#c8313a", ruler: "#e2a03a", mail: "#e2c94a", zap: "#e2c94a", road: "#4a4b52",
  stethoscope: "#c8313a", hospital: "#c8313a", pill: "#2f9e6a", microscope: "#2f7fd0", baby: "#c8313a", child: "#c8313a", school: "#8e97b8", "graduation-cap": "#1f2a5b", library: "#8a6a3a", theater: "#8a1f26", dumbbell: "#2f52ea", compass: "#c8313a", bed: "#2f52ea",
  scale: "#1f2a5b", gavel: "#8a6a3a", languages: "#2f52ea", globe: "#2f7fd0", tooth: "#f6f3ea", paw: "#8a6a3a", star: "#c9a84a",
};

export default function Glyph3D({ icon, size = 64, className, title }: { icon: string | null | undefined; size?: number; className?: string; title?: string }) {
  if (icon && EMBLEMS.has(icon)) {
    return <img src={`/emblems/${icon}${size <= 128 ? "@256" : ""}.png`} srcSet={`/emblems/${icon}@256.png 256w, /emblems/${icon}.png 1024w`} sizes={`${size}px`} width={size} height={size} alt={title ?? ""} aria-hidden={title ? undefined : true} loading="lazy" decoding="async" className={`g3 g3-live g3-img ${className ?? ""}`} draggable={false} style={{ display: "block", objectFit: "contain" }} />;
  }
  const key = icon && SCENES[icon] ? icon : "default";
  uid = 0; // deterministic ids per render for stable SSR/CSR markup
  const prims = SCENES[key](HUES[key] ?? "#8e97b8").sort((a, b) => a.depth - b.depth);
  const delay = `${(key.length * 137) % 1900}ms`;
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={`g3 g3-live ${className ?? ""}`} style={{ "--g3d": delay } as React.CSSProperties} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g className="g3-body">{prims.map((p) => p.el)}</g>
      <g className="g3-sheen" aria-hidden><rect x="-60" y="0" width="40" height="160" fill="url(#g3-sheen-grad)" transform="skewX(-18)" /></g>
      <defs><linearGradient id="g3-sheen-grad" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".32" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient><clipPath id="g3-clip"><rect x="0" y="0" width="160" height="160" /></clipPath></defs>
    </svg>
  );
}
