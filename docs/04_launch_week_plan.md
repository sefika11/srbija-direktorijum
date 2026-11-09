# Launch week plan (Mon 9 Nov – Sun 15 Nov 2026)

Goal for the week: the directory live on its own domain with real phones and hours for the biggest cities, the
monetization plumbing in place, and the first sponsor conversations started. Money itself arrives later: AdSense
approval takes one to three weeks after applying, and a sponsorship needs a sales call. Realistic first revenue is
weeks 3 to 6; this week makes it possible.

Legend: **Nick** = needs your account, card or decision. **Claude** = done here. Everything else is joint.

## Day 1, Monday: accounts and a live skeleton

| # | Step | Who | Done when |
|---|---|---|---|
| 1 | Pick the name (nadlezno.rs is free) and register the domain at an RNIDS registrar | Nick | registrar confirmation |
| 2 | Create a Neon project, region AWS Frankfurt, Postgres 16; copy the **direct** connection string | Nick | string pasted here |
| 3 | Restore `db/dumps/srbdir_2026-11-09_kjs.sql.gz` to Neon; verify 145 JLS / 10,162 organizations | Claude | counts match |
| 4 | Put the project in git and on GitHub (private repo) | Claude, Nick authorises | `main` on GitHub |
| 5 | Create the Vercel project from the repo, root `apps/web`, env `DATABASE_URL` (Neon **pooled** string) + `NEXT_PUBLIC_SITE_URL` | Nick (login), Claude (config) | `*.vercel.app` serving the home page |
| 6 | Smoke test on the deployed URL: home, a hub, an institution page, search, `/en` | Claude | all 200, no console errors |
| 7 | Point the domain at Vercel (CNAME) once registered | Nick | HTTPS on the domain |

Accounts to create today, all free tiers: Neon, GitHub (if not already), Vercel (you have one), plus the domain.
Optional today: Plausible or Umami for analytics (cookieless, no banner needed).

## Day 2, Tuesday: national branches and professions (Tier 1 and 2 data)

- Run the importers whose sources were verified: RFZO branches with coverage, enforcement agents, notaries.
- Load the RGZ address register and geocode every seat that has a street address.
- Confirm and write importers for Tax Administration branches, cadastre offices, PIO, NSZ, police directorates (headless fetch), court seats from the statute.
- Result: every national-network type has real branch pages with addresses, phones and the municipalities it serves.


> **Status 2026-11-09 (end of Day 2).** Day 1 done: personal GitHub (sefika11/srbija-direktorijum), Neon
> (Frankfurt, PG16, dump restored), Vercel (fra1, auto-deploy from `main`), live at
> https://srbija-direktorijum.vercel.app. Day 2 done: RFZO branches + coverage, 213 enforcement agents,
> 228 notaries with phones and opening hours; zoomable two-level map (okrug → opština); visual pass on
> header, hero, cards, footer. Scope widened on Day 2 (see docs/05): the directory also answers *how* to
> get things done (guides) and gets a typed assistant over its own data. Days 3–5 below are re-cut for that;
> the Tax/cadastre/PIO/NSZ/police importers and the RGZ geocoding move to Week 2 alongside the crawler.

## Day 3, Wednesday: the guides layer

- Seed `services` for the first 12 life tasks (lična karta, pasoš, vozačka dozvola, registracija vozila,
  zdravstvena knjižica, prijava boravišta, privremeni boravak za strance, izvod iz matične knjige, dečiji
  dodatak, novčana socijalna pomoć, otvaranje firme/preduzetnik, overa kod beležnika) with structured JSON
  (eligibility, documents, fees with tariff numbers, steps, FAQ) and `checked_at` + source URLs.
- Guide page `/vodic/{slug}` in four languages with a municipality picker that resolves "Gde se ide" to the
  concrete serving location via `locations_serving()`.
- Write three guides fully (lična karta, pasoš, zdravstvena knjižica) and verify the fees against the
  official tariff. Lead verticals attached per guide (doc 05 §2).
- Result: the first "how do I…" pages are live and personalised per municipality.

## Day 4, Thursday: question-aware search and Search Console

- No LLM assistant (decision 2026-11-09: uncapped per-visitor API spend). Instead: search that understands
  "pasoš Kragujevac": place detection with Serbian case endings, intent matching on guides and institution
  types, a best-answer card with the serving office, grouped results, and instant suggestions as you type.
- Zero-result query log as the editorial backlog; synonyms table maintained by hand.
- Register the domain's Search Console property, submit per-section sitemaps (split the 9,900-URL sitemap),
  add analytics (Plausible/Umami), apply for AdSense once the guides are indexed.
- Result: typing a question lands the reader on the right page; the site is measurable.

## Day 5, Friday: newcomer set, descriptions, partners page

- Nine more guides including the newcomer set (boravak, PIB za strance, prevodioci, radna dozvola) in sr + en,
  ru/de for the newcomer set.
- Serbian description and FAQ for the 20 most-visited institution types; empty-state copy on pages with no
  phone yet ("Prijavite broj" correction block above the fold).
- Partners page with the sponsor/lead inventory per guide × okrug, pricing from doc 02; Resend routing for
  lead forms to a personal inbox.
- Result: content and inventory ready for the first sponsor conversations.

## Day 6, Saturday: QA and soft launch

- Link check job, 404 sweep, Lighthouse on the three main templates, Cyrillic and English search checks, phone-width pass.
- Two or three house promos in sponsor slots so the layout never shows empty cards.
- Soft launch posts: r/serbia, expat and diaspora groups, LinkedIn; ask three friends in different cities to try it and report errors through the correction form.

## Day 7, Sunday: review and week 2 plan

- Read analytics and the correction queue; fix the top complaints.
- Plan week 2: crawl the remaining 135 municipalities by district seat, start sponsor outreach calls, Ezoic application once traffic passes their threshold, first partner onboarding.

## Standing rules for the week

- Every data change goes through an importer or the correction queue, never by hand in the database.
- Nothing commercial on a page before the user has the phone, address and hours (Part 2 rule).
- No promises of results to sponsors; sell placement and leads, show traffic from analytics.
