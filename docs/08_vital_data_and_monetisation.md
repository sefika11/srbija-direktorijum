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

## 9. Registry batch of 2026-11-10: 23 new institution types

Brief: `db/targets/NEW_TYPES_BRIEF_2026-11-10.md` (official sources only; a register behind a login or CAPTCHA, or one
that only answers single-record searches, is recorded as NOT OBTAINED and never replaced by a commercial directory).
Raw agent files: `db/imports/*_2026-11-10.json` with a `*_summary.md` per group. Types and names:
`db/seed_patch_021_registry_types.sql`.

Pipeline (repeatable):
```bash
python -m importers.jobs.prepare_registry_batch 2026-11-10           # dry run: resolution, duplicates, matches
python -m importers.jobs.prepare_registry_batch 2026-11-10 --write   # db/imports/clean_<date>/, db/contacts/*, retype list
python -m importers.jobs.prepare_registry_batch 2026-11-10 --retype  # existing institutions get the more specific type
python -m importers.jobs.load_orgs_json db/imports/clean_2026-11-10/<file>.json --source <code>
python -m importers.jobs.apply_contacts db/contacts/<file>_contacts_2026-11-10.json --source institution_site
```

| Type | Source | Rows loaded |
|---|---|---|
| sudski-vestak | Ministry of Justice register of court experts | 6,605 |
| menjacnica | National Bank of Serbia, exchange locations | 2,993 |
| medijator | Ministry of Justice register of mediators | 1,042 |
| hotel | Ministry of Tourism, categorised accommodation (Oct 2026) | 434 |
| procenitelj-nepokretnosti | Ministry of Finance directory of licensed appraisers | 285 |
| agencija-za-zaposljavanje | Ministry of Labour, employment and temporary-work agencies | 248 |
| usluga-socijalne-zastite | Ministry of Labour, licensed social care providers | 237 |
| stecajni-upravnik | Bankruptcy Supervision Agency directory | 227 |
| skola-za-odrasle | Qualifications Agency register of adult-education organisers + ministry open data | 182 |
| carinarnica | Customs Administration (units and working hours; no addresses published) | 151 |
| revizorska-kuca | Chamber of Authorised Auditors register | 119 |
| privatna-skola | Ministry of Education open data (private founders) | 98 |
| privatne visokoškolske (univerzitet / fakultet / visoka-skola) | Ministry of Education open data | 71 new |
| muzicka-skola | Ministry of Education open data | 54 re-typed + 9 |
| granicni-prelaz | Customs Administration list of crossings | 63 |
| gerontoloski-centar | Ministry of Labour list of state homes | 23 re-typed + 11 |
| arhiv | State Archives of Serbia network | 31 re-typed + 6 |
| dom-ucenika | Ministry of Education list (June 2024) | 29 re-typed + 6 |
| specijalna-bolnica | Health network plan (RFZO) + own sites | 22 re-typed + 11 |
| klinika-institut | Health network plan (RFZO) + own sites | 25 re-typed + 2 |
| zavod-za-zastitu-spomenika | Republic Institute for the Protection of Monuments | 11 re-typed + 2 |
| lizing, platna-institucija, penzijski-fond | National Bank of Serbia registers | 12, 11, 4 |
| privatna-laboratorija | Accreditation Body register (ISO 15189), private only | 10 |

Not obtained (no official public listing): authorised vehicle inspection stations, civil registry offices, design
firms, moving companies (not a licensed activity), private health institutions (register is search-only), licensed
travel agencies (register behind a CAPTCHA). Pharmacies were not reloaded: the RFZO list is already imported.

Rules that came out of it:
- **Natural persons** (experts, mediators, administrators, appraisers): name, town, phone, e-mail and field as the
  register publishes them; the street address is not republished.
- **Public institutions are matched before loading.** Same municipality and same normalised name means the existing
  organisation is re-typed and gets the contacts; it is never inserted twice. Rows that match two existing
  organisations are skipped (the database already holds a duplicate to clean up).
- **Private schools are never matched by name** (public schools share the names).
- Known weak spots: experts' register dates mostly from 2017; pupil dormitory list from 2024; border crossings from
  the Customs list, not the Interior Ministry's; customs units and crossings in tiny settlements did not resolve to a
  municipality (25 rows dropped).

