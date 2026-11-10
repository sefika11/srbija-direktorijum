# 08 · Vital data per municipality and how it earns

Status 2026-11-10. Companion to docs/06 (coverage) and docs/07 (design system). This is the data roadmap written from the
money side: what every municipality page must hold so that residents come back, and which of those rows a business will pay to be on.

## 1. What the directory holds today (local = Neon)

| Layer | Rows | Gap that matters |
|---|---|---|
| Local government (organ JLS, uprave, mesne zajednice) | 4,800 | local tax office (LPA) exists for 2 of 145 municipalities; matičar for 0 |
| Public enterprises | 1,187 | 795 still typed as generic `javno-preduzece`; only 49 waterworks, 38 heating, 3 power-distribution branches have their own type |
| Public institutions (schools, kindergartens, DZ, hospitals, culture, sport) | 4,400 | 1,280 primary + 505 secondary schools and 170 kindergartens carry no phone for most entries |
| Justice and public powers (courts, notaries, bailiffs) | 700 | court interpreters: type exists, 0 rows |
| Private layer (clinics, dentists, lawyers, banks, insurers, vets, driving schools, realty, accountants) | 2,200 | no geodetic firms, architects, movers, private kindergartens, nursing homes, vehicle inspection, embassies |
| Contact completeness | 19,235 locations | phones on 31 %, hours on 21 %, website on 12 % |

Monetisation tables already exist: `partners`, `sponsorships`, `ad_slots`/`creatives`/`ad_events`, `leads`, `lead_verticals` (11), `vertical_triggers`, `affiliate_programs`/`affiliate_links`. Missing: a way for a business to claim its row and pay for placement.

## 2. The vital set: every municipality page must answer these in one screen

Ordered by how often a resident needs it. Each is a data layer with a source and a monetisation hook.

| # | Need | Rows we need per municipality | Source | Who pays |
|---|---|---|---|---|
| 1 | Emergency and faults: police 192, fire 193, ambulance 194, roadside 1987, power outage, water outage, heating, gas | fault phone per utility branch (EDS ogranak, vodovod, toplana, gas distributor) | EDS site, JKP sites (municipal crawler), reclassified KJS rows | nobody; this is the retention layer |
| 2 | Local administration: opštinska uprava, matičar, LPA (local tax), građevinska dozvola counter, inspekcije | department phone + hours per uprava | municipal sites (haiku crawler, already built) | nobody; retention + SEO ("porez na imovinu Čačak") |
| 3 | Health: DZ, dežurna apoteka, hitna pomoć, bolnica, private clinics, dentists, labs, vets | phones + hours for all; "dežurna" flag | RFZO, DZ sites, OSM, chain sites (Beo-lab, MediGroup…) | private clinics/labs/dentists: lead form + featured card |
| 4 | Children: public kindergartens (upis), private kindergartens, primary and secondary schools, music/sport schools | phones, websites, enrolment pages | MPNTR open data, registry of verified private PU | private kindergartens, tutoring, language schools: leads + featured |
| 5 | Money and paper: banks, insurers, notaries, lawyers, accountants, court interpreters, geodetic firms, architects | branch phones + hours; licence numbers | NBS, MoJ interpreter registry, RGZ geodetic registry, chambers | all of them: this is the core lead-gen inventory (verticals 1-9) |
| 6 | Vehicles: MUP registration counters, tehnički pregled, driving schools, insurers, car-sharing of plates (tablice) | authorised inspection stations list (ABS/MUP) | ABS/MUP list, OSM | inspection stations + insurers: leads ("registracija vozila" guide) |
| 7 | Home: cadastre service, utilities connection, movers, real-estate agencies, property tax | RGZ offices (have), movers (none) | OSM, APR by šifra delatnosti 49.42 | movers, agencies: leads |
| 8 | Elderly and social: CSR (have), nursing homes, home care, PIO counters | licensed providers | MRZS licence list | private nursing homes: leads + featured |
| 9 | Foreigners: police foreigners desk, embassies/consulates, translators, relocation | embassies list | MFA diplomatic list | relocation, translators, lawyers: leads |
| 10 | Everyday: post, pharmacies, markets (pijace), parking, public transport, libraries, sports centres, waste schedule | have most; waste/parking rules per JLS missing | JKP sites | parking apps/affiliates minor |

