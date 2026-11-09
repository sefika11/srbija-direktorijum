"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { href, type Locale } from "@/lib/i18n";
import type { Suggestion } from "@/lib/search";

const KIND_LABEL: Record<Locale, Record<Suggestion["kind"], string>> = {
  sr: { guide: "Vodič", type: "Vrsta", place: "Mesto", org: "Institucija" }, en: { guide: "Guide", type: "Type", place: "Place", org: "Institution" },
  ru: { guide: "Инструкция", type: "Тип", place: "Место", org: "Учреждение" }, de: { guide: "Anleitung", type: "Art", place: "Ort", org: "Einrichtung" },
};

/** Search box with instant suggestions (guides, types, places, institutions). Falls back to a plain form without JS. */
export default function SearchBox({ locale, defaultValue = "", large = false, placeholder, submitLabel }: { locale: Locale; defaultValue?: string; large?: boolean; placeholder: string; submitLabel: string }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dirty, setDirty] = useState(false);   // only suggest after the user types, not for a prefilled query
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty || q.trim().length < 2) { setItems([]); return; }
    timer.current = setTimeout(async () => {
      abort.current?.abort(); const ac = new AbortController(); abort.current = ac;
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}&l=${locale}`, { signal: ac.signal });
        if (r.ok) { setItems(await r.json()); setOpen(true); setActive(-1); }
      } catch { /* aborted */ }
    }, 160);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, locale, dirty]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); setOpen(false); router.push(items[active].href); }
    else if (e.key === "Escape") setOpen(false);
  };
  const go = (s: Suggestion) => { setOpen(false); router.push(s.href); };

  return (
    <form action={href(locale, "/pretraga")} role="search" className={`relative w-full ${large ? "max-w-2xl search-large" : "max-w-md"}`} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <label htmlFor={id} className="sr-only">{submitLabel}</label>
      <div className="flex">
        <div className={`flex-1 min-w-0 flex items-center gap-2 rounded-l-xl border border-line bg-surface ${large ? "px-4" : "px-3"} focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition`}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-muted shrink-0"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input id={id} name="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setDirty(true); }} onFocus={() => items.length && setOpen(true)} onKeyDown={onKey}
                 placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
                 className={`flex-1 min-w-0 bg-transparent ${large ? "py-3.5 text-[16px]" : "py-2 text-[14px]"} outline-none placeholder:text-muted/80`} />
        </div>
        <button type="submit" className={`rounded-r-xl bg-accent hover:bg-accent-ink text-white px-5 font-medium transition ${large ? "text-[15px]" : "text-[14px]"}`}>{submitLabel}</button>
      </div>
      {open && items.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full mt-1.5 z-50 card overflow-hidden shadow-lg text-left">
          {items.map((s, i) => (
            <li key={`${s.kind}-${s.href}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(s)} onMouseEnter={() => setActive(i)}
                      className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 text-[14px] ${i === active ? "bg-accent-soft" : ""}`}>
                <span className={`shrink-0 text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${s.kind === "guide" ? "bg-moss-soft text-moss" : s.kind === "place" ? "bg-surface-2 text-muted" : s.kind === "type" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted"}`}>{KIND_LABEL[locale][s.kind]}</span>
                <span className="min-w-0 truncate text-ink">{s.title}</span>
                {s.sub && <span className="ml-auto shrink-0 text-[12.5px] text-muted truncate max-w-[45%]">{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
