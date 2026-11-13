"use client";
/** Opening sequence for the first home-page visit of a session: paper curtain, wordmark rising word by word,
 *  the tricolour hairline drawing across, the institution count running up, then the curtain parts and the page's
 *  own reveals (headline words, 3D map rise) start. ≤ 2.1 s, skippable by click or key, skipped entirely on
 *  return visits in the same session, under prefers-reduced-motion and on screens narrower than 768 px. Purely presentational: aria-hidden. */
import { useLayoutEffect, useState } from "react";
import { LogoMark } from "./Logo";

const EXPO = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function Opener({ words, eyebrow, count, countLabel }: { words: string[]; eyebrow: string; count: number; countLabel: string }) {
  const [state, setState] = useState<"idle" | "play" | "out" | "done">("idle");
  const [n, setN] = useState(0);
  // layout effect: the decision lands before the browser paints, so a client-side navigation to the home page never
  // shows the page under the opener either (the server-rendered first visit is covered by html.opener-pending)
  useLayoutEffect(() => {
    const root = document.documentElement;
    let seen = false;
    try { seen = sessionStorage.getItem("gdi-opener") === "1"; } catch { /* storage blocked */ }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // slow connection: the pre-paint curtain gives up after 4 s and shows the page; starting the opener after that would
    // cover a page the visitor is already reading, so it is skipped for this visit
    const late = root.classList.contains("opener-pending") && performance.now() > 3800;
    // a phone gets the page at once: the curtain kept anything readable off the screen for about 3.6 s on a first visit,
    // and up to 4 s blank on a slow connection (measured 2026-11-13). The inline script in the layout head makes the same test.
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (seen || reduced || late || phone) { if (late) { try { sessionStorage.setItem("gdi-opener", "1"); } catch { /* ignore */ } } setState("done"); root.classList.add("opener-done"); root.classList.remove("opener-pending", "has-opener"); return; }
    root.classList.add("has-opener");
    try { sessionStorage.setItem("gdi-opener", "1"); } catch { /* ignore */ }
    setState("play");
    const t0 = performance.now(); let raf = 0; let finished = false;
    const tick = (now: number) => { const k = EXPO(Math.min(1, (now - t0 - 350) / 1100)); setN(Math.round(count * Math.max(0, k))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const finish = () => {
      if (finished) return; finished = true; cancelAnimationFrame(raf); setN(count);
      setState("out"); root.classList.add("opener-done");
      window.setTimeout(() => { setState("done"); root.classList.remove("has-opener"); }, 1000);
    };
    const auto = window.setTimeout(finish, 1750);
    const skip = () => finish();
    window.addEventListener("pointerdown", skip, { once: true }); window.addEventListener("keydown", skip, { once: true });
    return () => { window.clearTimeout(auto); cancelAnimationFrame(raf); window.removeEventListener("pointerdown", skip); window.removeEventListener("keydown", skip); };
  }, [count]);
  // the pre-paint curtain (html.opener-pending) hands over once the opener's own halves are in the DOM, still before paint
  useLayoutEffect(() => { if (state !== "idle") document.documentElement.classList.remove("opener-pending"); }, [state]);
  if (state === "idle" || state === "done") return null;
  return (
    <div className={`opener ${state === "out" ? "is-out" : ""}`} aria-hidden>
      <div className="opener-half opener-top" />
      <div className="opener-half opener-bottom" />
      <div className="opener-center">
        <div className="opener-mark"><LogoMark size={104} /></div>
        <div className="eyebrow plain opener-eyebrow">{eyebrow}</div>
        <div className="opener-word display">
          {words.map((w, i) => <span key={i} className="w"><span className="i" style={{ "--i": i } as React.CSSProperties}>{w}</span></span>)}
        </div>
        <div className="opener-rule"><i /></div>
        <div className="opener-count"><span className="num tabular">{n.toLocaleString("sr-Latn")}</span><span className="lbl">{countLabel}</span></div>
      </div>
    </div>
  );
}
