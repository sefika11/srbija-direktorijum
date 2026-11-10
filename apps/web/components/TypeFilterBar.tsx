"use client";
/** Filter bar of a paged type page: name, place and (where the type has one) field. Same Combobox as everywhere else,
 *  so every dropdown on the site looks and behaves alike. URL-driven: each result has its own address. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";

type Opt = { value: string; label: string; sub?: string };
export default function TypeFilterBar({ base, q, place, facet, places, facets, labels, filtered }: {
  base: string; q: string | null; place: string | null; facet: string | null; places: Opt[]; facets: Opt[];
  labels: { name: string; allPlaces: string; allFields: string; show: string; reset: string }; filtered: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(q ?? ""); const [pl, setPl] = useState<string | null>(place); const [fc, setFc] = useState<string | null>(facet);
  const go = (n: string, p: string | null, f: string | null) => { const u = new URLSearchParams(); if (n.trim()) u.set("q", n.trim()); if (p) u.set("mesto", p); if (f) u.set("oblast", f); const s = u.toString(); router.push(`${s ? `${base}?${s}` : base}#lista`); };
  return (
    <form className={`type-filter card p-3.5 ${facets.length ? "has-facet" : ""}`} role="search" action={base} method="get" onSubmit={(e) => { e.preventDefault(); go(name, pl, fc); }}>
      <input type="search" name="q" value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.name} aria-label={labels.name} maxLength={60} />
      <Combobox label={labels.allPlaces} placeholder={labels.allPlaces} value={pl} options={places} maxItems={60} onChange={(v) => { setPl(v); go(name, v, fc); }} />
      {facets.length > 0 && <Combobox label={labels.allFields} placeholder={labels.allFields} value={fc} options={facets} maxItems={40} onChange={(v) => { setFc(v); go(name, pl, v); }} />}
      <button type="submit" className="btn-primary">{labels.show}</button>
      {filtered && <a href={base} className="type-filter-reset">{labels.reset}</a>}
    </form>
  );
}
