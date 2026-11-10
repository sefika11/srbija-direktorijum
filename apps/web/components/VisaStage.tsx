"use client";
/**
 * VisaStage — the centre stage of /vize: a clickable dotted globe between two passports.
 * Right: the Serbian passport (the traveller). Left: the passport of the country the visitor picks (type to search, or click
 * a country on the globe). Picking a country rotates the globe to it, lights it, draws the arc from Serbia and shows both
 * directions of the regime with an "Open" button; after the rotation settles the country page can open automatically.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import earth from "@/lib/earth-dots.json";
import { Passport, flagOf } from "./Passport";
import Combobox from "./Combobox";
import { href, type Locale } from "@/lib/i18n";

type Dot = [number, number, string];
const DATA = earth as unknown as { step: number; dots: Dot[]; centroids: Record<string, [number, number]> };
export type StageCountry = { iso2: string; slug: string; name: string; to: string | null; from: string | null };

const R = 1;
const toVec = (lat: number, lon: number, r = R) => { const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon + 180); return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
const toLatLon = (v: THREE.Vector3) => { const n = v.clone().normalize(); const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(n.y)); const lon = THREE.MathUtils.radToDeg(Math.atan2(n.z, -n.x)) - 180; return [lat, ((lon + 540) % 360) - 180] as [number, number]; };
const cssColor = (name: string, fallback: string) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; };
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").toLowerCase();

const L: Record<Locale, Record<string, string>> = {
  sr: { you: "Vaš pasoš", pick: "Država koja vas zanima", type: "Upišite državu…", toRs: "Ulazak u Srbiju", fromRs: "Iz Srbije tamo", open: "Otvori stranicu države", free: "bez vize", visa: "viza", eviza: "eViza", eta: "eTA", unknown: "nije objavljeno", hint: "Kliknite državu na globusu ili je upišite. Prevucite za okretanje.", auto: "Otvaranje…", freeGroup: "Plavo: građani ulaze u Srbiju bez vize", serbia: "Srbija" },
  en: { you: "Your passport", pick: "Country you are interested in", type: "Type a country…", toRs: "Entering Serbia", fromRs: "From Serbia there", open: "Open the country page", free: "visa-free", visa: "visa", eviza: "eVisa", eta: "eTA", unknown: "not published", hint: "Click a country on the globe or type it. Drag to rotate.", auto: "Opening…", freeGroup: "Blue: citizens enter Serbia visa-free", serbia: "Serbia" },
  ru: { you: "Ваш паспорт", pick: "Интересующая страна", type: "Введите страну…", toRs: "Въезд в Сербию", fromRs: "Из Сербии туда", open: "Открыть страницу страны", free: "без визы", visa: "виза", eviza: "eVisa", eta: "eTA", unknown: "не опубликовано", hint: "Нажмите на страну на глобусе или введите её. Тяните для вращения.", auto: "Открываем…", freeGroup: "Синим: въезд в Сербию без визы", serbia: "Сербия" },
  de: { you: "Ihr Pass", pick: "Land, das Sie interessiert", type: "Land eingeben…", toRs: "Einreise nach Serbien", fromRs: "Von Serbien dorthin", open: "Länderseite öffnen", free: "visumfrei", visa: "Visum", eviza: "eVisum", eta: "eTA", unknown: "nicht veröffentlicht", hint: "Land auf dem Globus anklicken oder eingeben. Ziehen zum Drehen.", auto: "Öffnet…", freeGroup: "Blau: Bürger reisen visumfrei nach Serbien ein", serbia: "Serbien" },
};
const regimeWord = (T: Record<string, string>, r: string | null) => r === "bez vize" ? T.free : r === "viza" ? T.visa : r === "eviza" ? T.eviza : r === "eta" ? T.eta : T.unknown;

export default function VisaStage({ locale, countries, initial }: { locale: Locale; countries: StageCountry[]; initial?: string }) {
  const T = L[locale];
  const [sel, setSel] = useState<StageCountry | null>(() => countries.find((c) => c.iso2 === initial) ?? null);
  const wrap = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null);
  const selRef = useRef<StageCountry | null>(sel); selRef.current = sel;
  const byIso = useMemo(() => Object.fromEntries(countries.map((c) => [c.iso2, c])), [countries]);
  const freeSet = useMemo(() => new Set(countries.filter((c) => c.to === "bez vize").map((c) => c.iso2)), [countries]);

  // the scene lives for the component's life; selection changes are pushed through a ref the loop reads
  useEffect(() => {
    const el = wrap.current, canvas = canvasRef.current; if (!el || !canvas) return;
    let renderer: THREE.WebGLRenderer; try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, 1, .1, 100); camera.position.set(0, 0, 2.9);
    const ink = new THREE.Color(cssColor("--ink", "#0f1b2d")), accent = new THREE.Color(cssColor("--accent", "#0c4076")), red = new THREE.Color(cssColor("--red", "#c6363c")), surface = new THREE.Color(cssColor("--surface", "#ffffff"));
    const group = new THREE.Group(); scene.add(group);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R * .985, 64, 64), new THREE.MeshBasicMaterial({ color: surface.clone().lerp(ink, .05) })));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 64, 64), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .07, side: THREE.BackSide })));
    // per-dot colours in one buffer so the selection can recolour without rebuilding
    const n = DATA.dots.length; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const base = ink.clone().lerp(surface, .28), freeC = accent.clone().lerp(surface, .08);
    const paint = (selIso: string | null) => { for (let i = 0; i < n; i++) { const iso = DATA.dots[i][2]; const c = iso === "RS" ? red : iso === selIso ? accent : freeSet.has(iso) ? freeC : base; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } };
    DATA.dots.forEach((d, i) => { const v = toVec(d[0], d[1], R + .004); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
    paint(selRef.current?.iso2 ?? null);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); const colAttr = new THREE.BufferAttribute(col, 3); g.setAttribute("color", colAttr);
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .021, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false })); group.add(pts);
    // home pin + selected pin + arc (rebuilt on selection)
    const home = DATA.centroids.RS ?? [44.2, 20.8];
    const mkPin = (c: THREE.Color) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.02, 16, 16), new THREE.MeshBasicMaterial({ color: c })); const h = new THREE.Mesh(new THREE.RingGeometry(.03, .048, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .5, side: THREE.DoubleSide })); return { m, h }; };
    const hp = mkPin(red); hp.m.position.copy(toVec(home[0], home[1], R + .01)); hp.h.position.copy(toVec(home[0], home[1], R + .012)); hp.h.lookAt(0, 0, 0); group.add(hp.m, hp.h);
    const sp = mkPin(accent); sp.m.visible = sp.h.visible = false; group.add(sp.m, sp.h);
    let arc: THREE.Mesh | null = null; let arcDraw = 0;
    const setArc = (dest: [number, number] | null) => {
      if (arc) { group.remove(arc); arc.geometry.dispose(); (arc.material as THREE.Material).dispose(); arc = null; }
      if (!dest) { sp.m.visible = sp.h.visible = false; return; }
      sp.m.visible = sp.h.visible = true; sp.m.position.copy(toVec(dest[0], dest[1], R + .01)); sp.h.position.copy(toVec(dest[0], dest[1], R + .012)); sp.h.lookAt(0, 0, 0);
      const a = toVec(home[0], home[1]), b = toVec(dest[0], dest[1]); const ang = a.angleTo(b); const arr: THREE.Vector3[] = [];
      for (let i = 0; i <= 80; i++) { const t = i / 80; const v = a.clone().lerp(b, t).normalize().multiplyScalar(R * (1 + Math.sin(Math.PI * t) * Math.min(.5, ang * .32))); arr.push(v); }
      arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr), 72, .006, 6, false), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .9 })); arcDraw = 0; group.add(arc);
    };
    // orientation: rotate the group so the target point faces the camera
    let targetQ = new THREE.Quaternion(); let lastSel: string | null | undefined = undefined;
    const faceTo = (lat: number, lon: number) => { const v = toVec(lat, lon).normalize(); targetQ = new THREE.Quaternion().setFromUnitVectors(v, new THREE.Vector3(0, 0, 1)); };
    faceTo(home[0], home[1]); group.quaternion.copy(targetQ);
    // input: drag rotates (and cancels auto), click picks the nearest country centroid
    const ray = new THREE.Raycaster(); let dragging = false, moved = 0, lx = 0, ly = 0, touched = false; const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 32), new THREE.MeshBasicMaterial({ visible: false })); group.add(sphere);
    const ndc = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); };
    const down = (e: PointerEvent) => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); if (moved > 4) { touched = true; const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * .005), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * .005); group.quaternion.premultiply(qy).premultiply(qx); targetQ.copy(group.quaternion); } };
    const up = (e: PointerEvent) => {
      dragging = false; if (moved > 4) return;
      ray.setFromCamera(ndc(e), camera); const hit = ray.intersectObject(sphere)[0]; if (!hit) return;
      const local = sphere.worldToLocal(hit.point.clone()); const [lat, lon] = toLatLon(local);
      let best: { iso: string; d: number } | null = null;
      for (const [iso, c] of Object.entries(DATA.centroids)) { if (!byIso[iso]) continue; const d = toVec(c[0], c[1]).angleTo(toVec(lat, lon)); if (!best || d < best.d) best = { iso, d }; }
      // prefer the country whose dots are under the pointer; fall back to the nearest centroid within ~12°
      const near = DATA.dots.find((d) => Math.abs(d[0] - lat) < DATA.step && Math.abs(d[1] - lon) < DATA.step / Math.max(.2, Math.cos(THREE.MathUtils.degToRad(lat))) && byIso[d[2]]);
      const iso = near ? near[2] : best && best.d < .21 ? best.iso : null;
      if (iso && byIso[iso]) { touched = false; setSel(byIso[iso]); }
    };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { dragging = false; });
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0, running = true;
    const frame = (now: number) => {
      if (!running) return; raf = requestAnimationFrame(frame); if (document.hidden) return;
      const cur = selRef.current?.iso2 ?? null;
      if (cur !== lastSel) { lastSel = cur; paint(cur); colAttr.needsUpdate = true; const c = cur ? DATA.centroids[cur] : null; setArc(c ?? null); if (c) { const mid = toVec(home[0], home[1]).add(toVec(c[0], c[1])).normalize(); const [mlat, mlon] = toLatLon(mid); faceTo(mlat, mlon); } else faceTo(home[0], home[1]); touched = false; }
      if (!dragging) { if (!touched) group.quaternion.slerp(targetQ, reduced ? 1 : .06); else if (!cur) group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), .0012); }
      if (arc) { arcDraw = Math.min(1, arcDraw + (reduced ? 1 : .025)); (arc.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor(arcDraw * 72) * 6 * 6); }
      const pulse = 1 + Math.sin(now / 500) * .12; hp.h.scale.setScalar(pulse); sp.h.scale.setScalar(pulse);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); (m.material as THREE.Material | undefined)?.dispose?.(); }); renderer.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.length]);

  const Flag = sel ? flagOf(sel.iso2) : null;
  return (
    <section className="vstage" aria-label={T.pick}>
      <div className="vstage-side vstage-left">
        <div className="eyebrow plain">{T.pick}</div>
        <Combobox className="w-full" size="lg" label={T.pick} placeholder={T.type} value={sel?.iso2 ?? null}
          options={countries.map((c) => { const F = flagOf(c.iso2); return { value: c.iso2, label: c.name, keywords: c.iso2, icon: <span className="visa-flag">{F ? <F /> : c.iso2}</span>, sub: c.to === "bez vize" ? T.free : undefined }; })}
          onChange={(v) => setSel(v ? byIso[v] ?? null : null)} />
        <div className={`vstage-passport ${sel ? "is-set" : "is-empty"}`}>
          {sel ? <Passport iso2={sel.iso2} name={sel.name} size={150} label={locale === "sr" ? "PASOŠ" : "PASSPORT"} /> : <div className="vstage-ghost"><span>?</span></div>}
        </div>
        {sel && (
          <div className="vstage-facts">
            <div className="vstage-name">{Flag && <Flag />}<b>{sel.name}</b></div>
            <div className={`visa-pill ${sel.to === "bez vize" ? "is-free" : sel.to ? "is-visa" : "is-unknown"}`}>{T.toRs}: {regimeWord(T, sel.to)}</div>
            <div className={`visa-pill ${sel.from === "bez vize" ? "is-free" : sel.from === "viza" ? "is-visa" : sel.from ? "is-e" : "is-unknown"}`}>{T.fromRs}: {regimeWord(T, sel.from)}</div>
            <a className="btn-primary mt-2 no-underline" href={href(locale, `/vize/${sel.slug}`)}>{T.open} →</a>
          </div>
        )}
      </div>
      <div className="vstage-globe" ref={wrap}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={T.hint} role="img" />
        <div className="globe-legend"><span><i className="globe-dot is-home" />{T.serbia}</span><span><i className="globe-dot is-dest" />{sel ? sel.name : T.freeGroup}</span></div>
        <div className="vstage-hint">{T.hint}</div>
      </div>
      <div className="vstage-side vstage-right">
        <div className="eyebrow plain">{T.you}</div>
        <div className="vstage-passport is-set"><Passport iso2="RS" name={T.serbia} size={150} label={locale === "sr" ? "PASOŠ" : "PASSPORT"} /></div>
        <div className="vstage-facts"><div className="vstage-name"><b>{T.serbia}</b></div><p className="text-[12.5px] text-muted">{locale === "sr" ? "Crvena tačka na globusu. Plave tačke: države čiji građani ulaze u Srbiju bez vize." : locale === "en" ? "The red point on the globe. Blue points: countries whose citizens enter Serbia visa-free." : locale === "ru" ? "Красная точка на глобусе. Синие точки: страны без визы в Сербию." : "Der rote Punkt auf dem Globus. Blaue Punkte: visumfreie Einreise nach Serbien."}</p></div>
      </div>
    </section>
  );
}
