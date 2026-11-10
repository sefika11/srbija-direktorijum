# Brief: one enrolment guide for "Gde da idem?" (Serbia's directory of institutions)

You research ONE procedure from official Serbian sources and write ONE guide file. Today is 2026-11-10.
Do the work yourself: do NOT spawn sub-agents. Do not edit anything in the repository. Write exactly two files (paths given in your task).

## Sources: official only
Allowed: euprava.gov.rs, prosveta.gov.rs / mpn.gov.rs (Ministry of Education), mojasrednjaskola.gov.rs, upis.mpn.gov.rs, azk.gov.rs (Agencija za kvalifikacije),
pravno-informacioni-sistem.rs (official legal texts), srbija.gov.rs, other *.gov.rs, official city/municipality sites (e.g. beograd.rs, novisad.rs),
official sites of public institutions (universities *.ac.rs, studentski centri, predškolske ustanove).
NOT allowed as a basis for any fact: news portals, blogs, forums, private prep schools, Wikipedia, paragraf.rs commentary.
If a fact cannot be confirmed on an official page you actually opened, leave it out of the guide and list it under "unverified" in the evidence file.
Never invent amounts, dates, article numbers or URLs. Fees: only amounts printed on an official page; otherwise amount_rsd = null with a "basis" sentence saying who sets it.
Dates: the guide must stay true next year, so describe the calendar generically ("konkurs raspisuje ... obično u ...") and give the exact 2026/27 or 2027/28 dates only if an official page states them, with the school year named.

## Output 1: the guide JSON (UTF-8, valid JSON)
Read /Users/djoni/Downloads/4 Personal & Side Projects/14 Side Projects/srbija-direktorijum/db/guides/licna-karta.json first: copy its structure exactly. Keys:
slug, category ("obrazovanje-i-deca"), org_types (given in your task), lead_vertical (given), status ("full"), sort_order (given),
name_lat, summary (one sentence), typical_duration (one or two sentences: how long the procedure takes / when in the year it happens),
legal_basis (law and rulebook names, with Službeni glasnik numbers only if you saw them on an official page), euprava_url (the eUprava service page if one exists, else null),
online_available (true only if the application itself can be filed online), checked_at ("2026-11-10"),
fees: [{item, amount_rsd (number|null), basis, source_url, checked_at, note?}],
sources: [{url, title, checked_at}]  (3 to 7 official pages you actually opened; every URL must load),
guide: { "sr": {...}, "en": {...} } where each locale has:
  title, summary, where_note (where exactly to go or which portal, 1-3 sentences),
  who: [..]            eligibility and prerequisites (age limits, prior schooling, residence), 3-6 items
  documents: [{name, note?, variants?: [..]}]   what to bring / upload; say which ones the institution obtains itself (po službenoj dužnosti)
  steps: [..]          the procedure from start to finish in order, 5-9 imperative sentences
  tips: [..]           3-5 practical tips that follow from the official rules (deadlines people miss, what is checked, what can be done online). No opinions, no promises.
  faq: [{q, a}]        4-6 real questions with factual answers
  for_foreigners       one paragraph: what differs for foreign nationals / children of foreigners / foreign diplomas
Write "sr" in Serbian Latin script with full diacritics (č ć š ž đ). Write "en" as a faithful translation of "sr" (same facts, same order); keep Serbian proper names and add the English meaning once in brackets.

## Style (house rules)
Imperative verbs for actions ("Podnesite", "Zakažite"). One claim per sentence. Numbers as digits. No exclamation marks. No marketing words (najbolji, jednostavno, brzo, lako).
Never promise an outcome (no "dobićete mesto", say "rang lista se objavljuje ..."). Dates as "1. 3. 2027.". Terms: opština / grad, institucija, vodič, "po službenoj dužnosti".
Each sentence must be something an office clerk would confirm. Keep items short: a document name is 2-8 words, a step is one or two sentences.

## Output 2: the evidence file (JSON)
{ "claims": [{ "claim": "<fact as written in the guide>", "url": "<official page where you read it>" }, ...],   // every number, age limit, deadline, fee and legal reference
  "unverified": ["<things you wanted to include but could not confirm officially>"],
  "notes": "<anything the editor should know: conflicting pages, rules that differ by city>" }

## Final reply (short)
5-10 lines: file paths written, number of sources, the 3 facts you are least sure of, and anything that differs by municipality.
