# d_professions – summary (2026-11-10)

All five registers obtained from official bodies, polite crawling (one detail-page fetch per second only for kor.rs; the rest are bulk files). No personal identifiers (JMBG, birth data, parent names) were used.

## sudski-vestak -> sudski_vestaci_2026-11-10.json
- Source: Ministry of Justice, https://mpravde.gov.rs/registar-sudskix-vestaka (xlsx export linked on the page, storage/downloads/01M6G4J8DTMQ2ZR684K5FS0R19.xlsx).
- 6,963 appointment lines -> 6,874 distinct active experts (STATUS true, no dismissal decision), one row per person+address; all fields of expertise merged in extra.oblasti ("Oblast – uža specijalnost"), plus court and title.
- 6,874 rows; 6,783 with street address (99%), 6,844 with phone (99.6%), 0 emails (not in register).
- Missing: legal entities (Registar pravnih lica koja obavljaju poslove veštačenja, about 87 entries). The old ministry page www.mpravde.gov.rs/sr/tekst/29854/pravna-lica-sudski-vestaci.php fails TLS certificate verification (not bypassed) and the new site lists no such register. So extra.kind is "fizičko lice" for all rows. NOT OBTAINED for entities.
- Note: the export's own last-modified column is mostly 2017; the file may lag real appointments (115 appointed 2024, 1 in 2025).

## medijator -> medijatori_2026-11-10.json
- Source: Ministry of Justice, https://mpravde.gov.rs/registar-posrednika (xlsx, register dated 24.09.2026).
- 3,457 records; 1,057 with STATUS true taken as currently licensed (2,400 inactive/expired excluded).
- 1,057 rows; 0 street addresses (deliberately: the export's address is not marked as an office address), 1,047 phones, 1,048 emails. Town = GRAD.
- Suspicious: the revocation/expiry columns are inconsistently filled (about 310 active rows carry a date in the revocation column); STATUS was the only activity signal used.

## stecajni-upravnik -> stecajni_upravnici_2026-11-10.json
- Source: Bankruptcy Supervision Agency, https://alsu.gov.rs/ci/stecajni-upravnik/imenik-stecajnih-upravnika-2/ ; PDF "Lista aktivnih licenciranih stečajnih upravnika" (generated 10.11.2026), https://alsu.gov.rs/doc/Upravnici/Stecajni_Upravnici_Aktivni.pdf, parsed with pdfplumber (227 consecutive entries).
- 227 rows; 0 street addresses (register gives town + postal code only, ptt in extra), 186 phones (82%), 150 emails (66%). Extra: licence number/date, commercial court of assignment, profession.
- The full list of licensed (including inactive) administrators exists too (Stecajni_Upravnici_Licencirani.pdf); not used.

## procenitelj-nepokretnosti -> procenitelji_2026-11-10.json
- Source: Ministry of Finance, https://www.mfin.gov.rs/usluge/imenici -> "Imenik licenciranih procenitelja" xlsx (https://www.mfin.gov.rs//upload/media/laminascoi1fah_6af17c41b921f.xlsx).
- 279 appraisers (licences 001-387) -> 288 rows (appraisers with several listed offices get one row per office); 1 appraiser dropped (Adresa has a street but no town).
- 235 with street address (82%), 274 with phone (95%), no emails in register.
- Not carried: accredited-association membership, disciplinary measures. Phone-to-office mapping for multi-office rows is positional.

## revizorska-kuca -> revizorske_kuce_2026-11-10.json
- Source: Chamber of Authorised Auditors, https://www.kor.rs/registri.asp ("Registar društava za reviziju i samostalnih revizora"); one detail page per firm (86 fetched).
- 86 audit firms (all d.o.o.) + 33 Serbian branches listed in the register = 119 rows; 119 with address, 86 phones, 86 emails; websites where listed. Foreign (Montenegro, North Macedonia) affiliates skipped.
- Firm name = register short name; full name in extra.pun_naziv; Ministry of Finance licence decision in extra.
- The Ministry of Finance publishes no separate list that was found; the Chamber register is the official one. Individual auditors section not taken (firms only).

## General
- Cyrillic transliterated to Serbian Latin, including Latin look-alike letters inside Cyrillic words (the expert register mixes scripts).
- Scratch files and scripts: /private/tmp/claude-501/-Users-djoni-Downloads/2503d3f5-68aa-46e5-881d-96436cd641a8/scratchpad/reg_d (dl/ and scripts/).
