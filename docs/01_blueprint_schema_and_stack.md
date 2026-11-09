# Srbija Direktorijum javne uprave
## Blueprint, Part 1: Data model and tech stack

Version 0.1, 2026-11-09. Companion files: `db/schema.sql` (runnable DDL) and `db/seed_core.sql` (territorial hierarchy + taxonomy). Parts 3 to 5 of the brief (ad placement, scraping, page template) come next and build on the names defined here.

---

## 0. Decisions locked in this document

| Decision | Choice | One-line reason |
|---|---|---|
| Core entities | Territorial unit, Organization, Location, Service, plus Coverage between location and territory | Users search for a *branch* that *serves their municipality*; an org-only model cannot answer that |
| Taxonomy groups | The brief's 4 groups plus a 5th: courts, prosecutors, notaries, enforcement agents, court translators | Highest commercial intent on the site; they do not belong under "javne ustanove" |
| Script | Latin canonical, Cyrillic stored and shown as toggle; Cyrillic URLs only in phase 2 with hreflang | Serbian search demand is overwhelmingly Latin; two URL sets at launch halves crawl budget |
| Identifiers | MB, PIB, JBKJS as de-duplication keys across sources | Names change, registry numbers do not |
| Stack | Next.js (App Router, React Server Components) + PostgreSQL on Neon + Drizzle ORM, on Vercel; Directus as admin UI over the same DB | ISR with tag-based revalidation is exactly the "edit one record, regenerate one page" workflow a crowdsourced directory needs |
| Render strategy | Pre-render hubs (about 3k pages) at build; ISR for the long tail; on-demand revalidate on approved edits | Build stays under 5 minutes forever, pages are still static HTML for ads and Core Web Vitals |
| Analytics | Self-hosted Plausible or Umami, daily export into `page_stats_daily` | No cookie banner needed for analytics; traffic drives verification priority and sponsor pricing |

---

## 1. The Serbian administrative taxonomy we model

### 1.1 Territorial hierarchy

```
Republika Srbija
├── AP Vojvodina ──────────────┐
│                              ├── Upravni okrug (29) + Grad Beograd as okrug-level row = 30 rows
└── (central Serbia, direct)──┘        └── JLS: grad (28 incl. Beograd) | opština (117) = 145 administered
                                             └── Gradska opština (27: Beograd 17, Niš 5, Novi Sad 2, Požarevac, Vranje, Užice)
                                                   └── Naselje (~6,150; loaded lazily)
AP Kosovo i Metohija: 5 okruga listed, flagged in_kosovo, no children
```

Nuances the schema handles explicitly:

- **Grad vs opština** is the `jls_kind` enum on a single `jls` level. Both are jedinice lokalne samouprave with identical organ structure (skupština, predsednik/gradonačelnik, uprava). The difference matters for naming ("Gradska uprava" vs "Opštinska uprava") and for SEO titles, not for structure.
- **Gradska opština** (Novi Beograd, Medijana, Petrovaradin) is a sub-JLS level with its own uprava, its own matičar for some matters, and its own URL. Inđija is a JLS; Novi Beograd is not. This is the distinction the brief asked for.
- **Grad Beograd** is sui generis: a JLS that is also its own okrug. It is stored twice on purpose: an `okrug` row "Grad Beograd" (ISO RS-00) with one `jls` child "Beograd" (`is_capital = true`). Every JLS therefore has an okrug parent and the ltree path logic has no special cases.
- **Okrug seat** (`okrug_seat = true`) is where republic organs put their filijale. A user in Babušnica is served by Poreska uprava Filijala Pirot. The seat flag gives the fallback when explicit coverage is missing.
- **Kosovo**: inserted as flagged rows so codes stay complete (ISO list, RZS šifarnik) but hidden from navigation and sitemaps.
- **ltree `path`** (`1.3.27.112`) makes "everything inside Nišavski okrug" a single indexed `@>` query. It powers sponsor targeting (buy a whole okrug), hub pages, and the coverage fallback.

### 1.2 Organization versus Location versus Coverage

This is the central modeling decision.

| Layer | Table | Example | What it carries |
|---|---|---|---|
| Legal entity / organ | `organizations` | Poreska uprava; JKP Naissus Niš; Opštinska uprava Babušnica | MB/PIB/JBKJS, founder, parent org, type, website, editorial description |
| Physical unit | `locations` | Filijala Niš; Ispostava Doljevac; Policijska stanica Medijana; Sudska jedinica Babušnica | address, geo, hours, phones, šalteri, verification |
| Who it serves | `location_coverage` | Filijala Pirot → Pirot, Babušnica, Bela Palanka, Dimitrovgrad | territory, optionally per service |