## 3. Monetisation mechanics to add (data model)

1. **Claim your listing** (`listing_claims`): a business submits name, role, email, phone for an `organizations.id`; we verify by email domain or a call; a verified claim unlocks editing hours/photos/description and shows the "Potvrđeno od institucije" chip. Free. It is the funnel.
2. **Featured placement** (`featured_listings`): one paid slot per (municipality × type), e.g. "advokat × Novi Sad". The featured card sits first in that list with a `Sponzor` label, never above the information the reader asked for (docs/05 rules). Price ladder per docs/05 §7 (institution page / city / vertical nationwide).
3. **Leads** (exists): the `LeadForm` on type hubs and guides routes to the partner covering that municipality (`partner_coverage`). Price per inquiry.
4. **Affiliates** (exists): insurance comparison, bank account opening, eSIM/telecom for newcomers, moving quotes. Only on the matching guide, labelled.
5. **Data products**: the completeness view per municipality (`v_jls_completeness`) doubles as the sales pitch to a municipality or chamber ("31 % of your institutions are reachable by phone; we fix that") and as a paid API/CSV later.

## 4. Order of work (2026-11-10 → )

1. Reclassify the 795 generic public enterprises by name (vodovod, toplana, čistoća, parking, pijace, pogrebne, zelenilo, prevoz, gas, putevi, stanovanje) — SQL only.
2. New types + tables (patch 015): `ambasada`, `konzulat`, `geodetska-agencija`, `dom-za-stare`, `privatni-vrtic`, `tehnicki-pregled`, `projektni-biro`, `agencija-za-selidbe`, `privatna-laboratorija`; `listing_claims`, `featured_listings`, `v_jls_completeness`.
3. Registry imports via cheap agents → `db/imports/*.json` → `importers.jobs.load_orgs_json`: court interpreters (MoJ), embassies (MFA), geodetic firms (RGZ), nursing homes (MRZS), private kindergartens (MPNTR), inspection stations (ABS/MUP).
4. Municipality page: "Vitalno" block at the top (emergency, faults, uprava, LPA, matičar, DZ, police station, schools) with `tel:` links, built from the rows above.
5. Phones for schools and kindergartens (1,955 rows): MPNTR open data carries phones; load via `apply_contacts`.
6. Claim flow UI on organisation pages (form → `listing_claims`), admin review in the existing verification queue.
7. Featured cards in type hubs and municipality lists.

## 5. Rules

- Official registries first; OSM fills gaps; commercial directories are never copied.
- Every imported row carries `provenance` with the registry URL and date.
- Paid placement is always labelled and never displaces the reader's answer.
- No outcome promises in partner copy (memory rule); size by the completeness numbers, not by traffic we do not have yet.

## 6. Results of the first pass (2026-11-10, local; Neon load running)

| Layer | Rows loaded | Contacts | Source | Note |
|---|---|---|---|---|
| Court interpreters (`sudski-prevodilac`) | 937 people, 34 languages | 99 % phones, 0 emails | MoJ national xlsx | home addresses and family data stripped before load; register is for contacting, not visiting |
| Embassies + consulates | 74 + 51 | 100 % phones, 98 % emails, 42 sites, 115 with hours | MFA diplomatic list PDF (27 Oct 2026) | international organisations excluded |
| Geodetic organisations | 607 (585 private) | none: the RGZ register publishes no contacts | RGZ licence register API | needs a web-enrichment pass |
| Homes for the elderly | 196 licensed (20 public) | 79 phones, 204 emails, capacity on all | MRZS licence xlsx, expired licences dropped | websites missing |
| Private kindergartens | 514 | none in either official source | MPNTR open data + verified-PU PDF | 109 PDF-only rows may duplicate open-data rows under another name |
| Public enterprises reclassified | 73 more (gas 11, roads 37, housing 8, …) | | name rules, patch 016 | 722 still generic (agencies, funds, councils, bankrupt firms) |
| Vehicle inspection stations | 0 | | no official public list at ABS/MUP; commercial directories not copied | ask MUP/ABS or read the MUP portal manually |

Municipality page now opens with the **Vitalno** block: emergency numbers, faults (water, power, heating, gas, waste, parking), administration and tax, health, social and work, police stations, school counts, each with a `tel:` link where we have the number and "broj još nije unet" where we do not. The phone gap on JKP and uprava rows is the next crawl target (haiku, municipal sites).

