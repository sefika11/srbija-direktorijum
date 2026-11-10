"use client";
/** Home-page effect layer: pointer light on the hero, spotlight cards, magnetic buttons, word reveal, number count-up.
 *  Everything is gated: fine pointer + hover for pointer effects, prefers-reduced-motion for all motion. No layout work per frame. */
import { useEffect } from "react";

const EXPO = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function HeroFX() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: (() => void)[] = [];

    // 1. word reveal + stage-in class (CSS does the motion)
    const t = requestAnimationFrame(() => root.classList.add("fx-in"));
    cleanups.push(() => { cancelAnimationFrame(t); root.classList.remove("fx-in"); });

    // 2. count-up numbers
    const nums = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    if (!reduced && nums.length) {
      const io = new IntersectionObserver((es) => {
        for (const e of es) { if (!e.isIntersecting) continue; io.unobserve(e.target); const el = e.target as HTMLElement; const to = Number(el.dataset.count || 0); const t0 = performance.now();
          const step = (now: number) => { const k = EXPO(Math.min(1, (now - t0) / 1500)); el.textContent = Math.round(to * k).toLocaleString("sr-Latn"); if (k < 1) requestAnimationFrame(step); };
          el.textContent = "0"; requestAnimationFrame(step); }
      }, { threshold: .4 });
      nums.forEach((n) => io.observe(n)); cleanups.push(() => io.disconnect());
    }

    if (!fine || reduced) return () => cleanups.forEach((f) => f());

    // 3. pointer light on the hero + spotlight on cards (CSS vars, written once per frame)
    const hero = document.querySelector<HTMLElement>(".hero-open, .hero-light");
    let hx = 0, hy = 0, pending = false;
    const flush = () => { pending = false; hero?.style.setProperty("--mx", `${hx}px`); hero?.style.setProperty("--my", `${hy}px`); };
    const onHero = (e: PointerEvent) => { const r = hero!.getBoundingClientRect(); hx = e.clientX - r.left; hy = e.clientY - r.top; if (!pending) { pending = true; requestAnimationFrame(flush); } };
    if (hero) { hero.addEventListener("pointermove", onHero, { passive: true }); hero.classList.add("has-light"); cleanups.push(() => { hero.removeEventListener("pointermove", onHero); hero.classList.remove("has-light"); }); }
    const spots = Array.from(document.querySelectorAll<HTMLElement>(".spot"));
    const onSpot = (e: PointerEvent) => { const el = e.currentTarget as HTMLElement; const r = el.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; el.style.setProperty("--x", `${x}px`); el.style.setProperty("--y", `${y}px`); el.style.setProperty("--rx", (x / r.width).toFixed(3)); el.style.setProperty("--ry", (y / r.height).toFixed(3)); };
    spots.forEach((el) => el.addEventListener("pointermove", onSpot, { passive: true }));
    cleanups.push(() => spots.forEach((el) => el.removeEventListener("pointermove", onSpot)));

    // 4. magnetic buttons
    const mags = Array.from(document.querySelectorAll<HTMLElement>(".btn-primary, form[role=search] button[type=submit], .quick-chip"));
    const onMag = (e: PointerEvent) => { const el = e.currentTarget as HTMLElement; const r = el.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); el.style.transform = `translate(${dx * .18}px, ${dy * .22}px)`; };
    const offMag = (e: PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = ""; };
    mags.forEach((el) => { el.classList.add("mag"); el.addEventListener("pointermove", onMag, { passive: true }); el.addEventListener("pointerleave", offMag); });
    cleanups.push(() => mags.forEach((el) => { el.classList.remove("mag"); el.style.transform = ""; el.removeEventListener("pointermove", onMag); el.removeEventListener("pointerleave", offMag); }));

    return () => cleanups.forEach((f) => f());
  }, []);
  return null;
}