Why not one table: a republic organ like RGZ has 1 organization row and about 170 location rows; a JKP has 1 and 1. Hours and phones belong to the building, registry numbers to the entity. Coverage is the only way to answer "which katastar handles my parcel if I live in Gadžin Han" without hard-coding.

Rule of thumb for data entry: **if it has its own PIB it is an organization; if it has its own door it is a location.**

### 1.3 The five organization groups

`org_types."group"` enum. Each org type carries defaults that drive page generation (`one_per_jls`, `national_network`, default jurisdiction) and monetization (`lead_vertical_id`).

| Group | Examples (seeded `org_types.slug`) | Generation pattern |
|---|---|---|
| `republicki_organi` | poreska-uprava, apr, pio-fond, rfzo, rgz-katastar, mup-policijska-uprava, nsz, uprava-za-trezor, ministarstvo, upravni-okrug | One org, many locations; `national_network = true`; locations mostly at okrug seats |
| `lokalna_samouprava` | gradska-uprava, opstinska-uprava, uprava-gradske-opstine, lokalna-poreska-administracija, maticna-sluzba, sekretarijat, mesna-zajednica | One org per JLS (`one_per_jls`), 1 to 5 locations each |
| `javna_preduzeca` | jkp-vodovod, jkp-cistoca, jkp-parking-servis, jkp-toplana, jkp-zelenilo, jkp-pijace, jkp-pogrebne-usluge, jkp-gradski-prevoz, jp-urbanizam, jp-posta-srbije, eps-distribucija | One org per JLS for JKP (founder = JLS); Pošta and EPS are national networks |
| `javne_ustanove` | dom-zdravlja, opsta-bolnica, apoteka, zavod-za-javno-zdravlje, centar-za-socijalni-rad, predskolska-ustanova, osnovna-skola, srednja-skola, narodna-biblioteka, kulturni-centar, muzej, sportski-centar, turisticka-organizacija | One per JLS for DZ, CSR, PU; many per JLS for schools |
| `pravosudje_i_javna_ovlascenja` | osnovni-sud, visi-sud, privredni-sud, prekrsajni-sud, apelacioni-sud, upravni-sud, osnovno/vise-javno-tuzilastvo, javni-beleznik, javni-izvrsitelj, sudski-prevodilac | Courts per okrug with sudske jedinice as child locations; notaries and izvršitelji are private persons with public authority, one org row each, listed per JLS |

Matična služba is technically a department of the opštinska uprava. It is seeded as its own org type anyway because "matičar Niš" is a top-volume query and users think of it as a place. The same pragmatism applies to lokalna poreska administracija.

### 1.4 Services: the third axis

`services` (usluge) are what people actually need: izvod iz matične knjige rođenih, registracija vozila, upis u katastar, otvaranje preduzetničke radnje, prijava prebivališta. They connect to org types through `org_type_services` and can be overridden per location (`location_services`: this šalter, this local fee).

Services are where monetization attaches: a `lead_vertical_id` on a service beats the one on the org type. Registracija vozila → osiguranje; upis u katastar → geometar / advokat; otvaranje firme → knjigovodstvo.

Each service row stores `required_documents` and `fees` as JSON so the page can render a checklist and a payment table (račun 840-..., model 97, poziv na broj) without a rigid schema that breaks the first time a taksa has two tiers.

---

## 2. Schema walkthrough

Full DDL is in `db/schema.sql` (124 statements, parsed against the PostgreSQL 17 grammar). This section explains the parts that are not obvious from the column names.

### 2.1 Entity relationship overview

```
territorial_units ◄──────────────┐ founder_unit_id
   ▲ parent_id (ltree path)      │
   │                             │
   │ territorial_unit_id   organizations ──► org_types ──► lead_verticals
   │                         ▲ org_id            ▲ org_type_id
   │                         │                   │
   └──────────────── locations ◄── location_coverage ──► services ──► service_categories
                       │  ▲                                  ▲
        ┌──────────────┼──┴─ parent_location_id              │ org_type_services
        ▼              ▼                                      │ location_services
  location_contacts  opening_hours / opening_exceptions / departments

quality:    provenance, edit_suggestions, link_checks, change_log, data_sources, admin_users
seo:        seo_overrides, redirects, page_stats_daily
money:      partners, partner_coverage, ad_slots, creatives, sponsorships,
            vertical_triggers, affiliate_programs, affiliate_links, leads, ad_events (partitioned)
```

