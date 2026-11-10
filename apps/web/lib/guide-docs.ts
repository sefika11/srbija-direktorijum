/**
 * Which document a guide is about, drawn as a 3D object in the guide's hero (components/Doc3D.tsx).
 * Stylised illustrations: real proportions and layout families (ID-1 card, booklet, A4 sheet), no state emblems,
 * no personal data, generic field labels only. Titles are the Serbian names (as printed) with an English second line.
 */
import type { Locale } from "./i18n";

type Base = { title: string; sub?: string; issuer?: string; c: string; c2?: string };
export type CardDoc = Base & { form: "card"; fields: string[]; photo?: boolean; chip?: boolean; holo?: boolean; dark?: boolean; plate?: string; back: "mrz" | "barcode" | "stripe" | "grid" };
export type BookDoc = Base & { form: "booklet"; glyph: "flag" | "book" | "school"; inside: "id" | "grades" };
export type PaperDoc = Base & { form: "paper"; table?: boolean; ribbon?: boolean; seal?: boolean; landscape?: boolean };
export type DocSpec = CardDoc | BookDoc | PaperDoc;

export const GUIDE_DOCS: Record<string, DocSpec> = {
  "licna-karta": { form: "card", title: "LIČNA KARTA", sub: "IDENTITY CARD", issuer: "REPUBLIKA SRBIJA", c: "#6f93cc", c2: "#d79aa8", fields: ["Prezime", "Ime", "Datum rođenja", "Važi do"], photo: true, holo: true, back: "mrz" },
  "vozacka-dozvola": { form: "card", title: "VOZAČKA DOZVOLA", sub: "DRIVING LICENCE", issuer: "REPUBLIKA SRBIJA", c: "#d77fa0", c2: "#e8b08e", fields: ["1. Prezime", "2. Ime", "3. Datum rođenja", "9. Kategorije"], photo: true, holo: true, back: "grid" },
  "zdravstvena-knjizica": { form: "card", title: "ZDRAVSTVENA KARTICA", sub: "HEALTH INSURANCE CARD", issuer: "RFZO", c: "#2f97a6", c2: "#6fb7dd", fields: ["Prezime i ime", "LBO", "Važi do"], chip: true, back: "barcode" },
  "registracija-vozila": { form: "card", title: "SAOBRAĆAJNA DOZVOLA", sub: "VEHICLE REGISTRATION", issuer: "REPUBLIKA SRBIJA", c: "#6d8fb8", c2: "#9cc39a", fields: ["Marka i model", "Vlasnik", "Važi do"], chip: true, plate: "BG 000-AA", back: "barcode" },
  "privremeni-boravak-stranci": { form: "card", title: "DOZVOLA ZA PRIVREMENI BORAVAK", sub: "TEMPORARY RESIDENCE PERMIT", issuer: "REPUBLIKA SRBIJA", c: "#57a488", c2: "#86b3dc", fields: ["Prezime", "Ime", "Državljanstvo", "Važi do"], photo: true, holo: true, back: "mrz" },
  "bankovni-racun-i-kartice": { form: "card", title: "DEBITNA KARTICA", sub: "DEBIT", issuer: "BANKA", c: "#2a2f3d", c2: "#3d4660", fields: ["Ime i prezime", "Važi do"], chip: true, dark: true, back: "stripe" },
  "studentski-dom-kredit-i-stipendija": { form: "card", title: "STUDENTSKA KARTICA", sub: "STUDENT CARD", issuer: "STUDENTSKI CENTAR", c: "#d98d3c", c2: "#e3c063", fields: ["Prezime i ime", "Fakultet", "Broj indeksa", "Školska godina"], photo: true, back: "barcode" },
  "pasos": { form: "booklet", title: "ПАСОШ", sub: "PASSPORT", issuer: "РЕПУБЛИКА СРБИЈА", c: "#5c1b25", glyph: "flag", inside: "id" },
  "upis-na-fakultet": { form: "booklet", title: "INDEKS", sub: "STUDENTSKA KNJIŽICA", issuer: "UNIVERZITET", c: "#1f3a5f", glyph: "book", inside: "grades" },
  "upis-u-osnovnu-skolu": { form: "booklet", title: "ĐAČKA KNJIŽICA", sub: "OSNOVNA ŠKOLA", issuer: "REPUBLIKA SRBIJA", c: "#2c6a50", glyph: "school", inside: "grades" },
  "upis-u-srednju-skolu": { form: "booklet", title: "ĐAČKA KNJIŽICA", sub: "SREDNJA ŠKOLA", issuer: "REPUBLIKA SRBIJA", c: "#3a4a80", glyph: "school", inside: "grades" },
  "izvod-iz-maticne-knjige": { form: "paper", title: "IZVOD IZ MATIČNE KNJIGE ROĐENIH", issuer: "Matična služba", c: "#3b5ea8", table: true },
  "prijava-prebivalista": { form: "paper", title: "UVERENJE O PREBIVALIŠTU", issuer: "MUP · Policijska uprava", c: "#3b5ea8" },
  "pib-za-strance": { form: "paper", title: "POTVRDA O IZVRŠENOJ REGISTRACIJI", sub: "PIB", issuer: "Poreska uprava", c: "#3b5ea8", table: true },
  "otvaranje-firme-preduzetnik": { form: "paper", title: "REŠENJE O REGISTRACIJI", sub: "Preduzetnik", issuer: "Agencija za privredne registre", c: "#3b5ea8" },
  "overa-kod-javnog-beleznika": { form: "paper", title: "OVERA POTPISA", issuer: "Javni beležnik", c: "#b0303a", ribbon: true },
  "deciji-dodatak": { form: "paper", title: "REŠENJE O DEČIJEM DODATKU", issuer: "Gradska / opštinska uprava", c: "#3b5ea8" },
  "novcana-socijalna-pomoc": { form: "paper", title: "REŠENJE O NOVČANOJ SOCIJALNOJ POMOĆI", issuer: "Centar za socijalni rad", c: "#3b5ea8" },
  "prijava-na-nsz": { form: "paper", title: "UVERENJE O EVIDENCIJI NEZAPOSLENIH", issuer: "Nacionalna služba za zapošljavanje", c: "#3b5ea8", table: true },
  "upis-u-vrtic": { form: "paper", title: "POTVRDA O UPISU DETETA", issuer: "Predškolska ustanova", c: "#3b5ea8" },
  "pripremni-predskolski-program": { form: "paper", title: "UVERENJE O POHAĐANJU", sub: "Pripremni predškolski program", issuer: "Predškolska ustanova", c: "#3b5ea8", seal: true },
  "priznavanje-strane-diplome": { form: "paper", title: "DIPLOMA", sub: "Rešenje o priznavanju", issuer: "Agencija za kvalifikacije · ENIC/NARIC", c: "#3b5ea8", seal: true, landscape: true },
};

export const DOC_LABELS: Record<Locale, { flip: string; open: string; stamp: string; note: string; back: string; close: string }> = {
  sr: { flip: "Kliknite da okrenete", open: "Kliknite da otvorite", stamp: "Kliknite za pečat", note: "Ilustracija dokumenta", back: "Poleđina", close: "Zatvorite" },
  en: { flip: "Click to flip", open: "Click to open", stamp: "Click to stamp", note: "Illustration of the document", back: "Back side", close: "Close" },
  ru: { flip: "Нажмите, чтобы перевернуть", open: "Нажмите, чтобы открыть", stamp: "Нажмите, чтобы поставить печать", note: "Иллюстрация документа", back: "Оборот", close: "Закрыть" },
  de: { flip: "Klicken zum Umdrehen", open: "Klicken zum Öffnen", stamp: "Klicken zum Stempeln", note: "Illustration des Dokuments", back: "Rückseite", close: "Schließen" },
};
