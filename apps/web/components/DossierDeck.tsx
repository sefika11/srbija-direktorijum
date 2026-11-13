"use client";
/**
 * DossierDeck — the lower areas of the home page as one deck of index cards instead of a column of sections.
 * The front card is the readable one; the other two sit behind it, turned a little, each with its own index tab showing.
 * Changing card is a rotation, not a scroll: the front card swings out around the side and tucks in at the back while the
 * next one comes forward. Driven by the tabs, the arrow buttons, ← → keys, a drag on the card's top strip or a swipe.
 * All three panels are server-rendered and stay in the DOM (search engines read all of them); hidden ones are inert.
 * Reduced motion: the swap is instant.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type DeckTab = { id: string; label: string };
type Pose = { x: number; y: number; z: number; ry: number; rz: number; s: number };
const tf = (p: Pose) => `translate3d(${p.x}%, ${p.y}px, ${p.z}px) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;
const mirror = (p: Pose): Pose => ({ ...p, x: -p.x, ry: -p.ry, rz: -p.rz });
/** resting poses: 0 front, 1 behind on the right, 2 further behind on the left */
const poses = (wide: boolean): Pose[] => wide
  ? [{ x: 0, y: 0, z: 0, ry: 0, rz: 0, s: 1 }, { x: 3.4, y: -24, z: -40, ry: -2.5, rz: 1.2, s: 1 }, { x: -3.4, y: -46, z: -80, ry: 2.5, rz: -1.6, s: 1 }]
  : [{ x: 0, y: 0, z: 0, ry: 0, rz: 0, s: 1 }, { x: 2.6, y: -20, z: 0, ry: 0, rz: 1.3, s: .985 }, { x: -2.6, y: -38, z: 0, ry: 0, rz: -1.7, s: .97 }];
const EASE = "cubic-bezier(.5, 0, .18, 1)";

