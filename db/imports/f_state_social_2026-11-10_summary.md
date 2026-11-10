# Group f_state_social - summary (2026-11-10)

## usluga-socijalne-zastite - 270 rows (usluge_socijalne_zastite_2026-11-10.json)
- Source: MRZBSP register page https://www.minrzs.gov.rs/sr/registri/sektor-za-brigu-o-porodici-i-socialnu-zastitu - 24 xlsx lists (jul 2026); used the per-service lists 10-11, 13-21, 8, 9, 7 (day care, shelters, svratiste, predah, licni pratilac deteta, pomoc u kuci, personalni asistent, stanovanje uz podrsku, SOS telefon, domovi za lica sa teskocama).
- Obtained by direct xlsx download and parsing (name/town/address/e-mail are one free-text cell; phones from the founder cell). Cyrillic transliterated.
- Coverage: address 268/270, phone 264, e-mail 265. Homes for the elderly lists (2-6, 12) skipped (already loaded).
- Dropped: 201 rows whose licence is marked as lapsed/replaced by a new licence (successor row is kept), 139 rows whose licence end date is past with no renewal noted. Parsing is heuristic: a few names keep the "pri <parent>" form; spot-check recommended. The register has typos preserved (e.g. "PRUZAE").
- Address is the provider's seat as printed, not necessarily the service location.

## gerontoloski-centar - 48 rows (gerontoloski_centri_2026-11-10.json)
- Source requested (Uredba o mrezi ustanova) NOT reachable: minrzs.gov.rs archive PDF returned HTTP 504 three times. Substitute: the same ministry's state-homes licence list (xlsx, list "domski smestaj odraslih i starijih - drzavni") plus homes for persons with intellectual disability. Address/phone/e-mail from the register, NOT verified on the institutions' own sites.
- Overlaps with the existing domovi_za_stare file (same entities under another type) - decide on dedupe on import. Includes Subotica GC as 3 locations. Subotica phones corrected to the one valid number (register had Vrbas phones on 2 rows).
- Address 46/48, phone 46/48.

## carinarnica - 165 rows (carinarnice_2026-11-10.json)
- Source: carina.rs docx "Radno vreme carinarnica" (28.10.2026, linked from https://www.carina.rs/o-nama/carinarnice/carinarnice-opste-informacije.html). 15 carinarnice (HQ rows) + 150 ispostave/referati/punktovi, extra.kind and extra.parent filled, hours for all (Mon-Fri / Sat / Sun).
- Missing: street addresses and phones for every unit (carina.rs "Kontakti carinarnica" page is a map only and returns HTTP 500). town is derived from the unit name (or parent seat for non-place names such as terminals/skladista) - the least certain field. HQ hours are the generic 07:30-15:30 from the site.
- Priština carinarnica and its 4 punktovi are administrative points toward AP KiM.

## granicni-prelaz - 74 rows (granicni_prelazi_2026-11-10.json)
- Source: carina.rs docx on working hours of border crossings and administrative points (jul 2026). MUP / government decision list not used. Road 41 (+6 admin points), rail 9, river 10, air 4 (kind in extra.kind, extra.neighbour_country).
- Missing: addresses, phones. town = nearest settlement from the crossing name. Guesses flagged in note: Bijelo Polje rail crossing placed at Vrbnica, Brnjacki most at Kosovska Mitrovica. Rivers on the Sava/inland ports have no neighbour country.

## arhiv - 41 rows (arhivi_2026-11-10.json)
- Source: https://www.arhivsrbije.rs/arhivska-delatnost/arhivi-u-srbiji (official network list, 38 archives + 3 departments Trstenik, Bor, Becej).
- Address 38/41, phone 39/41, e-mail 39/41, website where listed. territory in extra. Includes displaced Kosovo archives (Pristina, Gnjilane, Pec, Prizren, K. Mitrovica) with the addresses as listed (Strpce, Prokuplje, Vranic). Not on list: Vojni arhiv, Diplomatski arhiv.

## zavod-za-zastitu-spomenika - 14 rows (zavodi_spomenici_2026-11-10.json)
- Source: Republic Institute site, page "Mreza zavoda u Srbiji" (https://www.heritage.gov.rs/cirilica/mreza_zavoda_u_srbiji.php); the list is the institute's own Google My Maps embed, read via its KML export (names, phones, web, e-mail, location).
- Street addresses missing except the Republic Institute (Radoslava Grujica 11, Beograd, hours 08-16). Level in extra.level.
