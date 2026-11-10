# b_health summary (2026-11-10)

## specijalna-bolnica (specijalne_bolnice_2026-11-10.json) - 33 rows
- Source: official Plan mreže table (Uredba o planu mreže zdravstvenih ustanova, as hosted by RFZO, rfzo.rs/dokumenta/Tabela - Uredba o Planu mreže...pdf); contacts from institutions' own sites (sites listed on rfzo.rs/linkovi/sajtovi-zu).
- 15 of 33 with address, 17 with phone. Missing: no known own site or site unreachable/no address found (Novi Kneževac, Apatin Junaković, Aranđelovac, Sokobanja x2, Vrnjačka Banja x2, Surdulica, Beograd x4 etc.).
- Rows are the specialist hospitals in the plan (33 of ~35; a few not seeded). data.gov.rs has no health-institution dataset.

## klinika-institut (klinike_instituti_2026-11-10.json) - 32 rows
- Same source. UKC/KBC/clinics/institutes/VMA. 17 with address, 19 with phone. Zavodi (javno zdravlje, urgentna medicina, rad, studenti) and Kosovo institutions not included.
- Suspicious: Institut za kardiovaskularne bolesti Dedinje shares address with KBC Dedinje (as on its site).

## privatna-ordinacija (privatne_zdravstvene_ustanove_2026-11-10.json) - NOT OBTAINED
- APR Registar zdravstvenih ustanova (rzu.apr.gov.rs/publicsearch) is a criteria search app, no bulk export or data.gov.rs dataset; host failed TLS validation from here (not bypassed). No substitute source used.

## apoteka (apoteke_registar_2026-11-10.json) - 3405 rows
- Source: RFZO "Spisak privatnih apoteka i njihovih ogranaka sa kojima je RFZO sklopio ugovore", state 06.03.2026 (rfzo.rs/dokumenta/apo1-1(2).xlsx). Public body list, not the APR register.
- One row per sedište/ogranak with address; 3233 with phone, 3199 with email. Only RFZO-contracted private pharmacies (not every licensed pharmacy; public apotekarske ustanove excluded). Municipality null. Town is the register's "mesto" column and may be the head-office place for a few branches. ~700 on site already, so expect heavy overlap; dedupe by name+address on import.
