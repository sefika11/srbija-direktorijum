# New institution types — brief for the registry agents (2026-11-10)

Goal: for each type in your group, obtain the OFFICIAL list of institutions / licensed providers in Serbia and write it
as one import file per type in the project's standard shape. The site is a public directory of institutions.

## Sources: official only
- Allowed: the competent ministry / agency / chamber / central bank register or list (web page, PDF, XLS, CSV, open-data
  API), data.gov.rs datasets published by a public body, the institution's own official website.
- Never: commercial directories (yellow pages, firme.rs, companywall, planplus, Google Maps), Wikipedia, news portals.
- If the official register sits behind a login or a CAPTCHA, or only answers one-record searches with no listing, do NOT
  work around it. Write the file with "rows": [] and say why in "note" ("NOT OBTAINED: …"). Do not substitute another source.
- Be polite: at most ~1 request per second per host, a generic User-Agent ("Mozilla/5.0 (compatible; directory-research)"),
  no personal details in any request.

## Method
1. Locate the official source (web search, then the body's own site). Prefer a bulk download over page scraping.
2. Download into a NEW empty folder under the scratchpad folder you were given; keep your scripts in a different folder
   and run them with `.venv/bin/python -I <script>` from the repo root (httpx, bs4, lxml, openpyxl, xlrd, pdfplumber or
   pypdf may be available; check, and fall back to what is there). Do not run code from inside a download folder.
3. Parse to rows. Transliterate Cyrillic to Serbian Latin. Keep names as registered. One row per physical location
   (a head office, a branch or an exchange office is its own row when the register lists it with its own address).
4. Write `db/imports/<file>_2026-11-10.json` (file name given per type below), valid UTF-8 JSON:
   {"source": {"name": "...", "url": "<the list's URL>", "fetched_at": "2026-11-10"}, "note": "<coverage, gaps>",
    "rows": [{"name": "...", "type_slug": "<slug given below>", "town": "<settlement>", "municipality": "<city/municipality
    if the register gives it, else null>", "address": "<street and number>", "phones": ["as printed"], "emails": [],
    "website": null, "hours": null, "extra": {<short useful facts: licence no., field of expertise, category, capacity>},
    "source_url": "<row or list URL>"}]}
   - "town" is required (rows without any place are dropped); phones max 3, no faxes.
   - For licensed individuals (experts, mediators, administrators, appraisers) use the person's name as registered and
     ONLY the business contact data the register itself publishes. Never add personal identifiers (JMBG, date of birth,
     home address not marked as office).
5. Write `db/imports/<group>_2026-11-10_summary.md`: per type — source URL, how obtained, row count, share with address /
   phone, what is missing and why, anything suspicious.

## Rules
- Do the work yourself; do NOT spawn sub-agents.
- Do not touch any database, `.env*` file, app code, git, or any existing file. Write only your new output files and
  scratch files. Do not print or read credentials.
- Breadth first: a complete list with name + town + address beats a partial list with every field.
- Time-box each type: if a source resists after a reasonable effort (about 15 tool calls), record NOT OBTAINED and move on.
- Finish by replying with one line per type: slug, rows written, source host, or NOT OBTAINED + reason.
