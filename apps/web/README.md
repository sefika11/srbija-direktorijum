# apps/web — Adresar uprave (Next.js 15, App Router)

Server-rendered directory over the Postgres schema in `../../db`. No ORM: typed SQL via `postgres` against the
views and functions the schema already provides (`v_location_page`, `locations_serving`, `pick_sponsorship`).

```bash
cd apps/web && npm install
cp .env.local.example .env.local   # or edit .env.local: DATABASE_URL, NEXT_PUBLIC_SITE_URL
npm run dev                        # http://localhost:3100
```

## Routes (one catch-all resolver, optional locale prefix `/en` `/ru` `/de`)

| URL | Page |
|---|---|
| `/` | Home: search, interactive district map, browse by type, foreigners teaser |
| `/okrug/{slug}` | District hub: its cities and municipalities |
| `/{jls}` and `/{jls}/{gradska-opstina}` | Municipality hub: institutions by group, national offices serving it |
| `/{type}` | Institution-type hub grouped by municipality |
| `/{type}/{org}` and `/{type}/{org}/{location}` | Institution page in the Part 2 layout (slots, lead form, correction block) |
| `/pretraga?q=` | Search (trigram + full text, Latin or Cyrillic) |
| `/za-strance` | Guide for newcomers (sr, en, ru, de) |
| `/o-sajtu`, `/partneri`, `/privatnost` | Static pages |
| `/api/upit`, `/api/predlog` | Lead and correction submissions |
| `/sitemap.xml`, `/robots.txt` | Generated from the database |

Slugs: a first segment is tried as a municipality, then as an institution type. Reserved words: `okrug`, `pretraga`,
`za-strance`, `o-sajtu`, `partneri`, `privatnost`, `api`, `go`, and the locale codes.

## Deploy (Vercel)

1. Create the Neon project (Frankfurt, PG16) and restore `db/dumps/*.sql.gz` (see root README).
2. In the Vercel dashboard: **Add New > Project**, import the GitHub repo, set **Root Directory** to `apps/web`.
   Framework is detected as Next.js; `vercel.json` here pins the `fra1` region and security headers.
3. Environment variables (Production + Preview):
   - `DATABASE_URL` = the Neon **pooled** connection string
   - `NEXT_PUBLIC_SITE_URL` = `https://<your-domain>` (no trailing slash)
4. Deploy. Pages are ISR (`revalidate` 1 day); add an on-demand revalidation route when the admin goes live.
5. Add the custom domain under Settings > Domains and set the CNAME at the registrar.

## Map

`lib/serbia-map.ts` is generated from geoBoundaries SRB ADM1 (OpenStreetMap contributors, ODbL). Attribution is in the footer.
