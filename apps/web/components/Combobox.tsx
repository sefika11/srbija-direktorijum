"use client";
/**
 * Combobox — one picker for the whole site: type to filter, or open the list and pick. Keyboard: ↓↑ move, Enter picks,
 * Esc closes, Backspace on a picked value clears it. Cyrillic and diacritics fold so "nemacka" finds "Nemačka".
 * The list is rendered into <body> at a fixed position under (or, without room, above) the field, so no card, deck or
 * section with overflow/contain can ever cut it off, and it always sits above the page.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ComboOption = { value: string; label: string; sub?: string; icon?: ReactNode; keywords?: string };

const CYR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s" };
export const fold = (s: string) => s.toLowerCase().replace(/[а-яђјљњћџ]/g, (c) => CYR[c] ?? c).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj");

export default function Combobox({ options, value, onChange, placeholder, label, disabled, className = "", inputClassName = "", maxItems = 12, emptyText = "—", size = "md" }: {
  options: ComboOption[]; value: string | null; onChange: (value: string | null, option: ComboOption | null) => void;
  placeholder: string; label: string; disabled?: boolean; className?: string; inputClassName?: string; maxItems?: number; emptyText?: string; size?: "md" | "lg";
}) {
  const id = useId();
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [active, setActive] = useState(0); const [typing, setTyping] = useState(false);
  const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null); const list = useRef<HTMLUListElement>(null);
  const shown = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return options.slice(0, maxItems);
    const starts: ComboOption[] = [], has: ComboOption[] = [];
    for (const o of options) { const l = fold(o.label), k = o.keywords ? fold(o.keywords) : ""; if (l.startsWith(f) || k.split(/\s+/).some((w) => w.startsWith(f))) starts.push(o); else if (l.includes(f) || k.includes(f)) has.push(o); if (starts.length >= maxItems) break; }
    return [...starts, ...has].slice(0, maxItems);
  }, [q, options, maxItems]);
  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => { const el = list.current?.children[active] as HTMLElement | undefined; el?.scrollIntoView?.({ block: "nearest" }); }, [active, shown]);
  useEffect(() => { if (!open) return; const off = (e: PointerEvent) => { const t = e.target as Node; if (!root.current?.contains(t) && !list.current?.contains(t)) { setOpen(false); setTyping(false); setQ(""); } }; document.addEventListener("pointerdown", off); return () => document.removeEventListener("pointerdown", off); }, [open]);
  // where the list goes: glued to the field, below it when there is room (at least 200 px), otherwise above
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) { setBox(null); return; }
    const place = () => {
      const r = root.current?.getBoundingClientRect(); if (!r) return;
      const below = window.innerHeight - r.bottom - 14, above = r.top - 14; const up = below < 200 && above > below;
      const w = Math.min(Math.max(260, r.width), window.innerWidth - 16);
      setBox({ left: Math.max(8, Math.min(r.left, window.innerWidth - 8 - w)), width: w, ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }), maxHeight: Math.max(140, Math.min(320, up ? above : below)) });
    };
    place(); window.addEventListener("scroll", place, { passive: true, capture: true }); window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, { capture: true } as EventListenerOptions); window.removeEventListener("resize", place); };
  }, [open]);
  const pick = (o: ComboOption | null) => { onChange(o?.value ?? null, o); setQ(""); setTyping(false); setOpen(false); };
  const shownValue = typing ? q : selected?.label ?? "";
  return (
    <div ref={root} className={`cbx ${open ? "is-open" : ""} ${selected ? "has-value" : ""} cbx-${size} ${className}`}>
      {selected?.icon && !typing && <span className="cbx-icon" aria-hidden>{selected.icon}</span>}
      <input ref={input} id={id} type="text" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={label} autoComplete="off" spellCheck={false} disabled={disabled}
        className={`cbx-input ${inputClassName}`} placeholder={placeholder} value={shownValue}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
        onChange={(e) => { setTyping(true); setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shown.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter") { if (open && shown[active]) { e.preventDefault(); pick(shown[active]); } }
          else if (e.key === "Escape") { setOpen(false); setTyping(false); setQ(""); }
          else if (e.key === "Backspace" && !typing && selected) { e.preventDefault(); onChange(null, null); setTyping(true); setQ(""); setOpen(true); }
        }} />
      {selected && !typing ? (
        <button type="button" className="cbx-btn" aria-label="×" onClick={() => { pick(null); input.current?.focus(); }}>×</button>
      ) : (
        <button type="button" className="cbx-btn" tabIndex={-1} aria-label="▾" onPointerDown={(e) => { e.preventDefault(); setOpen((o) => !o); input.current?.focus(); }}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      )}
      {open && box && createPortal(
        <ul ref={list} id={`${id}-list`} role="listbox" className="cbx-list is-floating" style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }}>
          {shown.length === 0 && <li className="cbx-empty">{emptyText}</li>}
          {shown.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={`cbx-opt ${i === active ? "is-active" : ""}`} onPointerDown={(e) => e.preventDefault()} onClick={() => pick(o)} onMouseMove={() => setActive(i)}>
              {o.icon && <span className="cbx-icon" aria-hidden>{o.icon}</span>}
              <span className="cbx-label">{o.label}</span>
              {o.sub && <span className="cbx-sub">{o.sub}</span>}
            </li>
          ))}
        </ul>, document.body
      )}
    </div>
  );
}
