"use client";
/**
 * VisaStage — the centre stage of /vize: a clickable dotted globe between two passports.
 * Right: the Serbian passport (the traveller). Left: the passport of the country the visitor picks (type to search, or click
 * a country on the globe). Picking a country rotates the globe to it, lights it, draws the arc from Serbia and shows both
 * directions of the regime with an "Open" button; after the rotation settles the country page can open automatically.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobeEngine } from "@/lib/globe-engine";
import earth from "@/lib/country-centroids.json";
import { Passport, flagOf } from "./Passport";
import Combobox from "./Combobox";
import { href, type Locale } from "@/lib/i18n";

const DATA = earth as unknown as { centroids: Record<string, [number, number]> };
export type StageCountry = { iso2: string; slug: string; name: string; to: string | null; from: string | null };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").toLowerCase();

const L: Record<Locale, Record<string, string>> = {
  sr: { you: "Vaš pasoš", pick: "Država koja vas zanima", type: "Upišite državu…", toRs: "Ulazak u Srbiju", fromRs: "Iz Srbije tamo", open: "Otvori stranicu države", free: "bez vize", visa: "viza", eviza: "eViza", eta: "eTA", unknown: "nije objavljeno", hint: "Kliknite državu na globusu ili je upišite. Prevucite za okretanje.", auto: "Otvaranje…", freeGroup: "Plavo: građani ulaze u Srbiju bez vize", serbia: "Srbija" },
  en: { you: "Your passport", pick: "Country you are interested in", type: "Type a country…", toRs: "Entering Serbia", fromRs: "From Serbia there", open: "Open the country page", free: "visa-free", visa: "visa", eviza: "eVisa", eta: "eTA", unknown: "not published", hint: "Click a country on the globe or type it. Drag to rotate.", auto: "Opening…", freeGroup: "Blue: citizens enter Serbia visa-free", serbia: "Serbia" },
  ru: { you: "Ваш паспорт", pick: "Интересующая страна", type: "Введите страну…", toRs: "Въезд в Сербию", fromRs: "Из Сербии туда", open: "Открыть страницу страны", free: "без визы", visa: "виза", eviza: "eVisa", eta: "eTA", unknown: "не опубликовано", hint: "Нажмите на страну на глобусе или введите её. Тяните для вращения.", auto: "Открываем…", freeGroup: "Синим: въезд в Сербию без визы", serbia: "Сербия" },
  de: { you: "Ihr Pass", pick: "Land, das Sie interessiert", type: "Land eingeben…", toRs: "Einreise nach Serbien", fromRs: "Von Serbien dorthin", open: "Länderseite öffnen", free: "visumfrei", visa: "Visum", eviza: "eVisum", eta: "eTA", unknown: "nicht veröffentlicht", hint: "Land auf dem Globus anklicken oder eingeben. Ziehen zum Drehen.", auto: "Öffnet…", freeGroup: "Blau: Bürger reisen visumfrei nach Serbien ein", serbia: "Serbien" },
};
const regimeWord = (T: Record<string, string>, r: string | null) => r === "bez vize" ? T.free : r === "viza" ? T.visa : r === "eviza" ? T.eviza : r === "eta" ? T.eta : T.unknown;

export default function VisaStage({ locale, countries, initial }: { locale: Locale; countries: StageCountry[]; initial?: string }) {
  const T = L[locale];
  const [sel, setSel] = useState<StageCountry | null>(() => countries.find((c) => c.iso2 === initial) ?? null);
  const wrap = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null);
  const selRef = useRef<StageCountry | null>(sel); selRef.current = sel;
  const byIso = useMemo(() => Object.fromEntries(countries.map((c) => [c.iso2, c])), [countries]);
  const freeSet = useMemo(() => new Set(countries.filter((c) => c.to === "bez vize").map((c) => c.iso2)), [countries]);

  const engRef = useRef<GlobeEngine | null>(null);
  useEffect(() => {
    const el = wrap.current, canvas = canvasRef.current; if (!el || !canvas) return;
    let eng: GlobeEngine | null = null;
    try { eng = new GlobeEngine({ canvas, host: el, names: Object.fromEntries(countries.map((c) => [c.iso2, c.name])), centroids: DATA.centroids, home: "RS", homeLabel: T.serbia, highlight: freeSet, pickable: new Set(countries.map((c) => c.iso2)), onPick: (iso) => setSel(byIso[iso] ?? null) }); } catch { return; }
    engRef.current = eng; eng.setSelection(selRef.current?.iso2 ?? null);
    return () => { eng?.destroy(); engRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.length]);
  useEffect(() => { engRef.current?.setSelection(sel?.iso2 ?? null); }, [sel]);

  const Flag = sel ? flagOf(sel.iso2) : null;
  return (
    <section className="vstage" aria-label={T.pick}>
      <div className="vstage-side vstage-left">
        <div className="eyebrow plain">{T.pick}</div>
        <Combobox className="w-full" size="lg" label={T.pick} placeholder={T.type} value={sel?.iso2 ?? null}
          options={countries.map((c) => { const F = flagOf(c.iso2); return { value: c.iso2, label: c.name, keywords: c.iso2, icon: <span className="visa-flag">{F ? <F /> : c.iso2}</span>, sub: c.to === "bez vize" ? T.free : undefined }; })}
          onChange={(v) => setSel(v ? byIso[v] ?? null : null)} />
        <div className={`vstage-passport ${sel ? "is-set" : "is-empty"}`}>
          {sel ? <Passport iso2={sel.iso2} name={sel.name} size={150} label={locale === "sr" ? "PASOŠ" : "PASSPORT"} /> : <div className="vstage-ghost"><span>?</span></div>}
        </div>
        {sel && (
          <div className="vstage-facts">
            <div className="vstage-name">{Flag && <Flag />}<b>{sel.name}</b></div>
            <div className={`visa-pill ${sel.to === "bez vize" ? "is-free" : sel.to ? "is-visa" : "is-unknown"}`}>{T.toRs}: {regimeWord(T, sel.to)}</div>
            <div className={`visa-pill ${sel.from === "bez vize" ? "is-free" : sel.from === "viza" ? "is-visa" : sel.from ? "is-e" : "is-unknown"}`}>{T.fromRs}: {regimeWord(T, sel.from)}</div>
            <a className="btn-primary mt-2 no-underline" href={href(locale, `/vize/${sel.slug}`)}>{T.open} →</a>
          </div>
        )}
      </div>
      <div className="vstage-globe" ref={wrap}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={T.hint} role="img" />
        <div className="globe-legend"><span><i className="globe-dot is-home" />{T.serbia}</span><span><i className="globe-dot is-dest" />{sel ? sel.name : T.freeGroup}</span></div>
        <div className="vstage-hint">{T.hint}</div>
      </div>
      <div className="vstage-side vstage-right">
        <div className="eyebrow plain">{T.you}</div>
        <div className="vstage-passport is-set"><Passport iso2="RS" name={T.serbia} size={150} label={locale === "sr" ? "PASOŠ" : "PASSPORT"} /></div>
        <div className="vstage-facts"><div className="vstage-name"><b>{T.serbia}</b></div><p className="text-[12.5px] text-muted">{locale === "sr" ? "Crvena tačka na globusu. Plave tačke: države čiji građani ulaze u Srbiju bez vize." : locale === "en" ? "The red point on the globe. Blue points: countries whose citizens enter Serbia visa-free." : locale === "ru" ? "Красная точка на глобусе. Синие точки: страны без визы в Сербию." : "Der rote Punkt auf dem Globus. Blaue Punkte: visumfreie Einreise nach Serbien."}</p></div>
      </div>
    </section>
  );
}
