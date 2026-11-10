// Landmarks, part 2: bridges, spas, nature, farming, industry, archaeology, village life, parks and modern sights.
import * as D from "./dsl.mjs";
import { H } from "./landmarks.mjs";
const { box, cyl, cone, sphere, torus, capsule, dome, rod, shape2d, prism, pitchedRoof, pyramid, vault, colonnade, steps, windowGrid, block, door, arch, flagMast, tree, cypress, lamp, bench, fence, grp, S, T,
  CREAM, STONE, DARK, DOOR, GOLD, RED, WOOD, GREEN, GLASS, GREY, WHITE, INK, BLUE, AMBER } = D;
const { P, Y, PI, R, ground, lawn, pond, disc, cross, pine, hill, peak, drum, crenels, towerSq, wallRun, person, boat, haystack, rows, greens, BUILDINGS } = H;
const river = (z = 0, w = 2.4, len = 8.6, o = {}) => [box(len, w, 0.05, P.water, { y: Y, z, sharp: true, ...o }), box(len, 0.16, 0.07, P.sand, { y: Y, z: z + w / 2 + 0.08, sharp: true, ...o }), box(len, 0.16, 0.07, P.sand, { y: Y, z: z - w / 2 - 0.08, sharp: true, ...o })];
const bush = (r, col, o = {}) => sphere(r, col, { sy: 0.75, ...o });