### 2.2 Worked example: Poreska uprava, Filijala Niš

```
organizations
  slug = 'poreska-uprava', org_type = poreska-uprava, jurisdiction = republika,
  parent_org = (Ministarstvo finansija), jbkjs = (5-digit code from the Trezor KJS list), website = purs.gov.rs

locations
  org = poreska-uprava, slug = 'filijala-nis', unit_kind = filijala,
  territorial_unit = Niš › Medijana (gradska_opstina), street = 'Nikole Pašića', street_number = '24'

location_contacts   (phone +38118..., label 'Centrala'), (phone ..., label 'Kontakt centar', is_primary)
opening_hours       day 1..5, rad_sa_strankama 08:00-15:00; radno_vreme 07:30-15:30
location_coverage   → Niš, Aleksinac, Doljevac, Gadžin Han, Merošina, Ražanj, Svrljig (service_id NULL = all)
locations (child)   slug = 'ispostava-aleksinac', parent_location = filijala-nis, coverage → Aleksinac
```

URL: `/poreska-uprava/filijala-nis`. The JLS hub `/aleksinac` lists "Poreska uprava → Ispostava Aleksinac (matična filijala: Niš)" via `locations_serving(aleksinac_id, 'poreska-uprava')`.

### 2.3 Worked example: a user in Babušnica

`locations_serving(babusnica_id, 'rgz-katastar')`:

1. Explicit coverage rows for Babušnica → returns "Služba za katastar nepokretnosti Babušnica" if RGZ has one there (it does; most JLS have a katastar office).
2. If none, locations physically inside Babušnica's ltree subtree.
3. If none, the application falls back to the okrug seat (Pirot) and labels it "Nadležna filijala".

This three-step fallback means the site is useful on day one with partial coverage data, and gets more precise as crowdsourced corrections land.

### 2.4 Identifiers and de-duplication

Three registry numbers, all optional, all uniquely indexed where present:

| Code | Digits | Who issues it | Why we store it |
|---|---|---|---|
| MB (matični broj) | 8 | RZS via APR | Stable identity of any legal entity |
| PIB | 9 | Poreska uprava | Stable; present on every official site footer |
| JBKJS | 5 | Uprava za trezor | Present for every public-money user; the Trezor "Spisak korisnika javnih sredstava" is a monthly spreadsheet listing roughly 11,000 entities with type and parent. It is the seed for the whole `organizations` table. |

Importer rule: match on JBKJS, then PIB, then MB, then (name + founder JLS) fuzzy via `pg_trgm`. Never create a second org row when any registry key already exists.

### 2.5 Latin and Cyrillic

- Every named entity has `name_lat` (required) and `name_cyr` (optional). Slugs are built from Latin with `slugify_sr()`, which maps đ → dj before unaccenting, because that is what people type ("indjija", not "india").
- `cyr_to_lat()` is deterministic and in the schema; Latin → Cyrillic is not (lj/nj/dž digraphs) and lives in app code with an exception dictionary. The seed ships `lat_to_cyr_place()` which is safe for toponyms only.
- Search vectors use the `simple` dictionary over unaccented Latin plus raw Cyrillic, so "poreska nis" and "пореска ниш" both hit. Typo tolerance via trigram index on `f_unaccent(name_lat)`.
- SEO: Latin URLs are canonical. Cyrillic page variants (phase 2) go under `/sr-cyrl/...` with `hreflang="sr-Cyrl"` / `sr-Latn`, never as a client-side toggle that Google cannot index.

### 2.6 Verification and crowdsourcing

Every public record has a `verification` state (`unverified → auto_verified → human_verified`, or `disputed` / `stale`), `verified_at`, and `last_seen_at` (last crawler confirmation).

- `provenance` records which source produced which field and when, with the raw fragment, so a disputed phone number can be traced.
- `edit_suggestions` stores the "Prijavi grešku / Izmeni podatke" submission as a JSON patch (`{"street": {"old": ..., "new": ...}}`) plus optional evidence URL. Nothing is applied automatically; an editor approves in the admin, the patch is applied, `change_log` records before/after, and the page's cache tag is revalidated.
- `link_checks` runs weekly over every official URL: status code, redirect target, content hash to catch soft-404s (municipal sites love redirecting dead pages to the homepage). Three consecutive failures create an `edit_suggestion` of kind `closed` for review.
- `v_verification_queue` orders locations by `(views_30d + 1) × days_since_verified` so editor time goes to pages people actually visit.

