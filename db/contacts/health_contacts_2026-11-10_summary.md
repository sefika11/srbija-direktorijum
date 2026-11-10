# Health group contact pass, 2026-11-10

Output: `db/contacts/health_contacts_2026-11-10.json` (188 rows with an address and/or phone; phones as printed, Cyrillic transliterated).

## Found / total per type
| type | found | total | with address |
|---|---|---|---|
| dom-zdravlja | 58 | 69 | 58 |
| opsta-bolnica (incl. ZC, special hospitals, clinics, institutes) | 93 | 148 | 93 |
| zavod-za-javno-zdravlje | 23 | 25 | 23 |
| centar-za-socijalni-rad | 14 | 110 | 10 |
| **total** | **188** | **352** | |

## Datasets used (fetched 2026-11-10)
- Ministry of Health, "Zdravstvene ustanove" register page by okrug (address, phones, website for ~340 institutions): https://zdravlje.gov.rs/tekst/333549/zdravstvene-ustanove.php  (source_url of all 174 health rows)
- CSR rows: each institution's own official website (csrapatin.rs, csr-leskovac.rs, csrloznica.org.rs, csrnoviknezevac.rs, csrodzaci.org.rs, csrpozega.rs, csr-ruma.rs, csrtemerin.rs, csrzabalj.org.rs, srbobrancsr.rs, csrbackipetrovac.rs, csr-uzice.rs, csrvrnjackabanja.org.rs, csr-ada.rs).
- Checked, no usable bulk list: data.gov.rs (only a Zrenjanin city health dataset, irrelevant), rfzo.rs (no downloadable contracted-institution XLS found from the homepage), batut.org.rs, minrzs.gov.rs (no CSR directory; only accreditation XLSX), zavodsz.gov.rs (links a Google My Map "Ustanove socijalne zastite" whose KML has coordinates only, no addresses/phones), asocijacijacsr.org (nothing listing CSRs).

## Match method
Cyrillic to Latin, diacritic fold, lowercase, stop words dropped; match required the same institution kind (dom / bolnica / centar / zavod / institut) plus municipality (jls) present in the ministry name or address, token overlap >= 0.5 (jls-less rows only at 1.0). Manual overrides (note field says "manual") for renames: Univerzitetski klinicki centar = Klinicki centar (Srbije/Kragujevac/Nis/Vojvodine), KBC Bezanijska kosa, Dedinje, Zrenjanin OB, Cacak OB (listed as ZC "Dr Dragisa Misovic"), Banjica, special hospitals with spelling variants, Mali Idjos and Varvarin domovi zdravlja. Everything auto-matched was eyeballed.

## Judgement calls to review
- 10 "Zdravstveni centar" rows (Aleksinac, Bor, Gornji Milanovac, Loznica, Prokuplje, Smederevo, Sremska Mitrovica, Valjevo, Zajecar, Sabac): the ministry lists the Dom zdravlja and Opsta bolnica separately; I used the general hospital's address/phones (note field says so). Where DZ and OB share an address (Aleksinac, Loznica, Smederevo, Sremska Mitrovica, Zajecar) this is safe; for Bor, Valjevo, Sabac, Gornji Milanovac, Prokuplje the ZC seat may differ.
- "Opsta bolnica Studenica" Kraljevo matched to ministry "Opsta bolnica Kraljevo"; "Opsta bolnica Cacak" to ZC Cacak; "Opsta bolnica Majdanpek" (ministry typo "Majdampek").
- Phones for hospitals/Doma zdravlja are the ministry's main numbers; a few have odd formatting kept as printed (e.g. "034/6841-130", "011/82-31-988"). Two 7-8 digit numbers missing area code were completed from sibling rows (021/4805100, 031/841141).
- Ministry list has no emails; only existing emails are carried through.

## Unmatched (164 rows) and why
- 11 dom-zdravlja: all Kosovo/Metohija (Dragas, Gracanica, Istok, Pec, Pristina, Zvecan, Strpce, Donja Gusterica, Kosovo Polje, Zubin Potok, Obilic-Vucitrn), not on the ministry list and without municipality.
- 55 opsta-bolnica: about 42 are NOT health institutions at all (scientific institutes of agriculture, history, physics, forestry, philosophy, law, plus "Mesna zajednica Nova bolnica" Pirot, "Mesna zajednica Berbersko-Bolnica" Zrenjanin, Institut za standardizaciju, Institut za puteve) mis-typed as hospitals by name-matching on "bolnica/institut"; recommend retyping or deleting them. Remaining: Kosovo hospitals/ZC (Pec, Prizren, Djakovica, Gnjilane matched via Silovo address only, K. Mitrovica KBC, Pristina KBC in Gracanica), Specijalna bolnica Interne Lazarevac (ministry has only "za endemsku nefropatiju" at the same town, not merged), Institut za rehabilitaciju "Mladenovac" (our municipality looks wrong; ministry's Institut za rehabilitaciju is in Beograd, Sokobanjska 17), Specijalna zatvorska bolnica, Institut za rani razvoj deteta, Tehnicko-ekonomski centar KCS, Zuber Kursumlija.
- 2 ZJZ: Novi Pazar (not in ministry list), Kosovska Mitrovica.
- 96 CSR: no ministry/fund dataset exists and own sites exist for only ~36 of them (9 of those failed to load, e.g. csrbogatic.rs, csr-ivanjica.rs, csrknjazevac.org.rs, csrplandiste.org.rs, csrprijepolje.org.rs, csrsvrljig.rs, csrtrgoviste.rs, csrcicevac.rs, csrsid.org.rs); sites that loaded but showed no machine-readable address: Aleksinac, Knic, Opovo, Pancevo, Nis, Prokuplje, Sokobanja, Svilajnac, Vlasotince, Valjevo, Zajecar, Bor. Returns got thin, stopped there.

## Suspicious
- Ministry page contains typos in names (Majdampek, Backa Palnka, Niski Sad); matched anyway by municipality.
- Gnjilane ZC address on the ministry list is "38252 Silovo" (relocated), no phone.
- Ministry entries for Kraljevo ZJZ say "temporarily relocated" in the address; kept as printed.
- Many CSR emails are `<municipality>.csr@minrzs.gov.rs` (pattern, not verified per row, not added to output).
