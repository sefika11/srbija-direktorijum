"use client";
/** Header menu for narrow screens: the links that do not fit in the bar, plus the language choice on phones.
 *  Closes on a link, on Escape and on a press outside. */
import Link from "@/components/Link";
import { useEffect, useRef, useState } from "react";

export default function NavMenu({ label, items, langs, langLabel }: {
  label: string; langLabel: string;
  items: { href: string; label: string; from?: "sm" | "lg" | "xl" }[];
  langs: { href: string; code: string; label: string; current: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="nav-menu">
      <button type="button" className="nav-menu-btn" aria-label={label} title={label} aria-expanded={open} aria-controls="nav-menu-panel" onClick={() => setOpen((v) => !v)} data-open={open || undefined}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path className="nm-a" d="M4.5 7.5h15" /><path className="nm-b" d="M4.5 12h15" /><path className="nm-c" d="M4.5 16.5h15" /></svg>
      </button>
      {open && (
        <div id="nav-menu-panel" className="nav-menu-panel">
          <ul>{items.map((it) => <li key={it.href} className={it.from ? `nm-until-${it.from}` : undefined}><Link href={it.href} onClick={() => setOpen(false)}>{it.label}<span aria-hidden>→</span></Link></li>)}</ul>
          <div className="nav-menu-langs sm:hidden" role="group" aria-label={langLabel}>
            {langs.map((l) => <Link key={l.code} href={l.href} hrefLang={l.code} aria-current={l.current ? "true" : undefined} className={l.current ? "is-on" : undefined} onClick={() => setOpen(false)}>{l.label}</Link>)}
          </div>
        </div>
      )}
    </div>
  );
}
