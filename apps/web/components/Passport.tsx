/** Passport booklet + flag lookup. No server imports: safe to use from client components. */
import * as Flags from "country-flag-icons/react/3x2";

type FlagComp = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => React.JSX.Element;
export const flagOf = (iso2: string): FlagComp | null => ((Flags as unknown as Record<string, FlagComp>)[iso2.toUpperCase()] ?? null);

/** Passport cover colours: EU burgundy, the Americas/Anglosphere navy, OIC-style green where that is the issued colour, black for a few; default dark blue. */
const EU = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
const GREEN = new Set("SA MA PK NG BD ID MY SN TN DZ EG MR IR AF NE BF ML TG".split(" "));
const RED = new Set("CH TR CN RU AL MK ME BA JP KR SG MX PE CL".split(" "));
const BLACK = new Set("NZ AO TD ZM MW".split(" "));
function coverColour(iso2: string) {
  if (EU.has(iso2)) return "#6b1f2b"; if (GREEN.has(iso2)) return "#1f5a3a"; if (RED.has(iso2)) return "#8a1f26"; if (BLACK.has(iso2)) return "#1a1a1f"; return "#1f2a5b";
}

/** A passport booklet drawn as layered SVG: cover with flag plate, page stack, spine shadow. Server-rendered. */
export function Passport({ iso2, name, size = 180, label = "PASOŠ" }: { iso2: string; name: string; size?: number; label?: string }) {
  const Flag = flagOf(iso2); const c = coverColour(iso2);
  return (
    <div className="passport" style={{ width: size, height: size * 1.32 }} aria-hidden>
      <div className="passport-pages" />
      <div className="passport-cover" style={{ background: `linear-gradient(135deg, ${c} 0%, color-mix(in oklab, ${c} 70%, black) 100%)` }}>
        <div className="passport-emblem">{Flag ? <Flag title={name} /> : <span className="passport-iso">{iso2}</span>}</div>
        <div className="passport-text"><span>{name.toUpperCase()}</span><b>{label}</b></div>
      </div>
      <div className="passport-sheen" />
    </div>
  );
}

