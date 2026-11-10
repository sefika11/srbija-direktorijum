/** Passport booklet drawn as a layered 2.5D object (CSS 3D): leather cover in the country's real cover colour, gold-foil
 *  national title and the word for "passport" in the national language, an emblem medallion (coat of arms for Serbia,
 *  flag for the rest), the ICAO chip symbol, a page block and a spine. No server imports: safe in client components. */
import * as Flags from "country-flag-icons/react/3x2";

type FlagComp = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => React.JSX.Element;
export const flagOf = (iso2: string): FlagComp | null => ((Flags as unknown as Record<string, FlagComp>)[iso2.toUpperCase()] ?? null);

type Cover = { c: string; title: string; word: string; union?: string };
const BURG = "#5a1a2b", NAVY = "#1c2f55", RED = "#7a1b23", GREEN = "#1f4d35", BLACK = "#1a1a1f";
const EU_WORD: Record<string, string> = { DE: "EUROPÄISCHE UNION", FR: "UNION EUROPÉENNE", IT: "UNIONE EUROPEA", ES: "UNIÓN EUROPEA", NL: "EUROPESE UNIE", PT: "UNIÃO EUROPEIA", PL: "UNIA EUROPEJSKA", CZ: "EVROPSKÁ UNIE", SK: "EURÓPSKA ÚNIA", HU: "EURÓPAI UNIÓ", RO: "UNIUNEA EUROPEANĂ", BG: "ЕВРОПЕЙСКИ СЪЮЗ", HR: "EUROPSKA UNIJA", SI: "EVROPSKA UNIJA", GR: "ΕΥΡΩΠΑΪΚΗ ΕΝΩΣΗ", CY: "ΕΥΡΩΠΑΪΚΗ ΕΝΩΣΗ", SE: "EUROPEISKA UNIONEN", DK: "DEN EUROPÆISKE UNION", FI: "EUROOPAN UNIONI", IE: "AN tAONTAS EORPACH", LT: "EUROPOS SĄJUNGA", LV: "EIROPAS SAVIENĪBA", EE: "EUROOPA LIIT", LU: "UNION EUROPÉENNE", MT: "UNJONI EWROPEA", AT: "EUROPÄISCHE UNION", BE: "UNION EUROPÉENNE · EUROPESE UNIE" };
const COVERS: Record<string, Cover> = {
  RS: { c: "#5c1b25", title: "РЕПУБЛИКА СРБИЈА", word: "ПАСОШ" },
  DE: { c: BURG, title: "BUNDESREPUBLIK DEUTSCHLAND", word: "REISEPASS" }, FR: { c: BURG, title: "RÉPUBLIQUE FRANÇAISE", word: "PASSEPORT" }, IT: { c: BURG, title: "REPUBBLICA ITALIANA", word: "PASSAPORTO" }, ES: { c: BURG, title: "ESPAÑA", word: "PASAPORTE" },
  AT: { c: BURG, title: "REPUBLIK ÖSTERREICH", word: "REISEPASS" }, NL: { c: BURG, title: "KONINKRIJK DER NEDERLANDEN", word: "PASPOORT" }, BE: { c: BURG, title: "BELGIQUE · BELGIË · BELGIEN", word: "PASSEPORT · PASPOORT" }, PT: { c: BURG, title: "REPÚBLICA PORTUGUESA", word: "PASSAPORTE" },
  GR: { c: BURG, title: "ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ", word: "ΔΙΑΒΑΤΗΡΙΟ" }, HR: { c: BURG, title: "REPUBLIKA HRVATSKA", word: "PUTOVNICA" }, SI: { c: BURG, title: "REPUBLIKA SLOVENIJA", word: "POTNI LIST" }, HU: { c: BURG, title: "MAGYARORSZÁG", word: "ÚTLEVÉL" },
  PL: { c: BURG, title: "RZECZPOSPOLITA POLSKA", word: "PASZPORT" }, CZ: { c: BURG, title: "ČESKÁ REPUBLIKA", word: "CESTOVNÍ PAS" }, SK: { c: BURG, title: "SLOVENSKÁ REPUBLIKA", word: "CESTOVNÝ PAS" }, RO: { c: BURG, title: "ROMÂNIA", word: "PAȘAPORT" }, BG: { c: BURG, title: "РЕПУБЛИКА БЪЛГАРИЯ", word: "ПАСПОРТ" },
  SE: { c: BURG, title: "SVERIGE", word: "PASS" }, DK: { c: BURG, title: "DANMARK", word: "PAS" }, FI: { c: BURG, title: "SUOMI · FINLAND", word: "PASSI · PASS" }, IE: { c: BURG, title: "ÉIRE · IRELAND", word: "PAS · PASSPORT" }, LT: { c: BURG, title: "LIETUVOS RESPUBLIKA", word: "PASAS" }, LV: { c: BURG, title: "LATVIJAS REPUBLIKA", word: "PASE" }, EE: { c: BURG, title: "EESTI VABARIIK", word: "PASS" }, LU: { c: BURG, title: "GRAND-DUCHÉ DE LUXEMBOURG", word: "PASSEPORT" }, MT: { c: BURG, title: "MALTA", word: "PASSAPORT" }, CY: { c: BURG, title: "ΚΥΠΡΙΑΚΗ ΔΗΜΟΚΡΑΤΙΑ", word: "ΔΙΑΒΑΤΗΡΙΟ" },
  US: { c: NAVY, title: "UNITED STATES OF AMERICA", word: "PASSPORT" }, GB: { c: "#15224a", title: "UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND", word: "PASSPORT" }, CA: { c: NAVY, title: "CANADA", word: "PASSPORT · PASSEPORT" }, AU: { c: NAVY, title: "AUSTRALIA", word: "PASSPORT" }, NZ: { c: BLACK, title: "NEW ZEALAND · AOTEAROA", word: "PASSPORT · URUWHENUA" },
  RU: { c: "#6a1d26", title: "РОССИЙСКАЯ ФЕДЕРАЦИЯ", word: "ПАСПОРТ" }, CN: { c: RED, title: "中华人民共和国", word: "护照 · PASSPORT" }, JP: { c: RED, title: "日本国", word: "旅券 · PASSPORT" }, KR: { c: "#1a3a5c", title: "대한민국", word: "여권 · PASSPORT" }, IN: { c: NAVY, title: "भारत गणराज्य · REPUBLIC OF INDIA", word: "पासपोर्ट · PASSPORT" },
  TR: { c: "#6a1d26", title: "TÜRKİYE CUMHURİYETİ", word: "PASAPORT" }, CH: { c: "#b3242b", title: "SCHWEIZERISCHE EIDGENOSSENSCHAFT", word: "PASS" }, NO: { c: RED, title: "NORGE", word: "PASS" }, IS: { c: NAVY, title: "ÍSLAND", word: "VEGABRÉF" },
  BA: { c: "#1a3a5c", title: "BOSNA I HERCEGOVINA", word: "PASOŠ" }, ME: { c: "#6a1d26", title: "CRNA GORA", word: "PASOŠ" }, MK: { c: "#6a1d26", title: "РЕПУБЛИКА СЕВЕРНА МАКЕДОНИЈА", word: "ПАСОШ" }, AL: { c: "#6a1d26", title: "REPUBLIKA E SHQIPËRISË", word: "PASAPORTË" }, XK: { c: NAVY, title: "REPUBLIKA E KOSOVËS", word: "PASAPORTË" },
  UA: { c: NAVY, title: "УКРАЇНА", word: "ПАСПОРТ" }, BY: { c: NAVY, title: "РЭСПУБЛІКА БЕЛАРУСЬ", word: "ПАШПАРТ" }, GE: { c: NAVY, title: "საქართველო", word: "პასპორტი" }, AM: { c: NAVY, title: "ՀԱՅԱՍՏԱՆԻ ՀԱՆՐԱՊԵՏՈՒԹՅՈՒՆ", word: "ԱՆՁՆԱԳԻՐ" }, AZ: { c: NAVY, title: "AZƏRBAYCAN RESPUBLİKASI", word: "PASPORT" }, KZ: { c: NAVY, title: "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ", word: "ПАСПОРТ" },
  SA: { c: GREEN, title: "المملكة العربية السعودية", word: "جواز سفر" }, AE: { c: NAVY, title: "الإمارات العربية المتحدة", word: "جواز سفر" }, EG: { c: GREEN, title: "جمهورية مصر العربية", word: "جواز سفر" }, MA: { c: GREEN, title: "المملكة المغربية", word: "جواز سفر" }, PK: { c: GREEN, title: "اسلامی جمہوریہ پاکستان", word: "PASSPORT" }, IR: { c: "#6a1d26", title: "جمهوری اسلامی ایران", word: "گذرنامه" },
  BR: { c: NAVY, title: "REPÚBLICA FEDERATIVA DO BRASIL", word: "PASSAPORTE" }, AR: { c: NAVY, title: "REPÚBLICA ARGENTINA", word: "PASAPORTE" }, MX: { c: GREEN, title: "ESTADOS UNIDOS MEXICANOS", word: "PASAPORTE" }, CL: { c: "#6a1d26", title: "REPÚBLICA DE CHILE", word: "PASAPORTE" }, CO: { c: "#6a1d26", title: "REPÚBLICA DE COLOMBIA", word: "PASAPORTE" },
  ZA: { c: GREEN, title: "REPUBLIC OF SOUTH AFRICA", word: "PASSPORT" }, NG: { c: GREEN, title: "FEDERAL REPUBLIC OF NIGERIA", word: "PASSPORT" }, KE: { c: NAVY, title: "REPUBLIC OF KENYA", word: "PASSPORT" }, IL: { c: NAVY, title: "מדינת ישראל", word: "דרכון · PASSPORT" },
  SG: { c: RED, title: "REPUBLIC OF SINGAPORE", word: "PASSPORT" }, MY: { c: RED, title: "MALAYSIA", word: "PASPORT" }, ID: { c: GREEN, title: "REPUBLIK INDONESIA", word: "PASPOR" }, TH: { c: "#6a1d26", title: "ราชอาณาจักรไทย", word: "หนังสือเดินทาง · PASSPORT" }, VN: { c: GREEN, title: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", word: "HỘ CHIẾU" }, PH: { c: "#6a1d26", title: "REPUBLIKA NG PILIPINAS", word: "PASAPORTE" },
};
export function passportCover(iso2: string, name: string): Cover {
  const k = iso2.toUpperCase(); const c = COVERS[k]; if (c) return { ...c, union: c.union ?? EU_WORD[k] };
  return { c: NAVY, title: name.toUpperCase(), word: "PASSPORT" };
}

/** Passport booklet. `size` is the cover width in px. */
export function Passport({ iso2, name, size = 180, label }: { iso2: string; name: string; size?: number; label?: string }) {
  const Flag = flagOf(iso2); const cv = passportCover(iso2, name); const isRS = iso2.toUpperCase() === "RS";
  return (
    <div className={`pp3 ${isRS ? "is-rs" : ""}`} style={{ "--w": `${size}px`, "--c": cv.c } as React.CSSProperties} aria-hidden title={`${name} · ${label ?? cv.word}`}>
      <div className="pp3-book">
        <div className="pp3-back" />
        <div className="pp3-pages" />
        <div className="pp3-cover">
          <div className="pp3-leather" />
          {cv.union && <div className="pp3-union">{cv.union}</div>}
          <div className="pp3-country">{cv.title}</div>
          <div className="pp3-emblem">{Flag ? <Flag title={name} /> : <span className="pp3-iso">{iso2}</span>}</div>
          <div className="pp3-word">{cv.word}</div>
          <svg className="pp3-chip" viewBox="0 0 40 28" aria-hidden><rect x="1" y="1" width="38" height="26" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="20" cy="14" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M1 14h13M26 14h13" stroke="currentColor" strokeWidth="2" /></svg>
          <div className="pp3-gloss" />
        </div>
        <div className="pp3-spine" />
      </div>
      <div className="pp3-shadow" />
    </div>
  );
}
