# 07 · Design system

Set by Nick on 2026-11-10. Every interface change is checked against this document before it ships.

## 1. Principles (verbatim brief)

Keep the interface compact, clear, and focused on the user's immediate task. Preserve accepted geometry,
hierarchy, and content unless a change is required. Reuse existing UI primitives and patterns. Keep controls
close to the content they affect. Show the effective state clearly.

Use concise labels and direct instructions. Prefer verbs over nouns. Use one consistent term for each concept.
State what happened and what the user should do next. Avoid marketing language, vague claims, unnecessary
explanation, and rotating synonyms. Every sentence should make one clear claim.

Design for real product use. Inspect the existing surface, states, and widths before changing it. Verify the
result in the relevant workflow and report visual checks honestly.

## 2. What this means for Gde da idem?

- **The task is always "where do I go and what do I bring".** Above the fold on any page: the answer
  (office, address, phone, hours, documents), then navigation, then commercial elements. Nothing decorative
  before the answer.
- **Geometry is fixed.** Shell 1120px; two-column 1fr + 300px rail on ≥1024px; one column below. Section
  padding 48px desktop / 32px mobile. Grid gaps 16px. Card padding 20px. Touch targets ≥ 40px.
- **Primitives only** (see §4). A new pattern needs a reason written in the PR; otherwise reuse.
- **Controls sit with their content.** The municipality picker sits beside the "Where to go" block; the
  correction block sits under the data it corrects; zoom controls sit on the map.
- **State is visible.** Verified / auto-verified / unverified chips on every record; "address not yet entered"
  instead of blanks; selected municipality shown in the picker and in the result title; search tells you which
  place and task it recognised.

## 3. Tokens (`apps/web/app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #fafaf8 | #0f1420 | page |
| `--surface` | #ffffff | #161d2b | cards, header, footer base |
| `--surface-2` | #f1f2f0 | #1f2838 | footer, muted fills |
| `--ink` | #131a24 | #eceff4 | text |
| `--muted` | #5b6672 | #9ba6b6 | secondary text (≥ 4.5:1 on surface) |
| `--line` | #e2e5ea | #2b3546 | hairlines |
| `--accent` / `--accent-ink` / `--accent-soft` | #1e5bff / #1544c4 / #eaf0ff | #7ea2ff / #a9c0ff / #1a2340 | every action, links, data emphasis |
| `--red` / `--red-soft` | #d9343a / #fdeeee | #e26b70 / #3a1f22 | tricolour hairline, section marker, sponsor label only |
| `--gold` / `--gold-soft` | #a07a1f / #f8efd6 | #d2b15a / #332b17 | verified marks only |
| `--moss` / `--moss-soft` | #1f7a4d / #e3f3ea | #7cc9a0 / #1b3327 | local-partner lead forms only |
| `--radius` | 10px | | all boxes; 999px for chips |

Type: Literata (display, h1, h2) at 32/40/56; IBM Plex Sans body 15–16px, labels 11.5px uppercase tracking .1em;
Plex Mono for codes. Line length ≤ 70 characters.

## 4. Primitives (the whole set)

| Primitive | Where | Rule |
|---|---|---|
| `SearchBox` | header, hero, search page | one component, two sizes; suggestions after the user types |
| `.btn-primary` | one per block | the single next action; verb label ("Pozovi", "Otvori", "Pošalji") |
| `.quick-chip` | secondary links/filters | noun or short verb; never two chip rows for the same purpose |
| `.card` + `.card-hover` | every list item and panel | hairline, radius 10, no shadow at rest |
| `.eyebrow` | section labels | red marker + uppercase; `plain` variant on coloured bands |
| `SectionTitle` | h2 inside content | 17px semibold; numbers only in `.section-head` on the home page |
| `Chip` (neutral/moss/brick/accent) + `VerificationChip` | states | gold = verified by a person; accent = auto-verified; neutral = unverified |
| `AdSlot`, `SponsorCard`, `LeadForm` | monetization | labelled, below the answer, never adjacent to a button |
| `Breadcrumbs` | every inner page | Home › area › page |
| `MunicipalityPicker` | guides, search best answer | select, remembered in a cookie |
| `SerbiaMap` | home only | light variant; districts on zoom |
| `CorrectionBlock` | every record page | under the data; "Izmeni podatke" / "Prijavi zatvaranje" |