### 2.7 Monetization model

Four revenue mechanisms, one schema:

| Mechanism | Tables | How it resolves on a page |
|---|---|---|
| Fixed-fee local sponsorship | `partners`, `creatives`, `ad_slots`, `sponsorships` | `pick_sponsorship(slot, tu, org_type, org, service, location)` returns the most specific active sponsorship; territorial targeting matches any ancestor via ltree, so a sponsor can buy one location, one city, or a whole okrug. `is_exclusive` enforces "one sponsor per slot per target" which is what makes the fixed fee sellable. |
| B2B lead forms | `lead_verticals`, `vertical_triggers`, `partner_coverage`, `leads` | Vertical resolved service › org type › category. Lead stored with page context and consent version; routed to a partner whose `partner_coverage` subtree contains the page's territory; `dedupe_hash` blocks double submissions; `purge_after` auto-expires PII after 180 days (ZZPL). |
| Affiliate | `affiliate_programs`, `affiliate_links` | Inline disclosed links attached to a service or org type (osiguranje on registracija vozila, knjigovodstveni softver on APR). |
| Programmatic (AdSense → Ezoic later) | `ad_slots.adsense_unit` | Every sponsor slot has a programmatic fallback unit so unsold inventory is never blank. |

`ad_events` is append-only, partitioned monthly, PII-free (rotating daily session hash, no cookie). It exists so sponsor invoices can say "12,430 views, 212 clicks" and so lead buyers can be shown form view → submit rates.

---

## 3. URL and page architecture (programmatic SEO)

### 3.1 Templates and URL patterns

| Template | URL | Approx. count | Pre-render | Index |
|---|---|---|---|---|
| home | `/` | 1 | build | yes |
| okrug_hub | `/okrug/nisavski` | 25 | build | yes |
| jls_hub | `/nis`, `/babusnica` | 145 | build | yes |
| gradska_opstina_hub | `/beograd/novi-beograd`, `/nis/medijana` | 27 | build | yes |
| org_type_hub | `/poreska-uprava`, `/dom-zdravlja`, `/jkp-vodovod` | ~50 | build | yes |
| org_hub (local orgs) | `/jkp-vodovod/naissus-nis`, `/opstinska-uprava/babusnica` | ~2,500 | build (top 1k) / ISR | yes |
| location | `/poreska-uprava/filijala-nis`, `/mup-policijska-uprava/ps-medijana` | 8,000 to 15,000 | ISR | yes when verified or has ≥ 3 data fields; otherwise noindex |
| service | `/usluge/izvod-iz-maticne-knjige-rodjenih` | 150 to 300 | build | yes |
| service_jls | `/usluge/izvod-iz-maticne-knjige-rodjenih/nis` | up to 300 × 145 = 43,500 | ISR | **only where local data differs** (office, hours, local fee); else canonical → service page |
| search | `/pretraga?q=` | 1 | dynamic | no |

Org-type-first URLs for locations match how Serbians search: "poreska uprava niš", "katastar niš", "mup niš lična karta". JLS pages are the city hubs that route users to the right one.

JLS slugs are globally unique (partial unique index) and reserved words (`usluge`, `okrug`, `pretraga`, `o-nama`, `partneri`, `api`, `admin`) are checked at insert time in the importer.

### 3.2 Avoiding the "doorway page" penalty

Google's scaled-content and doorway policies are the single biggest risk to a programmatic directory. Rules baked into the data model:

1. A `service_jls` page is generated only if at least one of: a `location_services` override, a `local_fee_rsd`, or a distinct serving location exists for that JLS. Otherwise the URL 301s to the service page with a JLS anchor.
2. A `location` page is `noindex` until it has address + at least one contact or hours. Thin rows still render (for users) but do not enter sitemaps.
3. Every org type and service carries hand-written `description_md` and `faq_md` reused across its pages; the per-page part is the data. This satisfies AdSense "sufficient publisher content" and gives each page a meaningful body.
4. `seo_overrides` lets an editor hand-tune title/description/canonical/noindex per path without a deploy.
5. `redirects` guarantees slug changes never 404.

### 3.3 Structured data

