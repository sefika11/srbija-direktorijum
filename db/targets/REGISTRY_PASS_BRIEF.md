# Registry contact pass — brief for the matching agents

Goal: give every institution in your input file a street address, a phone and (where published) an e-mail and website, taken ONLY from official sources — the competent ministry's register or open-data set, the public fund's list, or the institution's own official website. Never commercial directories (yellow pages, firme.rs, companywall, Google Maps scrapes, Wikipedia).

Input: `db/targets/<group>_missing_2026-11-10.json` — array of {org_slug, name, type_slug, website, settlement, jls (municipality), okrug, address, phones, email}. `address`/`phones` are what we lack (null).

Method (do it this way):
1. Find the official dataset(s) for your types. Prefer bulk sources: data.gov.rs (Portal otvorenih podataka), the ministry's register page, the fund's XLS/CSV list. Download with curl into a NEW empty folder under the scratchpad; parse with the project venv `.venv/bin/python -I <script>` (pandas/openpyxl are available; if not, use csv/json/zipfile). Do not run scripts from inside the download folder.
2. Match registry rows to our rows by normalised name (fold diacritics, drop quotes/„“, lowercase, drop generic words like "osnovna škola", "oš", "predškolska ustanova", "pu", "dom zdravlja", "opšta bolnica") AND municipality (jls) — a name match in a different municipality is NOT a match. When two of ours share a name in one municipality, use settlement or address hints; otherwise leave both unmatched.
3. Output `db/contacts/<group>_contacts_2026-11-10.json`: array of {org_slug, website, phones: [..], email, address: "Street number, PostalCode City" | "Street number, City", hours: null, source_url, note}. Phones as printed (e.g. "011/123-4567" or "+381 11 1234567"), max 4, no faxes. Transliterate Cyrillic to Latin. Only rows where you found an address or a phone. Validate JSON.
4. Write `db/contacts/<group>_contacts_2026-11-10_summary.md`: per type found/total, datasets used (URLs + fetched date), match method, number left unmatched and why, and anything suspicious (duplicates, closed institutions).

Rules: no sub-agents; do not touch any database, .env, app code or git; only write the two output files plus scratch files in the scratchpad. Breadth over depth: an address + one phone for as many rows as possible beats perfect records for a few. If a bulk dataset covers only part of your types, do the rest from the institutions' own official sites where a URL is known, and stop when returns get thin — report the remainder.
