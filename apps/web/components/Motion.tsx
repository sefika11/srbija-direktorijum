"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Scroll reveals for [data-reveal] and the header's transparent-over-dark-hero state. No layout work on scroll. */
export default function Motion() {
  const path = usePathname();
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); io.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in"); else io.observe(el); });
    // safety net: never leave content hidden if the observer does not fire (background tabs, HMR re-mounts)
    const safety = window.setTimeout(() => els.forEach((el) => el.classList.add("in")), 2500);
    const header = document.querySelector<HTMLElement>(".site-header");
    const dark = !!document.querySelector(".hero-dark[data-hero]");
    header?.classList.toggle("on-dark", dark);
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 24);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.clearTimeout(safety); window.removeEventListener("scroll", onScroll); };
  }, [path]);
  return null;
}
