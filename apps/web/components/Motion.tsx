"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Scroll reveals for [data-reveal] and the header's transparent-over-dark-hero state. No layout work on scroll. */
export default function Motion() {
  const path = usePathname();
  // Page-enter glide on client-side navigation only (the first, server-rendered paint is left alone, so nothing flashes).
  // Layout effect: the class lands before the new page paints. The class comes off again on a timer, so a tab whose
  // animations are frozen (background tab) can never be left with hidden content.
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const main = document.querySelector<HTMLElement>("main"); if (!main || document.documentElement.classList.contains("has-opener")) return;
    main.classList.remove("page-in"); void main.offsetWidth; main.classList.add("page-in");
    const t = window.setTimeout(() => main.classList.remove("page-in"), 1000);
    return () => { window.clearTimeout(t); main.classList.remove("page-in"); };
  }, [path]);
  useEffect(() => {
    document.documentElement.classList.add("js");
    // Flow, not scroll effects: the page glides in once, what is on screen arrives in one short cascade, and everything
    // further down is simply there when the reader scrolls to it (no flips or wings triggered by scrolling).
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    let k = 0;
    els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) { if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", `${Math.min(k++, 8) * 55}ms`); el.classList.add("in"); } else el.classList.add("in", "rv-static"); });
    // Content that arrives later on the same page (a new municipality, a filter, another results page: the path stays,
    // only the query changes) must never wait for a reveal that already ran: it is simply shown.
    const show = (el: HTMLElement) => { if (el.hasAttribute("data-reveal") && !el.classList.contains("in")) el.classList.add("in", "rv-static"); };
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes") { show(m.target as HTMLElement); continue; }
        m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; const el = n as HTMLElement; show(el); el.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)").forEach(show); });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).classList.add("foot-in"); io.unobserve(e.target); } }, { threshold: 0.12 });
    document.querySelectorAll(".site-footer").forEach((f) => io.observe(f));
    // safety net: never leave content hidden if the observer does not fire (background tabs, HMR re-mounts)
    const safety = window.setTimeout(() => els.forEach((el) => el.classList.add("in")), 2500);
    const header = document.querySelector<HTMLElement>(".site-header");
    const dark = !!document.querySelector(".hero-dark[data-hero]");
    header?.classList.toggle("on-dark", dark);
    const rail = document.querySelector<HTMLElement>(".read-rail");
    const onScroll = () => { header?.classList.toggle("scrolled", window.scrollY > 24); if (rail) { const art = rail.parentElement!; const r = art.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (window.innerHeight * .4 - r.top) / Math.max(1, r.height - window.innerHeight * .4))); rail.style.setProperty("--p", p.toFixed(3)); } };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { mo.disconnect(); io.disconnect(); window.clearTimeout(safety); window.removeEventListener("scroll", onScroll); };
  }, [path]);
  return null;
}
