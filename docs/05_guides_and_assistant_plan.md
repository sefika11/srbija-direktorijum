# 05 · Guides layer and the directory assistant

Written 2026-11-09 after the Day 2 brief: the directory is not only "where is the office" but "how do I get
this done" for every citizen and every newcomer, and a person should be able to type a question and be taken
to the right page. This document fixes the scope, the data model, the monetization rules and the build order.

## 1. What a guide is

A **guide** (`vodič`) answers one life task in one page, e.g. *Lična karta – prvo izdavanje*, *Pasoš*,
*Vozačka dozvola – prva*, *Zdravstvena knjižica (RFZO) – zaposleni / nezaposleni / strani državljani*,
*Prijava boravišta*, *Privremeni boravak za strance*, *Upis u matičnu knjigu rođenih*, *Dečiji dodatak*,
*Novčana socijalna pomoć*, *Registracija vozila*, *Otvaranje firme (APR)*, *PIB za strance*, *Overa kod
javnog beležnika*, *Izvod iz katastra*, *Prijava na NSZ*. Each guide is structured, not prose:

| Block | Content | Source of truth |
|---|---|---|
| Ko može | eligibility in two or three bullets | statute + institution page |
| Gde se ide | the **org type** that handles it (e.g. `policijska-uprava`), resolved to the *location serving the reader's municipality* via `locations_serving()` | our DB |
| Šta poneti | document checklist, with variants (state ID vs. foreigner's ID, first issue vs. renewal) | institution page |
| Koliko košta | administrative fee (republička taksa) + any form cost, with the date we checked it | official fee schedule (Zakon o republičkim administrativnim taksama, tarifni brojevi) |
| Koliko traje | legal deadline + typical wait | statute + user reports |
| Koraci | numbered steps, each pointing at an institution type or an eUprava link | institution page |
| Česta pitanja | 3–6 FAQ pairs (these become FAQ rich results) | editorial |
| Za strance | the differences for non-citizens, in all four languages | editorial |

The schema already has `services`, `service_categories` and location-level service overrides (schema.sql
§ services). Guides are **services with a `guide_md` body plus structured JSON** (`eligibility`, `documents[]`,
`fees[]`, `steps[]`, `faq[]`), each tied to one or more `org_types`. The page URL is
`/vodic/{slug}` and the localized variants `/en/vodic/{slug}` etc. A guide page renders the generic content,
then **personalises** it with a municipality picker ("Vaša opština: Niš ▾"): the "Gde se ide" block then shows
the concrete location (address, phone, hours) that serves that municipality, from `locations_serving`.

## 2. Monetization that never costs the reader

Rules carried over from doc 02, applied to guides:

- The procedure itself (steps, documents, fees, office) is always above any commercial element.
- Vertical triggers fire on the guide's `lead_verticals`: driving licence → auto-škole (driving schools),
  residence permit → licensed agencies and sworn translators, company registration → accountants, health
  insurance → private clinics and supplementary insurance, cadastre → geodetic bureaus, notary → law offices.
  Each is a **lead form** ("Zatražite ponudu") or a **sponsored card**, labelled "Sponzor" and never styled as a step.
- Affiliate: only where the product is the natural next step and the reader is told it is affiliate (e.g.
  travel insurance for visa applicants, mobile plans for newcomers). No affiliate inside the fee block.
- Sponsorship is sold per guide × okrug (`sponsorships.specificity`), so a Niš driving school sponsors the
  driving-licence guide for Nišavski okrug only.

## 3. The assistant ("Pitajte adresar") — DROPPED 2026-11-09

> Decision (Nick, Day 4): no LLM-backed chat on the public site. Every visitor question would spend
> API credits with no cap on abuse, and the value is reproducible without a model. Replaced by
> **question-aware search** (§3a). The design below is kept for reference only.

### 3a. Question-aware search (replacement, zero per-use cost)

- One search box everywhere; as you type, instant suggestions from the database (guides, institution
  types, places, institutions), keyboard-navigable, debounced, cached per prefix at the edge.
- The results page parses the query: a **place** (any municipality/city/district name, with Serbian case
  endings) and an **intent** (guide titles and synonyms: "pasoš", "lična", "vozačka", "knjižica",
  "katastar", institution type names). If both match, the page opens with a *best answer* card: the guide
  with its "Where to go" block already personalised to that municipality (the serving office, phone, hours).
- Results are grouped: Vodiči · Vrste institucija · Mesta · Institucije; each group links to its hub.
- Synonyms live in a small table (`search_synonyms`: term → target kind/slug) maintained by hand from the
  search log; the log of zero-result queries is the editorial backlog, exactly as the assistant's would have been.
- Cost: Postgres only (pg_trgm + tsvector already in place). No API keys, no rate-limit worries.



A chat box on every page: *"Gde vadim pasoš u Kragujevcu?"*, *"How do I register my address as a foreigner
in Novi Sad?"*. It is a **retrieval agent over our own data**, not an open chatbot:

- Model: `claude-haiku-5-5` via the Anthropic SDK, server-side route `/api/asistent` (streaming), with a hard
  system prompt: answer only from tool results, always cite the directory page, never invent phone numbers or
  fees, reply in the user's language, keep answers under ~120 words plus links.
- Tools (all read-only SQL through the existing `lib/db.ts` helpers): `search_directory(q, locale)`,
  `locations_for(org_type, municipality)`, `guide(slug)`, `municipality_lookup(name)`.
- Grounding: every answer ends with 1–3 cards (institution or guide) rendered from tool output, so the
  user clicks through to the page with the full data. The text is the summary; the cards are the truth.
- Cost control: cache the top 500 question shapes per locale for 24 h; rate-limit by IP; log questions
  (no PII) because unanswered questions are the editorial backlog for new guides.
- Trust: a visible "Odgovor je generisan iz podataka adresara; proverite na stranici institucije" line and a
  thumbs up/down that feeds `edit_suggestions`.
- Keys: a personal Anthropic API key in Vercel env `ANTHROPIC_API_KEY` (never in the repo).

## 4. Build order

| Day | Deliverable |
|---|---|
| Day 3 | `services` seed for the first 12 guides (sr), guide page template with municipality picker, 3 guides fully written (lična karta, pasoš, zdravstvena knjižica); fee schedule checked against the official tariff |
| Day 4 | Assistant route + chat UI (collapsed bar on mobile), tools wired to `lib/db.ts`, 4-language replies, question logging |
| Day 5 | 9 more guides incl. the newcomer set (boravak, PIB, prevodioci) in sr + en; ru/de for the newcomer set |
| Week 2 | Per-municipality fee/hours overrides from the crawler; sponsor and lead-form inventory per guide; AdSense review |

## 5. Editorial standard

Every fee, deadline and document list carries `checked_at` and a source URL. A guide is published only when
its "Gde se ide" resolves for all 145 municipalities (coverage complete for its org type) or clearly states
the exceptions. Guides are written in plain Serbian first (B1 level), then translated; the four languages
share one structured JSON so the facts cannot drift.
