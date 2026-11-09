// UI strings only. Institution names, addresses and hours stay in Serbian (that is what is written on the door).
export const LOCALES = ["sr", "en", "ru", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sr";
export const LOCALE_LABEL: Record<Locale, string> = { sr: "Srpski", en: "English", ru: "Русский", de: "Deutsch" };
export const HREFLANG: Record<Locale, string> = { sr: "sr-Latn", en: "en", ru: "ru", de: "de" };

const dict = {
  sr: {
    siteName: "Adresar uprave", tagline: "Sve institucije Srbije na jednom mestu: adresa, telefon, radno vreme i ko je nadležan za vašu opštinu.",
    searchPlaceholder: "Pretražite instituciju, uslugu ili grad…", search: "Pretraga", home: "Početna",
    browseByRegion: "Pronađite po okrugu", browseByCategory: "Pronađite po vrsti institucije", mapHint: "Pređite preko okruga ili ga izaberite na mapi.",
    institutions: "institucija", municipalities: "opština i gradova", inOkrug: "u okrugu", forForeigners: "Za strance", forForeignersLead: "Boravak, rad, PIB, firma, prevod dokumenata: gde se šta rešava.",
    allInstitutionsIn: "Sve institucije u", gradskeOpstine: "Gradske opštine", nationalOrgans: "Republički organi nadležni za ovu opštinu", noData: "Još nema podataka.",
    contactAndAddress: "Kontakt i adresa", address: "Adresa", phone: "Telefon", email: "Email", website: "Sajt", hours: "Radno vreme", radSaStrankama: "Rad sa strankama",
    jurisdiction: "Nadležnost", coveredAreas: "Ova jedinica je nadležna za", units: "Ispostave i odeljenja", parentUnit: "Matična jedinica", services: "Usluge",
    about: "O instituciji", faq: "Česta pitanja", related: "Povezano", otherUnits: "Druge jedinice", alsoIn: "Takođe u", allInstitutions: "Sve institucije",
    isDataCorrect: "Da li su podaci tačni?", lastChecked: "Poslednja provera", source: "Izvor", editData: "Izmeni podatke", reportClosed: "Prijavi da je zatvoreno / preseljeno",
    reviewNote: "Ispravke pregleda urednik pre objave.", verified: "Provereno", unverified: "Nepotvrđeno", autoVerified: "Iz zvaničnog registra",
    call: "Pozovi", directions: "Uputstva", ad: "Oglas", sponsor: "Sponzor stranice", localPartner: "Lokalni partner", sendRequest: "Pošalji upit",
    freeNoObligation: "Besplatno, bez obaveze. Odgovor radnim danima u roku od 24h.", nameLabel: "Ime i prezime", phoneLabel: "Telefon", viber: "Kontaktirajte me preko Vibera",
    consent: "Slažem se da se moj upit prosledi jednom partneru.", privacy: "Politika privatnosti", thanks: "Hvala! Javićemo se u roku od 24h radnim danima.",
    thanksEdit: "Hvala, pregledaćemo u roku od 3 dana.", yourEmailOptional: "Vaš email (opciono, da vas obavestimo)", whatIsWrong: "Šta nije tačno?", send: "Pošalji",
    results: "Rezultati pretrage za", noResults: "Nema rezultata. Pokušajte drugi naziv ili grad.", page: "strana", founder: "Osnivač", registry: "Registarski podaci",
    becomePartner: "Oglašavanje i partnerstva", aboutSite: "O sajtu", terms: "Uslovi korišćenja", dataSources: "Izvori podataka", language: "Jezik",
    okrug: "Okrug", city: "Grad", municipality: "Opština", gradskaOpstina: "Gradska opština", seat: "Sedište", inPlace: "u", showAll: "Prikaži sve", showing: "Prikazano",
    groups: { republicki_organi: "Republički organi", lokalna_samouprava: "Lokalna samouprava", javna_preduzeca: "Javna preduzeća", javne_ustanove: "Javne ustanove", pravosudje_i_javna_ovlascenja: "Pravosuđe i javna ovlašćenja" },
  },
  en: {
    siteName: "Serbia Public Directory", tagline: "Every public institution in Serbia in one place: address, phone, opening hours, and which office serves your municipality.",
    searchPlaceholder: "Search an institution, service or town…", search: "Search", home: "Home",
    browseByRegion: "Browse by district", browseByCategory: "Browse by type of institution", mapHint: "Hover over a district or pick it on the map.",
    institutions: "institutions", municipalities: "municipalities and cities", inOkrug: "in district", forForeigners: "For foreigners", forForeignersLead: "Residence, work, tax number, company, certified translations: where each is handled.",
    allInstitutionsIn: "All institutions in", gradskeOpstine: "City municipalities", nationalOrgans: "National bodies serving this municipality", noData: "No data yet.",
    contactAndAddress: "Contact and address", address: "Address", phone: "Phone", email: "Email", website: "Website", hours: "Opening hours", radSaStrankama: "Public counter hours",
    jurisdiction: "Jurisdiction", coveredAreas: "This office serves", units: "Branches and departments", parentUnit: "Parent office", services: "Services",
    about: "About this institution", faq: "Frequently asked", related: "Related", otherUnits: "Other offices", alsoIn: "Also in", allInstitutions: "All institutions",
    isDataCorrect: "Is this information correct?", lastChecked: "Last checked", source: "Source", editData: "Suggest a correction", reportClosed: "Report closed / moved",
    reviewNote: "An editor reviews corrections before publishing.", verified: "Verified", unverified: "Unverified", autoVerified: "From the official register",
    call: "Call", directions: "Directions", ad: "Advertisement", sponsor: "Page sponsor", localPartner: "Local partner", sendRequest: "Send request",
    freeNoObligation: "Free, no obligation. Reply within 24h on working days.", nameLabel: "Full name", phoneLabel: "Phone", viber: "Contact me on Viber",
    consent: "I agree that my request is forwarded to one partner.", privacy: "Privacy policy", thanks: "Thank you! We will reply within 24h on working days.",
    thanksEdit: "Thank you, we will review it within 3 days.", yourEmailOptional: "Your email (optional, to notify you)", whatIsWrong: "What is wrong?", send: "Send",
    results: "Search results for", noResults: "No results. Try another name or town.", page: "page", founder: "Founded by", registry: "Registry data",
    becomePartner: "Advertising and partnerships", aboutSite: "About", terms: "Terms of use", dataSources: "Data sources", language: "Language",
    okrug: "District", city: "City", municipality: "Municipality", gradskaOpstina: "City municipality", seat: "Seat", inPlace: "in", showAll: "Show all", showing: "Showing",
    groups: { republicki_organi: "National bodies", lokalna_samouprava: "Local government", javna_preduzeca: "Public utilities and enterprises", javne_ustanove: "Public institutions", pravosudje_i_javna_ovlascenja: "Courts, notaries and enforcement" },
  },
  ru: {
    siteName: "Справочник учреждений Сербии", tagline: "Все государственные учреждения Сербии в одном месте: адрес, телефон, часы работы и какой орган отвечает за вашу общину.",
    searchPlaceholder: "Найти учреждение, услугу или город…", search: "Поиск", home: "Главная",
    browseByRegion: "По округам", browseByCategory: "По типу учреждения", mapHint: "Наведите на округ или выберите его на карте.",
    institutions: "учреждений", municipalities: "общин и городов", inOkrug: "в округе", forForeigners: "Для иностранцев", forForeignersLead: "ВНЖ, работа, налоговый номер, фирма, заверенный перевод: куда обращаться.",
    allInstitutionsIn: "Все учреждения в", gradskeOpstine: "Городские общины", nationalOrgans: "Республиканские органы для этой общины", noData: "Данных пока нет.",
    contactAndAddress: "Контакты и адрес", address: "Адрес", phone: "Телефон", email: "Эл. почта", website: "Сайт", hours: "Часы работы", radSaStrankama: "Приём граждан",
    jurisdiction: "Территория обслуживания", coveredAreas: "Это отделение обслуживает", units: "Отделения", parentUnit: "Головное отделение", services: "Услуги",
    about: "Об учреждении", faq: "Частые вопросы", related: "Связанное", otherUnits: "Другие отделения", alsoIn: "Также в", allInstitutions: "Все учреждения",
    isDataCorrect: "Данные верны?", lastChecked: "Последняя проверка", source: "Источник", editData: "Предложить исправление", reportClosed: "Сообщить: закрыто / переехало",
    reviewNote: "Исправления проверяет редактор перед публикацией.", verified: "Проверено", unverified: "Не подтверждено", autoVerified: "Из официального реестра",
    call: "Позвонить", directions: "Маршрут", ad: "Реклама", sponsor: "Спонсор страницы", localPartner: "Местный партнёр", sendRequest: "Отправить запрос",
    freeNoObligation: "Бесплатно, без обязательств. Ответ в течение 24 ч в рабочие дни.", nameLabel: "Имя и фамилия", phoneLabel: "Телефон", viber: "Свяжитесь со мной в Viber",
    consent: "Согласен(на) на передачу запроса одному партнёру.", privacy: "Политика конфиденциальности", thanks: "Спасибо! Ответим в течение 24 ч в рабочие дни.",
    thanksEdit: "Спасибо, проверим в течение 3 дней.", yourEmailOptional: "Ваш email (необязательно)", whatIsWrong: "Что неверно?", send: "Отправить",
    results: "Результаты поиска по", noResults: "Ничего не найдено. Попробуйте другое название или город.", page: "страница", founder: "Учредитель", registry: "Регистрационные данные",
    becomePartner: "Реклама и партнёрство", aboutSite: "О сайте", terms: "Условия использования", dataSources: "Источники данных", language: "Язык",
    okrug: "Округ", city: "Город", municipality: "Община", gradskaOpstina: "Городская община", seat: "Центр", inPlace: "в", showAll: "Показать все", showing: "Показано",
    groups: { republicki_organi: "Республиканские органы", lokalna_samouprava: "Местное самоуправление", javna_preduzeca: "Коммунальные и публичные предприятия", javne_ustanove: "Публичные учреждения", pravosudje_i_javna_ovlascenja: "Суды, нотариусы, исполнители" },
  },
  de: {
    siteName: "Behördenverzeichnis Serbien", tagline: "Alle öffentlichen Einrichtungen Serbiens an einem Ort: Adresse, Telefon, Öffnungszeiten und welche Stelle für Ihre Gemeinde zuständig ist.",
    searchPlaceholder: "Einrichtung, Leistung oder Ort suchen…", search: "Suche", home: "Start",
    browseByRegion: "Nach Bezirk", browseByCategory: "Nach Art der Einrichtung", mapHint: "Bezirk auf der Karte wählen oder darüberfahren.",
    institutions: "Einrichtungen", municipalities: "Gemeinden und Städte", inOkrug: "im Bezirk", forForeigners: "Für Ausländer", forForeignersLead: "Aufenthalt, Arbeit, Steuernummer, Firma, beglaubigte Übersetzungen: wo was erledigt wird.",
    allInstitutionsIn: "Alle Einrichtungen in", gradskeOpstine: "Stadtgemeinden", nationalOrgans: "Staatliche Stellen für diese Gemeinde", noData: "Noch keine Daten.",
    contactAndAddress: "Kontakt und Adresse", address: "Adresse", phone: "Telefon", email: "E-Mail", website: "Website", hours: "Öffnungszeiten", radSaStrankama: "Parteienverkehr",
    jurisdiction: "Zuständigkeit", coveredAreas: "Diese Stelle ist zuständig für", units: "Außenstellen und Abteilungen", parentUnit: "Übergeordnete Stelle", services: "Leistungen",
    about: "Über die Einrichtung", faq: "Häufige Fragen", related: "Verwandt", otherUnits: "Weitere Stellen", alsoIn: "Ebenfalls in", allInstitutions: "Alle Einrichtungen",
    isDataCorrect: "Stimmen die Angaben?", lastChecked: "Zuletzt geprüft", source: "Quelle", editData: "Korrektur vorschlagen", reportClosed: "Geschlossen / umgezogen melden",
    reviewNote: "Korrekturen prüft eine Redaktion vor der Veröffentlichung.", verified: "Geprüft", unverified: "Unbestätigt", autoVerified: "Aus dem amtlichen Register",
    call: "Anrufen", directions: "Route", ad: "Anzeige", sponsor: "Seitensponsor", localPartner: "Lokaler Partner", sendRequest: "Anfrage senden",
    freeNoObligation: "Kostenlos und unverbindlich. Antwort werktags innerhalb von 24 h.", nameLabel: "Vor- und Nachname", phoneLabel: "Telefon", viber: "Kontakt über Viber",
    consent: "Ich stimme zu, dass meine Anfrage an einen Partner weitergeleitet wird.", privacy: "Datenschutz", thanks: "Danke! Wir melden uns werktags innerhalb von 24 h.",
    thanksEdit: "Danke, wir prüfen das innerhalb von 3 Tagen.", yourEmailOptional: "Ihre E-Mail (optional)", whatIsWrong: "Was stimmt nicht?", send: "Senden",
    results: "Suchergebnisse für", noResults: "Keine Treffer. Anderen Namen oder Ort versuchen.", page: "Seite", founder: "Träger", registry: "Registerdaten",
    becomePartner: "Werbung und Partnerschaften", aboutSite: "Über uns", terms: "Nutzungsbedingungen", dataSources: "Datenquellen", language: "Sprache",
    okrug: "Bezirk", city: "Stadt", municipality: "Gemeinde", gradskaOpstina: "Stadtgemeinde", seat: "Sitz", inPlace: "in", showAll: "Alle anzeigen", showing: "Angezeigt",
    groups: { republicki_organi: "Staatliche Organe", lokalna_samouprava: "Kommunalverwaltung", javna_preduzeca: "Kommunale und öffentliche Unternehmen", javne_ustanove: "Öffentliche Einrichtungen", pravosudje_i_javna_ovlascenja: "Justiz, Notare, Vollstrecker" },
  },
} as const;

export type Dict = (typeof dict)["sr"];
export function t(locale: Locale): Dict { return (dict[locale] ?? dict.sr) as Dict; }
export function isLocale(x: string | undefined): x is Locale { return !!x && (LOCALES as readonly string[]).includes(x); }
/** Split a URL path into locale + rest. '/en/nis' → ['en', ['nis']]; '/nis' → ['sr', ['nis']] */
export function splitLocale(segments: string[]): [Locale, string[]] {
  if (segments.length && isLocale(segments[0])) return [segments[0] as Locale, segments.slice(1)];
  return [DEFAULT_LOCALE, segments];
}
export function href(locale: Locale, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? p : `/${locale}${p === "/" ? "" : p}`;
}
