/**
 * Logo — "Gde da idem?" as a map pin that holds an institution: a red pin, a paper disc with a small temple front
 * (pediment, three columns, steps) and a blue shadow on the ground. Red, white and blue come from the object itself,
 * so the mark carries the flag without a stripe. Pure SVG, server-rendered, no ids (safe to repeat on a page).
 */
export function LogoMark({ size = 40, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 58" height={size} width={(size * 48) / 58} className={`logo-mark ${className ?? ""}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <ellipse className="logo-ground" cx="24" cy="54" rx="11" ry="3" />
      <g className="logo-pin">
        <path className="logo-body" d="M24 52C24 52 7 34.5 7 20.5a17 17 0 1 1 34 0C41 34.5 24 52 24 52Z" />
        <path className="logo-shade" d="M24 3.5a17 17 0 0 1 17 17C41 34.5 24 52 24 52Z" />
        <circle className="logo-disc" cx="24" cy="20.5" r="11.8" />
        <g className="logo-temple">
          <path d="M15 18.3 24 11.5l9 6.8Z" />
          <rect x="15.2" y="19.3" width="17.6" height="1.7" />
          <rect x="16.7" y="22.1" width="2.4" height="6.3" /><rect x="22.8" y="22.1" width="2.4" height="6.3" /><rect x="28.9" y="22.1" width="2.4" height="6.3" />
          <rect x="14.5" y="28.9" width="19" height="2" rx=".5" />
        </g>
        <circle className="logo-disc" cx="24" cy="15.9" r="1.05" />
      </g>
    </svg>
  );
}

/** Mark + wordmark. `sub` is the small line under the name (hidden on phones in the header). */
export function Logo({ name, sub, size = 40, big = false }: { name: string; sub?: string; size?: number; big?: boolean }) {
  const q = name.endsWith("?"); const base = q ? name.slice(0, -1) : name;
  return (
    <span className={`brand ${big ? "is-big" : ""}`}>
      <LogoMark size={size} />
      <span className="brand-text">
        <span className="brand-name">{base}{q && <span className="q">?</span>}</span>
        {sub && <span className="brand-sub">{sub}</span>}
      </span>
    </span>
  );
}
