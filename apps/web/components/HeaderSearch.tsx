"use client";
/** Search from anywhere: a header button that drops the spotlight under the bar on screens where the bar has no
 *  room for the field (and on the home page once the hero search has scrolled away). Opens on the button, on
 *  Ctrl/Cmd+K and on "/" when no search field is visible; closes on Escape, a press outside, or after navigation. */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SearchBox from "./SearchBox";
import type { Locale } from "@/lib/i18n";

export default function HeaderSearch({ locale, label, placeholder, submitLabel, always = false }: { locale: Locale; label: string; placeholder: string; submitLabel: string; always?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const show = () => setOpen(true), hide = () => setOpen(false);
    window.addEventListener("gdi:open-search", show); window.addEventListener("gdi:close-search", hide);   // the box says when a result was opened
    return () => { window.removeEventListener("gdi:open-search", show); window.removeEventListener("gdi:close-search", hide); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className={`hsearch-wrap ${always ? "" : "lg:hidden"}`}>
      <button type="button" className="nav-menu-btn" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen((v) => !v)} data-open={open || undefined}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
      </button>
      {open && <div className="hsearch"><div className="shell"><SearchBox locale={locale} large autoFocus placeholder={placeholder} submitLabel={submitLabel} /></div></div>}
    </div>
  );
}
