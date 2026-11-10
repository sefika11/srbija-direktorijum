// Guide category names in the four site languages (the database holds the Serbian name only).
import type { Locale } from "./i18n";
const CATS: Record<string, [en: string, ru: string, de: string]> = {
  "obrazovanje-i-deca": ["Education and children", "Образование и дети", "Bildung und Kinder"],
  "licna-dokumenta": ["Personal documents", "Личные документы", "Ausweisdokumente"],
  "vozila-i-saobracaj": ["Vehicles and traffic", "Транспорт и вождение", "Fahrzeuge und Verkehr"],
  "socijalna-zastita": ["Social protection", "Социальная защита", "Soziale Sicherung"],
  "firma-i-preduzetnistvo": ["Company and self-employment", "Фирма и предпринимательство", "Firma und Selbstständigkeit"],
  "banke-i-novac": ["Banks and money", "Банки и деньги", "Banken und Geld"],
  "sud-i-pravda": ["Courts and justice", "Суд и право", "Gericht und Justiz"],
  "stranci-i-boravak": ["Foreigners and residence", "Иностранцы и проживание", "Ausländer und Aufenthalt"],
  "porezi-i-takse": ["Taxes and fees", "Налоги и пошлины", "Steuern und Gebühren"],
  "zaposljavanje": ["Employment", "Трудоустройство", "Beschäftigung"],
  "maticne-knjige": ["Civil registers", "Акты гражданского состояния", "Personenstandsregister"],
  "zdravstvo": ["Health care", "Здравоохранение", "Gesundheit"],
  "gradjenje-i-urbanizam": ["Building and planning", "Строительство и градостроение", "Bauen und Stadtplanung"],
  "komunalne-usluge": ["Utilities", "Коммунальные услуги", "Kommunale Dienste"],
  "nekretnine-i-katastar": ["Property and cadastre", "Недвижимость и кадастр", "Immobilien und Kataster"],
  "penzije-i-osiguranje": ["Pensions and insurance", "Пенсии и страхование", "Renten und Versicherung"],
};
export function catName(g: { category_slug: string; category_name: string }, locale: Locale): string {
  const c = CATS[g.category_slug];
  return !c || locale === "sr" ? g.category_name : locale === "en" ? c[0] : locale === "ru" ? c[1] : c[2];
}