## 5. Vocabulary (one term per concept)

| Concept | sr | en | ru | de |
|---|---|---|---|---|
| open a page | Otvori | Open | Открыть | Öffnen |
| call | Pozovi | Call | Позвонить | Anrufen |
| search | Pretraga / Pretraži | Search | Поиск / Найти | Suche / Suchen |
| municipality or city | opština / grad (never "mesto" for a JLS) | municipality / city | община / город | Gemeinde / Stadt |
| city district | gradska opština | city district | городская община | Stadtbezirk |
| district (okrug) | okrug | district | округ | Bezirk |
| institution | institucija | institution | учреждение | Einrichtung |
| guide | vodič | guide | инструкция | Anleitung |
| serving office | Nadležno za … | Serving … | Обслуживает … | Zuständig für … |
| verified | Provereno | Verified | Проверено | Geprüft |
| not yet entered | još nije uneto | not yet entered | ещё не внесено | folgt |
| correction | Izmeni podatke | Edit data | Исправить данные | Daten ändern |
| sponsor / ad / partner | Sponzor / Oglas / Lokalni partner | Sponsor / Ad / Local partner | — | — |

Copy rules: imperative verbs for actions; one claim per sentence; numbers as digits; no exclamation marks;
no "najbolji", "jednostavno", "brzo" unless measured; dates as `d. m. yyyy`; phone numbers as the institution
writes them.

## 6. States every surface must show

Empty ("Nema institucija ove vrste u …" + the nearest alternative), loading (skeleton only for the map panel),
error (plain sentence + retry), unverified/stale data (chip + last checked date), no phone/address (explicit
text, correction link), selected context (municipality in picker and title), search understanding (place and
task chips above results).

## 7. Review checklist (paste into the PR)

1. Did I inspect the current surface at 375, 768, 1024, 1440 before changing it?
2. Is the user's answer above every commercial element and every decoration?
3. Did I reuse a primitive from §4? If not, why is a new one required?
4. Are labels verbs, single-claim, and from the §5 vocabulary in all four languages?
5. Are all states in §6 visible on this surface?
6. Did I verify in the real workflow (click path, not just a screenshot) and report what I saw, including
   anything broken or unverified?

## 8. Craft rules (measured from awwwards nominees, 2026-11-09)

Source: six Site-of-the-Day / nominee sites read as CSS (Clinia, Dwell, HoneyQuote, Grids/Obys, DeepBook, cafeteria 2027). Only patterns that serve an information site are kept; WebGL stages, grain overlays, Lottie and canvas scenes are out of scope.

| Rule | Value we use | Where it came from |
|---|---|---|
| Canvas | warm paper `#f4f3ee`, never pure white as page colour | Clinia `#fcf8ef`, Dwell `#f5f4ed`, HoneyQuote `#f8f2e6` |
| Ink | near-black with a warm undertone `#1a1a18` | Clinia `#1a1a1e`, Dwell `#161605` |
| Accent | one: cobalt `#2347e6`, used for links, focus, the map hover and the category bar only | every site has exactly one saturated accent |
| Big numbers | ink, serif, weight 500, tracking −0.03em | numbers in accent read as marketing |
| Display | tracking −0.035em, line-height .96 | −0.02 to −0.06em, lh .9–1.2 across all six |
| Labels / eyebrows | mono, 11px, +0.14em, uppercase | Clinia, Dwell, Grids, cafeteria |
| Radii | 8px surfaces, 999px buttons and chips | 4/8/12/16 + pill everywhere |
| Colour / opacity transitions | 220ms `cubic-bezier(.4,0,.2,1)` | 200–360ms on all six |
| Movement / reveals | 600–800ms `cubic-bezier(.16,1,.3,1)` | Clinia 93 uses of this curve |
| Hover | border to ink, underline reveal, 2px arrow slide; no lift, no shadow | gated behind `@media (hover: hover)` like Clinia and Dwell |
| Header | 56px glass: 78 % paper + `blur(20px) saturate(160%)` + 1px 10 % ink border | cafeteria nav |
| Footer | paper, hairline top, ink links with underline reveal, 14px | Clinia's footer is 10–14px at 50 % opacity: too faint, we keep contrast |
| Spacing | multiples of 4; 8, 12, 16, 20, 24, 32, 48 | all six |
| Reduced motion | one `prefers-reduced-motion: reduce` block kills every transition and animation | partial on the reference sites; we do it fully |