function bridge(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass), box(8.6, 2.6, 0.05, P.water, { y: Y, sharp: true, ry: 0 })];
  // the river runs along x under a bridge that crosses along z
  const deckY = Y + 1.5;
  if (style === "stone-arch") {
    const n = o.arches ?? 3, st = o.wall ?? "#cfc5b1", span = 4.6;
    k.push(box(1.5, span + 1.6, 1.5, st, { y: Y }), box(1.7, span + 1.8, 0.14, S(st, -0.05), { y: deckY }), box(0.16, span + 1.8, 0.4, st, { y: deckY + 0.14, x: 0.75 }), box(0.16, span + 1.8, 0.4, st, { y: deckY + 0.14, x: -0.75 }));
    for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * (span / n) ; const a = arch(span / n - 0.3, 1.25, P.water, { y: Y + 0.03, x: 0.76, z, ry: PI / 2, depth: 0.04 }); const b = arch(span / n - 0.3, 1.25, "#5f7f9c", { y: Y + 0.03, x: -0.78, z, ry: PI / 2, depth: 0.04 }); k.push(a, b); }
    k.push(...greens(seed, [[-3.3, 2.6], [3.3, 2.6], [-3.2, -2.6], [3.3, -2.5]]), box(1.2, 1.0, 1.4, "#efe6d2", { y: Y, x: 2.6, z: 2.3 }), pitchedRoof(1.2, 1.0, 0.6, P.tile, { y: Y + 1.4, x: 2.6, z: 2.3 }));
    return grp(k);
  }
  if (style === "cable-stayed") { // one tall pylon, a fan of cables to the deck (Most na Adi)
    k.push(box(1.3, 6.4, 0.22, P.concrete, { y: deckY }), box(0.5, 0.5, deckY - Y, P.concrete, { y: Y, z: 0 }), cone(0.42, 7.2, "#e9e7e1", { y: deckY + 0.22, seg: 16 }), sphere(0.08, RED, { y: deckY + 7.4 }));
    for (let i = 1; i <= 7; i++) for (const s of [-1, 1]) for (const x of [-0.55, 0.55]) k.push(rod([0, deckY + 2.2 + i * 0.62, 0], [x, deckY + 0.24, s * (0.3 + i * 0.4)], 0.016, "#f1efe9"));
    k.push(box(0.7, 0.4, 0.3, RED, { y: deckY + 0.22, z: 1.6 }), box(0.6, 0.36, 0.26, BLUE, { y: deckY + 0.22, x: 0.2, z: -1.3 }), ...greens(seed, [[-3.4, 2.6], [3.4, 2.6], [-3.3, -2.6], [3.4, -2.6]]), boat(WHITE, { x: -2.6, z: 0.2, y: Y + 0.03 }));
    return grp(k);
  }
  if (style === "footbridge") { // a small arched footbridge hung with padlocks (Most ljubavi)
    k.length = 0; k.push(ground(P.grass), box(8.6, 1.5, 0.05, P.water, { y: Y, sharp: true }));
    for (let i = 0; i < 9; i++) { const t = (i - 4) / 4, z = t * 1.7, y = Y + 0.9 - t * t * 0.55; k.push(box(1.5, 0.46, 0.1, "#b08a5a", { y, z, rx: t * 0.5 })); for (const x of [-0.72, 0.72]) k.push(cyl(0.035, 0.75, "#2f3a34", { y: y + 0.08, x, z, seg: 8 }), i % 2 ? box(0.1, 0.06, 0.12, [GOLD, RED, "#c9ccd4"][i % 3], { y: y + 0.4, x: x * 1.04, z, sharp: true }) : null); }
    for (const x of [-0.72, 0.72]) for (let i = 0; i < 8; i++) { const t0 = (i - 4) / 4, t1 = (i - 3) / 4; k.push(rod([x, Y + 1.73 - t0 * t0 * 0.55, t0 * 1.7], [x, Y + 1.73 - t1 * t1 * 0.55, t1 * 1.7], 0.03, "#2f3a34")); }
    k.push(lamp({ x: -1.2, z: 2.2, y: Y }), lamp({ x: 1.2, z: -2.2, y: Y }), bench(1.2, { x: 2.3, z: 2.5, y: Y }), ...greens(seed, [[-3.4, 2.4], [3.5, 2.2], [-3.3, -2.4], [3.3, -2.4], [-2.2, -2.7]]), bush(0.4, "#d98aa5", { x: 2.6, z: -1.6, y: Y }), bush(0.35, "#e2a03a", { x: -2.5, z: 1.5, y: Y }));
    return grp(k);
  }
  // truss: a steel through-truss on stone piers
  const stl = o.metal ?? "#6f8a7c"; k.push(box(1.5, 6.4, 0.18, "#8d9099", { y: deckY }), box(1.0, 0.9, deckY - Y, "#cfc5b1", { y: Y, z: -1.3 }), box(1.0, 0.9, deckY - Y, "#cfc5b1", { y: Y, z: 1.3 }));
  for (const x of [-0.72, 0.72]) { k.push(rod([x, deckY + 1.6, -2.8], [x, deckY + 1.6, 2.8], 0.06, stl), rod([x, deckY + 0.18, -3.2], [x, deckY + 1.6, -2.8], 0.06, stl), rod([x, deckY + 0.18, 3.2], [x, deckY + 1.6, 2.8], 0.06, stl)); for (let i = 0; i < 7; i++) { const z = -2.8 + i * 0.8; k.push(rod([x, deckY + 0.18, z], [x, deckY + 1.6, z], 0.04, stl), i < 7 ? rod([x, deckY + 0.18, z + (i % 2 ? 0 : 0.8)], [x, deckY + 1.6, z + (i % 2 ? 0.8 : 0)], 0.035, stl) : null); } }
  for (let i = 0; i < 8; i++) k.push(rod([-0.72, deckY + 1.6, -2.8 + i * 0.8], [0.72, deckY + 1.6, -2.8 + i * 0.8], 0.035, stl));
  k.push(...greens(seed, [[-3.4, 2.6], [3.4, 2.6], [-3.3, -2.6], [3.4, -2.6]]), boat("#8a6a3a", { x: 2.6, z: 0.1, y: Y + 0.03 }));
  return grp(k);
}
function spa(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(), lawn(8.2, 6, {})];
  const fountain = (x, z, s = 1) => [cyl(1.1 * s, 0.22, STONE, { y: Y, x, z, seg: 32 }), disc(0.98 * s, P.water, { x, z, y: Y + 0.2 }), cyl(0.14 * s, 0.9 * s, STONE, { y: Y, x, z, seg: 12 }), cyl(0.5 * s, 0.08, STONE, { y: Y + 0.9 * s, x, z, seg: 24 }), sphere(0.16 * s, P.water, { y: Y + 0.98 * s, x, z }), ...[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * PI * 2; return rod([x, Y + 1.0 * s, z], [x + Math.sin(a) * 0.7 * s, Y + 0.3, z + Math.cos(a) * 0.7 * s], 0.02, "#d7e9f7"); })];
  if (style === "bathhouse") { // old hammam: stone cube under lead domes with glass eyes, a warm pool beside it
    const st = o.wall ?? "#d9cdb4"; k.push(box(4.2, 3.2, 2.2, st, { y: Y, x: -1.0, z: -0.8 }), ...[0, 1, 2].map((i) => box(4.24, 3.24, 0.1, P.brick, { y: Y + 0.5 + i * 0.6, x: -1.0, z: -0.8, sharp: true })), arch(0.8, 1.5, DOOR, { y: Y, x: -1.0, z: 0.81 }));
    [[-2.0, 1.25], [0, 1.25]].forEach(([dx, r]) => { const dm = dome(r, P.lead, { y: Y + 2.2, x: -1.0 + dx + 1.0, z: -0.8 }); dm.scale.y = 0.8; k.push(dm); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; k.push(sphere(0.07, GLASS, { x: dx + Math.sin(a) * r * 0.6, z: -0.8 + Math.cos(a) * r * 0.6, y: Y + 2.2 + r * 0.6 })); } });
    k.push(cyl(1.3, 0.2, STONE, { y: Y, x: 2.5, z: 1.4, seg: 32 }), disc(1.15, "#8fd0d6", { x: 2.5, z: 1.4, y: Y + 0.18 }), ...[0, 1, 2].map((i) => sphere(0.16 + i * 0.05, "#f1f5f7", { x: 2.3 + i * 0.2, y: Y + 0.7 + i * 0.4, z: 1.3 })), ...greens(seed, [[-3.5, 2.4], [3.6, -2.2], [1.6, -2.4]]), bench(1.2, { x: 0.2, z: 2.5, y: Y }));
    return grp(k);
  }
  if (style === "geyser") { k.push(disc(1.9, "#8fd0d6", { y: Y + 0.02 }), torus(1.9, 0.14, P.rock, { rx: PI / 2, y: Y + 0.08 }), cyl(0.3, 0.3, P.rockD, { y: Y, seg: 12 }), cyl(0.16, 5.2, "#e3f1fa", { y: Y + 0.3, seg: 12, rTop: 0.3 }), ...[0, 1, 2, 3, 4, 5, 6].map((i) => sphere(0.3 + R(seed, i) * 0.25, "#f1f7fb", { x: (R(seed, i + 5) - 0.5) * 1.3, z: (R(seed, i + 9) - 0.5) * 1.3, y: Y + 4.6 + R(seed, i + 2) * 1.4 })), ...[0, 1, 2, 3].map((i) => { const a = i * 1.6 + 0.4; return sphere(0.12, "#e3f1fa", { x: Math.sin(a) * 1.0, z: Math.cos(a) * 1.0, y: Y + 2.0 + i * 0.5 }); }), ...greens(seed, [[-3.4, 2.2], [3.4, 2.2], [-3.3, -2.3], [3.3, -2.3]]), bench(1.2, { x: -2.3, z: 2.6, y: Y }), box(1.6, 1.0, 1.3, "#efe6d2", { y: Y, x: 2.9, z: -2.0 }), pyramid(1.9, 1.3, 0.7, P.tile, { y: Y + 1.3, x: 2.9, z: -2.0 })); return grp(k); }
  if (style === "fountain") { k.push(...fountain(0, 0.2, 1.5), ...greens(seed, [[-3.4, 2.2], [3.4, 2.2], [-3.3, -2.3], [3.3, -2.3], [0, -2.6]]), bench(1.2, { x: -2.3, z: 1.2, y: Y, ry: PI / 2 }), bench(1.2, { x: 2.3, z: 1.2, y: Y }), lamp({ x: -1.7, z: 2.5, y: Y }), lamp({ x: 1.7, z: 2.5, y: Y }), bush(0.4, "#d98aa5", { x: -1.9, z: -1.6, y: Y }), bush(0.4, "#e2a03a", { x: 1.9, z: -1.6, y: Y })); return grp(k); }
  // pavilion: the spa's long, low kursalon with a portico, a fountain in the park in front
  const w = o.wall ?? "#f2ead8"; k.push(block(6.4, 2.4, 2.4, w, { y: Y, z: -1.5, front: { cols: 7, rows: 1, w: 6.0 }, side: { cols: 2, rows: 1 }, y0: 0.5 }), pyramid(6.8, 2.8, 1.1, o.roof ?? P.tile, { y: Y + 2.4, z: -1.5 }), box(2.6, 1.3, 0.2, CREAM, { y: Y + 2.4, z: 0.1 }), colonnade(4, 0.75, 0.13, 2.3, CREAM, { y: Y + 0.1, z: 0.5 }), prism(2.6, 1.3, 0.8, S(CREAM, -0.03), { ridge: "z", y: Y + 2.6, z: 0.1 }), steps(2, 2.8, 0.3, 0.1, STONE, { z: 0.7, y: Y }), door(0.9, 1.6, DOOR, { y: Y + 0.1, z: -0.29 }));
  [-2.6, 2.6].forEach((x) => k.push(box(1.3, 2.7, 2.9, S(w, 0.02), { x, y: Y, z: -1.5 }), pyramid(1.6, 3.0, 1.0, o.roof ?? P.tile, { x, y: Y + 2.9, z: -1.5 })));
  k.push(...fountain(0, 2.2, 0.8), ...greens(seed, [[-3.5, 2.4], [3.5, 2.4]]), bench(1.1, { x: -2.2, z: 2.4, y: Y }), bench(1.1, { x: 2.2, z: 2.4, y: Y }));
  return grp(k);
}
function mountain(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(o.sand ? P.sand : P.grass)], rock = o.rock ?? "#9aa08f";
  const pines = (spots, s = 1) => spots.map(([x, z, h = 2.2]) => pine(h * s, { x, z, y: Y }));
  if (style === "pyramid") { // one perfect pyramid of a mountain (Rtanj)
    k.push(cone(3.6, 5.6, "#9fb08a", { y: Y, z: -0.6, seg: 4, ry: PI / 4 }), cone(1.3, 2.0, "#b9bfae", { y: Y + 3.62, z: -0.6, seg: 4, ry: PI / 4 }), box(0.34, 0.34, 0.4, "#efe9dc", { y: Y + 5.5, z: -0.6 }), ...pines([[-3.3, 2.2], [-2.3, 2.6, 1.7], [3.2, 2.3, 2.5], [2.3, 2.7, 1.6], [3.6, 0.9, 2.0], [-3.7, 0.6, 1.9]]), box(1.1, 0.9, 0.8, P.log, { y: Y, x: 0.3, z: 2.4 }), pitchedRoof(1.1, 0.9, 0.6, "#4a3b30", { y: Y + 0.8, x: 0.3, z: 2.4 }));
    return grp(k);
  }
  if (style === "canyon") { // a river winding between steep green walls (Uvac, Ovčar-Kablar)
    const gw = "#8fa67a"; k.push(box(8.6, 6.4, 0.05, P.water, { y: Y, sharp: true }));
    [[-2.9, -1.9, 2.4, 2.9], [0.3, -2.4, 2.0, 2.3], [3.0, -1.3, 2.3, 3.2], [-1.4, 1.2, 2.1, 2.5], [1.7, 2.0, 2.2, 2.0], [-3.6, 2.4, 1.6, 1.8], [3.9, 2.6, 1.2, 1.4]].forEach(([x, z, r, h], i) => k.push(hill(r, h, i % 2 ? gw : S(gw, -0.05), { x, z, y: Y, sx: 1.25, sz: 0.8 }), cyl(r * 0.92, 0.5, P.rock, { x, z, y: Y, seg: 16 })));
    k.push(...pines([[-2.9, -1.9, 1.5], [3.0, -1.3, 1.6], [0.3, -2.4, 1.3]].map(([x, z, h]) => [x, z, h])).map((p, i) => { p.position.y = Y + [2.8, 3.1, 2.2][i]; return p; }), o.monastery ? [box(0.9, 0.7, 0.7, "#efe9dc", { y: Y + 2.2, x: -1.4, z: 1.2 }), drum(0.3, 0.4, "#efe9dc", P.tile, { y: Y + 2.9, x: -1.4, z: 1.2 })] : boat("#8a6a3a", { x: -0.6, z: 0.1, y: Y + 0.03, ry: 0.5 }));
    return grp(k);
  }
  if (style === "plateau") { // a high rolling meadow: cabin, haystacks, a few pines (Zlatibor, Pešter, Rajac) or dunes (Deliblato)
    const g = o.sand ? "#e3d3a3" : "#a9c08e"; k.push(hill(4.4, 1.3, g, { y: Y, z: -1.2, sx: 1.2, sz: 0.7 }), hill(2.8, 0.9, S(g, 0.04), { y: Y, x: 2.6, z: 1.2, sx: 1.2 }), hill(2.4, 0.7, S(g, -0.03), { y: Y, x: -2.8, z: 1.6 }));
    if (o.sand) k.push(...[[-2.2, -0.6], [0.8, -1.6], [2.8, 0.6], [-0.6, 1.9], [3.4, -2.0]].map(([x, z], i) => bush(0.3 + R(seed, i) * 0.2, "#7f9a6a", { x, z, y: Y + 0.6 })), ...pines([[-3.5, -2.2, 2.4], [-2.6, -2.6, 1.8], [3.6, 2.4, 1.9], [3.0, -2.5, 2.2]]), ...[[-1.6, 0.9], [0.4, 0.2], [1.9, -0.9], [-0.4, -1.9], [2.6, 1.7], [-2.9, 1.9]].map(([x, z], i) => cone(0.12, 0.5, "#8fa66a", { x, z, y: Y + 0.75, seg: 5 })), rod([0.9, Y + 1.2, -1.5], [0.9, Y + 3.2, -1.5], 0.05, WOOD), rod([1.5, Y + 1.2, -1.5], [1.5, Y + 3.2, -1.5], 0.05, WOOD), box(1.0, 0.8, 0.1, WOOD, { x: 1.2, z: -1.5, y: Y + 2.6 }), pyramid(1.2, 1.0, 0.5, "#5a3b33", { x: 1.2, z: -1.5, y: Y + 3.2 }));
    else k.push(box(1.7, 1.3, 1.0, P.log, { y: Y + 1.1, x: -0.6, z: -0.9 }), prism(2.0, 1.6, 1.0, "#4a3b30", { y: Y + 2.1, x: -0.6, z: -0.9 }), haystack(0.5, { x: 1.9, z: 1.3, y: Y + 0.8 }), haystack(0.42, { x: 2.9, z: 0.5, y: Y + 0.75 }), ...pines([[-3.4, -1.6, 2.6], [-2.6, -2.3, 2.0], [3.3, -2.0, 2.4], [-3.2, 2.2, 1.8]]), fence(3, WOOD, { x: -1.8, z: 2.2, y: Y + 0.55 }), o.lift ? [rod([-3.8, Y + 3.4, 1.0], [3.8, Y + 4.6, -2.4], 0.025, INK), ...[-2.2, 0.2, 2.6].map((x, i) => box(0.42, 0.36, 0.42, [RED, AMBER, BLUE][i], { x, y: Y + 3.2 + (x + 3.8) * 0.158, z: 1.0 - (x + 3.8) * 0.447 })), cyl(0.07, 3.3, P.steel, { x: -3.8, z: 1.0, y: Y, seg: 8 }), cyl(0.07, 4.2, P.steel, { x: 3.8, z: -2.4, y: Y + 0.5, seg: 8 })] : null);
    return grp(k);
  }
  if (style === "forest") { k.push(hill(4.2, 1.6, "#93ab7d", { y: Y, z: -0.8, sx: 1.2, sz: 0.75 })); for (let i = 0; i < 16; i++) { const x = -3.7 + (i % 6) * 1.45 + (R(seed, i) - 0.5) * 0.6, z = -2.5 + Math.floor(i / 6) * 2.0 + (R(seed, i + 30) - 0.5) * 0.8; k.push(R(seed, i + 60) > (o.oak ? 0.15 : 0.7) ? tree(2.0 + R(seed, i + 3) * 1.1, i % 2 ? "#5d8a4c" : "#6f9a58", { x, z, y: Y + (z < 0 ? 0.9 : 0.1) }) : pine(2.1 + R(seed, i + 8) * 1.3, { x, z, y: Y + (z < 0 ? 0.9 : 0.1) })); } k.push(bench(1.1, { x: 0.4, z: 2.7, y: Y })); return grp(k); }
  // peak / ski: rocky summits, snow on top, pines below; a lift and a chalet when it is a ski mountain
  const ski = style === "ski"; k.push(peak(2.9, 5.2, rock, { x: -1.2, z: -1.3, y: Y }, ski ? 0.5 : 0.28), peak(2.3, 3.9, S(rock, -0.05), { x: 1.9, z: -1.6, y: Y }, ski ? 0.5 : 0.24), peak(1.9, 2.7, S(rock, 0.04), { x: 3.3, z: -0.4, y: Y }, ski ? 0.4 : 0.15), peak(1.8, 2.4, S(rock, 0.02), { x: -3.4, z: -0.3, y: Y }, ski ? 0.4 : 0));
  if (ski) { k.push(box(8.2, 2.6, 0.08, P.snow, { y: Y, z: 1.8, sharp: true }), box(1.8, 1.3, 1.0, "#efe6d2", { y: Y, x: -2.3, z: 1.6 }), box(1.8, 1.3, 0.5, P.log, { y: Y + 1.0, x: -2.3, z: 1.6 }), prism(2.2, 1.7, 1.1, "#5a3b33", { y: Y + 1.5, x: -2.3, z: 1.6 }), box(2.2, 1.7, 0.1, P.snow, { y: Y + 2.05, x: -2.3, z: 1.2, rx: 0.5 })); k.push(rod([0.4, Y + 2.2, 2.4], [2.6, Y + 4.4, -1.2], 0.025, INK), cyl(0.07, 2.1, P.steel, { x: 0.4, z: 2.4, y: Y, seg: 8 }), cyl(0.07, 2.0, P.steel, { x: 1.6, z: 0.5, y: Y + 1.3, seg: 8 }), ...[0.25, 0.55, 0.85].map((t, i) => box(0.36, 0.3, 0.36, [RED, AMBER, BLUE][i], { x: 0.4 + 2.2 * t, y: Y + 1.75 + 2.2 * t, z: 2.4 - 3.6 * t }))); }
  k.push(...pines(ski ? [[3.4, 2.3, 2.2], [2.5, 1.5, 1.8], [-3.7, 2.5, 1.7], [0.2, 0.9, 1.6]] : [[-3.4, 2.2, 2.4], [-2.2, 2.6, 1.8], [3.3, 2.3, 2.6], [2.1, 2.6, 1.9], [0.2, 2.2, 2.2], [-1.0, 1.5, 1.6]]), ski ? null : [box(1.2, 1.0, 0.8, P.log, { y: Y, x: 1.1, z: 1.4 }), pitchedRoof(1.2, 1.0, 0.6, "#4a3b30", { y: Y + 0.8, x: 1.1, z: 1.4 })]);
  return grp(k);
}
function rocks(c, style, o = {}) { // earth pillars, each with its dark stone cap (Đavolja varoš, Vražji kamen)
  const seed = o.seed ?? 0, k = [ground(P.grass), hill(4.2, 1.1, o.tall ? "#9aa58a" : "#c9a37a", { y: Y, sx: 1.2, sz: 0.75 })];
  if (o.tall) { [[-1.2, 0, 4.6, 1.3], [0.6, -0.4, 5.6, 1.5], [1.9, 0.5, 3.6, 1.1]].forEach(([x, z, h, r]) => k.push(cyl(r, h, P.rock, { x, z, y: Y + 0.4, seg: 7, rTop: r * 0.7 }), cone(r * 0.7, 0.7, P.rockD, { x, z, y: Y + 0.4 + h, seg: 7 }))); k.push(box(0.8, 0.6, 0.6, "#efe9dc", { y: Y + 6.1, x: 0.6, z: -0.4 }), drum(0.25, 0.3, "#efe9dc", P.tile, { y: Y + 6.7, x: 0.6, z: -0.4 }), ...river(2.5, 1.2)); }
  else for (let i = 0; i < 12; i++) { const x = -3.0 + (i % 6) * 1.2 + (R(seed, i) - 0.5) * 0.5, z = -1.0 + Math.floor(i / 6) * 1.5 + (R(seed, i + 9) - 0.5) * 0.6, h = 1.8 + R(seed, i + 20) * 2.6, r = 0.3 + R(seed, i + 4) * 0.16; k.push(cone(r, h, i % 2 ? "#c98b5a" : "#b97a50", { x, z, y: Y + 0.7, seg: 9 }), sphere(r * 0.75, "#5a524c", { x, z, y: Y + 0.7 + h * 0.8, sy: 0.6 })); }
  k.push(pine(2.3, { x: -3.6, z: 2.4, y: Y }), pine(1.9, { x: 3.6, z: 2.3, y: Y }));
  return grp(k);
}
function lake(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass)];
  { const w = cyl(3.5, 0.06, P.water, { y: Y, seg: 48 }); w.scale.set(1.12, 1, 0.74); k.push(w); const s = cyl(3.62, 0.04, P.sand, { y: Y, seg: 48 }); s.scale.set(1.12, 1, 0.74); k.push(s); }
  if (style === "mountain") k.push(hill(2.6, 2.6, "#8fa67a", { x: -2.4, z: -2.6, y: Y }), hill(2.2, 2.0, "#9db886", { x: 1.2, z: -2.9, y: Y }), hill(1.8, 1.5, "#8fa67a", { x: 3.6, z: -2.2, y: Y }), pine(2.4, { x: -3.8, z: -0.6, y: Y }), pine(2.0, { x: 3.9, z: 0.4, y: Y }), pine(1.8, { x: -2.6, z: -1.9, y: Y + 1.6 }), pine(1.6, { x: 1.4, z: -2.4, y: Y + 1.3 }), boat("#8a6a3a", { x: 0.6, z: 0.5, y: Y + 0.05, ry: 0.4 }));
  else if (style === "island") k.push(hill(1.1, 0.5, "#9db886", { x: 0.4, z: -0.2, y: Y + 0.03, sx: 1.3 }), pine(1.6, { x: 0.1, z: -0.2, y: Y + 0.4 }), pine(1.2, { x: 0.9, z: -0.1, y: Y + 0.35 }), hill(2.6, 1.6, "#9db886", { x: -2.6, z: -2.8, y: Y }), hill(2.4, 1.3, "#8fa67a", { x: 2.6, z: -2.9, y: Y }), boat(WHITE, { x: -1.6, z: 1.0, y: Y + 0.05, ry: -0.3 }, 1.4), pine(2.2, { x: 3.8, z: 2.2, y: Y }), pine(1.9, { x: -3.9, z: 2.0, y: Y }));
  else { // plain: pier, rowboat, reeds, a white heron or sunshades
    k.push(box(0.5, 1.8, 0.1, "#b08a5a", { y: Y + 0.12, x: -1.4, z: 1.8 }), ...[1.1, 1.9, 2.6].map((z) => cyl(0.05, 0.3, WOOD, { x: -1.6, z, y: Y, seg: 6 })), boat("#b5523f", { x: -0.3, z: 0.9, y: Y + 0.05, ry: 0.5 }), o.sail ? boat(WHITE, { x: 1.5, z: -0.3, y: Y + 0.05, ry: -0.2 }, 1.5) : null);
    for (let i = 0; i < 14; i++) { const a = 2.2 + i * 0.16, x = Math.cos(a) * 3.6, z = -Math.sin(a) * 2.5; k.push(cyl(0.025, 0.8 + R(seed, i) * 0.5, "#7f9a5a", { x, z, y: Y, seg: 5 }), capsule(0.05, 0.16, "#6b4a2e", { x, z, y: Y + 0.9 + R(seed, i) * 0.5 })); }
    k.push(o.birds ? [cyl(0.03, 0.5, INK, { x: 1.9, z: 1.3, y: Y, seg: 5 }), capsule(0.12, 0.28, WHITE, { x: 1.9, z: 1.3, y: Y + 0.62, rz: 0.9 }), rod([2.0, Y + 0.72, 1.3], [2.12, Y + 1.05, 1.3], 0.03, WHITE), sphere(0.06, WHITE, { x: 2.13, z: 1.3, y: Y + 1.02 })] : [cone(0.55, 0.3, RED, { x: 2.7, z: 2.3, y: Y + 0.9, seg: 12 }), cyl(0.03, 0.9, WOOD, { x: 2.7, z: 2.3, y: Y, seg: 6 }), cone(0.5, 0.28, AMBER, { x: 1.6, z: 2.6, y: Y + 0.85, seg: 12 }), cyl(0.03, 0.85, WOOD, { x: 1.6, z: 2.6, y: Y, seg: 6 })], ...greens(seed, [[3.6, -2.4], [-3.7, -2.3], [3.8, 0.4]]));
  }
  return grp(k);
}
function riverScene(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass)];
  if (style === "house-on-rock") { // a tiny wooden house on a rock in the middle of the river (Kućica na Drini)
    k.push(box(8.6, 6.4, 0.05, "#7fc0b4", { y: Y, sharp: true }), cyl(1.3, 1.5, P.rock, { y: Y, seg: 7, rTop: 0.95 }), cyl(0.9, 0.5, P.rockD, { y: Y, x: 1.2, z: 0.5, seg: 6 }), box(1.4, 1.2, 0.12, P.log, { y: Y + 1.5 }), box(1.2, 1.0, 1.0, "#b08a5a", { y: Y + 1.62 }), prism(1.5, 1.3, 0.75, "#5a3b33", { y: Y + 2.62 }), box(0.3, 0.05, 0.4, DARK, { y: Y + 1.95, z: 0.51, sharp: true }), flagMast(0.8, [RED, BLUE, WHITE], { y: Y + 3.3, x: 0.3 }));
    k.push(hill(3.0, 2.2, "#8fa67a", { x: -3.2, z: -3.0, y: Y }), hill(2.6, 1.8, "#9db886", { x: 3.0, z: -3.2, y: Y }), pine(2.0, { x: -3.4, z: -2.2, y: Y + 1.4 }), pine(1.7, { x: 3.2, z: -2.6, y: Y + 1.2 }), boat("#8a6a3a", { x: -2.4, z: 2.0, y: Y + 0.03, ry: 0.3 }));
    return grp(k);
  }
  if (style === "beach") { k.push(...river(-1.6, 2.8), box(8.6, 2.4, 0.07, P.sand, { y: Y, z: 1.2, sharp: true }), ...[[-2.6, 1.3, RED], [-0.4, 1.7, AMBER], [1.9, 1.2, BLUE]].flatMap(([x, z, col]) => [cyl(0.03, 1.0, WOOD, { x, z, y: Y, seg: 6 }), cone(0.6, 0.32, col, { x, z, y: Y + 1.0, seg: 12 }), box(0.5, 0.9, 0.06, WHITE, { x: x + 0.6, z: z + 0.2, y: Y + 0.12, ry: 0.3 })]), boat(WHITE, { x: 1.2, z: -1.4, y: Y + 0.05 }, 1.3), ...greens(seed, [[-3.6, 2.6], [3.7, 2.6], [-3.5, -2.9], [0.4, -3.0], [3.4, -2.9]])); return grp(k); }
  if (style === "danube") { k.push(box(8.6, 3.6, 0.05, P.waterD, { y: Y, z: -0.2, sharp: true }), box(8.6, 0.2, 0.08, P.sand, { y: Y, z: 1.7, sharp: true }), box(3.0, 0.9, 0.36, WHITE, { y: Y + 0.03, x: -0.6, z: -0.5 }), box(2.2, 0.7, 0.34, "#e6eef5", { y: Y + 0.39, x: -0.8, z: -0.5 }), windowGrid(6, 1, 2.0, 0.3, { y: Y + 0.42, x: -0.8, z: -0.14, sill: false }), cyl(0.12, 0.5, RED, { y: Y + 0.73, x: -1.2, z: -0.5, seg: 10 }), boat("#8a6a3a", { x: 2.6, z: 0.7, y: Y + 0.03 }), boat("#b5523f", { x: 3.1, z: 1.1, y: Y + 0.03, ry: 0.3 }), ...[-3.4, -2.4, -1.5].map((x, i) => cypress(2.6 + i * 0.3, "#6f9a58", { x, z: 2.6, y: Y })), bench(1.1, { x: 0.6, z: 2.6, y: Y }), lamp({ x: 1.8, z: 2.5, y: Y }), hill(3.0, 0.8, "#9db886", { x: 1.5, z: -3.2, y: Y, sx: 1.6 })); return grp(k); }
  // bend: a lowland river curling through fields and willows
  [[-3.2, -1.6, 0.5], [-1.6, -0.5, 0.75], [0, 0.4, 0.2], [1.6, 0.2, -0.5], [3.2, -0.9, -0.6]].forEach(([x, z, ry]) => k.push(box(2.1, 1.3, 0.05, P.water, { x, z, y: Y, ry: -ry, sharp: true })));
  k.push(rows(5, 3.4, 0.4, P.wheat, { x: -2.1, z: 2.1, y: Y }), rows(4, 3.0, 0.4, "#a9c08e", { x: 2.4, z: 2.3, y: Y }), ...[[-3.4, 0.2], [-0.4, -1.8], [1.4, 1.5], [3.5, 0.6], [2.2, -2.4], [-2.0, -2.7]].map(([x, z], i) => tree(1.6 + R(seed, i) * 0.9, i % 2 ? "#7fa868" : "#6f9a58", { x, z, y: Y })), boat("#8a6a3a", { x: 0.1, z: 0.4, y: Y + 0.03, ry: -0.2 }));
  return grp(k);
}
function dam(c, style, o = {}) { // concrete dam with spillway gates, high water behind it, pylons on the bank
  const k = [ground(P.grass), box(8.6, 2.8, 1.5, P.waterD, { y: Y, z: -1.8, sharp: true }), box(8.6, 2.6, 0.05, P.water, { y: Y, z: 1.9, sharp: true }), box(8.6, 0.9, 2.1, P.concrete, { y: Y, z: -0.2 }), box(8.6, 1.1, 0.12, S(P.concrete, -0.06), { y: Y + 2.1, z: -0.2 })];
  for (let i = 0; i < 6; i++) { const x = -3.3 + i * 1.32; k.push(box(0.9, 0.2, 1.5, "#5f7f9c", { x, y: Y + 0.2, z: 0.3, sharp: true }), box(0.26, 1.3, 2.5, S(P.concrete, 0.03), { x: x + 0.66, y: Y, z: 0.0 }), i < 3 ? box(0.8, 0.5, 0.06, "#eaf3fa", { x, y: Y + 0.05, z: 0.75, sharp: true }) : null); }
  k.push(box(1.6, 1.2, 1.3, "#e6e2d8", { x: 3.2, y: Y + 2.22, z: -0.2 }), windowGrid(3, 1, 1.4, 0.9, { x: 3.2, y: Y + 2.4, z: 0.41 }), ...[-3.4, -2.2].map((x) => grp([rod([-0.3, 0, 0], [0, 2.2, 0], 0.04, P.steel), rod([0.3, 0, 0], [0, 2.2, 0], 0.04, P.steel), rod([-0.5, 1.7, 0], [0.5, 1.7, 0], 0.03, P.steel), rod([-0.35, 2.05, 0], [0.35, 2.05, 0], 0.03, P.steel)], { x, z: 2.9, y: Y })), rod([-3.4, Y + 1.7, 2.9], [-2.2, Y + 1.7, 2.9], 0.012, INK), pine(2.0, { x: -3.7, z: 2.3, y: Y }), pine(1.7, { x: 3.7, z: 2.6, y: Y }));
  const g = grp(k.splice(1)); g.scale.set(1, 1.55, 1); g.position.y = -Y * 0.55; k.push(g);
  return grp(k);
}
function cave(c, style, o = {}) { // a karst hillside with a dark mouth, stalactites and a stream
  const seed = o.seed ?? 0, k = [ground(P.grass), hill(3.9, 3.6, "#a39d90", { y: Y, z: -1.1, sx: 1.15, sz: 0.8 }), hill(3.0, 1.2, "#9db886", { y: Y + 2.6, z: -1.6, sx: 1.2 })];
  k.push(arch(2.3, 2.3, "#2a2623", { y: Y, z: 1.55, depth: 0.5 }), ...[-0.8, -0.35, 0.1, 0.55, 0.85].map((x, i) => cone(0.1 + R(seed, i) * 0.06, 0.4 + R(seed, i + 4) * 0.5, "#d9d2c2", { x, y: Y + 2.25 - Math.abs(x) * 0.5, z: 2.02, rz: PI })), ...[-0.6, 0.5].map((x, i) => cone(0.14, 0.5 + i * 0.2, "#d9d2c2", { x, y: Y, z: 1.95 })));
  k.push(box(1.0, 2.6, 0.05, P.water, { y: Y, x: 0.2, z: 2.0, ry: 0.2, sharp: true }), box(1.6, 0.3, 0.1, "#b08a5a", { y: Y + 0.1, x: 0.2, z: 2.9 }), pine(2.4, { x: -3.5, z: 2.2, y: Y }), pine(2.0, { x: 3.5, z: 2.3, y: Y }), pine(1.6, { x: -1.6, z: -1.6, y: Y + 3.2 }), pine(1.8, { x: 1.4, z: -1.8, y: Y + 3.3 }), box(0.7, 0.08, 0.5, "#8a6a3a", { x: 2.2, y: Y + 0.9, z: 2.4 }), cyl(0.04, 0.9, WOOD, { x: 2.2, y: Y, z: 2.4, seg: 6 }));
  return grp(k);
}
function windmill(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass)];
  if (style === "horse-mill") { // suvača: a great conical shingle roof over the horse-driven millstone, the miller's house attached
    k.push(lawn(8.2, 6, { col: "#c9cf9f" }), cyl(2.3, 1.0, "#efe6d2", { y: Y, x: -1.0, seg: 12 }), cone(2.9, 3.6, "#6b5a4a", { y: Y + 1.0, x: -1.0, seg: 12 }), sphere(0.12, WOOD, { y: Y + 4.6, x: -1.0 }), arch(0.9, 0.9, DOOR, { y: Y, x: -1.0, z: 2.3, depth: 0.05 }), box(2.6, 1.8, 1.5, "#f1ebdc", { y: Y, x: 2.4, z: -0.4 }), pitchedRoof(2.6, 1.8, 1.0, "#6b5a4a", { y: Y + 1.5, x: 2.4, z: -0.4 }), windowGrid(2, 1, 2.0, 1.0, { y: Y + 0.3, x: 2.4, z: 0.51 }), haystack(0.5, { x: 3.2, z: 2.3, y: Y }), fence(3, WOOD, { x: -2.6, z: 2.8, y: Y }), ...greens(seed, [[-3.7, -2.4], [3.7, -2.5]]));
    return grp(k);
  }
  if (style === "watermill") { k.push(...river(0.8, 1.6), box(2.4, 1.8, 0.3, P.rock, { y: Y, x: -0.6, z: -1.2 }), box(2.2, 1.6, 1.3, P.log, { y: Y + 0.3, x: -0.6, z: -1.2 }), prism(2.6, 2.0, 1.1, "#4a3b30", { y: Y + 1.6, x: -0.6, z: -1.2 }), torus(0.8, 0.08, WOOD, { y: Y + 0.8, x: -0.6, z: -0.25 }), ...[0, 1, 2, 3].map((i) => box(1.6, 0.14, 0.06, WOOD, { y: Y + 0.77, x: -0.6, z: -0.25, rz: (i / 4) * PI })), ...greens(seed, [[-3.5, 2.4], [3.4, 2.5], [3.3, -2.3], [-3.5, -2.4]]), fence(3, WOOD, { x: 2.2, z: -1.6, y: Y })); return grp(k); }
  const w = o.wall ?? "#efe6d2"; k.push(lawn(8.2, 6, { col: "#c9cf9f" }), cyl(1.25, 4.0, w, { y: Y, seg: 16, rTop: 0.85 }), cone(1.0, 1.1, "#5a3b33", { y: Y + 4.0, seg: 16 }), door(0.6, 1.1, DOOR, { y: Y, z: 1.2 }), box(0.3, 0.05, 0.4, DARK, { y: Y + 2.4, z: 1.02, sharp: true }), cyl(0.1, 0.5, WOOD, { y: Y + 4.2, z: 0.9, axis: "z", seg: 8 }));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + 0.5; k.push(grp([box(0.08, 0.05, 2.6, WOOD, { y: 0.1, sharp: true }), box(0.6, 0.03, 2.1, "#d9cdb4", { x: 0.3, y: 0.55, sharp: true })], { y: Y + 4.2, z: 1.18, rz: a })); }
  k.push(rows(4, 3.0, 0.42, P.wheat, { x: 2.6, z: 2.0, y: Y }), haystack(0.5, { x: -2.8, z: 1.8, y: Y }), ...greens(seed, [[-3.6, -2.3], [3.6, -2.4]]));
  return grp(k);
}
function farm(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass)];
  if (style === "salas") { // a long white farmhouse with a porch, the well with its sweep, haystack and field
    k.push(lawn(8.2, 6, { col: "#c9cf9f" }), box(4.6, 1.8, 1.5, "#f6f2e8", { y: Y, x: -0.8, z: -1.4 }), pitchedRoof(4.6, 1.8, 1.1, o.thatch ? P.thatch : P.tile, { y: Y + 1.5, x: -0.8, z: -1.4 }), ...[-2.6, -1.4, -0.2, 1.0].map((x) => cyl(0.07, 1.4, "#3f6f5a", { x, y: Y, z: -0.2, seg: 8 })), box(4.6, 0.6, 0.1, "#f6f2e8", { y: Y + 1.4, x: -0.8, z: -0.4 }), windowGrid(4, 1, 4.0, 1.0, { y: Y + 0.3, x: -0.8, z: -0.49, color: "#3f6f5a" }));
    k.push(cyl(0.45, 0.6, P.rock, { x: 2.4, z: 1.2, y: Y, seg: 12 }), cyl(0.08, 2.6, WOOD, { x: 3.2, z: 1.2, y: Y, seg: 8 }), rod([1.9, Y + 3.2, 1.2], [3.9, Y + 2.0, 1.2], 0.05, WOOD), rod([1.95, Y + 3.15, 1.2], [2.35, Y + 0.9, 1.2], 0.02, INK), haystack(0.55, { x: -3.0, z: 1.8, y: Y }), rows(4, 3.0, 0.42, P.wheat, { x: -0.2, z: 2.3, y: Y }), ...greens(seed, [[3.6, -2.4], [-3.7, -2.4]]));
    return grp(k);
  }
  // wheat: a golden field, sheaves, a tractor, the village church spire far behind
  k.push(rows(9, 8.0, 0.5, P.wheat, { z: 0.3, y: Y }, 0.3), ...[[-2.8, 2.6], [-1.9, 2.7], [-2.3, 2.2]].map(([x, z]) => cone(0.22, 0.7, "#d9b85a", { x, z, y: Y, seg: 8 })), box(1.3, 0.8, 0.6, RED, { x: 1.6, z: 1.4, y: Y + 0.35 }), box(0.6, 0.7, 0.6, "#c9ccd4", { x: 1.2, z: 1.4, y: Y + 0.95 }), cyl(0.42, 0.24, INK, { x: 1.2, z: 1.9, y: Y + 0.42, axis: "z", seg: 16 }), cyl(0.26, 0.2, INK, { x: 2.1, z: 1.85, y: Y + 0.26, axis: "z", seg: 16 }), box(1.1, 0.8, 1.0, "#f6f2e8", { x: -2.6, z: -2.4, y: Y }), box(0.5, 0.5, 2.2, "#f6f2e8", { x: -2.6, z: -2.0, y: Y }), pyramid(0.6, 0.6, 1.0, P.tile, { x: -2.6, z: -2.0, y: Y + 2.2 }), ...[0.2, 1.2, 2.3, 3.3].map((x, i) => cypress(2.2 + R(seed, i) * 0.8, "#6f9a58", { x, z: -2.6, y: Y })));
  return grp(k);
}
function vineyard(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass), hill(4.6, 1.2, "#b9c79a", { y: Y, z: -1.4, sx: 1.2, sz: 0.7 })];
  const vines = (x0, z0, n, len) => { for (let i = 0; i < n; i++) { const z = z0 + i * 0.55; k.push(box(len, 0.2, 0.42, P.vine, { x: x0, z, y: Y + 0.08, sharp: true })); for (let j = 0; j < Math.round(len / 0.7); j++) k.push(cyl(0.03, 0.62, WOOD, { x: x0 - len / 2 + 0.2 + j * 0.7, z, y: Y, seg: 5 }), R(seed, i * 9 + j) > 0.5 ? sphere(0.07, "#6a3a6f", { x: x0 - len / 2 + 0.45 + j * 0.7, z: z + 0.12, y: Y + 0.2 }) : null); } };
  if (style === "pimnice") { // a hamlet of small stone wine cellars under stone roofs (Rajačke pimnice)
    [[-2.6, -1.5, 1.3], [-0.9, -1.9, 1.5], [0.9, -1.4, 1.2], [2.6, -1.8, 1.4], [-1.7, -0.2, 1.1], [1.8, -0.1, 1.2]].forEach(([x, z, w], i) => k.push(box(w, 1.1, 1.1, i % 2 ? "#d2c6ae" : "#c7ba9f", { x, z, y: Y + 0.6 }), pitchedRoof(w, 1.1, 0.6, i % 2 ? "#8c7f70" : "#9a8e7d", { x, z, y: Y + 1.7 }), arch(0.42, 0.75, "#3a2a1e", { x, z: z + 0.56, y: Y + 0.6, depth: 0.04 })));
    vines(-1.6, 1.5, 3, 4.2); k.push(cyl(0.34, 0.8, "#8a5a3a", { x: 2.8, z: 2.0, y: Y + 0.34, axis: "x", seg: 14 }), torus(0.34, 0.03, INK, { x: 2.6, z: 2.0, y: Y + 0.34, ry: PI / 2 }), torus(0.34, 0.03, INK, { x: 3.0, z: 2.0, y: Y + 0.34, ry: PI / 2 }));
    return grp(k);
  }
  vines(-1.2, 0.6, 4, 5.4); k.push(box(2.2, 1.5, 1.4, "#efe6d2", { x: 2.4, z: -1.6, y: Y + 0.7 }), pitchedRoof(2.2, 1.5, 0.9, P.tile, { x: 2.4, z: -1.6, y: Y + 2.1 }), arch(0.7, 1.0, "#3a2a1e", { x: 2.4, z: -0.84, y: Y + 0.7, depth: 0.05 }), cyl(0.42, 1.0, "#8a5a3a", { x: 3.2, z: 0.9, y: Y + 0.42, axis: "x", seg: 14 }), torus(0.42, 0.035, INK, { x: 2.95, z: 0.9, y: Y + 0.42, ry: PI / 2 }), torus(0.42, 0.035, INK, { x: 3.45, z: 0.9, y: Y + 0.42, ry: PI / 2 }), cypress(2.6, "#56795a", { x: -3.6, z: -2.2, y: Y + 0.6 }), cypress(2.2, "#4b6b4c", { x: 0.6, z: -2.4, y: Y + 0.9 }));
  return grp(k);
}
function produce(c, style, o = {}) { // what the place grows, larger than life on a market crate
  const seed = o.seed ?? 0, k = [ground(), box(3.4, 2.4, 0.9, "#b08a5a", { y: Y }), ...[0, 1, 2].map((i) => box(3.44, 2.44, 0.06, "#8a6a3a", { y: Y + 0.2 + i * 0.3, sharp: true }))];
  const top = Y + 0.9, leaf = (x, y, z, s = 1) => sphere(0.3 * s, "#5f8f4a", { x, y, z, sy: 0.2 });
  if (style === "pepper") for (let i = 0; i < 6; i++) { const x = -1.2 + (i % 3) * 1.2, z = -0.5 + Math.floor(i / 3) * 1.0; k.push(cone(0.36, 1.6, i % 2 ? "#c8313a" : "#d8452f", { x, z, y: top + 1.5, rz: PI + (R(seed, i) - 0.5) * 0.5 }), sphere(0.36, i % 2 ? "#c8313a" : "#d8452f", { x, z, y: top + 1.25, sy: 0.6 }), cyl(0.05, 0.3, "#5f8f4a", { x, z, y: top + 1.6, seg: 6 })); }
  else if (style === "plum" || style === "cherry" || style === "apple") { const col = style === "plum" ? ["#5a3d7a", "#6b4a8f"] : style === "cherry" ? ["#b3202c", "#c8313a"] : ["#c8313a", "#d8a03a"]; for (let i = 0; i < 9; i++) { const x = -1.1 + (i % 3) * 1.1 + (R(seed, i) - 0.5) * 0.2, z = -0.6 + Math.floor(i / 3) * 0.62, r = style === "cherry" ? 0.34 : 0.42; k.push(sphere(r, col[i % 2], { x, z, y: top + (i > 5 ? 0.45 : 0), sy: style === "plum" ? 1.2 : 1 }), i % 2 ? cyl(0.02, style === "cherry" ? 0.7 : 0.25, "#6b4a2e", { x, z, y: top + r * 2 + (i > 5 ? 0.45 : 0) - 0.05, seg: 5 }) : null); } k.push(leaf(0.4, top + 1.5, 0.2), leaf(-0.6, top + 1.4, -0.3)); }
  else if (style === "raspberry") for (let b = 0; b < 3; b++) { const bx = -1.0 + b * 1.0; for (let i = 0; i < 16; i++) { const a = (i / 8) * PI * 2, lv = Math.floor(i / 8); k.push(sphere(0.2, i % 2 ? "#c2274a" : "#d63a5e", { x: bx + Math.sin(a) * (0.28 - lv * 0.08), z: Math.cos(a) * (0.28 - lv * 0.08), y: top + 0.1 + lv * 0.3 })); } k.push(sphere(0.2, "#c2274a", { x: bx, y: top + 0.7 }), leaf(bx, top + 1.05, 0, 0.8)); }
  else for (let i = 0; i < 5; i++) k.push(capsule(0.24, 1.3, "#e3c56c", { x: -1.2 + i * 0.6, y: top + 0.3, z: 0, rz: PI / 2, ry: PI / 2 + (R(seed, i) - 0.5) * 0.3 }), leaf(-1.2 + i * 0.6, top + 0.5, -0.8, 1.2));
  k.push(box(1.1, 0.8, 0.5, "#b08a5a", { x: 2.8, z: 1.4, y: Y }), box(1.0, 0.7, 0.4, "#b08a5a", { x: -2.8, z: 1.2, y: Y }), ...greens(seed, [[-3.6, -2.3], [3.6, -2.3]]));
  return grp(k);
}
function object(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground()], gold = "#d9b24a";
  if (style === "trumpet") { // a golden trumpet on a plinth (Guča)
    k.push(lawn(8.2, 6, {}), steps(2, 3.6, 0.3, 0.12, STONE, { z: 1.0, y: Y }), box(3.2, 1.6, 0.9, "#d9d3c5", { y: Y + 0.24 }), cyl(0.09, 3.6, gold, { y: Y + 2.6, axis: "x", seg: 12 }), cone(0.75, 1.2, gold, { y: Y + 2.6, x: 1.8, rz: PI / 2, seg: 24 }), cyl(0.07, 2.2, gold, { y: Y + 2.25, x: -0.4, axis: "x", seg: 10 }), torus(0.18, 0.07, gold, { y: Y + 2.42, x: -1.5, rx: 0 }), torus(0.18, 0.07, gold, { y: Y + 2.42, x: 0.7 }), ...[-0.5, -0.1, 0.3].map((x) => [cyl(0.09, 0.7, gold, { x, y: Y + 2.3, seg: 10 }), cyl(0.11, 0.06, "#f1e3a8", { x, y: Y + 3.0, seg: 10 })]), sphere(0.1, gold, { x: -1.85, y: Y + 2.5 }), rod([-0.6, Y + 1.14, 0], [-0.6, Y + 2.2, 0], 0.05, INK), rod([0.6, Y + 1.14, 0], [0.6, Y + 2.2, 0], 0.05, INK));
    { const tr = grp(k.splice(4)); tr.scale.setScalar(1.45); tr.position.set(0, -(Y + 1.14) * 0.45 + 0.0, 0); k.push(tr); }
    k.push(...greens(seed, [[-3.6, 2.2], [3.6, 2.2], [-3.5, -2.3], [3.5, -2.3]])); return grp(k);
  }
  if (style === "horse") { // a horse at the stud farm, paddock rail behind (Ljubičevo)
    const hc = "#6b4a2e"; k.push(lawn(8.2, 6, {}), capsule(0.62, 1.7, hc, { y: Y + 2.0, rz: PI / 2 }), ...[[-0.9, 0.3], [-0.9, -0.3], [0.9, 0.3], [0.9, -0.3]].map(([x, z]) => cyl(0.14, 1.5, S(hc, -0.05), { x, z, y: Y, seg: 10 })), capsule(0.3, 1.0, hc, { x: 1.45, y: Y + 2.75, rz: -0.65 }), box(0.9, 0.36, 0.42, hc, { x: 1.95, y: Y + 3.2, rz: -0.45 }), cone(0.08, 0.24, hc, { x: 1.62, y: Y + 3.62, z: 0.12, seg: 6 }), cone(0.08, 0.24, hc, { x: 1.62, y: Y + 3.62, z: -0.12, seg: 6 }), capsule(0.1, 0.9, INK, { x: -1.6, y: Y + 1.7, rz: 0.5 }), box(0.9, 0.08, 0.5, INK, { x: 1.35, y: Y + 3.0, z: 0, rz: -0.65, sharp: true }));
    k.push(fence(7, WHITE, { z: -2.2, y: Y }), box(2.4, 1.4, 1.5, "#efe6d2", { x: -2.6, z: -2.9, y: Y }), ...greens(seed, [[3.6, 2.3], [-3.6, 2.4]])); return grp(k);
  }
  if (style === "mammoth") { const hc = "#7a5a40"; k.push(lawn(8.2, 6, {}), sphere(1.5, hc, { y: Y + 1.3, sx: 1.3, sy: 1.0 }), sphere(0.95, hc, { x: 1.7, y: Y + 2.3 }), ...[[-0.9, 0.5], [-0.9, -0.5], [0.9, 0.5], [0.9, -0.5]].map(([x, z]) => cyl(0.34, 1.5, S(hc, -0.05), { x, z, y: Y, seg: 12 })), capsule(0.2, 1.5, hc, { x: 2.5, y: Y + 1.7, rz: -0.25 }), ...[0.35, -0.35].map((z) => { const t = torus(0.75, 0.09, "#f1ebdc", { x: 2.5, y: Y + 1.9, z, arc: PI * 0.8, rz: -PI * 0.75 }); return t; }), ...greens(seed, [[-3.6, 2.3], [3.6, -2.3]])); return grp(k); }
  // grill: the long charcoal grill with skewers and smoke (Roštiljijada)
  k.push(box(4.6, 1.3, 0.2, INK, { y: Y + 1.0 }), box(4.4, 1.1, 0.14, "#c9482f", { y: Y + 1.08, sharp: true }), ...[-2.0, 2.0].flatMap((x) => [-0.5, 0.5].map((z) => cyl(0.06, 1.0, INK, { x, z, y: Y, seg: 8 }))), ...Array.from({ length: 9 }, (_, i) => [cyl(0.02, 1.5, "#c9ccd4", { x: -1.9 + i * 0.48, y: Y + 1.3, axis: "z", seg: 6 }), ...[-0.4, -0.1, 0.2, 0.45].map((z, j) => box(0.26, 0.2, 0.16, j % 2 ? "#8a4a2e" : "#a55a36", { x: -1.9 + i * 0.48, z, y: Y + 1.24 }))]), ...[0, 1, 2, 3, 4].map((i) => sphere(0.28 + i * 0.08, "#e9e7e1", { x: -1.0 + i * 0.5 + R(seed, i) * 0.4, y: Y + 2.0 + i * 0.55, z: -0.2 })));
  k.push(box(1.4, 1.0, 0.9, "#b08a5a", { x: 3.2, z: 1.8, y: Y }), ...[0, 1, 2].map((i) => cone(0.12, 0.5, i % 2 ? "#c8313a" : "#d8452f", { x: 2.9 + i * 0.3, z: 1.8, y: Y + 1.4, rz: PI })), flagMast(2.6, [RED, BLUE, WHITE], { x: -3.6, z: -2.3, y: Y }), ...greens(seed, [[3.6, -2.4]]));
  return grp(k);
}
function train(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass)];
  const track = (z, y = Y) => [box(8.6, 1.0, 0.1, "#9a958a", { y, z, sharp: true }), box(8.6, 0.06, 0.07, P.steel, { y: y + 0.1, z: z - 0.28, sharp: true }), box(8.6, 0.06, 0.07, P.steel, { y: y + 0.1, z: z + 0.28, sharp: true }), ...Array.from({ length: 14 }, (_, i) => box(0.16, 0.9, 0.05, "#6b4a2e", { x: -3.9 + i * 0.6, y: y + 0.09, z, sharp: true }))];
  const loco = (x, y, z) => [box(2.3, 0.8, 0.22, "#8a1f26", { x, y: y + 0.36, z }), cyl(0.42, 1.6, INK, { x: x + 0.25, y: y + 1.0, z, axis: "x", seg: 16 }), box(0.85, 0.86, 1.0, INK, { x: x - 0.75, y: y + 0.58, z }), box(1.0, 0.95, 0.08, "#8a1f26", { x: x - 0.75, y: y + 1.58, z }), cyl(0.13, 0.55, INK, { x: x + 0.75, y: y + 1.4, z, seg: 10, rTop: 0.18 }), sphere(0.2, GOLD, { x: x + 0.2, y: y + 1.38, z, sy: 0.8 }), ...[-0.7, 0.0, 0.7].map((dx) => [cyl(0.3, 0.1, "#8a1f26", { x: x + dx, y: y + 0.34, z: z + 0.42, axis: "z", seg: 16 }), cyl(0.3, 0.1, "#8a1f26", { x: x + dx, y: y + 0.34, z: z - 0.42, axis: "z", seg: 16 })]), ...[0, 1, 2].map((i) => sphere(0.22 + i * 0.1, "#eeeeea", { x: x + 0.7 - i * 0.4, y: y + 2.1 + i * 0.5, z }))];
  if (style === "steam") { k.push(...track(0.4), ...loco(0.6, Y + 0.1, 0.4), box(1.7, 0.78, 0.9, "#3f6f5a", { x: -2.2, y: Y + 0.5, z: 0.4 }), box(1.8, 0.86, 0.08, "#2f4f42", { x: -2.2, y: Y + 1.4, z: 0.4 }), windowGrid(3, 1, 1.5, 0.5, { x: -2.2, y: Y + 0.8, z: 0.86, sill: false }), ...[-2.7, -1.7].map((x) => cyl(0.22, 0.1, INK, { x, y: Y + 0.32, z: 0.82, axis: "z", seg: 12 })), box(2.2, 1.2, 1.3, "#efe6d2", { x: 2.6, z: -2.0, y: Y }), pitchedRoof(2.2, 1.2, 0.7, P.tile, { x: 2.6, z: -2.0, y: Y + 1.3 }), ...greens(seed, [[-3.5, -2.3], [-1.6, -2.5], [3.6, 2.5], [-3.4, 2.5]]), cyl(0.05, 1.8, INK, { x: 3.6, z: 1.5, y: Y, seg: 6 }), box(0.5, 0.06, 0.16, RED, { x: 3.85, z: 1.5, y: Y + 1.6, sharp: true })); return grp(k); }
  const st = BUILDINGS.trainstation ? BUILDINGS.trainstation(c) : BUILDINGS.townhall(c); st.scale.setScalar(0.72); st.position.set(0, Y - 0.2, -1.2); k.push(st, ...track(2.3), box(8.6, 0.9, 0.16, STONE, { y: Y, z: 1.3, sharp: true }));
  return grp(k);
}
function mine(c, style, o = {}) { // an open pit cut in terraces, a haul truck, the headframe on the rim
  const k = [ground("#b9b0a0")], ore = o.coal ? ["#4a4744", "#5a5652", "#3d3a38"] : ["#b9836a", "#c9937a", "#a8735c"];
  for (let i = 0; i < 5; i++) { const t = torus(3.2 - i * 0.55, 0.32, ore[i % 3], { rx: PI / 2, y: Y - 0.05 + (4 - i) * 0.02, x: -0.6, z: 0.2 }); t.scale.set(1.15, 0.85, 1); k.push(t); }
  k.push(cyl(0.8, 0.1, o.coal ? "#2f2d2b" : "#6fa7a0", { y: Y, x: -0.6, z: 0.2, seg: 24 }), box(1.1, 0.7, 0.5, "#e2b03a", { x: 1.2, z: 1.6, y: Y + 0.36 }), box(0.5, 0.6, 0.5, "#e2b03a", { x: 1.9, z: 1.6, y: Y + 0.5 }), ...[0.9, 1.9].flatMap((x) => [1.25, 1.95].map((z) => cyl(0.26, 0.2, INK, { x, z, y: Y + 0.26, axis: "z", seg: 14 }))), cone(0.5, 0.4, ore[0], { x: 1.1, z: 1.6, y: Y + 0.86, seg: 10 }));
  if (o.excavator) k.push(box(1.6, 1.2, 0.9, "#e2b03a", { x: 2.6, z: -1.8, y: Y + 0.5 }), box(2.0, 1.5, 0.4, INK, { x: 2.6, z: -1.8, y: Y }), rod([2.6, Y + 1.4, -1.8], [0.4, Y + 2.8, -1.4], 0.1, "#e2b03a"), torus(0.7, 0.14, "#e2b03a", { x: 0.3, z: -1.4, y: Y + 2.6 }), ...[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * PI * 2; return box(0.26, 0.3, 0.2, INK, { x: 0.3 + Math.cos(a) * 0.7, y: Y + 2.6 + Math.sin(a) * 0.7 - 0.1, z: -1.4 }); }));
  else k.push(...[[-0.5, 0], [0.5, 0]].map(([dx]) => rod([3.0 + dx, Y, -2.2], [3.0, Y + 3.6, -2.2], 0.07, P.steel)), rod([3.0, Y, -2.9], [3.0, Y + 3.6, -2.2], 0.07, P.steel), rod([2.7, Y + 1.8, -2.2], [3.3, Y + 1.8, -2.2], 0.05, P.steel), torus(0.4, 0.06, INK, { x: 3.0, y: Y + 3.7, z: -2.2, ry: PI / 2 }), box(1.4, 1.0, 1.1, "#c9c2b4", { x: 1.6, z: -2.4, y: Y }), pitchedRoof(1.4, 1.0, 0.5, "#8c7f70", { x: 1.6, z: -2.4, y: Y + 1.1 }));
  k.push(hill(1.5, 1.2, ore[1], { x: -3.4, z: -2.4, y: Y }), hill(1.1, 0.8, ore[2], { x: -2.2, z: -2.7, y: Y }));
  return grp(k);
}
function powerplant(c, style, o = {}) {
  const k = [ground("#cfcabf")], stripe = (x, z, h, r) => [cyl(r, h, "#e2ded4", { x, z, y: Y, seg: 16, rTop: r * 0.7 }), ...[0.7, 0.82, 0.94].map((t, i) => cyl(r * (1 - t * 0.3) + 0.01, h * 0.06, i % 2 ? WHITE : RED, { x, z, y: Y + h * t, seg: 16 })), sphere(r * 0.9, "#eeeeea", { x: x + 0.3, z, y: Y + h + 0.3 }), sphere(r * 1.2, "#eeeeea", { x: x + 0.8, z, y: Y + h + 0.9 })];
  if (style === "steel") { k.push(box(4.6, 2.2, 1.8, "#9aa3ad", { x: -1.2, z: -1.2, y: Y }), ...[0, 1, 2, 3].map((i) => prism(1.15, 2.2, 0.6, "#7d8590", { x: -2.9 + i * 1.15, z: -1.2, y: Y + 1.8, ridge: "z" })), cyl(0.9, 3.4, "#8c5a4a", { x: 2.4, z: -1.0, y: Y, seg: 16, rTop: 0.6 }), cyl(0.45, 0.8, INK, { x: 2.4, z: -1.0, y: Y + 3.4, seg: 12 }), rod([1.0, Y + 1.8, -1.0], [2.2, Y + 3.2, -1.0], 0.1, P.steel), ...stripe(3.5, 1.2, 4.6, 0.3), ...[0, 1, 2].map((i) => cyl(0.5, 0.5, "#b87333", { x: -2.6 + i * 1.1, z: 1.7, y: Y + 0.5, axis: "x", seg: 16 })), ...[0, 1].map((i) => cyl(0.5, 0.5, "#c98a4a", { x: -2.0 + i * 1.1, z: 1.7, y: Y + 1.3, axis: "x", seg: 16 })), box(1.2, 0.7, 0.5, "#e2b03a", { x: 1.2, z: 2.0, y: Y + 0.2 })); return grp(k); }
  // thermal: boiler house, two striped stacks, a cooling tower, the coal conveyor (or cement silos)
  k.push(box(3.4, 2.2, 2.6, "#b9bec6", { x: -1.4, z: -1.0, y: Y }), box(3.4, 2.2, 0.5, "#8d949e", { x: -1.4, z: -1.0, y: Y + 2.6 }), windowGrid(5, 2, 3.0, 1.8, { x: -1.4, z: 0.11, y: Y + 0.5, sill: false }), ...stripe(1.2, -1.6, 6.4, 0.38), ...stripe(2.2, -1.6, 5.6, 0.34));
  if (o.silos) k.push(...[0, 1, 2].map((i) => [cyl(0.6, 3.0, "#d9d5cb", { x: 1.2 + i * 1.25, z: 1.2, y: Y, seg: 16 }), cone(0.62, 0.4, "#b9b5ab", { x: 1.2 + i * 1.25, z: 1.2, y: Y + 3.0, seg: 16 })]), rod([-0.6, Y + 2.9, -0.4], [1.2, Y + 3.3, 1.2], 0.09, P.steel));
  else { const ct = cyl(1.3, 3.2, "#d9d5cb", { x: 2.6, z: 1.0, y: Y, seg: 24, rTop: 0.95 }); k.push(ct, cyl(0.95, 0.5, "#d9d5cb", { x: 2.6, z: 1.0, y: Y + 3.2, seg: 24, rTop: 1.1 }), sphere(0.7, "#f1f1ee", { x: 2.7, z: 1.0, y: Y + 3.8 }), sphere(0.9, "#f1f1ee", { x: 3.1, z: 1.0, y: Y + 4.6 }), rod([-3.8, Y + 0.3, 2.2], [-1.6, Y + 2.2, 0.4], 0.12, P.steel), hill(0.9, 0.7, "#3d3a38", { x: -3.6, z: 2.3, y: Y })); }
  return grp(k);
}
function archaeology(c, style, o = {}) {
  const seed = o.seed ?? 0, st = "#e3dccb", k = [ground(P.grass)];
  if (style === "prehistoric") { // trapezoid house floors facing the river, fish-faced boulders, a clay figurine
    k.push(...river(2.3, 1.6), box(8.2, 3.6, 0.06, "#d9c8a2", { y: Y, z: -0.4, sharp: true }));
    [[-2.4, 0.3, 0.2], [0, -0.4, -0.1], [2.4, 0.2, 0.15], [-1.2, -1.9, 0], [1.4, -1.9, 0.1]].forEach(([x, z, ry], i) => k.push(shape2d([[-0.9, 0], [0.9, 0], [0.5, 1.5], [-0.5, 1.5]], 0.1, i % 2 ? "#c7a57a" : "#b8956a", { x, z, y: Y + 0.07, rx: -PI / 2, ry: 0, bevel: 0 }), cyl(0.16, 0.06, "#6b4a2e", { x, z: z - 0.5, y: Y + 0.18, seg: 10 }), sphere(0.26, "#a8a39a", { x: x + 0.1, z: z - 0.95, y: Y + 0.1, sy: 1.25 })));
    if (o.figurine) k.push(box(1.0, 1.0, 0.6, "#d9d3c5", { x: 3.2, z: -2.2, y: Y }), cone(0.36, 1.2, "#b9744e", { x: 3.2, z: -2.2, y: Y + 0.6, seg: 14 }), sphere(0.24, "#b9744e", { x: 3.2, z: -2.2, y: Y + 1.7, sx: 1.2 }));
    else k.push(...[-3.6, 3.6].flatMap((x) => [-2.4, 1.2].map((z) => cyl(0.06, 2.0, P.steel, { x, z, y: Y, seg: 6 }))), rod([-3.6, Y + 2.0, -2.4], [3.6, Y + 2.0, -2.4], 0.05, P.steel), rod([-3.6, Y + 2.0, 1.2], [3.6, Y + 2.0, 1.2], 0.05, P.steel), ...[-3.6, -1.2, 1.2, 3.6].map((x) => rod([x, Y + 2.0, -2.4], [x, Y + 2.0, 1.2], 0.04, P.steel)));
    k.push(hill(2.4, 1.6, "#8fa67a", { x: -3.6, z: -3.2, y: Y }), pine(1.9, { x: 3.7, z: 1.0, y: Y }));
    return grp(k);
  }
  // roman / byzantine / ruin: standing and broken columns, wall stubs, a mosaic floor, a gate arch
  k.push(box(8.0, 5.6, 0.1, "#d9cfb8", { y: Y, sharp: true }));
  for (let i = 0; i < 16; i++) k.push(box(0.5, 0.5, 0.03, [RED, "#3f6f8a", CREAM, "#c9a84a"][(i + Math.floor(i / 4)) % 4], { x: -0.75 + (i % 4) * 0.5, z: 0.6 + Math.floor(i / 4) * 0.5, y: Y + 0.1, sharp: true }));
  [[-3.2, 3.2], [-2.2, 3.2], [-1.2, 1.6], [3.2, 2.8], [2.2, 0.9], [1.2, 3.2]].forEach(([x, h], i) => k.push(cyl(0.24, h, st, { x, z: -1.9, y: Y + 0.1, seg: 16 }), box(0.62, 0.62, 0.14, S(st, -0.04), { x, z: -1.9, y: Y + 0.1, sharp: true }), h > 3 ? box(0.66, 0.66, 0.16, S(st, -0.04), { x, z: -1.9, y: Y + 0.1 + h, sharp: true }) : cyl(0.24, 0.5, st, { x: x + 0.5, z: -1.2, y: Y + 0.34, axis: "x", seg: 12 })));
  k.push(box(2.4, 0.62, 0.3, st, { x: -2.7, z: -1.9, y: Y + 3.46 }));
  if (style === "byzantine" || o.apse) { const ap = cyl(1.4, 2.2, "#c9b79a", { x: 0.2, z: -1.2, y: Y + 0.1, seg: 16 }); k.push(ap, cyl(1.1, 2.3, "#d9cfb8", { x: 0.2, z: -0.9, y: Y + 0.1, seg: 16 }), ...[0, 1, 2].map((i) => box(2.84, 2.84, 0.08, P.brick, { x: 0.2, z: -1.2, y: Y + 0.6 + i * 0.6, sharp: true })).map((m) => { m.scale.set(1, 1, 0.5); return m; })); }
  else k.push(box(0.7, 0.6, 2.6, "#c9b79a", { x: 2.6, z: 1.6, y: Y + 0.1 }), box(0.7, 0.6, 2.6, "#c9b79a", { x: 3.9, z: 1.6, y: Y + 0.1 }), box(2.0, 0.6, 0.6, "#c9b79a", { x: 3.25, z: 1.6, y: Y + 2.4 }), arch(0.6, 1.8, "#8a8073", { x: 3.25, z: 1.91, y: Y + 0.1, depth: 0.02 }));
  k.push(box(2.6, 0.4, 0.8, "#c9b79a", { x: -2.6, z: 1.9, y: Y + 0.1 }), box(0.4, 1.6, 0.5, "#c9b79a", { x: -3.7, z: 1.1, y: Y + 0.1 }), cypress(2.8, "#4b6b4c", { x: -3.8, z: -2.7, y: Y }), cypress(2.2, "#56795a", { x: 3.9, z: -2.7, y: Y }));
  return grp(k);
}
function ethno(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(P.grass), lawn(8.2, 6, { col: "#bccb9f" })];
  const cabin = (x, z, s = 1, ry = 0) => grp([box(2.4, 1.8, 0.5, P.rock, {}), box(2.2, 1.6, 1.1, P.log, { y: 0.5 }), ...[0, 1, 2].map((i) => box(2.24, 1.64, 0.04, S(P.log, -0.08), { y: 0.78 + i * 0.28, sharp: true })), prism(2.7, 2.1, 1.6, "#4a3b30", { y: 1.6 }), box(0.3, 0.3, 0.6, P.rock, { x: 0.6, y: 2.5 }), door(0.6, 0.95, "#3a2a1e", { y: 0.5, x: -0.4, z: 0.81, frame: P.log }), box(0.4, 0.05, 0.4, DARK, { x: 0.6, y: 0.9, z: 0.81, sharp: true })], { x, z, y: Y, scale: s, ry });
  if (style === "tree-monument") { // the great oak and the stone that marks the place (Takovski grm)
    k.push(cyl(0.34, 2.0, "#6b4a2e", { x: -1.2, y: Y, seg: 10, rTop: 0.24 }), sphere(1.6, "#5d8a4c", { x: -1.2, y: Y + 1.6 }), sphere(1.2, "#6f9a58", { x: -2.1, y: Y + 2.3, z: 0.3 }), sphere(1.25, "#6f9a58", { x: -0.3, y: Y + 2.5, z: -0.3 }), sphere(1.0, "#5d8a4c", { x: -1.2, y: Y + 3.4 }), steps(2, 2.2, 0.3, 0.1, STONE, { x: 2.0, z: 0.9, y: Y }), box(1.3, 0.7, 2.6, "#d9d3c5", { x: 2.0, z: 0.3, y: Y + 0.2 }), pyramid(1.3, 0.7, 0.5, "#cfc8b8", { x: 2.0, z: 0.3, y: Y + 2.8 }), cross({ x: 2.0, z: 0.3, y: Y + 3.3 }, 0.8), box(0.8, 0.05, 1.0, "#8a7f70", { x: 2.0, z: 0.66, y: Y + 1.0, sharp: true }), fence(4, WOOD, { x: -1.2, z: 2.2, y: Y }), bench(1.1, { x: 0.6, z: 2.6, y: Y }), ...greens(seed, [[3.6, -2.4], [-3.7, -2.5]]));
    return grp(k);
  }
  if (style === "village") { k.push(cabin(-2.3, -0.9, 1, 0.2), cabin(0.6, -1.7, 0.85, -0.1), cabin(2.6, 0.4, 0.8, -0.4), haystack(0.5, { x: -0.4, z: 1.4, y: Y }), fence(5, WOOD, { x: -0.8, z: 2.7, y: Y }), cyl(0.4, 0.5, P.rock, { x: 1.4, z: 1.8, y: Y, seg: 10 }), pine(2.6, { x: -3.7, z: 2.2, y: Y }), pine(2.2, { x: 3.7, z: -2.4, y: Y }), tree(1.9, GREEN, { x: 3.4, z: 2.4, y: Y })); return grp(k); }
  if (style === "log-cabin") { k.push(cabin(-0.4, -0.6, 1.5, 0.15), haystack(0.55, { x: 3.0, z: 0.6, y: Y }), fence(6, WOOD, { x: 0, z: 2.6, y: Y }), box(0.9, 0.5, 0.5, P.log, { x: 2.6, z: 2.0, y: Y }), pine(2.8, { x: -3.6, z: -2.2, y: Y }), tree(2.2, GREEN, { x: 3.5, z: -2.2, y: Y }), tree(1.7, "#6f9a58", { x: -3.5, z: 2.0, y: Y })); return grp(k); }
  // house: a whitewashed town house with a deep porch and a hip roof
  k.push(box(4.6, 2.8, 0.5, P.rock, { y: Y, z: -0.6 }), box(4.4, 2.6, 1.7, "#f6f2e8", { y: Y + 0.5, z: -0.6 }), pyramid(5.4, 3.8, 1.5, P.tile, { y: Y + 2.2, z: -0.6 }), box(0.4, 0.4, 0.8, "#f6f2e8", { x: 1.2, y: Y + 3.0, z: -0.9 }), ...[-1.9, -0.65, 0.65, 1.9].map((x) => cyl(0.07, 1.6, P.log, { x, y: Y + 0.5, z: 1.25, seg: 8 })), box(4.6, 0.9, 0.12, P.log, { y: Y + 0.5, z: 1.0 }), box(4.6, 0.12, 0.3, P.log, { y: Y + 0.8, z: 1.4 }), door(0.7, 1.2, "#3a2a1e", { y: Y + 0.5, z: 0.71, frame: P.log }), windowGrid(2, 1, 1.6, 1.0, { y: Y + 0.9, x: -1.4, z: 0.71, color: "#3a2a1e", frame: P.log, sill: false }), windowGrid(2, 1, 1.6, 1.0, { y: Y + 0.9, x: 1.4, z: 0.71, color: "#3a2a1e", frame: P.log, sill: false }), ...greens(seed, [[-3.6, 2.2], [3.6, 2.3], [3.5, -2.4]]), fence(3, WOOD, { x: -2.4, z: 2.8, y: Y }));
  return grp(k);
}
function park(c, style, o = {}) {
  const seed = o.seed ?? 0, k = [ground(), lawn(8.2, 6, {})];
  if (style === "zoo") { // the zoo gate, a giraffe looking over the fence
    k.push(box(0.5, 0.5, 2.4, "#efe6d2", { x: -1.3, z: 1.6, y: Y }), box(0.5, 0.5, 2.4, "#efe6d2", { x: 1.3, z: 1.6, y: Y }), box(3.4, 0.6, 0.7, "#3f6f5a", { z: 1.6, y: Y + 2.4 }), ...[-0.8, 0, 0.8].map((x, i) => box(0.5, 0.05, 0.4, [AMBER, WHITE, RED][i], { x, z: 1.91, y: Y + 2.55, sharp: true })), fence(3, WOOD, { x: -3.0, z: 1.6, y: Y }), fence(3, WOOD, { x: 3.0, z: 1.6, y: Y }));
    const g = "#e2b03a"; k.push(capsule(0.42, 1.0, g, { x: 1.6, z: -1.2, y: Y + 2.1, rz: PI / 2 }), ...[[1.1, -0.95], [1.1, -1.45], [2.1, -0.95], [2.1, -1.45]].map(([x, z]) => cyl(0.09, 1.8, g, { x, z, y: Y, seg: 8 })), capsule(0.16, 2.0, g, { x: 2.5, z: -1.2, y: Y + 3.4, rz: -0.3 }), box(0.6, 0.26, 0.28, g, { x: 2.95, z: -1.2, y: Y + 4.4, rz: -0.2 }), ...[0, 1, 2, 3, 4].map((i) => sphere(0.1, "#8a5a2e", { x: 1.2 + i * 0.25, z: -0.78, y: Y + 2.0 + (i % 2) * 0.3 })), sphere(1.0, "#8d949e", { x: -2.0, z: -1.4, y: Y, sy: 0.8, sx: 1.2 }), ...[[-2.5, -1.1], [-1.5, -1.1]].map(([x, z]) => cyl(0.2, 0.7, "#7d8590", { x, z, y: Y, seg: 10 })), capsule(0.12, 0.8, "#8d949e", { x: -0.9, z: -1.4, y: Y + 0.8, rz: 0.3 }), ...greens(seed, [[-3.6, -2.6], [3.7, -2.6], [0, -2.7]]));
    return grp(k);
  }
  // fountain square: round basin with a memorial fountain, benches and lamps in a ring
  k.push(disc(2.7, "#ded7c8", {}), cyl(1.3, 0.24, STONE, { y: Y, seg: 32 }), disc(1.16, P.water, { y: Y + 0.22 }), box(0.7, 0.7, 2.0, "#d9d3c5", { y: Y }), pyramid(0.8, 0.8, 0.5, "#cfc8b8", { y: Y + 2.0 }), sphere(0.14, GOLD, { y: Y + 2.5 }), ...[0, 1, 2, 3].map((i) => { const a = (i / 4) * PI * 2; return rod([Math.sin(a) * 0.36, Y + 1.2, Math.cos(a) * 0.36], [Math.sin(a) * 0.9, Y + 0.3, Math.cos(a) * 0.9], 0.02, "#d7e9f7"); }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.3; k.push(i % 2 ? bench(1.0, { x: Math.sin(a) * 2.2, z: Math.cos(a) * 2.2, y: Y, ry: a }) : lamp({ x: Math.sin(a) * 2.3, z: Math.cos(a) * 2.3, y: Y })); }
  k.push(...greens(seed, [[-3.5, 2.4], [3.5, 2.4], [-3.5, -2.4], [3.5, -2.4]]), block(2.4, 1.0, 1.8, "#efe6d2", { x: 0, z: -2.6, y: Y, front: { cols: 3, rows: 1 }, side: false }), pitchedRoof(2.4, 1.0, 0.6, P.tile, { x: 0, z: -2.6, y: Y + 1.8 }));
  return grp(k);
}
function highrise(c, style, o = {}) { // two raw-concrete towers joined by a bridge, a round restaurant on the taller one (Genex)
  const cn = "#c9c4b9", k = [ground(), lawn(8.2, 2.2, { z: 2.0 })];
  k.push(block(2.0, 2.0, 7.6, cn, { x: -1.4, z: -0.6, y: Y, front: { cols: 3, rows: 9 }, side: { cols: 3, rows: 9 }, pane: "#5a6470" }), block(1.8, 1.8, 6.2, S(cn, 0.03), { x: 1.5, z: -0.6, y: Y, front: { cols: 3, rows: 7 }, side: { cols: 3, rows: 7 }, pane: "#5a6470" }), box(1.6, 1.2, 0.9, S(cn, -0.04), { x: 0.1, z: -0.6, y: Y + 5.4 }), cyl(0.45, 8.6, S(cn, -0.05), { x: -2.6, z: -0.6, y: Y, seg: 12 }), cyl(0.4, 7.0, S(cn, -0.05), { x: 2.6, z: -0.6, y: Y, seg: 12 }));
  k.push(cyl(0.5, 0.8, cn, { x: -1.4, z: -0.6, y: Y + 7.6, seg: 16 }), cyl(1.15, 0.7, "#b9b3a6", { x: -1.4, z: -0.6, y: Y + 8.4, seg: 24 }), cyl(1.17, 0.3, "#5a6470", { x: -1.4, z: -0.6, y: Y + 8.6, seg: 24 }), cyl(0.04, 1.0, INK, { x: -1.4, z: -0.6, y: Y + 9.1, seg: 6 }), tree(1.8, GREEN, { x: -3.5, z: 2.2, y: Y }), tree(1.5, "#6f9a58", { x: 3.5, z: 2.3, y: Y }), box(8.6, 0.9, 0.05, "#8d9099", { z: 2.8, y: Y, sharp: true }), box(0.7, 0.4, 0.3, RED, { x: -1.0, z: 2.8, y: Y + 0.05 }), box(0.7, 0.4, 0.3, BLUE, { x: 1.6, z: 2.8, y: Y + 0.05 }));
  return grp(k);
}
function civic(c, style, o = {}) { // an existing building type stands in: gallery, museum, theatre, station, airport, observatory
  if (style === "observatory") { const w = "#efe6d2", k = [ground(), lawn(8.2, 6, {})]; k.push(block(5.0, 2.6, 2.4, w, { y: Y, z: -0.8, front: { cols: 5, rows: 2, w: 4.4 }, side: { cols: 2, rows: 2 } }), box(5.2, 2.8, 0.2, S(w, -0.06), { y: Y + 2.4, z: -0.8 }), cyl(1.4, 1.2, w, { y: Y + 2.6, z: -0.8, seg: 24 }), dome(1.45, "#e9eef2", { y: Y + 3.8, z: -0.8 }), box(0.34, 1.6, 1.3, "#3b4252", { y: Y + 4.0, z: -0.2, rx: -0.5 }), steps(3, 2.2, 0.3, 0.1, STONE, { z: 0.5, y: Y }), door(0.9, 1.5, DOOR, { y: Y + 0.3, z: 0.51 }), cyl(0.8, 0.8, w, { x: 3.0, z: 1.4, y: Y, seg: 16 }), dome(0.82, "#e9eef2", { x: 3.0, z: 1.4, y: Y + 0.8 }), pine(2.8, { x: -3.6, z: 2.0, y: Y }), pine(2.3, { x: -3.2, z: -2.4, y: Y }), tree(1.9, GREEN, { x: 3.6, z: -2.3, y: Y })); return grp(k); }
  const key = { gallery: "museum", museum: "museum", theatre: "theater-house", library: "library", gymnasium: "school", station: "trainstation", airport: "airport" }[style] ?? "museum";
  return (BUILDINGS[key] ?? BUILDINGS.museum)(c);
}
export const PART2 = { bridge, spa, mountain, rocks, lake, river: riverScene, dam, cave, windmill, farm, vineyard, produce, object, train, mine, powerplant, archaeology, ethno, park, highrise, civic };
