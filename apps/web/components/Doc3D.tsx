"use client";
/**
 * Doc3D — the document a guide is about, as an object you can handle: an ID-1 card that flips to its back, a booklet
 * that opens to its data page, an A4 sheet that takes a stamp. CSS 3D like the passport booklets (crisp type, no WebGL):
 * it floats, leans toward the pointer with a moving sheen and hologram, and answers a click, Enter or Space.
 * Reduced motion: no float, no lean; the click still changes the state instantly.
 */
import { useEffect, useRef, useState } from "react";
import type { BookDoc, CardDoc, DocSpec, PaperDoc } from "@/lib/guide-docs";
import { flagOf } from "./Passport";

type Labels = { flip: string; open: string; stamp: string; note: string; back: string; close: string };
const bars = (n: number, seed = 0) => Array.from({ length: n }, (_, i) => 46 + ((i * 37 + seed * 23) % 44));

const Silhouette = () => (<svg viewBox="0 0 40 50" aria-hidden><rect width="40" height="50" fill="currentColor" opacity=".16" /><circle cx="20" cy="19" r="8.5" fill="currentColor" opacity=".5" /><path d="M4 50c0-11 7-17 16-17s16 6 16 17Z" fill="currentColor" opacity=".5" /></svg>);
const Chip = () => (<svg className="d3-chip" viewBox="0 0 44 34" aria-hidden><rect x=".8" y=".8" width="42.4" height="32.4" rx="6" fill="url(#d3chip)" stroke="#8b6b1e" strokeWidth="1" /><path d="M1 12h13v10H1M43 12H30v10h13M14 1v11M30 1v11M14 22v11M30 22v11M14 17h16" fill="none" stroke="#8b6b1e" strokeWidth="1" /><defs><linearGradient id="d3chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1d98a" /><stop offset=".5" stopColor="#c9a443" /><stop offset="1" stopColor="#e9cf7c" /></linearGradient></defs></svg>);
const Stamp = ({ text }: { text: string }) => (
  <svg className="d3-stamp" viewBox="0 0 80 80" aria-hidden>
    <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="2.6" /><circle cx="40" cy="40" r="30.5" fill="none" stroke="currentColor" strokeWidth="1" /><circle cx="40" cy="40" r="17" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path id="d3arc" d="M40 40m-23.5 0a23.5 23.5 0 1 1 47 0a23.5 23.5 0 1 1-47 0" fill="none" />
    <text fontSize="6.2" letterSpacing="1.5" fill="currentColor" fontFamily="var(--font-mono)"><textPath href="#d3arc" startOffset="2%">{text} · {text} ·</textPath></text>
    <path d="M40 29l3.1 6.6 7.2.9-5.3 4.9 1.4 7.1-6.4-3.6-6.4 3.6 1.4-7.1-5.3-4.9 7.2-.9Z" fill="currentColor" />
  </svg>
);
const Fields = ({ list, seed = 0 }: { list: string[]; seed?: number }) => (<div className="d3-fields">{list.map((k, i) => <div key={k} className="d3-field"><span className="k">{k}</span><i className="v" style={{ width: `${bars(list.length, seed)[i]}%` }} /></div>)}</div>);