### Phone pass on vital utilities and administrations (2026-11-10)
247 organisations without a phone in the 40 largest municipalities → 3 agent passes (2 haiku, 1 sonnet second pass, official sites only): 199 now have a phone, 197 a website, 72 an e-mail, 31 hours. Unresolved (37): Kragujevac departments (portal blocks direct URLs), Aleksinac (Cloudflare), eight Pančevo village JKPs, Niš objedinjena naplata / parking / Ei toplana, five Novi Sad agencies, a handful of small JKPs with no site. Targets and raw answers are in `db/targets/` and `db/contacts/vital_phones_*`. Next: the same pass for the remaining 105 municipalities (about 400 organisations) once the first 40 are checked.

### Phone pass, remaining 105 municipalities (2026-11-10)
250 rows → 4 haiku agents (no sub-agents, official portals only): 171 now have a phone, 169 a website, 94 e-mails, 41 hours. Vital-type coverage on Neon after both passes: opštinske uprave 106/116, gradske uprave 68/77, domovi zdravlja 116/145, vodovod 37/50, toplane 27/39, čistoća 110/223 (village JKPs have no web presence), gas 6/16. 136 of 145 municipalities now have at least one vital phone. Portals down or hostile: Žitorađa, Despotovac, Kuršumlija, Ljubovija, Ljig, Aleksinac, Kragujevac departments. Not yet covered because they are founded by the Republic, not the municipality: centri za socijalni rad (0/140) and EPS branches (0/6) → next batch keyed by primary location.

### Visa layer (2026-11-10)
`countries` (patch 017) holds both directions of the regime per country from the MFA; `/vize` lists all countries by regime for entering Serbia, `/vize/<country>` shows the passport, both regimes, what to bring, the country's missions in Serbia (from the embassy rows) and the official MFA page. Monetisation hooks: translators, relocation, lawyers and insurance leads on the pages of countries with a visa requirement; affiliate for travel insurance on the outbound panel. Loader: `importers.jobs.load_countries`.

### Social work centres and power branches (2026-11-10)
146 rows (founded by the Republic, so missed by the municipality-keyed export) → 2 haiku agents: 48 centres now have a phone, 61 a website, 39 an institutional e-mail (<town>.csr@minrzs.gov.rs pattern). No central phone book exists: zavodsz.gov.rs only publishes a map layer without phones. Unresolved: about 60 centres with no site on the csr<town>.rs patterns, 8 Kosovo centres, and the 2 Kosovo power entities. The ministry e-mail pattern can be applied to every centre as a fallback contact.

### Brand networks and exact visa instructions (2026-11-10, in progress)
- `importers/jobs/load_chain_json.py`: one organisation per brand, one location per branch, duplicates by normalised address skipped, OSM branches kept. Agents are reading the official branch locators of every NBS-licensed bank, every insurer and the telecom operators (new type `telekom-prodavnica`).
- `countries.from_rs_instructions` + `site_settings.visa_to_serbia` (patch 018): where to apply, forms, appointment, documents, fee, processing, validity, source. Rendered as numbered steps on `/vize/<country>`; inbound general procedure (visa C/D) shown on every visa-required country page.