export default function DossierDeck({ tabs, children, labels }: { tabs: DeckTab[]; children: ReactNode[]; labels: { prev: string; next: string; hint: string; region: string } }) {
  const n = tabs.length;
  const [active, setActive] = useState(0);
  const deck = useRef<HTMLDivElement>(null); const cards = useRef<(HTMLElement | null)[]>([]);
  const activeRef = useRef(0); const busy = useRef(false); const drag = useRef<{ id: number; x0: number; y0: number; dx: number; locked: boolean } | null>(null);
  const wide = () => window.matchMedia("(min-width: 768px)").matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rel = (i: number, a: number) => (i - a + n) % n;

  /** put every card at its resting pose for the given front card and size the deck to that card */
  const settle = useCallback((a: number) => {
    const P = poses(wide());
    cards.current.forEach((c, i) => { if (!c) return; const r = rel(i, a); c.style.transform = tf(P[Math.min(r, 2)]); c.style.zIndex = String(n - r); c.dataset.pos = String(r); });
    const front = cards.current[a]; if (front && deck.current) deck.current.style.setProperty("--deck-h", `${front.offsetHeight}px`);
  }, [n]);
  useLayoutEffect(() => { settle(activeRef.current); deck.current?.classList.add("is-ready"); }, [settle]);
  useEffect(() => {
    const ro = new ResizeObserver(() => { if (!busy.current) settle(activeRef.current); });
    cards.current.forEach((c) => c && ro.observe(c)); window.addEventListener("resize", () => settle(activeRef.current));
    return () => ro.disconnect();
  }, [settle]);

  const go = useCallback((to: number, fromDx = 0) => {
    const a = activeRef.current; to = ((to % n) + n) % n; if (to === a || busy.current) return;
    const fwd = to === (a + 1) % n; const P = poses(wide()); const W = wide();
    const el = deck.current; const out = cards.current[a], inc = cards.current[to];
    const others = cards.current.filter((c, i) => c && i !== a && i !== to) as HTMLElement[];
    activeRef.current = to; setActive(to);
    if (!el || !out || !inc || reduced()) { settle(to); return; }
    busy.current = true; el.classList.add("is-moving");
    el.style.setProperty("--deck-h", `${Math.max(out.offsetHeight, inc.offsetHeight)}px`);
    const m = (p: Pose) => (fwd ? p : mirror(p));
    // the front card swings out around the side, drops behind, and lands at the far back position of that side
    const outFrom: Pose = fromDx ? { x: 0, y: 0, z: 0, ry: fromDx * -.03, rz: fromDx * .012, s: 1 } : P[0];
    const outEnd = fwd ? P[2] : P[1];
    const side = W ? m({ x: -56, y: 8, z: 60, ry: 22, rz: -6.5, s: .94 }) : m({ x: -78, y: 6, z: 0, ry: 0, rz: -7, s: .95 });
    const tuck = W ? m({ x: -30, y: -30, z: -300, ry: 13, rz: -4, s: .9 }) : m({ x: -34, y: -24, z: -180, ry: 0, rz: -4, s: .92 });
    const fromTf = fromDx ? `translate3d(${fromDx}px, 0, 0) rotateY(${outFrom.ry}deg) rotateZ(${outFrom.rz}deg)` : tf(P[0]);
    const D = W ? 980 : 760;
    const A = [
      out.animate([{ transform: fromTf, zIndex: 6 }, { transform: tf(side), zIndex: 6, offset: .42 }, { transform: tf(side), zIndex: 0, offset: .43 }, { transform: tf(tuck), zIndex: 0, offset: .72 }, { transform: tf(outEnd), zIndex: 0 }], { duration: D, easing: EASE }),
      // the next card comes forward out of the stack, leaning the other way, and straightens
      inc.animate([{ transform: tf(fwd ? P[1] : P[2]), zIndex: 2 }, { transform: tf(m(W ? { x: 7, y: -26, z: 50, ry: -10, rz: 2.2, s: .985 } : { x: 5, y: -14, z: 0, ry: 0, rz: 1.6, s: .985 })), zIndex: 5, offset: .5 }, { transform: tf(P[0]), zIndex: 5 }], { duration: D, easing: EASE }),
      // the card that stays in the stack crosses behind to the other side
      ...others.map((o) => o.animate([{ transform: tf(fwd ? P[2] : P[1]), zIndex: 1 }, { transform: tf({ x: 0, y: -40, z: -340, ry: 0, rz: 0, s: .9 }), zIndex: 1, offset: .5 }, { transform: tf(fwd ? P[1] : P[2]), zIndex: 1 }], { duration: D, easing: EASE })),
    ];
    settle(to); el.style.setProperty("--deck-h", `${Math.max(out.offsetHeight, inc.offsetHeight)}px`);
    inc.classList.remove("is-entering"); void inc.offsetWidth; inc.classList.add("is-entering");
    // settle when the animations end, or after a timer if the tab was backgrounded and they never report back
    let ended = false; const done = () => { if (ended) return; ended = true; A.forEach((x) => x.cancel()); busy.current = false; el.classList.remove("is-moving"); settle(activeRef.current); };
    Promise.allSettled(A.map((x) => x.finished)).then(done); window.setTimeout(done, D + 500);
  }, [n, settle]);

  // outside requests: the index tabs under the map, a #hash, keyboard
  useEffect(() => {
    const byId = (id: string) => tabs.findIndex((t) => t.id === id);
    const onGo = (e: Event) => { const i = byId((e as CustomEvent<string>).detail); if (i >= 0) go(i); };
    const fromHash = () => { const i = byId(location.hash.slice(1)); if (i >= 0) { if (reduced() || !deck.current?.classList.contains("is-ready")) { activeRef.current = i; setActive(i); settle(i); } else go(i); } };
    window.addEventListener("deck:go", onGo); window.addEventListener("hashchange", fromHash); fromHash();
    return () => { window.removeEventListener("deck:go", onGo); window.removeEventListener("hashchange", fromHash); };
  }, [tabs, go, settle]);

  // drag the top strip of the front card (mouse) or swipe anywhere on it (touch): the card follows, then rotates away
  const onDown = (e: React.PointerEvent) => {
    if (busy.current) return; const t = e.target as HTMLElement;
    const grip = !!t.closest(".deck-grip"); if (e.pointerType === "mouse" && !grip) return;
    if (t.closest("a, button, input, .rail, .okrug-tiles") && !grip) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, locked: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.locked) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; if (Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } d.locked = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); deck.current?.classList.add("is-dragging"); }
    d.dx = dx; const c = cards.current[activeRef.current]; if (c) c.style.transform = `translate3d(${dx}px, 0, 0) rotateY(${dx * -.03}deg) rotateZ(${dx * .012}deg)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null; deck.current?.classList.remove("is-dragging");
    if (!d.locked) return; const a = activeRef.current;
    if (Math.abs(d.dx) > 80) go(d.dx < 0 ? a + 1 : a - 1, d.dx);
    else { const c = cards.current[a]; c?.animate([{ transform: c.style.transform }, { transform: tf(poses(wide())[0]) }], { duration: 420, easing: "cubic-bezier(.16, 1, .3, 1)" }); settle(a); }
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") { e.preventDefault(); go(activeRef.current + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(activeRef.current - 1); } };

  return (
    <div className="deck-wrap" id="deck">
      <div className="deck-bar">
        <span className="deck-count" aria-hidden>{String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
        <span className="deck-title">{tabs[active]?.label}</span>
        <span className="deck-hint">{labels.hint}</span>
        <span className="deck-arrows">
          <button type="button" className="deck-arrow" onClick={() => go(activeRef.current - 1)} aria-label={labels.prev}><span aria-hidden>←</span></button>
          <button type="button" className="deck-arrow" onClick={() => go(activeRef.current + 1)} aria-label={labels.next}><span aria-hidden>→</span></button>
        </span>
      </div>
      {/* a tablist may hold tabs only, and each card here holds its tab AND its panel: the tablist is this empty element that owns the tab buttons by id */}
      <div role="tablist" aria-label={labels.region} aria-owns={tabs.map((t) => `tab-${t.id}`).join(" ")} className="sr-only" />
      <div ref={deck} className="deck" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <section key={t.id} id={t.id} ref={(el) => { cards.current[i] = el; }} className={`deck-card ${i === active ? "is-front" : ""}`} style={{ "--k": i, "--kn": tabs.length } as React.CSSProperties}
                   onPointerDown={i === active ? onDown : undefined} onPointerMove={i === active ? onMove : undefined} onPointerUp={i === active ? onUp : undefined} onPointerCancel={i === active ? onUp : undefined}
                   onClick={i === active ? undefined : () => go(i)}>
            <button type="button" role="tab" id={`tab-${t.id}`} aria-selected={i === active} aria-controls={`panel-${t.id}`} tabIndex={i === active ? 0 : -1} className="deck-tab tab" onClick={(e) => { e.stopPropagation(); go(i); }}>
              <span className="deck-tab-n">{String(i + 1).padStart(2, "0")}</span><span className="deck-tab-l">{t.label}</span>
            </button>
            <div className="deck-grip" aria-hidden />
            <div className="deck-body" role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} inert={i !== active}>{children[i]}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
