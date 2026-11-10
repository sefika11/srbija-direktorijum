"use client";
/** The passport is a button: opening it reveals the globe with the Serbia → country arc (3D, with a 2D option). */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Passport } from "./Passport";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false, loading: () => <div className="globe globe-loading" aria-hidden /> });

export default function PassportGlobe({ iso2, name, label, homeLabel, open: openLabel, close: closeLabel, size = 200, autoOpen = false, isos, legend }: { iso2: string; name: string; label: string; homeLabel: string; open: string; close: string; size?: number; autoOpen?: boolean; isos?: string[]; legend?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!autoOpen) return; const t = window.setTimeout(() => setOpen(true), 700); return () => window.clearTimeout(t); }, [autoOpen]);
  return (
    <div className={`pg ${open ? "is-open" : ""}`}>
      <button type="button" className="pg-passport" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="pg-globe">
        <Passport iso2={iso2} name={name} size={size} label={label} />
        <span className="pg-hint">{open ? closeLabel : openLabel}</span>
      </button>
      {open && <div id="pg-globe" className="pg-globe"><Globe3D iso2={iso2} label={legend ?? name} homeLabel={homeLabel} isos={isos} /></div>}
    </div>
  );
}
