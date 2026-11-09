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

## Day 3, Wednesday: municipal crawler, top 10 cities

- Crawl profiles for Beograd, Novi Sad, Niš, Kragujevac, Subotica, Zrenjanin, Pančevo, Čačak, Kraljevo, Novi Pazar.
- LLM extraction with Haiku into staging, review queue, load with provenance. Needs `ANTHROPIC_API_KEY` (Nick).
- On-demand revalidation route so approved edits refresh one page.
- Result: phones and hours on the pages that get most traffic.

## Day 4, Thursday: content and the Phase 1 visual pass

- Name, logo mark, favicon, colour identity applied; per-type icons and group colour coding.
- Designed empty states, static map with pin on institution pages, "open now" badge where hours exist.
- Serbian descriptions and FAQs for the 15 most-visited institution types.
- Google Search Console on the domain, sitemap submitted; analytics live; `o-sajtu`, `privatnost`, `uslovi` final.

## Day 5, Friday: monetization plumbing

- Apply for Google AdSense (needs the domain live, real content, privacy page). Nick's Google account.
- Wire the reserved slots to AdSense units; until approval they stay empty, never placeholder text on the live site.
- Directus admin over the database: review corrections, see leads by vertical and district, create sponsorships.
- Lead routing email via Resend; partners page with the three products and starting prices.
- Build the first sponsor target list: accountants, lawyers, surveyors, insurance agents, private clinics in the top 10 cities; one-pager for the pitch.

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