Files kept in the repo for this batch: the raw agent files (`db/imports/*_2026-11-10.json`), the cleaned files that were
actually loaded (`db/imports/clean_2026-11-10/`), the contacts applied to matched institutions (`db/contacts/`) and the
retype list. Exception: for court experts and property appraisers only the cleaned file is kept, because the raw
register export carries street addresses of natural persons. Re-running `prepare_registry_batch` after the load needs
`--before "2026-11-10 18:20+00"` so rows are not matched against their own insert.

**Paged type pages.** A type with more than 800 institutions (court experts, local communities, exchange offices, primary
schools, mediators) is not listed on one page: `/<type>?q=<name>&mesto=<municipality>&oblast=<field>&strana=<n>`,
60 rows a page, filtered and counted in SQL (`countOrgsOfType`, `getOrgsOfTypePaged`, `getPlacesOfType`,
`getFacetValues` in `apps/web/lib/db.ts`). The form is a plain GET form, so it works without JavaScript and every
result page has its own address. The field filter is configured per type in `TYPE_FACET` (`components/pages.tsx`);
today only court experts have one (the main field of expertise, values with at least 30 experts).

## 10. Units of institutions and the municipal contact pass (2026-11-11)

**Units (buildings and branch schools).** The directory held one row per institution: 171 state preschool
institutions, 1,247 primary schools. The kindergarten in your street and the branch school in the village were missing.
Source: Ministry of Education open data, `https://opendata.mpn.gov.rs/srv/{PO,Oo,So}/PodaciOLOPJSON` (one row per
building) joined to `kontaktPodaciJSON` (registration number). Job: `importers/jobs/load_education_units.py`
(dry run by default, `--write` to apply, idempotent).
- Institutions are matched by registration number; private ones (we had no number) by name + municipality, and their
  number is filled in. Institutions in the registry that we do not hold are listed in
  `db/imports/education_unmatched_<date>.json` (77 on the first run), not created.
- **The file repeats the seat's street on every row.** A unit therefore gets its name and municipality (a branch
  school also its village, when the name gives it) and NO street. Their own addresses must come from each
  institution's site (next scrape: 171 preschool institutions list their buildings on one page each).
- On the site a unit page shows the seat's contact, said as such; the institution page lists every unit; the type page
  shows the unit count beside the institution count; the search finds a unit by its own name.

**City municipalities.** `importers/jobs/assign_city_municipality.py` moves locations filed under a city to the city
municipality from coordinates (OSM boundaries), settlement name or address tail. 3,123 of 13,534 moved on the first
run; re-run after every import. Undo file in `db/fixes/`.

**Municipal contact pass (agents, official sites only).** Targets per municipality in
`db/targets/muni_2026-11-11/chunks/` (161 chunks, 9,206 institutions lacking an address or a phone; private practices
without a website of their own are left out, there is no official source for them). One Sonnet agent per chunk reads
the municipality's site, its Informator o radu and the institutions' own sites; output per chunk in
`db/contacts/muni_2026-11-11/`. Before applying, a clean-up drops private mobiles and private e-mails of community
office presidents and any address without a number; then `apply_contacts.py --source institution_site --confidence 0.75`.
- Pilot (14 chunks): 451 applied. Wave 2 (40 chunks): 1,496 applied. Yield about 37% of rows; best where the city
  publishes list pages (Čačak 111/139, Leskovac 102/120), worst in Belgrade (state bodies, firms without sites, and a
  fetch rate limit with 16 agents at once; wave 3 runs eight at a time and tells agents to fall back to curl).
- Cost: about 120,000 tokens per chunk.

**No free bulk source for every private business.** The business register (APR) publishes only the financial
statements API on data.gov.rs; its company search is single-record. Routes for the private sector: sector registers
(done for banks, insurers, exchange offices, auditors, hotels, private schools and kindergartens, and more), OSM,
institutions' own sites, owners adding and claiming their listing, or buying the register extract from APR.

**Results of the 2026-11-11 passes** (all applied to Neon):
- Municipal contact pass, all 161 chunks plus retries: pilot 451 + wave 2 1,496 + wave 3 1,862 rows applied. About 22.6M Sonnet tokens in total.
  Near-zero yield where the municipal site was down, blocked or lists community offices only by the president's name
  (Gadžin Han, Knić, Prijepolje, Preševo, Lučani, Bujanovac, Lebane and others), and in Belgrade for firms in
  bankruptcy, private adult-education providers and state bodies without a contact page.
