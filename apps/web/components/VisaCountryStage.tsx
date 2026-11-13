"use client";
/** Country-page stage: the passport booklet opens on its own and the globe (Serbia → country arc) stands behind it.
 *  The globe mounts only on ≥640 px screens; the passport is always there. Reduced motion: open at once, no transition. */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Passport } from "./Passport";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false, loading: () => <div className="globe-stage" aria-hidden /> });

export default function VisaCountryStage({ iso2, name, label, homeLabel, legend }: { iso2: string; name: string; label: string; homeLabel: string; legend?: string }) {
  // opens once the globe has painted its countries (or at once without a globe); a 4 s fallback never leaves it shut
  const [armed, setArmed] = useState(false); const [globe, setGlobe] = useState(false); const [ready, setReady] = useState(false); const [forced, setForced] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setGlobe(window.matchMedia("(min-width: 640px)").matches);
    const t = window.setTimeout(() => setArmed(true), reduced ? 0 : 650); const f = window.setTimeout(() => setForced(true), 4000);
    return () => { window.clearTimeout(t); window.clearTimeout(f); };
  }, []);
  const open = armed && (ready || !globe || forced);
  const setOpen = (fn: (o: boolean) => boolean) => { const next = fn(open); setArmed(next); if (next) setForced(true); };
  return (
    <div className={`vcstage ${open ? "is-open" : ""}`}>
      <button type="button" className="vcstage-passport" onClick={() => setOpen((o) => !o)} aria-pressed={open}>
        <span className="sr-only">{`${name} · ${label}`}</span>
        <span aria-hidden><Passport iso2={iso2} name={name} size={200} label={label} /></span>
      </button>
      <div className="vcstage-globe deskframe">{globe && <Globe3D iso2={iso2} label={legend ?? name} homeLabel={homeLabel} onReady={() => setReady(true)} />}</div>
    </div>
  );
}
