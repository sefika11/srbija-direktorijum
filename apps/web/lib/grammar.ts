/** Serbian place-name inflection for UI copy. Locative ("u Beogradu", "u Novom Sadu", "u Sremskoj Mitrovici"). */
const EXC: Record<string, string> = { Šabac: "Šapcu", Grocka: "Grockoj", Odžaci: "Odžacima", Bela: "Beloj", Crna: "Crnoj", Nova: "Novoj", Stara: "Staroj", Mala: "Maloj", Velika: "Velikoj", Gornja: "Gornjoj", Donja: "Donjoj", Novi: "Novom", Stari: "Starom", Savski: "Savskom", Veliki: "Velikom", Mali: "Malom", Gornji: "Gornjem", Donji: "Donjem", Bački: "Bačkom", Banatski: "Banatskom", Sremski: "Sremskom", Srpski: "Srpskom", Vrnjačka: "Vrnjačkoj", Beograd: "Beogradu", Zemun: "Zemunu", Vračar: "Vračaru", Sopot: "Sopotu", Pirot: "Pirotu", Bor: "Boru", Sombor: "Somboru", Titel: "Titelu", Žabalj: "Žablju", Bečej: "Bečeju", Niš: "Nišu", Vrbas: "Vrbasu", Čačak: "Čačku", Žitorađa: "Žitorađi", Crnogorac: "Crnogorcu" };
const ADJ_F = /^(Sremska|Bačka|Banatska|Srpska|Stara|Nova|Bela|Crna|Velika|Mala|Gornja|Donja|Vrnjačka|Kosovska|Mačvanska|Bosanska|Kninska)$/;
function word(w: string, multi: boolean): string {
  if (EXC[w]) return EXC[w];
  if (multi && ADJ_F.test(w)) return w.slice(0, -1) + "oj";
  if (/ac$/.test(w)) return w.slice(0, -2) + "cu";          // Kragujevac → Kragujevcu
  if (/[^aeiou]ak$/.test(w) && w.length > 4) return w.slice(0, -2) + "ku"; // Čačak → Čačku
  if (/ka$/.test(w)) return w.slice(0, -2) + "ci";          // Palanka → Palanci
  if (/ga$/.test(w)) return w.slice(0, -2) + "zi";          // Požega → Požezi
  if (/a$/.test(w)) return w.slice(0, -1) + "i";            // Subotica → Subotici
  if (/[oe]$/.test(w)) return w.slice(0, -1) + "u";         // Pančevo → Pančevu, Užice → Užicu
  if (/i$/.test(w)) return w.slice(0, -1) + "ima";          // plural: Odžaci → Odžacima
  return w + "u";                                           // Zrenjanin → Zrenjaninu
}
export function locative(name: string): string {
  const parts = name.trim().split(/\s+/); const multi = parts.length > 1;
  return parts.map((p, i) => (i > 0 && /^[a-zčćžšđ]/.test(p) ? word(p, multi) : word(p, multi))).join(" ");
}
/** "u Beogradu" */
export const inPlace = (name: string) => `u ${locative(name)}`;
