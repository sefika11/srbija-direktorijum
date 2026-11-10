"use client";
/**
 * SearchBox — Spotlight-style search: as you type, a palette shows grouped results (quick actions, guides, institution types,
 * municipalities, institutions, countries) with emblems, phones and highlighted matches. Arrow keys move across groups,
 * Enter opens the active row (or runs the full search), Esc closes, Ctrl/Cmd+K focuses the field from anywhere.
 * Empty field: recent searches (localStorage) and a few popular starting points. Without JS it is a plain form.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Flags from "country-flag-icons/react/3x2";
import { href, type Locale } from "@/lib/i18n";
import type { Suggestion } from "@/lib/search";
import Glyph3D from "./Glyph3D";

type FlagComp = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
const flagOf = (iso2: string): FlagComp | null => ((Flags as unknown as Record<string, FlagComp>)[iso2] ?? null);

const L: Record<Locale, Record<string, string>> = {
  sr: { section: "Odeljci", action: "Hitno", guide: "Vodiči", type: "Vrste institucija", place: "Opštine i okruzi", org: "Institucije", country: "Vize i države", recent: "Nedavno", popular: "Počnite od", clear: "Obriši", all: "Svi rezultati za", open: "otvori", move: "kretanje", close: "zatvori", call: "pozovi", none: "Nema predloga. Pritisnite Enter za punu pretragu.", placeholder: "Pretražite instituciju, uslugu ili grad…", k: "Ctrl K" },
  en: { section: "Sections", action: "Emergency", guide: "Guides", type: "Institution types", place: "Municipalities and districts", org: "Institutions", country: "Visas and countries", recent: "Recent", popular: "Start from", clear: "Clear", all: "All results for", open: "open", move: "move", close: "close", call: "call", none: "No suggestions. Press Enter for the full search.", placeholder: "Search an institution, service or town…", k: "Ctrl K" },
  ru: { section: "Разделы", action: "Экстренно", guide: "Инструкции", type: "Типы учреждений", place: "Общины и округа", org: "Учреждения", country: "Визы и страны", recent: "Недавно", popular: "Начните с", clear: "Очистить", all: "Все результаты для", open: "открыть", move: "перейти", close: "закрыть", call: "позвонить", none: "Нет подсказок. Нажмите Enter для полного поиска.", placeholder: "Найти учреждение, услугу или город…", k: "Ctrl K" },
  de: { section: "Bereiche", action: "Notfall", guide: "Anleitungen", type: "Einrichtungsarten", place: "Gemeinden und Bezirke", org: "Einrichtungen", country: "Visa und Länder", recent: "Zuletzt", popular: "Starten mit", clear: "Löschen", all: "Alle Ergebnisse für", open: "öffnen", move: "bewegen", close: "schließen", call: "anrufen", none: "Keine Vorschläge. Enter für die volle Suche.", placeholder: "Einrichtung, Leistung oder Ort suchen…", k: "Strg K" },
};
const ORDER: Suggestion["kind"][] = ["action", "section", "guide", "type", "place", "org", "country"];
const POPULAR: Record<Locale, { q: string; label: string }[]> = {
  sr: [{ q: "/vodic/licna-karta", label: "Lična karta" }, { q: "/vodic/pasos", label: "Pasoš" }, { q: "/dom-zdravlja", label: "Domovi zdravlja" }, { q: "/vize", label: "Vize i ulazak" }, { q: "/banka", label: "Banke" }, { q: "/okrug/grad-beograd", label: "Beograd" }],
  en: [{ q: "/vodic/licna-karta", label: "ID card" }, { q: "/vodic/privremeni-boravak-stranci", label: "Residence permit" }, { q: "/dom-zdravlja", label: "Health centres" }, { q: "/vize", label: "Visas" }, { q: "/banka", label: "Banks" }, { q: "/okrug/grad-beograd", label: "Belgrade" }],
  ru: [{ q: "/vodic/privremeni-boravak-stranci", label: "ВНЖ" }, { q: "/vodic/licna-karta", label: "Личная карта" }, { q: "/dom-zdravlja", label: "Дома здоровья" }, { q: "/vize", label: "Визы" }, { q: "/banka", label: "Банки" }, { q: "/okrug/grad-beograd", label: "Белград" }],
  de: [{ q: "/vodic/privremeni-boravak-stranci", label: "Aufenthaltstitel" }, { q: "/vodic/licna-karta", label: "Personalausweis" }, { q: "/dom-zdravlja", label: "Gesundheitszentren" }, { q: "/vize", label: "Visa" }, { q: "/banka", label: "Banken" }, { q: "/okrug/grad-beograd", label: "Belgrad" }],
};
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").toLowerCase();
/** Wrap the matched parts of a title in <mark>, diacritic-insensitive, per query token. */
function Highlight({ text, q }: { text: string; q: string }) {
  const toks = fold(q).split(/\s+/).filter((t) => t.length >= 2);
  if (!toks.length) return <>{text}</>;
  const f = fold(text); const ranges: [number, number][] = [];
  if (f.length === text.length) for (const t of toks) { let i = f.indexOf(t); while (i >= 0) { ranges.push([i, i + t.length]); i = f.indexOf(t, i + t.length); } }
  if (!ranges.length) return <>{text}</>;
  ranges.sort((a, b) => a[0] - b[0]); const out: React.ReactNode[] = []; let pos = 0;
  for (const [a, b] of ranges) { if (a < pos) continue; out.push(text.slice(pos, a)); out.push(<mark key={a}>{text.slice(a, b)}</mark>); pos = b; }
  out.push(text.slice(pos)); return <>{out}</>;
}
const RECENT_KEY = "gdi-recent";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
const pushRecent = (q: string) => { try { const r = [q, ...readRecent().filter((x) => x !== q)].slice(0, 6); localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch { /* storage blocked */ } };

export default function SearchBox({ locale, defaultValue = "", large = false, placeholder, submitLabel }: { locale: Locale; defaultValue?: string; large?: boolean; placeholder: string; submitLabel: string }) {
  const router = useRouter(); const id = useId(); const T = L[locale];
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Suggestion[]>());

  useEffect(() => { setRecent(readRecent()); }, []);
  // Ctrl/Cmd+K focuses the first search field on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { const first = document.querySelector<HTMLInputElement>('form[role="search"] input[type="search"]'); if (first) { e.preventDefault(); first.focus(); first.select(); } } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const key = `${locale}|${q.trim().toLowerCase()}`;
    if (!dirty || q.trim().length < 2) { setItems([]); setLoading(false); return; }
    if (cache.current.has(key)) { setItems(cache.current.get(key)!); setActive(-1); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      abort.current?.abort(); const ac = new AbortController(); abort.current = ac;
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}&l=${locale}`, { signal: ac.signal });
        if (r.ok) { const data: Suggestion[] = await r.json(); cache.current.set(key, data); setItems(data); setOpen(true); setActive(-1); }
      } catch { /* aborted */ } finally { setLoading(false); }
    }, 110);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, locale, dirty]);

  const grouped = useMemo(() => ORDER.map((k) => ({ kind: k, rows: items.filter((s) => s.kind === k) })).filter((g) => g.rows.length), [items]);
  const flat = useMemo(() => grouped.flatMap((g) => g.rows), [grouped]);
  const showEmpty = open && q.trim().length < 2;
  const emptyRows = useMemo(() => [...recent.map((r) => ({ kind: "recent" as const, label: r, href: href(locale, `/pretraga?q=${encodeURIComponent(r)}`) })), ...POPULAR[locale].map((p) => ({ kind: "popular" as const, label: p.label, href: href(locale, p.q) }))], [recent, locale]);
  const total = showEmpty ? emptyRows.length : flat.length + (q.trim().length >= 2 ? 1 : 0); // +1 = "all results" row

  const go = (url: string, remember?: string) => { if (remember) pushRecent(remember); setOpen(false); if (url.startsWith("tel:")) { window.location.href = url; return; } router.push(url); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); (e.currentTarget as HTMLInputElement).blur(); return; }
    if (!open) { if (e.key === "ArrowDown") { setOpen(true); e.preventDefault(); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % Math.max(1, total)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? total - 1 : a - 1)); }
    else if (e.key === "Enter") {
      if (active < 0) { if (q.trim()) pushRecent(q.trim()); return; } // native submit → full search
      e.preventDefault();
      if (showEmpty) { const r = emptyRows[active]; if (r) go(r.href, r.kind === "recent" ? r.label : undefined); return; }
      if (active < flat.length) go(flat[active].href, q.trim()); else go(href(locale, `/pretraga?q=${encodeURIComponent(q.trim())}`), q.trim());
    } else if (e.key === "Tab") setOpen(false);
  };
  const clearRecent = () => { try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } setRecent([]); };
  let idx = -1;
  return (
    <form action={href(locale, "/pretraga")} role="search" className={`sp ${large ? "sp-large search-large max-w-2xl" : "max-w-md"} relative w-full ${open ? "is-open" : ""}`}
          onSubmit={() => { if (q.trim()) pushRecent(q.trim()); setOpen(false); }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <label htmlFor={id} className="sr-only">{submitLabel}</label>
      <div className="flex">
        <div className={`sp-field flex-1 min-w-0 flex items-center gap-2 rounded-l-xl border border-line bg-surface ${large ? "px-4" : "px-3"} focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition`}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-muted shrink-0"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={inputRef} id={id} name="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setDirty(true); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
                 placeholder={placeholder || T.placeholder} autoComplete="off" spellCheck={false} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
                 className={`flex-1 min-w-0 bg-transparent ${large ? "py-3.5 text-[16px]" : "py-2 text-[14px]"} outline-none placeholder:text-muted/80`} />
          {q ? <button type="button" aria-label={T.clear} className="sp-clear" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setItems([]); setActive(-1); inputRef.current?.focus(); }}>×</button>
             : <kbd className="sp-kbd hidden sm:inline-flex" aria-hidden>{T.k}</kbd>}
        </div>
        <button type="submit" className={`rounded-r-xl bg-accent hover:bg-accent-ink text-white px-5 font-medium transition ${large ? "text-[15px]" : "text-[14px]"}`}>{submitLabel}</button>
      </div>

      {open && (showEmpty ? emptyRows.length > 0 : (flat.length > 0 || q.trim().length >= 2)) && (
        <div className="sp-panel" id={`${id}-list`} role="listbox">
          {showEmpty ? (
            <>
              {recent.length > 0 && <div className="sp-group"><div className="sp-group-head"><span>{T.recent}</span><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearRecent} className="sp-link">{T.clear}</button></div>
                {recent.map((r) => { idx++; const i = idx; return <button key={`r-${r}`} id={`${id}-opt-${i}`} type="button" role="option" aria-selected={i === active} className={`sp-row ${i === active ? "is-active" : ""}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => go(href(locale, `/pretraga?q=${encodeURIComponent(r)}`), r)}>
                  <span className="sp-ico sp-ico-flat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><span className="sp-title">{r}</span></button>; })}</div>}
              <div className="sp-group"><div className="sp-group-head"><span>{T.popular}</span></div>
                <div className="sp-chips">{POPULAR[locale].map((p) => { idx++; const i = idx; return <button key={p.q} id={`${id}-opt-${i}`} type="button" role="option" aria-selected={i === active} className={`quick-chip text-[13px] ${i === active ? "is-active" : ""}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => go(href(locale, p.q))}>{p.label}</button>; })}</div></div>
            </>
          ) : (
            <>
              {grouped.map((g) => (
                <div key={g.kind} className="sp-group">
                  <div className="sp-group-head"><span>{T[g.kind]}</span></div>
                  {g.rows.map((s) => { idx++; const i = idx; const Flag = s.iso2 ? flagOf(s.iso2) : null; return (
                    <button key={`${s.kind}-${s.href}`} id={`${id}-opt-${i}`} type="button" role="option" aria-selected={i === active} className={`sp-row ${i === active ? "is-active" : ""} ${s.kind === "action" ? "is-action" : ""}`}
                            onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => go(s.href, q.trim())}>
                      <span className={`sp-ico ${s.kind === "country" ? "sp-ico-flag" : ""}`}>{s.kind === "country" && Flag ? <Flag /> : <Glyph3D icon={s.icon ?? (s.kind === "guide" ? "file-text" : s.kind === "place" ? "building" : "landmark")} size={34} />}</span>
                      <span className="sp-text"><span className="sp-title"><Highlight text={s.title} q={q} /></span>{s.sub && <span className="sp-sub">{s.sub}</span>}</span>
                      <span className="sp-meta">{s.kind === "action" ? <span className="sp-tel">{s.sub}</span> : s.phone ? <span className="sp-tel">{s.phone}</span> : s.count != null ? <span className="sp-count tabular">{s.count.toLocaleString("sr-Latn")}</span> : null}<span className="sp-enter" aria-hidden>↵</span></span>
                    </button>); })}
                </div>))}
              {q.trim().length >= 2 && (() => { idx++; const i = idx; return (
                <button id={`${id}-opt-${i}`} type="button" role="option" aria-selected={i === active} className={`sp-row sp-all ${i === active ? "is-active" : ""}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => go(href(locale, `/pretraga?q=${encodeURIComponent(q.trim())}`), q.trim())}>
                  <span className="sp-ico sp-ico-flat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
                  <span className="sp-title">{flat.length === 0 && !loading ? T.none : <>{T.all} „{q.trim()}“</>}</span><span className="sp-meta"><span className="sp-enter" aria-hidden>↵</span></span>
                </button>); })()}
            </>
          )}
          <div className="sp-foot" aria-hidden><span><kbd>↑</kbd><kbd>↓</kbd> {T.move}</span><span><kbd>↵</kbd> {T.open}</span><span><kbd>esc</kbd> {T.close}</span>{loading && <span className="sp-spin" />}</div>
        </div>
      )}
    </form>
  );
}
