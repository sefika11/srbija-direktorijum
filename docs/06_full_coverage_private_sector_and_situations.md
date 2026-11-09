# 06 · Full coverage, the private layer, and "explain your situation"

Brief from Nick, 2026-11-10 (Day 6), in his words: *everyone should know how to apply for a credit or debit card
and which bank; law agencies and other institutions by city, municipality and region; sections for work permits
and visas; visuals for every segment; how to open companies; explain your situation and get the right context.
All municipalities, full coverage, a phenomenal scrape of every vital institution, private and public, as the
"gdedaidem" company. Every fire department, special clinic, every special department in each municipality,
every police station. Cheapest model agents for this segment. The most centralised and most used directory
in Serbia.*

## 1. Brand

**Gde da idem?** ("Where do I go?"). Checked 2026-11-10: `gdedaidem.rs`, `gdedaidem.co.rs`, `gdedaidem.com`,
`.net` and `.info` are all unregistered. Register `.rs` + `.com` on a personal account (RNIDS via any accredited
registrar for .rs). The site name, brand mark (G) and metadata are already renamed in the code; the Vercel env
`NEXT_PUBLIC_SITE_NAME` should read `Gde da idem?`.

## 2. Public coverage to 100 % (the "every station" layer)

| Segment | Source of truth | Method | Model |
|---|---|---|---|
| Police directorates and every station (PU/PS, saobraćajna, granična) | mup.gov.rs PU pages (client-rendered) | headless fetch + `crawler.extract` | haiku |
| Fire and rescue (vatrogasno-spasilačke jedinice) | MUP Sektor za vanredne situacije pages + municipal sites | crawler + extract | haiku |
| Every health institution: domovi zdravlja with ambulante, bolnice, klinike, instituti, zavodi, apoteke | Plan mreže zdravstvenih ustanova (Sl. glasnik), RFZO list of contracted institutions, Batut registry, institution sites | structured import + crawler | haiku |
| Municipal departments (odeljenja, odseci, službe, šalteri) with what each one handles and requires | 145 municipal sites (sistematizacija, "uprava" pages) | `crawler.discover` + `crawler.extract` with a department schema | haiku |
| Courts, prosecutors, prisons (KPZ) with visiting rules | sudovi.gov.rs, uzs.gov.rs (visiting hours, documents) | structured import + crawler | haiku |
| Schools, kindergartens, universities with enrolment contacts | MPNTR registers + sites | import + crawler | haiku |
| Utilities (JKP) with emergency numbers | KJS register (have) + sites | crawler | haiku |

Rule from Nick, kept: every pull/parse/scan agent runs on `claude-haiku-5-5` (or sonnet when haiku fails a
schema); Fable only for judgment. The crawler already does this.

## 3. The private layer (new org group `privatne_usluge`)

Per municipality, the institutions people actually need next to the public ones, with a "what is required" block:

| Vertical | Register / source | What we show | Monetization |
|---|---|---|---|
| Banks and branches (credit card, debit card, account for foreigners) | NBS list of licensed banks; each bank's branch locator; card requirements from bank sites | branches by city, requirements per product (ID, income proof, residence for foreigners), comparison table | affiliate / sponsor (bank) |
| Law offices | Advokatska komora Srbije imenik (public register) | by city, areas of practice | lead vertical `advokat` (exists) |
| Accountants | APR by šifra delatnosti 6920 | by city | lead vertical `knjigovodstvo` (exists) |
| Sworn translators | Ministarstvo pravde registar sudskih tumača | by language and city | lead vertical `sudski-prevodilac` (exists) |
| Driving schools | ABS (Agencija za bezbednost saobraćaja) registar auto-škola | by city, categories | new vertical `auto-skola` |
| Private clinics, labs, dentists | Registar privatne prakse (Ministarstvo zdravlja), komore | by city, services | lead vertical `privatna-zdravstvena-ustanova` (exists) |
| Insurance (AO, health, travel) | NBS list of insurers + agents | by product | vertical `osiguranje-vozila` (exists) + affiliate |
| Real-estate agencies | APR 6831 + Ministarstvo trgovine registar posrednika | by city | vertical `agencija-za-nekretnine` (exists) |
| Private kindergartens, schools | MPNTR verified list | by city | vertical `privatni-vrtic` (exists) |

Private entries carry `is_private = true`, show a neutral "privatno" chip, never mix into the public counts, and
are the inventory that pays for the public layer (doc 02 rules unchanged: the public answer always comes first).

## 4. "Explain your situation" without a model

A guided questionnaire (`/moja-situacija`): who are you (citizen, foreigner with/without residence, business),
where (municipality picker), what do you need (the 16 life situations from doc 05 §6, then the concrete task).
Each path resolves deterministically to: the guide, the serving public office in that municipality, the private
providers in that municipality, and the documents list. Pure data lookups, zero API cost, and every answered
path is a shareable URL (`/moja-situacija?ko=stranac&gde=nis&sta=boravak`). Logged like search for the backlog.

## 5. Visuals for every segment

One illustration system, not stock photos: a line-and-fill icon per institution type (90+), a cover motif per
life situation (16), per-municipality map thumbnails (static SVG from the shapes we already have), and the
tricolour band as the signature. Delivered as inline SVG in `components/icons.tsx` plus generated static SVGs
for municipality cards.

## 6. Order of work (Week 2)

1. Domain + rename live (Day 6). 2. Police + fire + health full import (Day 7–8, haiku crawler). 3. Municipal
departments crawl, top 30 cities (Day 8–9). 4. Private layer: banks, law offices, translators, driving schools
(Day 9–10). 5. Situation wizard (Day 10). 6. Situation hub pages and remaining guides (Day 11+).
