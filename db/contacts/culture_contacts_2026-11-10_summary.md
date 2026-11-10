# Culture group registry pass, 2026-11-10

Output: `culture_contacts_2026-11-10.json` (119 rows, all tourist organisations; each has address, phone and email).

| Type | Found / total |
|---|---|
| turisticka-organizacija | 119 / 139 |
| narodna-biblioteka | 0 / 148 |
| kulturni-centar | 0 / 233 |
| muzej | 0 / 129 |
| sportski-centar | 0 / 92 |

## Datasets used (fetched 2026-11-10)
- Tourist Organisation of Serbia (TOS), register of local tourist organisations, 143 entries on pages 1-5: https://www.serbia.travel/sr-lat/b2b/lokalne-turisticke-organizacije/ (paths /page/1/ to /page/5/). The e-mails are Cloudflare-obfuscated and were decoded from the page's data-cfemail attributes.

## Match method
Normalised municipality (diacritics folded) equals the TOS city prefix. When several TOS entries share a city, the one with the most name-word overlap wins; ties are left unmatched.

## Unmatched tourist organisations (20)
- No TOS entry for the municipality: Batočina, Doljevac, Gadžin Han, Žabari, Novi Beograd, Palilula, Zemun, Čukarica, Pećinci, and the Kosovo municipalities (Gnjilane, Zubin Potok, Kosovska Mitrovica, Zvečan).
- Dropped on purpose because TOS lists only the city organisation: "Savski Venac" (the TOS Beograd entry is the city TO), the regional TOs for Sandžak, Vojvodina and Zapadna Srbija, and the "u likvidaciji" duplicates for Aleksandrovac and Smederevska Palanka.
- Our "Turistička organizacija Srbije" row has no matching entry.

## Suspicious
- Some TOS "local TO" entries are not classic tourist organisations (for example Ada "JP Adica", Tutin "Centar za turizam, kulturu, omladinu i sport", Aleksinac "Lipovac" children's recreation institution). They were matched because they are the only TOS entry for that municipality. Check these before applying.
- Our file has liquidated or duplicate TO rows (Aleksandrovac, Smederevska Palanka) and two Užice TO rows (one matched via the city). The TO Užice match applies to the "Turistička organizacija Užice" row only.
- Facebook-only websites were dropped.

## Why libraries, museums, culture centres and sports centres have 0
No official bulk dataset with addresses and phones exists in an accessible form:
- data.gov.rs: no datasets for libraries, museums, culture or tourism (API search returned 0 hits).
- nb.rs: no "Mreža biblioteka" or adresar page (the guessed URLs return 404). The published PDFs are research papers, not directories. kobson.nb.rs "Adresar biblioteka" lists consortium members only (academic libraries).
- Ministry of Culture and Information / srbija.gov.rs: only a short list of national institutions. The institution register is kept by APR, and no open extract was found.
- Museum Society of Serbia: no online register.
- Sports centres: no Ministry of Sport register found.
The remainder needs per-institution lookups of the official sites, which are not in the input (website is null for all 741 rows).
