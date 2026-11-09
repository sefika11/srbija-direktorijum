"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Unit = { slug: string; name_lat: string; jls_kind: "grad" | "opstina" | null };

/** Select a municipality; remembered in a cookie so every guide opens personalised next time. */
export default function MunicipalityPicker({ units, value, basePath, label, placeholder }: { units: Unit[]; value: string | null; basePath: string; label: string; placeholder: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onChange = (slug: string) => {
    try { document.cookie = `opstina=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`; } catch {}
    start(() => router.push(slug ? `${basePath}?opstina=${encodeURIComponent(slug)}` : basePath, { scroll: false }));
  };
  return (
    <label className="flex items-center gap-2 text-[13.5px]">
      <span className="text-muted whitespace-nowrap">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={pending}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
        <option value="">{placeholder}</option>
        {units.map((u) => <option key={u.slug} value={u.slug}>{u.name_lat}</option>)}
      </select>
    </label>
  );
}