### Visa instructions, first load (2026-11-10)
114 visa-required/eVisa/eTA countries: 92 have instructions (US, UK, Canada, India, Korea verified on the foreign state's own pages; 74 rely on the MFA page + portal URL without documents or fee), 22 null (MFA gives no procedure or the page is empty; KP/YE/PS not applicable). Inbound general procedure loaded (visa C €90, D €50, exemptions for Schengen/UK/EU/US visa and permit holders, eID portal since 2025). A second agent is reading the embassy pages for the 74 thin rows + 22 nulls. Flags to review: Dominica (MFA text says 21 days visa-free vs regime flag), Zambia (contradictory MFA text), Saudi Arabia (no readable official procedure).

## Results · 2026-11-10 evening

- Bank network on Neon: 36 brand organisations → 9 duplicate brands merged (Raiffeisen ×3, AIK ×2, Poštanska štedionica ×2, API, NLB, UniCredit, Intesa, Bank of China) and 125 duplicate branches collapsed by normalised address within a brand (`db/fixes/fix_019_merge_brand_dupes.sql`, idempotent, slug-based). 2,042 bank branches, 141 municipalities.
- The local Postgres data directory died with the old scratchpad: **Neon is the only database now**; run importers with `DATABASE_URL` set to the unpooled Neon DSN plus keepalives.
- Courts and prosecutors: 262 organisations (all basic courts, higher, commercial, misdemeanour, appellate courts and public prosecutor's offices) have no street address; 273 have no phone. Export in `db/targets/courts_missing_contacts_2026-11-10.json`; an official-source contact pass is in progress → `db/contacts/courts_contacts_2026-11-10.json`, applied with `apply_contacts.py`.
- Search synonyms: sahrana / pogreb / groblje → `jkp-pogrebne-usluge`.

## Live-user audit · 2026-11-10 night — findings and status

Fixed in this pass: place matching confused *banka/banja* and *platim/plana*; "usa"/"sad" found no country; "poštanska štedionica kragujevac" returned only the town; EN/RU/DE queries ("court", "kindergarten", "суд") matched nothing (now 109 multilingual synonyms + translated type names shown in EN/RU/DE); brand/place filter counts were global; phone palette rows were all red; no skip link and `<html lang>` was always Serbian; the globe bundle shipped the 13k-dot file for nothing.

Open data gaps a user hits (primary seat without address AND phone): mesne zajednice 3,886 (low value), **osnovne škole 1,280, srednje škole 505, predškolske ustanove 171, opšte bolnice 148, biblioteke 148, muzeji 129, kulturni centri 233, fakulteti 97, centri za socijalni rad 94 (phones), domovi zdravlja 63 (phones)**. Official sources to use next: MPNTR/ data.gov.rs "Adresar ustanova obrazovanja" (schools + kindergartens), RFZO/Ministry of Health institution list (hospitals, health centres), Ministry of Culture register (libraries, museums), university sites (faculties).
Also: no official list of vehicle inspection stations (type exists, 0 rows); no "upis u vrtić" guide; several MFA visa texts truncated at source (BY contaminated).

## Registry contact pass · 2026-11-10 night

Method: `db/targets/<group>_missing_*.json` (our rows lacking address/phone) → agent matches an OFFICIAL bulk register by normalised name + municipality → `db/contacts/<group>_contacts_*.json` → `apply_contacts.py --targets …` (creates the seat location when an organisation had none; parses "Street n, 11000 City").
- **Education** (MPNTR open data, opendata.mpn.gov.rs `srv/{Oo,So,PO}`): 1,716 / 1,956 addresses — osnovne škole 1,111/1,280, srednje 444/505, predškolske 161/171. The ministry publishes no phones, e-mails or websites; 240 unmatched (74 same-named schools in one municipality, the rest name drift). Phones would need ~1,700 school sites — not done.
- **Culture** (TOS register of local tourist organisations): 119 / 139 tourist organisations with address + phone + e-mail. Libraries (148), culture centres (233), museums (129), sports centres (92): **no official bulk register found** (NBS "Vodič kroz biblioteke" not online; APR holds the register without an open extract). Route left: per-municipality pass over municipal sites.
- **Health**: see summary file when the agent reports.
- **Health** (Ministry of Health register page "Zdravstvene ustanove" by okrug + 14 CSR sites): 188 / 352 — domovi zdravlja 58/69, opšte bolnice 93/148, zavodi za javno zdravlje 23/25, centri za socijalni rad 14/110 (no official CSR directory exists; zavodsz.gov.rs map has coordinates only). 42 research institutes that were typed as hospitals retyped to `ustanova`; two mesne zajednice named "…bolnica" retyped. Remaining unmatched: Kosovo institutions and 96 CSRs.
- **Applied to Neon** (2026-11-10 night): education 1,623 addresses (93 matched rows skipped — organisation had no location row and its municipality name did not resolve), culture 119 seats (121 phones, 119 e-mails, 112 websites), health 186 seats (225 phones, 170 websites). Primary seats still without a street address: osnovne škole 242 (of 1,280), srednje 73 (of 505), predškolske 18, opšte bolnice 15, domovi zdravlja 11, turističke organizacije 20. Phones for schools remain the big gap (registry has none).