Per location page: `GovernmentOffice` (a schema.org subtype of LocalBusiness) with `address`, `geo`, `telephone`, `openingHoursSpecification`, `parentOrganization` (→ `GovernmentOrganization`), plus `BreadcrumbList` and `FAQPage` from `faq_md`. Service pages: `HowTo` with `supply` from `required_documents` and `estimatedCost` from `fees`.

### 3.4 Sitemaps

Sitemap index generated from the DB: one sitemap per template per 40,000 URLs, `lastmod` from `updated_at`, excluding `noindex` paths and `in_kosovo` subtrees.

---

## 4. Tech stack

### 4.1 Options considered

| | Next.js App Router + ISR | Astro SSG/SSR | WordPress + Page Generator Pro |
|---|---|---|---|
| 50k+ pages | ISR: build only hubs, generate rest on demand, regenerate one page on edit | Full SSG rebuild 20 to 40 min at 50k pages; SSR mode works but no per-page revalidation primitive | Thousands of posts in MySQL; slow admin, plugin stack, caching layer mandatory |
| Ad-heavy pages | Server Components ship near-zero JS; ad scripts are the only client JS; reserved slot sizes | Same strength (islands); no built-in on-demand regen | Themes + plugins routinely push LCP > 3s; CLS from ad plugins is chronic |
| Crowdsourced edits | Approve edit → `revalidateTag('location:123')` → one page rebuilt in seconds | Needs a full rebuild or SSR + external cache purge | Direct DB edit, instant, but no provenance/review workflow without custom code |
| Relational data | Postgres via Drizzle; the schema above is first-class | Same | Fighting the post/meta model; ACF relations do not scale to coverage tables |
| Security surface | Static pages, one admin app | Static | The most attacked CMS on the web; a directory with lead forms is a target |
| Cost at 500k views/month | Vercel Pro ~$20 + Neon ~$20 to $70 | Cloudflare Pages ~$0 to $20 | $30 to $80 managed WP hosting plus plugin licences |

**Choice: Next.js.** Astro is the runner-up and would win for a purely static dataset with monthly refreshes; this project's edit-driven regeneration tips it.

### 4.2 The stack

| Layer | Pick | Notes |
|---|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript | Server Components for all directory pages; client components only for search box, map, edit form, ad containers |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | Fast, consistent, small CSS |
| Database | PostgreSQL 16 on Neon (serverless, branching) | Branching gives a free staging DB per PR; scale-to-zero while traffic is low. Supabase is the alternative if built-in auth/storage is preferred |
| ORM / migrations | Drizzle ORM + drizzle-kit | Schema-as-code in TS mirrors `schema.sql`; type-safe queries in Server Components |
| Admin UI | Directus (self-hosted on Railway/Hetzner) pointed at the same Postgres | Instant CRUD, roles, review queue for `edit_suggestions`, no custom admin to build. Flows call the Next.js revalidation webhook on save |
| Search | pg_trgm + tsvector now; Meilisearch when the index passes ~50k docs or instant-search UX is wanted | Both scripts indexed in one document |
| Hosting | Vercel (Frankfurt region `fra1`) | 15 to 25 ms to Serbia. Migrate to Hetzner + Coolify only if Vercel bandwidth/ISR bills exceed ~$100/mo |
| Maps | Static map image (self-hosted OSM static tiles or Mapbox Static free tier) + "Uputstva" deep link to Google Maps | An interactive map on every page costs 300 KB of JS and hurts ad viewability |
| Storage | Cloudflare R2 or Vercel Blob | Logos and sponsor creatives only |
| Analytics | Plausible or Umami (self-hosted, cookieless) | Daily export to `page_stats_daily` via API |
| Ads | Google AdSense (manual units, Auto Ads off) → Ezoic at ~10k sessions/month | Mediavine/Raptive require majority tier-1 English traffic and will not accept a Serbian site; Ezoic will |
| Consent | Google-certified CMP (e.g. Cookiebot free tier or Funding Choices) | Serbia is not EEA, but the Serbian diaspora in DE/AT/CH is a meaningful share of traffic and AdSense requires a TCF CMP for EEA users |
| Jobs | Vercel Cron (or GitHub Actions) for link checks, KJS re-import, lead purge, partition creation | All idempotent SQL + small TS scripts |
| Email | Resend | Lead routing to partners, "your correction was applied" notices |

### 4.3 Rendering and caching strategy

