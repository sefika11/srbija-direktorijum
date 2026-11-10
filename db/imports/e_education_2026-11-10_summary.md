# e_education - 2026-11-10

Common source for 1, 2, 5 (and part of 4): Ministry of Education open data (data.gov.rs -> opendata.mpn.gov.rs/srv/{Oo,So,Vs}/kontaktPodaciJSON and PodaciOLOPJSON). Contact data has NO phone/email/web; addresses come from the "locations" dataset, joined by institution name + municipality (or okrug). Cyrillic transliterated to Serbian Latin; all-caps streets/places converted to title case.

## muzicka-skola - muzicke_skole_2026-11-10.json
66 rows (primary + secondary music and ballet schools, public and private), 65 with street, 0 phones. Selected by name (muzička/baletska). Includes Kosovo-based schools in exile (Priština, Gnjilane, Kosovska Mitrovica) as the ministry lists them. Music departments inside other schools are not captured.

## privatna-skola - privatne_skole_2026-11-10.json
105 rows (24 primary + 81 secondary private institutions per ownership field), 41 with street. Location records exist for only about a third of private institutions; the rest have town/municipality only. Ministry verified-private PDF not used. extra.level = osnovna | srednja.

## dom-ucenika - domovi_ucenika_2026-11-10.json
35 rows, all with address, phones, email, website, capacity. Source: prosveta.gov.rs PDF "Domovi učenika srednjih škola" (June 2024), hand-transcribed (30 dormitories + 5 housing units of Učenički centar Beograd). Not included: 32 schools with dormitory, 2 student centres admitting pupils. Possibly outdated/incomplete (a news item cites 62 dormitories).

## skola-za-odrasle - skole_za_odrasle_2026-11-10.json
234 rows, 234 with address, no phones. 223 active JPOA organisers from the AZK NOKS register (export of search results, noks.azk.gov.rs/jpoa/export; one archived omitted) + 11 primary adult-education schools from open data. Register gives seat address and activity types only. Many JPOA are companies/NGOs/employers, not schools.

## visoka-skola - privatne_visokoskolske_2026-11-10.json
73 rows (private founder type), 31 with street. extra.kind inferred from name; extra.ownership = privatna. nat.rs not queried; this is the ministry's list of institutions with work licence, not a current accreditation check. One institution without place omitted. Some entries are faculties belonging to a private university, listed separately as the ministry does.