- Preschool units from the institutions' own sites (59 chunks, 2,147 units): 694 units got a street, 489 a phone,
  99 institutions a seat contact; 6.7M tokens. Not found: preschool groups hosted in schools and village halls (the
  sites do not list them with an address) and institutions without a working official site.
- Coverage after everything: 40,841 locations; 20,364 with a street address, 23,222 with a phone, 6,656 with hours.
  Before the passes: 36,186 locations; 17,285 / 19,472 / 6,220. Units: 4,609, of which 694 have a street.
- Working files: targets in `db/targets/muni_2026-11-11/chunks/` and `db/targets/pu_units_2026-11-11/`, agent output
  in `db/contacts/muni_2026-11-11/` and `db/contacts/pu_units_2026-11-11/` (the cleaned `applied/` files are derived).

## 11. Reach pass: hours, phone, address and website in one sweep (2026-11-11)

Goal set by Nick: every institution has a phone, a street address, a website and opening hours. Measured first, then one
pass over everything that has an official place to read it from. Tools in `tools/reach/` (`build_targets.py`, `clean.py`,
`merge_map_duplicates.py`), targets in `db/targets/reach_2026-11-11/`, agent output in `db/contacts/reach_2026-11-11/`
(`_clean.json` is what was applied, `_summaries.json` holds each agent's notes, `_extra_all.json` the official branches
we do not hold yet).

- Three kinds of agent (167 Sonnet agents, 8 at a time, 18.2M tokens, 35 minutes): `net-*` one national system or chain
  per agent, the official branch list matched to our locations (70 files, 6,559 locations); `reg-*` one official national
  register per agent (10 files); `site-*` institutions whose own site we know, 24 per agent (87 files, 2,082 institutions).
- Applied: 1,961 locations touched; 1,146 hours, 765 street addresses, 417 phones, 464 e-mails, 17 websites.
- What official sources do not publish (so it stays empty, nothing is inferred): Benu, Dr.Max, Lilly and Vegafarma answer
  automated requests with a bot check (about 1,050 pharmacy branches); mup.gov.rs gives a phone list only, no addresses or
  hours for stations; the treasury lists branches by name only; the hotel list and the geodetic register carry no phone,
  hours or site; the ministry of education has no bulk source of school phones or sites; of 2,082 known sites only 448
  yielded a missing field (most publish no office hours, about one in ten is dead or parked).
- Duplicates: banks and insurers were loaded twice, from OpenStreetMap and from each company's own branch list. 787 map
  rows were merged into their official twin (status `merged`, `moved_to_location_id`; within 30 m, within 150 m unless the
  map row names another street, or same street and number). Undo file: `db/fixes/merged_map_rows_2026-11-11.json`.
- Coverage after the pass, institutions only (30,334 locations; natural persons are counted apart): hours 6,808 (22%),
  street address 18,274 (60%), phone 13,394 (44%), website known 11,335 (37%). Persons (9,720): phone 9,497, no street
  by rule.
- Still open: 3,459 institutions with no known site and no register (small pharmacies, public enterprises, local bodies,
  private practices), 3,888 community offices, village school and kindergarten units (the page shows the seat's contact),
  exchange offices and geodetic firms (registers give an address only), 102 official branches to import.
- Hours parser (`importers/common/normalize.py: parse_hours`) kept only the first range of a text, so "pon-pet 07-20; sub 07-14"
  lost Saturday and "Tu,Th 08-11" was stored as Monday to Friday. It now reads every part (weekend parts, day lists, map-data
  days, closed days), keeps the main hours when a later part is a sub-service ("rad sa novcem"), and parses nothing when
  parts contradict each other or name no weekday (seasons, departments): the text is shown instead. `tools/reach/reparse_hours.py`
  re-read 2,708 stored locations whose rows were exactly the old parser's output (2,361 gained days, 281 corrected, 66 now
  show their text); before-state in `db/fixes/reparsed_hours_2026-11-11_*.json`.
- Follow-up the same day: 400 local bodies (assemblies, councils, mayors, ombudsmen) took the official site of their
  municipality's administration (`_municipal_sites.json`); 87 official branches from `_extra_all.json` were imported with
  `tools/reach/import_branches.py` (31 fire units, 19 clinics, 15 fund counters, 15 pharmacy branches, 7 bank counters;
  ids in `db/fixes/imported_branches_2026-11-11_141017.json`). Short emergency numbers (193) are not stored as contacts.

