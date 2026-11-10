/**
 * org-type slug -> rendered 3D emblem key (see tools/emblems and public/emblems/manifest.json).
 * Types not listed here keep using org_types.icon (SVG scenes / object emblems). Includes both the slugs that exist in
 * the seed data and the common aliases, so new types pick up their building automatically.
 */
export const EMBLEM_BY_TYPE: Record<string, string> = {
  // republic
  skupstina: "parliament", ministarstvo: "parliament", "drzavni-organ": "parliament",
  "upravni-okrug": "townhall", "pokrajinski-sekretarijat": "townhall",
  apr: "registry", rfzo: "insurance", "uprava-za-trezor": "bank-house",
  "poreska-uprava": "tax", "lokalna-poreska-administracija": "tax",
  "rgz-katastar": "cadastre", katastar: "cadastre",
  "mup-policijska-uprava": "police", "policijska-stanica": "police", "policijska-uprava": "police",
  "uprava-za-vanredne-situacije": "fire", vatrogasci: "fire",
  nsz: "employment", "nacionalna-sluzba-za-zaposljavanje": "employment",
  "pio-fond": "pension",
  ambasada: "embassy", konzulat: "embassy",
  // local government
  opstina: "townhall", "gradska-uprava": "townhall", "opstinska-uprava": "townhall", "uprava-gradske-opstine": "townhall", "organ-jls": "townhall",
  sekretarijat: "townhall", "mesna-zajednica": "townhall", "mesna-kancelarija": "townhall",
  "maticna-sluzba": "registry",
  // public utilities
  "javno-preduzece": "utility", "eps-distribucija": "utility",
  jkp: "water", vodovod: "water", "jkp-vodovod": "water",
  toplana: "heating", "jkp-toplana": "heating",
  cistoca: "waste", "jkp-cistoca": "waste",
  "parking-servis": "parking", "jkp-parking-servis": "parking",
  "jkp-pijace": "market", pijaca: "market",
  "jkp-pogrebne-usluge": "cemetery", groblje: "cemetery",
  "jkp-gradski-prevoz": "busstation", "autobuska-stanica": "busstation",
  "zeleznicka-stanica": "trainstation", aerodrom: "airport",
  "jp-posta-srbije": "post", posta: "post",
  // public institutions
  "dom-zdravlja": "clinic", "zavod-za-javno-zdravlje": "clinic", "privatna-ordinacija": "clinic",
  "opsta-bolnica": "hospital", bolnica: "hospital", "klinicki-centar": "hospital",
  apoteka: "pharmacy-house",
  "predskolska-ustanova": "kindergarten", predskolska: "kindergarten", vrtic: "kindergarten",
  "osnovna-skola": "school", "srednja-skola": "school",
  univerzitet: "university", fakultet: "university", "visoka-skola": "university", "studentski-dom": "university",
  "narodna-biblioteka": "library", biblioteka: "library",
  "kulturni-centar": "theater-house", pozoriste: "theater-house",
  muzej: "museum",
  "sportski-centar": "sports",
  crkva: "church", eparhija: "church",
  zatvor: "prison",
  // justice
  sud: "court", "osnovni-sud": "court", "visi-sud": "court", "privredni-sud": "court", "prekrsajni-sud": "court", "apelacioni-sud": "court", "upravni-sud": "court", apelacioni: "court", "pravosudni-organ": "court",
  "osnovno-javno-tuzilastvo": "court", "vise-javno-tuzilastvo": "court", "javni-izvrsitelj": "court", advokat: "court",
  "javni-beleznik": "notary",
  "sudski-prevodilac": "translator", "prevodilacka-agencija": "translator",
  // private services
  banka: "bank-house", "osiguravajuce-drustvo": "insurance", osiguranje: "insurance",
  "auto-skola": "driving",
  "veterinarska-stanica": "vet", veterinar: "vet",
  "dom-za-stare": "elderly-home",
  "telekom-prodavnica": "telecom",
  // added 2026-11-11 (registry types)
  "specijalna-bolnica": "hospital", "klinika-institut": "hospital", "muzicka-skola": "school", "dom-ucenika": "university", "skola-za-odrasle": "school", "gerontoloski-centar": "elderly-home", "arhiv": "library", "zavod-za-zastitu-spomenika": "museum", "carinarnica": "tax", "sudski-vestak": "court", "procenitelj-nepokretnosti": "cadastre", "menjacnica": "bank-house", "platna-institucija": "bank-house", "lizing": "bank-house", "penzijski-fond": "pension", "privatna-skola": "school", "agencija-za-zaposljavanje": "employment",
};

/** Emblem key for an org type: the rendered building when we have one, else the stored icon. */
export function emblemFor(slug: string | null | undefined, icon?: string | null): string | null | undefined {
  return (slug && EMBLEM_BY_TYPE[slug]) || icon;
}
