# c_finance summary (2026-11-10)

All data from the National Bank of Serbia public web registers (webappcenter.nbs.rs), no login or CAPTCHA, paged at ~1 request/second.

## menjacnica -> menjacnice_2026-11-10.json
- Source: https://webappcenter.nbs.rs/webapp/CurrencyExchange/ExchangeOffice/Index?isSearchExecuted=true&StatusID=2 (Menjačka mesta, status Aktivno), 61 pages x 50.
- Rows: 3,042 active exchange locations (one per menjačko mesto). 100% have town and address; 0 phones (register publishes none).
- name = operator name (+ location label when different); extra = office_code, and authorisation_no (Jedinstveni broj ovlašćenog menjača), registration_no, pib, joined by operator name from the legal-entity list (2,187 entities). 39 rows have no unique name match (duplicate operator names) and lack authorisation_no.
- Inactive / temporarily closed / suspended locations excluded. The older PDF register (registar_ovlascenih_menjaca.pdf) was not used (stale).
- Municipality null; "town" is the register's Mesto (for Belgrade it is the municipality name, e.g. Novi Beograd).

## platna-institucija -> platne_institucije_2026-11-10.json
- Sources: NBS Registar platnih institucija and Registar institucija elektronskog novca (FinInstPayment, FinInstElectronicMoney web apps), details page per entry.
- Rows: 11 (6 platne institucije + 5 institucije elektronskog novca), extra.kind distinguishes. All with address, phone; no emails. Belgrade rows have municipality split out.
- Not included: third-country EMI list, agents of the postal operator.

## lizing -> lizing_2026-11-10.json
- Source: https://webappcenter.nbs.rs/WebApp/FinInstLeasing/LegalEntityFinInstitution/Index
- Rows: 12 (13 listed; ERB Leasing "U LIKVIDACIJI" excluded). All with address, phone; websites and e-mails taken from detail pages where published.

## penzijski-fond -> penzijski_fondovi_2026-11-10.json
- Source: https://webappcenter.nbs.rs/WebApp/FinInstValPanFund/LegalEntityFinInstitution/Index
- Rows: 4 (Generali, Raiffeisen Future, DDOR-Garant, Dunav), all with address, phone, email, licence number/date.
