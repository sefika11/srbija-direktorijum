# Visa texts — translation brief (one batch file per agent)

Input: `db/i18n/visa_src_<n>.json` → `{"countries": {ISO2: {name_sr, name_en, to_rs_stay?, to_rs_conditions?, from_rs_stay?, from_rs_passport?, from_rs_requirements?: string[], from_rs_instructions?: {...}, instructions_note?}}, "general"?: {...}}`.
Output: `db/i18n/visa_tr_<n>.json` → `{"sr": {...}, "en": {...}, "ru": {...}, "de": {...}}` where each language object has the SAME shape as the input (`countries` keyed by ISO2 with the same field names and same nested keys/array lengths; `general` only if the input had it), minus `name_sr`/`name_en` (drop those two keys).

Rules
- Translate every human-readable string: field values, array items, nested values inside `from_rs_instructions` and `general`. `sr` = Serbian in Latin script (translate into Serbian when the source is English or mixed; copy when already Serbian). `en` = English. `ru` = Russian (Cyrillic). `de` = German.
- Never translate or alter: URLs, e-mail addresses, keys whose name ends in `_url`/`url`/`href`, ISO codes, currency codes and amounts (EUR 90, USD 185), form names (DS-160, ImmiAccount, ETIAS, eVisa portal names), proper names of institutions and streets in addresses, dates. Keep numbers and punctuation.
- Register: calm official information for a citizen, short sentences, no marketing, no promises. Keep sentence meaning exact; do not add or drop facts. Keep "Srbija/Serbia/Сербия/Serbien" and the destination country name in the target language.
- Output must be valid JSON (UTF-8, no comments, no trailing commas). Validate it before finishing (e.g. `python3 -c "import json;json.load(open('db/i18n/visa_tr_<n>.json'))"`).
- Do not touch any other file. Do not spawn sub-agents. Do not use any database.
