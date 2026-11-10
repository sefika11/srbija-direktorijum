# g_tourism_work summary (2026-11-10)

## turisticka-agencija — NOT OBTAINED (0 rows)
Official register: APR Registar turizma, https://pretraga.apr.gov.rs/searchTourism. It only offers a search by name / company number (min. 3 characters) protected by Google reCAPTCHA; no list or bulk export. mto.gov.rs (turisticke-agencije page) and eturista.gov.rs have only user guides / login; data.gov.rs has no such dataset (all 3,531 dataset titles checked). Not worked around.

## hotel — 434 rows
Source: MTO "Kategorisani objekti za smeštaj Republika Srbija - oktobar 2026" XLSX, https://mto.gov.rs/extfile/sr/8205/oktobar2026.xlsx (linked from https://mto.gov.rs/tekst/308/sektor-za-turizam.php). Direct download, Cyrillic transliterated.
Kinds: hotel 280, garni hotel 136, motel 5, turističko naselje 6, apart hotel 6, pansion 1 (stars 1-5). Address 100%, town 100%; phones/emails/website 0% (not in the list). Name = object name, operator in extra.operator. Streetless objects get "<town> bb". Not included: apartments/rooms/houses and campsites (separate Kamp.xlsx with 2 camps), uncategorised objects.

## agencija-za-zaposljavanje — 248 rows
Source: Ministry of Labour, https://www.minrzs.gov.rs/sr/registri/sektor-za-rad-i-zaposljavanje — two files: "Registar agencija za zapošljavanje" XLS (104 agencies; address, phones in 99, email in 104, some websites) and "Registar Agencija za privremeno zapošljavanje" XLSX (152 entries incl. branches, state 30.10.2026; no contacts, licence decision + expiry in extra.licence). Merged by company number + address (23 are in both; extra.kind says so). Temporary-agency addresses were parsed from free text with a heuristic; spot-check towns/municipalities. Excluded: companies under a ban, and those that worked without a licence. Some emails in the register are gmail-type addresses of small agencies, kept as published.

## turisticki-vodic-org — skipped per instructions.
