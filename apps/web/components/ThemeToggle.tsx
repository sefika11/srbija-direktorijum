"use client";
/** Light / dark switch. The choice is kept in localStorage and applied before first paint by the inline script in
 *  app/layout.tsx (data-theme on <html>); without a stored choice the site follows the system setting. */
import { useEffect, useState } from "react";

export default function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const r = document.documentElement;
    setTheme(r.dataset.theme === "light" || r.dataset.theme === "dark" ? r.dataset.theme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; try { localStorage.setItem("gdi-theme", next); } catch { /* private mode */ }
    setTheme(next);
  };
  const label = theme === "dark" ? toLight : toDark;
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={label} title={label} data-theme-now={theme ?? undefined}>
      <svg className="tt-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" /></svg>
      <svg className="tt-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" /></svg>
    </button>
  );
}