Stylesheet layout: `globals.css` has one block per selector in ten numbered sections. New rules go into their section. Appending an override at the end of the file is a review failure.

## 9. 3D map and the effect layer (2026-11-09)

- `components/SerbiaMap3D.tsx`: the 25 districts extruded in Three.js from the same SVG paths as the 2D map. Height = √(share of institutions). Intro: districts rise west→east (42 ms stagger, expo-out 1.4 s) while the camera dollies in (2 s). Hover: raycast per frame, district lifts 2.2 units, top face tints toward cobalt, a normal-blended halo sits under it, the projected HTML label turns hot, the glass tooltip shows name/seat/counts. Click opens the district. No post-processing: additive bloom is invisible on paper and emissive clips to white under ACES, so the tint is done in material colour.
- `components/MapStage.tsx`: 3D on ≥768 px with WebGL, else the SVG map; a 3D/2D toggle sits bottom-right so it never covers the SVG zoom buttons. `prefers-reduced-motion` renders the final state with no intro and no sway.
- `components/HeroFX.tsx` (home only): word reveal on the H1 (CSS, class `fx-in`), count-up on `[data-count]`, pointer light on `.hero-open`, spotlight on `.spot` cards, magnetic `.btn-primary` / chips. Pointer effects run only under `(hover: hover) and (pointer: fine)` and never under reduced motion. One rAF write per pointer frame; no layout reads in loops.
- Budget: Three.js is dynamically imported on the home page only (~160 KB gzip). Pixel ratio capped at 2; the loop pauses when the stage is off-screen or the tab is hidden.

## 10. Type, opener and hub maps (2026-11-09, late)

- **Type**: Bona Nova (display serif, 400/700 + italic, Latin-ext + Cyrillic) · Commissioner Variable (text, humanist, Latin-ext + Cyrillic) · JetBrains Mono Variable (labels, codes). Chosen after checking 20 Google families for Cyrillic + Latin-Extended coverage; the usual AI-default faces (Inter, Manrope, DM Sans, Plus Jakarta, Space Grotesk, Playfair) are out. Self-hosted via Fontsource. Serbian italic Cyrillic forms (б г д п т) still need a `lang="sr"` check in Bona Nova.
- **Opener** (`components/Opener.tsx`, home only): paper curtain, wordmark words rise (90 ms stagger), tricolour hairline draws, institution count runs up, curtain parts top/bottom at 1.75 s (`cubic-bezier(.76,0,.24,1)`, 1 s). Skipped on return visits in the session (`sessionStorage gdi-opener`) and under reduced motion; any click or key skips it. The headline word reveal, section reveals and the 3D rise wait for `html.opener-done`. Hard cap: content is interactive by 2.1 s.
- **Hub maps**: `SerbiaMap3D` is generic (`features`, flat `context`, `fit` bbox). District pages show their municipalities extruded against the other districts flat; municipality pages show the unit (or its city districts) against its district siblings. Scene scale (`hs`) follows the frame radius so heights, bevels and halo stay proportional. Phones and no-WebGL get `StaticMap`: a linked SVG with the same colour ramp.
- **Map visibility**: top faces run paper `#f2f0e8` → desaturated cobalt `#8d9ede` by √share; walls `#cfcbbe` → `#7e8bbf`; borders ink at 50 %; sun 2.6 + hemisphere .95 + blue rim .7; label chips on blurred paper; camera fits the bounding sphere at 0.86.