```
Build (≈ 3,000 pages, < 5 min):   home, okrug hubs, JLS hubs, GO hubs, org-type hubs,
                                  service pages, top-1,000 org hubs by views
ISR (everything else):            revalidate = 7 days; dynamicParams = true
On-demand:                        admin approves edit → POST /api/revalidate { tags }
                                  tags: location:{id}, org:{id}, jls:{slug}, service:{slug}, type:{slug}
```

Every data fetch in a Server Component is wrapped with cache tags, so one approved phone-number fix invalidates exactly the location page, its org hub, and its JLS hub.

### 4.4 Why this fits a high-ad-density strategy

1. **Zero layout shift.** Each `ad_slots` row has width/height; the component renders a fixed-size container before the ad script runs. CLS is the Core Web Vital that ad-heavy sites fail, and it is a ranking factor.
2. **One third-party script.** Server Components mean the page's own JS is tiny; AdSense is loaded with `next/script` `strategy="afterInteractive"`, below-fold units lazy-load on intersection.
3. **Static HTML with dynamic sponsors.** The sponsorship pick runs at render time inside ISR, so sponsor changes propagate on the next revalidation (or instantly via tag). No client-side ad server call, no flicker.
4. **Content density is in the data model.** The AdSense policy risk for directories is "low value content". `description_md`, `faq_md`, services with documents and fees, and the coverage explanation give every page real body text that is also useful.
5. **Sponsor slots fall back to programmatic.** Unsold inventory still earns.

### 4.5 Cost at launch and at scale

| Stage | Monthly cost | Notes |
|---|---|---|
| Build / soft launch | ~$0 to $25 | Vercel Hobby or Pro, Neon free tier, Directus on a $5 VPS |
| 100k views/month | ~$45 to $70 | Vercel Pro $20, Neon Launch ~$20, VPS $5, Resend free, CMP free tier |
| 1M views/month | ~$150 to $250 on Vercel, ~$60 to $90 on Hetzner | Decision point to move rendering to Hetzner + Coolify; DB can stay on Neon |

### 4.6 Repository layout

```
srbija-direktorijum/
├── apps/web/                 Next.js app
│   ├── app/                  routes: (hubs)/[jls], [orgType]/[locationSlug], usluge/[service]/[jls]
│   ├── components/           ads/ (SlotContainer, SponsorCard, LeadForm), directory/, seo/
│   ├── lib/db/               drizzle schema (generated from db/schema.sql), queries with cache tags
│   └── lib/seo/              title/description templates, JSON-LD builders, sitemap
├── apps/admin/               Directus config (snapshot), flows for revalidation + lead routing
├── db/
│   ├── schema.sql            canonical DDL (this document's companion)
│   ├── seed_core.sql         territory + taxonomy
│   └── migrations/           drizzle-kit output after the initial import
├── importers/                Python: trezor_kjs.py, rzs_codes.py, municipal_crawler/ (Part 4)
├── jobs/                     link_check.ts, purge_leads.ts, create_partitions.sql
└── docs/                     this blueprint, Part 2 (ads + template), Part 3 (scraping)
```

---

## 5. Honest economics note

Serbian display RPMs are low (roughly $0.5 to $2 per 1,000 views on AdSense). At 500k monthly views, programmatic alone is a few hundred dollars. The schema is built so that **sponsorships and leads carry the business**: one exclusive sponsor at €50 to €150 per month on each of the 50 largest JLS hubs, plus accountant and lawyer leads at 1,500 to 2,500 RSD each, is the realistic path to a meaningful monthly figure. Treat AdSense as the floor, not the plan.

---

## 6. What this unlocks next

Immediate, in order:

1. Create a Neon project, run `db/schema.sql` then `db/seed_core.sql`, confirm counts (30 okruga, 145 JLS, 27 GO).
2. Download the Trezor "Spisak korisnika javnih sredstava" spreadsheet and write `importers/trezor_kjs.py` to populate `organizations` (this is the universe; Part 4 covers it).
3. Hand-write `description_md` + `faq_md` for the 15 highest-traffic org types (poreska uprava, katastar, MUP, PIO, RFZO, NSZ, APR, opštinska uprava, matična služba, dom zdravlja, CSR, osnovni sud, vodovod, parking servis, javni beležnik).
4. Register the domain (.rs) and set up the Next.js skeleton with the three core templates: JLS hub, org-type hub, location.

Part 2 of the blueprint will cover the ad and lead-form placement map and the location page template (brief items 3 and 5); Part 3 the sourcing and scraping methodology (item 4).
