# Education registry pass (2026-11-10)

Output: education_contacts_2026-11-10.json (1,716 rows, address only; phones/email/website empty).

## Found / total (address)
- osnovna-skola: 1,111 / 1,280
- srednja-skola: 444 / 505
- predskolska-ustanova: 161 / 171
- Total 1,716 / 1,956. Phones: 0. E-mail: 0. Website: 0.

## Datasets (fetched 2026-11-10)
Publisher Ministarstvo prosvete, portal https://opendata.mpn.gov.rs (also listed on data.gov.rs, org 58590b7ecbe3c816ac018e68):
- Contact data (name, municipality, MB, PIB): https://opendata.mpn.gov.rs/srv/{Oo,So,PO}/kontaktPodaciJSON
- Locations and buildings (street, place, seat flag): https://opendata.mpn.gov.rs/srv/{Oo,So,PO}/PodaciOLOPJSON
Oo = primary, So = secondary, PO = preschool. "Kontakt podaci" contains NO phone, e-mail or website despite the name; the location set gives street + place only, no postal code. Seat location (sedisteRadnaJedinica = Da) used.
Also checked: data.gov.rs "Moja srednja skola" (results statistics only, no contacts); city datasets (Sombor, Sabac, Subotica, Zrenjanin) not used.

## Match method
Cyrillic to Latin, fold diacritics, drop generic words; then municipality (jls) must match registry opstina (jls "Beograd" accepts any Belgrade municipality). Tiers: exact name (1,164), name with jls/settlement words stripped (216), our name = registry name + a village/place of the institution (315, branch schools use the seat school's address), fuzzy >= 0.88 with clear margin (21). Address format "Street number, City"; "BB" = no number as published.

## Unmatched: 240 rows
- 74 ambiguous: several same-named schools in one municipality (mostly Belgrade, e.g. "Branko Radicevic", "Dositej Obradovic") with no settlement hint; left unmatched on purpose.
- Rest: name differs from registry (e.g. "Nh ..." prefixes, spelling), or registry has no street (about 78 registry rows lack a location).
- 3 rows dropped as duplicate targets of one registry record (Kosovska Mitrovica music school vs Bor, Starcevo vs Kragujevac "Vuk Stefanovic Karadzic", Bac vs Sabac agricultural school); kept the one whose municipality agrees.

## Suspicious
- Fuzzy rows (21) and "noplace" rows are worth a spot check (note field says which tier).
- Registry may list relocated Kosovo institutions under Serbian municipalities.

## Not done
Phones, e-mail and websites: no official bulk source exists; school sites (.edu.rs) not known for any row (website null in input), so the per-site crawl of about 1,700 institutions was not attempted. A web search for a ministry directory found nothing usable.
