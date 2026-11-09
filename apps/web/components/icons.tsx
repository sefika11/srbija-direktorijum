/** Small inline icon set (24px grid, 1.75 stroke). Keep generic: no brand marks. */
const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const Icon = {
  landmark: () => <svg {...base}><path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M12 3l9 5H3l9-5z" /></svg>,
  townhall: () => <svg {...base}><path d="M4 21V9l8-5 8 5v12M4 21h16M9 21v-5h6v5M12 10h.01" /></svg>,
  hospital: () => <svg {...base}><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M12 7v6M9 10h6M10 21v-4h4v4" /></svg>,
  utility: () => <svg {...base}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>,
  scale: () => <svg {...base}><path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7zM18 7l-3 7a3 3 0 0 0 6 0l-3-7z" /></svg>,
  search: () => <svg {...base} width={18} height={18}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  globe: () => <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  pin: () => <svg {...base}><path d="M12 21s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>,
  phone: () => <svg {...base}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>,
  clock: () => <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  arrow: () => <svg {...base} width={16} height={16}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  briefcase: () => <svg {...base}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></svg>,
};
export type IconName = keyof typeof Icon;
export const GROUP_ICON: Record<string, IconName> = {
  lokalna_samouprava: "townhall", republicki_organi: "landmark", javne_ustanove: "hospital", javna_preduzeca: "utility", pravosudje_i_javna_ovlascenja: "scale", privatne_usluge: "briefcase",
};
