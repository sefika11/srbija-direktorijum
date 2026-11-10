"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Combobox from "./Combobox";

type Unit = { slug: string; name_lat: string; jls_kind: "grad" | "opstina" | null };

/** Pick a municipality (type or choose); remembered in a cookie so every guide opens personalised next time. */
export default function MunicipalityPicker({ units, value, basePath, label, placeholder }: { units: Unit[]; value: string | null; basePath: string; label: string; placeholder: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onChange = (slug: string | null) => {
    try { document.cookie = `opstina=${encodeURIComponent(slug ?? "")}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`; } catch {}
    start(() => router.push(slug ? `${basePath}?opstina=${encodeURIComponent(slug)}` : basePath, { scroll: false }));
  };
  return (
    <div className="flex items-center gap-2 text-[13.5px]">
      <span className="text-muted whitespace-nowrap">{label}</span>
      <Combobox className="min-w-0 flex-1" label={label} placeholder={placeholder} value={value} disabled={pending}
        options={units.map((u) => ({ value: u.slug, label: u.name_lat, sub: u.jls_kind === "grad" ? "grad" : undefined }))} onChange={(v) => onChange(v)} />
    </div>
  );
}