## 12. Beyond official pages: registers, the open map, and hours by rule (2026-11-11, afternoon)

Nick's direction: accuracy first; hours may also come from maps, or from strong assumptions that are backed up. What was done:
- Vojvodina's provincial school register (skolevojvodine.vojvodina.gov.rs, 568 entries, `tools/reach/vojvodina_schools.py`):
  478 matched to ours; 213 phones, 308 websites, 21 streets. 90 unmatched kept in `_vojvodina_schools_unmatched.json`.
- OpenStreetMap opening hours (`tools/reach/osm_hours.py`, Overpass extract in `.cache/osm/opening_hours_rs.json`): 134 locations,
  matched only where kind, street, number and municipality agree on both sides and (for traded kinds) the names share a word.
  Google Maps is not used: its pages are behind bot checks and its terms forbid scraping; the Places API would need Nick's key.
- Hours by rule (`tools/reach/rule_hours.py`): 203 state-administration locations 07:30-15:30 (Government decision of 1 May 2014),
  150 professional fire units 00-24. Every such row carries `opening_hours.note` and the page prints one line saying where
  the hours come from (`po propisu`, `dežurna služba`, `OpenStreetMap`). Nothing is assumed for hotels, police counters,
  municipal offices or schools.
- Register scout (one Sonnet agent, /tmp/scout/registers.md copied into this section's working notes): 12 verified sources.
  Imported: 417 technical inspection stations (ABS list of 23.07.2024; hours only where days and times are both published),
  149 theatres and cinemas (new types `pozoriste`, `bioskop`) and 77 other culture institutions from the Ministry of Culture
  open data, plus contacts for 383 culture institutions we held; branch networks of NSZ, PIO and the tax administration
  (`_branches_*.json`, via `tools/reach/import_branches.py`; units in Kosovo are skipped, no municipality to place them in).
- Not imported: APR's open company and NGO files (name, municipality and activity code, no address or phone).
- Loader lesson: `load_orgs_json` derives the slug from type + name + town cut at 80 characters, so long operator names with the
  street at the end collapse into one row. Put the distinguishing part first.

## 13. Search-led pass on Haiku, with a page check (2026-11-11, evening)

- Targets: 6,041 institutions with no known website (`tools/reach/build_search_targets.py`, 152 files by municipality, 40 each).
  Left out: natural persons, types read from national lists, local bodies (they took the municipality's site), exchange
  offices, geodetic firms, small pharmacies that already had phone and address.
- Agents: 3 files finished on Sonnet before Nick asked for cheaper agents; the other 149 ran on Haiku (24.4M tokens, 80 min).
  Each agent searches, opens the institution's own site or its founder's official page, and writes what it read.
- Accuracy is enforced after the fact by `tools/reach/verify_pages.py`, not by trusting the model: the cited page is fetched
  again and a value is kept only when it is on that page; the page must name the institution (a distinctive word, or name
  plus town); on directory pages a value must stand next to that institution's name; unreadable pages drop the row.
  Of 1,722 agent rows 1,586 kept something; dropped: 128 phones not on the page, 150 phones and 115 addresses not next to
  the name, 24 rows whose page did not name the institution, 20 unreadable pages.
- Applied (`db/contacts/search_2026-11-11/_clean.json`): 1,543 institutions; 1,381 websites, 759 phones, 409 street addresses,
  168 hours, 1,016 e-mails. About 4,300 of the 6,041 have no findable official page (search returns only directories).
- Source domains were reviewed: everything cited for three or more institutions is a municipal or provincial site or the
  institution's own; `aleksinac.net` (a local portal an agent took for the municipality's site) is blocked in `clean.py`.
- Branch networks imported the same evening: NSZ 156, PIO 151, tax administration 85 (ids in `db/fixes/imported_branches_2026-11-11_15*.json`);
  the tax units carry the labelled state-administration hours.
- Coverage at the end of 2026-11-11, institutions only (31,459 locations of 18,557 institutions; natural persons apart):
  street address 19,652 (62%), phone 15,314 (48%), website known 14,904 (47%), hours 7,915 (25%).
  Morning of the same day: 30,334 locations; 60% / 44% / 37% / 22%.