function Card({ s, back }: { s: CardDoc; back: string }) {
  return (
    <div className={`dcard ${s.dark ? "is-dark" : ""}`}>
      <div className="dcard-face dcard-front">
        <div className="d3-guil" />
        <div className="dcard-head"><i className="d3-flag" /><span className="iss">{s.issuer}</span><b>{s.title}</b>{s.sub && <em>{s.sub}</em>}</div>
        {s.photo && <div className="dcard-photo"><Silhouette /></div>}
        <div className={`dcard-body ${s.photo ? "" : "is-wide"}`}>
          {s.chip && <Chip />}
          {s.plate && <div className="dcard-plate"><i />{s.plate}</div>}
          {s.dark && <div className="dcard-pan" aria-hidden>{[0, 1, 2, 3].map((g) => <span key={g}>{g < 3 ? "••••" : "0000"}</span>)}</div>}
          <Fields list={s.fields} />
        </div>
        {s.dark && <svg className="dcard-nfc" viewBox="0 0 24 24" aria-hidden><path d="M6 8a8 8 0 0 1 0 8M10 5.5a12 12 0 0 1 0 13M14 3a16 16 0 0 1 0 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
        {s.holo && <div className="d3-holo" />}
        <div className="d3-gloss" />
      </div>
      <div className="dcard-face dcard-back" aria-label={back}>
        <div className="d3-guil" />
        {s.back === "stripe" ? (<><div className="dcard-stripe" /><div className="dcard-sign"><i /><span>000</span></div><Fields list={["IBAN", "SWIFT"]} seed={3} /></>) : (<>
          <div className="dcard-backtop"><Fields list={s.back === "grid" ? ["4a. Datum izdavanja", "4b. Važi do", "4c. Izdao"] : ["Mesto rođenja", "Prebivalište", "Datum izdavanja"]} seed={2} />{!s.chip && s.back === "mrz" && <Chip />}</div>
          {s.back === "grid" && <div className="dcard-cats">{["AM", "A1", "A", "B", "C", "D"].map((c, i) => <div key={c} className={i === 3 ? "on" : ""}><b>{c}</b><i /><i /></div>)}</div>}
          {s.back === "mrz" && <div className="dcard-mrz">{["I<SRB000000000<<<<<<<<<<<<<<<", "0000000<0000000SRB<<<<<<<<<<<0", "UZORAK<<SPECIMEN<<<<<<<<<<<<<<"].map((l) => <span key={l}>{l}</span>)}</div>}
          {s.back === "barcode" && <div className="dcard-barcode"><i /><span>0000 0000 0000</span></div>}
        </>)}
        <div className="d3-gloss" />
      </div>
    </div>
  );
}

function Glyph({ g }: { g: BookDoc["glyph"] }) {
  if (g === "flag") { const F = flagOf("RS"); return <div className="dbook-emblem is-flag">{F ? <F /> : null}</div>; }
  return (
    <div className="dbook-emblem"><svg viewBox="0 0 48 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {g === "book" ? <><path d="M24 14c-4-3-9-4-15-4v24c6 0 11 1 15 4 4-3 9-4 15-4V10c-6 0-11 1-15 4Z" /><path d="M24 14v24" /></> : <><path d="M6 20 24 10l18 10-18 10Z" /><path d="M13 25v9c3 3 7 4 11 4s8-1 11-4v-9M42 20v11" /></>}
    </svg></div>
  );
}
function Booklet({ s }: { s: BookDoc }) {
  return (
    <div className="dbook">
      <div className="dbook-back" />
      <div className="dbook-block" />
      <div className="dbook-page">
        <div className="d3-guil" />
        {s.inside === "id" ? (<>
          <div className="dbook-idrow"><div className="dcard-photo"><Silhouette /></div><Fields list={["Prezime", "Ime", "Državljanstvo", "Datum rođenja", "Važi do"]} seed={1} /></div>
          <div className="dcard-mrz">{["P<SRBUZORAK<<SPECIMEN<<<<<<<<<<<<", "000000000<0SRB0000000<0000000<<<<"].map((l) => <span key={l}>{l}</span>)}</div>
        </>) : (<>
          <div className="dbook-idrow"><div className="dcard-photo"><Silhouette /></div><Fields list={["Prezime i ime", "Broj", "Godina upisa"]} seed={1} /></div>
          <div className="dbook-grades">{[0, 1, 2].map((r) => <div key={r}><i style={{ width: `${bars(5, 4)[r]}%` }} /><b>{[10, 9, 8][r]}</b></div>)}</div>
        </>)}
        <div className="dbook-pagestamp"><Stamp text="OVERENO" /></div>
      </div>
      <div className="dbook-cover">
        <div className="dbook-cover-out">
          <div className="dbook-leather" />
          <div className="dbook-iss">{s.issuer}</div>
          <Glyph g={s.glyph} />
          <div className="dbook-word">{s.title}</div>
          {s.sub && <div className="dbook-sub">{s.sub}</div>}
          <div className="d3-gloss" />
        </div>
        <div className="dbook-cover-in"><div className="d3-guil" /><Fields list={["Izdato", "Serijski broj"]} seed={5} /></div>
      </div>
      <div className="dbook-spine" />
    </div>
  );
}

function Paper({ s }: { s: PaperDoc }) {
  return (
    <div className={`dpaper ${s.landscape ? "is-land" : ""}`}>
      <div className="dpaper-under" />
      <div className="dpaper-sheet">
        {s.landscape && <div className="dpaper-border" />}
        {s.ribbon && <div className="dpaper-ribbon" aria-hidden><i /><i /><i /></div>}
        <div className="dpaper-head"><svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M12 6.5l1.6 3.4 3.7.4-2.7 2.5.7 3.7-3.3-1.9-3.3 1.9.7-3.7-2.7-2.5 3.7-.4Z" fill="currentColor" /></svg><span>Republika Srbija</span>{s.issuer && <span className="iss">{s.issuer}</span>}</div>
        <b className="dpaper-title">{s.title}</b>
        {s.sub && <em className="dpaper-sub">{s.sub}</em>}
        {s.table ? <div className="dpaper-table">{bars(s.landscape ? 3 : 5, 2).map((w, i) => <div key={i}><i style={{ width: `${30 + (i * 13) % 30}%` }} /><i style={{ width: `${w}%` }} /></div>)}</div>
          : <div className="dpaper-lines">{bars(s.landscape ? 3 : 7, 1).map((w, i) => <i key={i} style={{ width: `${Math.min(100, w + 40)}%` }} />)}</div>}
        <div className="dpaper-foot">
          <div className="dpaper-sign"><svg viewBox="0 0 60 20" aria-hidden><path d="M2 14c5-9 8-11 10-6s-3 9 2 4 6-9 9-4-1 6 4 3 5-6 9-4 3 5 8 3 6-4 12-5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg><i /></div>
          <div className="dpaper-mp"><span>M.P.</span><Stamp text={s.ribbon ? "JAVNI BELEŽNIK" : "OVERENO"} /></div>
        </div>
        {s.seal && <div className="dpaper-seal" aria-hidden><i /></div>}
        <div className="dpaper-corner" />
        <div className="d3-gloss" />
      </div>
    </div>
  );
}

export default function Doc3D({ spec, labels }: { spec: DocSpec; labels: Labels }) {
  const [on, setOn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current; if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const step = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      el.style.setProperty("--rx", `${(-cy * 9).toFixed(2)}deg`); el.style.setProperty("--ry", `${(cx * 15).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(50 + cx * 50).toFixed(1)}%`); el.style.setProperty("--my", `${(50 + cy * 50).toFixed(1)}%`);
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)); ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)); el.classList.add("is-held"); kick(); };
    const leave = () => { tx = 0; ty = 0; el.classList.remove("is-held"); kick(); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const hint = spec.form === "card" ? labels.flip : spec.form === "booklet" ? labels.open : labels.stamp;
  return (
    <div ref={root} className={`doc3 doc3-${spec.form} ${on ? "is-on" : ""}`} style={{ "--c": spec.c, "--c2": ("c2" in spec && spec.c2) || spec.c } as React.CSSProperties}>
      <div role="button" tabIndex={0} className="doc3-hit" onClick={() => setOn((v) => !v)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOn((v) => !v); } }} aria-pressed={on} aria-label={`${spec.title}. ${on && spec.form !== "paper" ? labels.close : hint}`}>
        <div className="doc3-enter"><div className="doc3-float"><div className="doc3-tilt">
          {spec.form === "card" ? <Card s={spec} back={labels.back} /> : spec.form === "booklet" ? <Booklet s={spec} /> : <Paper s={spec} />}
        </div></div></div>
        <div className="doc3-shadow" aria-hidden />
      </div>
      <div className="doc3-cap"><span className="doc3-note">{labels.note}</span><span className="doc3-hint">{on && spec.form === "booklet" ? labels.close : hint}</span></div>
    </div>
  );
}
