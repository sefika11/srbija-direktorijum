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

## 11. 3D emblems and passports (2026-11-10)

- `components/Glyph3D.tsx`: one isometric scene per `org_types.icon` key (54 keys, 85 types). Primitives: box, cylinder, sphere, extruded flat shape; one base hue per scene shaded into three faces (+14 top, −4 left, −16 right), white edge highlight, floor shadow at 10 %, drop-shadow in CSS. Hues are desaturated to the paper register. Review sheet at `/ikonice` (not linked). Add a new type → add its icon key here or reuse one.
- Placement: home category tiles (72 px), type hub hero (132 px in a soft tile), organisation page title (80 px), municipality group titles (34 px). Never beside a flat icon of the same thing.
- `components/visa.tsx` `Passport`: CSS-3D booklet (cover rotated −18°, page stack behind, sheen), cover colour by issuing convention (EU burgundy, green, red, black, default navy), flag plate from `country-flag-icons` (self-hosted SVG, server-rendered). Used on `/vize`, `/vize/<country>` and the embassy hub.

## 12. Search palette, display face, dock, globe (2026-11-10)

- **Search** (`components/SearchBox.tsx`, `/api/suggest`): grouped palette in the order emergency actions → guides → institution types → municipalities → institutions (branches inside the detected place first) → countries. Rows carry the type emblem (34 px), title with gold-tinted `<mark>` on the matched letters, a subtitle, the phone or count on the right, and an ↵ hint on the active row. Arrow keys move across groups; Enter opens the active row or runs the full search; Esc closes; Ctrl/Cmd+K focuses the field from anywhere. Empty field shows recent searches (localStorage, clearable) and six starting chips. Active row is `--surface-2`, never an accent tint: blue on faint blue failed the contrast check.
- **Display face**: Unbounded Variable (300–400) for headlines, numbers, dock titles and the wordmark; Bona Nova stays for serif accents; Commissioner text; JetBrains Mono labels. Hero H1 30/40/46 px because the face is wide.
- **Map dock**: the hover state of the 3D map lives in a glass strip at the bottom of the stage (`.m3-dock`), never a floating card over the labels. Hint when idle, name + stats + "Otvori →" when a unit is hovered.
- **Emblems**: faces are gradient-lit (top sweep, sides darker toward the ground), two floor shadows, idle float (5.2 s, per-instance delay) and a periodic sheen; hover tilts and lifts. All motion stops under reduced motion.
- **Globe** (`components/Globe3D.tsx`): 13,482 land dots sampled at 0.9° from Natural Earth 110m (public domain) with ISO codes; Serbia red, destination cobalt, arc as line + tube drawn in; drag, wheel, auto-rotate until touched; 2D equirectangular SVG of the same dots. Opens from the passport (`PassportGlobe`), cover rotates −62°.

## 13. Pickers, filters and inventory (2026-11-10 sweep)

- **One picker everywhere.** `components/Combobox.tsx` is the only way to choose from a list: type to filter (Cyrillic and diacritics fold), or open the list and pick; ↓↑ Enter Esc; Backspace on a picked value clears it. Native `<select>` is allowed only inside the lead forms. The municipality picker on guides and the country chooser on the visa stage are both Combobox.
- **Native controls inherit the site font** (`button, input, select, textarea { font: inherit }`) and never show the browser's double focus ring: one 3px accent ring, nothing else.
- **One heading face.** Every heading uses the display font (Unbounded); `.font-serif` is an alias that resolves to it. The serif (Bona Nova) survives only as the italic accent word in the home h1 and the big numerals in the vital block.
- **Visa stage.** `/vize` opens with `VisaStage`: the visitor's passport on the left (picked by typing or by clicking the globe), the Serbian passport on the right, the dotted globe between them. Picking a country repaints its dots, draws the arc from Serbia and turns the globe to face the midpoint; the button opens the country page at once (no delayed auto-navigation).
- **Branch hubs** (banks, insurers, telecom shops, national networks with more than 24 branches) start with `BranchFilters`: a place Combobox and brand chips, URL-driven (`?brend=&mesto=`); with a place picked the list is grouped by municipality, otherwise by district.
- **Ad inventory is one slim dashed line** (`AdSlot` → `.ad-line`, links to /partneri), never a grey box; at most two per page plus one sponsor card in the sidebar. A real sponsor replaces the line; an empty slot never shows twice on one page.
- **Place names inflect.** `lib/grammar.ts` `locative()` / `inPlace()` for "u Beogradu", "u Novom Sadu", "u Sremskoj Mitrovici"; use it in every sentence that puts a place after a preposition. Add irregulars to `EXC`.
- **Phones:** no 3D/2D toggle (3D is never offered under 768px) and no labels on the static district map under 640px.

## 14. Emblems v3 — rendered buildings (2026-11-10)

- Every institution type is a **rendered 3D building or object** (`apps/web/public/emblems/<key>.png`, 1024 px + `@256`, transparent, ≤30 KB). Scenes are declarative Three.js in `tools/emblems/` (`dsl.mjs` primitives, `buildings.mjs`, `objects.mjs`, `scenes.mjs`); `render.html` renders them headless through Playwright: `.venv/bin/python tools/emblems/render.py [key …]` from the repo root regenerates PNGs, `manifest.json` and the review sheet `_sheet.png`. Always look at the sheet before shipping a new key.
- Look: orthographic, elevation ≈32°, azimuth ≈38°, matte materials in the type's hue, hemisphere + one soft key light, a rounded paper slab that receives the shadow; every subject fitted to the same frame so emblems weigh the same on a page.
- `Glyph3D` serves the image when the key is in the manifest (SVG scenes remain the fallback); `lib/emblem-map.ts` maps org-type slugs to building keys (`emblemFor(slug, icon)`) and is used by the type hubs, institution pages, the search palette, the home bento and `/ikonice`. New type → add a slug there; new building → add a scene and re-render.
- Known weak keys: `paw`, `tooth`, `microscope`; `bank`/`bank-house` and `theater`/`theater-house` share a scene.

## 15. Theme v6 "Trobojka" and the living background (2026-11-10, late)

- **Palette is the flag.** Red `#c6363c` is the action colour (primary buttons, active chips, vital rule); blue `#0c4076` informs (links, pills, selection on the globe); ink is neutral charcoal `#17181c`, never navy; paper `#f7f5f0`. Dark mode is charcoal `#141416`, not navy. Gold `#b8912d` stays a hairline.
- **Textures everywhere, always subtle:** paper grain over the page (`.hz-grain`, multiply/screen), woven kilim rhombus on bands, linen on cards and the header, fabric weave on the hero's tricolour ribbon stack, leather on passport covers. Textures are SVG data URIs, never bitmaps.
- **Heritage layers** (`components/Heritage.tsx`, fixed, pointer-events none): far ocila cross lattice, mid relief contours top-right, near embossed Morava interlace ribbon on the right edge; parallax with pointer and scroll; hidden on phones where it would crowd content.
- **Depth, not flatness:** cards carry `--shadow-2` and a hairline, lift to `--shadow-3` with a red hairline on hover; hub emblems sit on a plinth with red/blue rings; the hero ribbon stack is three skewed planes with a drop shadow that follows the pointer.
- **Globe** (`lib/globe-engine.ts`): one engine for the visa stage and country pages. Natural Earth 110 m polygons (`public/geo/countries-110m.json`, tiny states as discs) painted into a texture; hover shows the country name and outline, click picks; selection fills the country blue with a white rim, draws the arc from Serbia and turns the globe; labels are DOM pills; Serbia is always red.
- **Passports** (`components/Passport.tsx`): CSS-3D booklets with the real cover colour (EU burgundy, US/UK navy, Switzerland red, Saudi green…), the national title and the national word for "passport", an emblem medallion (Serbia's arms cropped from the flag, flag elsewhere), chip symbol, page block, spine, float and hover-open. Add countries to `COVERS`.
- **Visa texts** are stored per locale in `countries.i18n` and `site_settings.visa_to_serbia_i18n` (sr/en/ru/de); the country page merges the locale's fields over the source. Re-translate with `importers/jobs/visa_i18n_export.py` → agents → `visa_i18n_load.py`.

## 16. Depth primitives (2026-11-10, night)

Reusable classes in `globals.css` §35, used across home, hubs, guides and institution pages:
- `.plinth` raised tile with a tricolour bottom edge (stats, district tiles, the municipality picker card);
- `.stack` paper stack under a card (contact panel, "where to go" cards);
- `.tab` red index slab with a blue shadow line (guide-card numbers);
- `.ledger` ruled paper with a red margin line (opening hours);
- `.disc` 3D numbered disc (guide steps); `.slip` document slip with a red-to-blue rule (checklists);
- `.fold` page-corner fold (guide index cards); `.deskframe` / map and globe stages framed like a desk pad with a tricolour ring;
- `.section-title` carries a red/blue pip. Use these before inventing a new surface.

## 17. Stage language — live emblem stages and journey boards (2026-11-10, evening)

The passport booklets and the visa globe set the bar: every section now opens with a stage, not a picture. One look for all
of them (`lib/stage-kit.ts`): orthographic camera at elevation 32° / azimuth 38°, hemisphere + warm sun with soft shadows +
cool fill, matte materials in the type hue, a rounded paper slab that receives the shadow, frame fitted like the poster PNG.
Scenes are the declarative DSL that also renders the PNGs; it now lives in `apps/web/lib/emblems/` (`dsl.mjs`,
`buildings.mjs`, `objects.mjs`, `scenes.mjs`, typed by the `.d.mts` files) and `tools/emblems/render.html` imports it from
there, so a poster and its live stage can never drift apart.

- **`EmblemStage`** (`components/EmblemStage.tsx`, engine `lib/emblem-stage.ts`): the poster PNG is server-rendered and
  always present; on ≥768 px with WebGL the engine loads on demand and cross-fades a live turntable of the same scene over
  it (same slab, lights and frame). Slow sway (±11°, 24 s), pointer parallax, drag with inertia like the globe; paused
  off-screen and in hidden tabs; static under reduced motion (drag still works). Under 768 px or without WebGL the poster is
  all there is. Used on type hubs (`.estage-hero`, 4:3 desk-framed), institution pages, district and municipality hubs
  (`.estage-org`, 150 px beside the title; town hall for the hubs).
- **`JourneyBoard`** (`components/JourneyBoard.tsx`, engine `lib/journey-stage.ts`): the procedure as a board. Station 0 is
  the responsible building (scaled to the frame) with the chosen seat pinned in red; the path is a paper ribbon to the next
  stations: documents fan out as paper slips, fees are a counter with an open ledger and coins, steps are numbered discs
  (one row to four, two staggered rows to eight), duration is a clock on a post, FAQ a question mark; the visa variant adds
  a stamp (apply) and a file slip (notes). The camera eases from station to station as the page scrolls — progress is read
  from the sections' positions (`id`s `gde ko dokumenta takse koraci trajanje faq`, `v-*` on country pages); nothing
  scroll-jacks. Labels are DOM pills projected from the scene; the active one is outlined red and a red halo pulses under
  the active station; the glass dock at the bottom shows `0k/0n · station · Listajte ↓`. The board is sticky in the right
  column on ≥1024 px (`.jstage-col`); under 1024 px it comes first in the DOM; under 768 px or without WebGL it is a flat
  layered SVG board with the same stations, and the active station still follows the scroll.
- **Country pages**: `VisaCountryStage` — the passport opens on its own (cover swings −64° on the spine) and the shared
  globe sits behind it with the Serbia → country arc; the globe mounts only on ≥640 px. Instruction steps carry station
  ids so the journey board follows them in the right column; visa-free countries get no board.
- **Hubs**: vital block columns are plinth tiles (top-aligned), group sections flip in, district cards wing in.

**How to add a station.** Give the section an `id`, push `{ id, kind, label, n? }` into the page's `stations` array in
the order the sections appear, and if it is a new `kind`, add a prop builder in `lib/journey-stage.ts` (a small group
built with the DSL, 2–4 units wide, standing on y = 0) plus its label height in the `switch`. Reuse an `OBJECTS` scene
scaled 0.4 before drawing something new.

**Budget and measurements (2026-11-10).** Engines are dynamic chunks (emblem 1.6 kB gz, journey 3.4 kB gz, scenes 22.4 kB
gz). First rendered frame measured on the dev build at 1440 px: 52 ms for a type-hub emblem (court), 60–65 ms for a guide
board (police building + 7 stations). One renderer per stage; pixel ratio capped at 2; shadow map 1024 (emblem) / 2048
(board). The globe engine loads on demand too (`VisaStage`, `Globe3D`): three.js (166.6 kB gz, grown from 125.9 kB by the
extrude/shadow/tube code the stages use) is now a lazy chunk fetched only when a stage or globe mounts on ≥768 px, so the
first-load JavaScript of every `/[...path]` page fell from 337.4 kB to 208.6 kB gzipped (Next's own figure: 346 → 214 kB).
Measure again with `next build` in a scratch copy and `app-build-manifest.json`; never build inside `apps/web` while a
dev server runs there. Known limits: the country stage holds its opening until the globe has painted (4 s fallback);
step-disc numerals are canvas textures and inherit the page font only if Unbounded is loaded; the board frame is fitted to
the building, so a very wide prop (8 discs) can touch the frame edge.

## 18. Home: the map is the page (2026-11-10, night)

- **Order.** Centred headline (one sentence: every public and private institution), then the centrepiece: the search panel
  docked over the top edge of the 3D map (`.hero-search`, glass, 860 px), the map itself (`.m3-stage.is-hero`, height
  `clamp(440px, 100svh − 356px, 760px)` so the whole country, the dock and the top of the index tabs fit the first
  viewport), then three **index tabs** hanging off the map's bottom edge (`.hero-index`): number, unit, section title.
  They replace the stat strip (same numbers, now also navigation) and scroll to their dossier.
- **Nothing sits on the country.** The search panel overlaps only the top strip of the stage and the dock only the
  bottom strip; `SerbiaMap3D` takes `padTop` / `padBottom` (64 / 70 on the home page), fits the model to the free area
  between them and shifts the picture into it with a camera view offset. The placeholder SVG is padded the same way.
  The index tabs sit fully below the stage. On screens up to 860 px tall the lede is dropped and the headline shrinks so
  the whole stage still fits the first viewport. No edge vignette on the hero stage (it dimmed the northern labels).
- **Deck of index cards** (`components/DossierDeck.tsx`, `.deck`): the three areas below (guides, institution types,
  districts) are one deck, not a column of sections, and nothing below the map is scroll-animated. The front card is
  readable; the other two stand behind it, turned ±2.5° and lifted 24 / 46 px, each with its own index tab in reach
  (tabs are staggered along the top edge). Changing card is a rotation: the front card swings out around the side
  (56 % across, 22° about its vertical axis), drops behind and tucks in at the back while the next card comes forward
  leaning the other way and straightens; the third crosses behind. 980 ms, one easing curve, Web Animations API with
  resting poses in one table (`poses()`), so there is no CSS transition to fight. Ways in: the tabs, the arrow
  buttons, ← →, dragging the card's top strip (the card follows the pointer and tilts, 80 px commits), swiping on
  touch, the index tabs under the map (`deck:go` event) and `#vodici` / `#vrste` / `#okruzi`. The card that arrives lays
  its contents out in a 45 ms cascade. All three panels are server-rendered; hidden ones are `inert`. The deck takes the
  front card's height. Reduced motion: instant swap. A timer settles the deck if the tab is backgrounded mid-turn.
  Phones: same deck with flat poses, numbers on the tabs and the card's title in the bar.
- **Opener.** Counts "public and private institutions" (`d.openerLabel`). An inline script in the layout head adds
  `html.opener-pending` before the first paint on a first home visit, which draws the paper curtain in CSS; the opener
  takes over in a layout effect, so the page never shows under it. The curtain rule must force `display: block`: an older rule hides `body::before`, which is why the first version of this fix did nothing.
  The curtain releases itself after 4 s if the script never runs.
- Phones: search panel in flow above the 2D map, popular chips in one swipeable row, index tabs as three compact tiles,
  dossiers without tilt.

## 19. Usability audit (2026-11-10) — rules that came out of it

Scripted pass over 14 page types at 375 and 1440 plus 900 spot checks (overflow, tap targets, names, labels, heading
order, text size, layout shift, console), then hands-on keyboard and tap flows.

- **A page is never wider than the screen.** Page grids declare `grid-cols-[minmax(0,1fr)]` at the base and their
  children get `min-width: 0`; `main` clips the x axis so reveal transforms cannot widen the document; long strings
  wrap (`overflow-wrap`). Found: source URLs in the correction block widened guide pages to 639 px on phones.
  `contain-intrinsic-size` with one value sets width too: use `contain-intrinsic-block-size`.
- **The card is the hit area.** A title link with class `hit` stretches over its card (`a.hit::after`); other links in
  the card sit above it. Used on institution lists, branch cards, municipality cards, guide index cards, missions.
- **FAQ rows toggle on the whole row** (`details.faq`), 48 px tall.
- **Touch targets** are at least 40 px for language links, emergency numbers, picker and search clear buttons; nothing
  readable is under 11 px.
- **Long lists** (`.cv-auto` sections on type hubs) use `content-visibility: auto`.
- Favicon exists (`app/favicon.ico`, `app/icon.svg`): the catch-all route no longer runs two database lookups to answer
  404 for it on every page view. Institutions without a place are grouped under "Ostalo", sorted last.
- Passed without changes: accessible names, input labels, one h1 and no skipped heading levels, image alt and sizes,
  layout shift (≤ 0.01), focus rings, Ctrl/Cmd+K, suggestion panel keyboard flow, skip link.
- Dev note: a second dev server in this checkout must run with `NEXT_DIST_DIR=.next-3101` (see `next.config.ts`);
  two servers sharing `.next` corrupt each other's cache.

## 20. Guides: tips, type links and the education ladder (2026-11-10)

- **Seven enrolment guides**, in ladder order under "Obrazovanje i deca": nursery and kindergarten, the preparatory
  preschool programme, first grade, secondary school, faculty and college, dormitory / loan / scholarship, recognition
  of foreign certificates and diplomas. Files in `db/guides/`, four languages each, loaded with
  `python -m importers.jobs.load_guides <folder>` (point it at a folder holding only the files you mean to load).
- **How they were made** (repeat this for the next type): `db/guides/BRIEF.md` is the research brief (official sources
  only, an evidence file per guide, nothing unverified in the text); `importers/jobs/validate_guides.py <folder>`
  checks structure, sr/en parity, banned wording, official hosts and that every cited URL loads. An editor then reads
  each guide against its evidence. Year-specific dates are allowed only with the school year named.
- **Tips** (`guide.<locale>.tips`): a "Saveti" section and a station on the journey board, between steps and duration.
  Tips follow from the official rules; no opinions, no promises.
- **Type links.** `getGuidesForType` puts "Kako se šta rešava" chips on every type hub and a card on every institution
  page of that type (with the institution's municipality pre-selected), so a school page leads to its enrolment guide.
- **Locale fallback is per field.** A guide whose Russian or German entry holds only a title still shows the full body
  (English, marked "EN"). In the "where to go" list an office named "Sedište" is titled by its institution.

## 21. Brand, footer and flow (2026-11-10, late night)

- **Logo** (`components/Logo.tsx`): a red map pin whose paper disc holds a small temple front (pediment, three columns,
  steps), with a blue shadow on the ground. Red, white and blue come from the object, so the mark carries the flag
  without a stripe. `LogoMark` is the pin alone, `Logo` the lockup with the wordmark (red question mark) and an optional
  mono sub-line. Header: 46 px mark, 21 px name, sub-line hidden on phones. Opener: the pin drops in above the words.
  Footer: 62 px lockup. `app/icon.svg` and `favicon.ico` are the same pin on a dark tile.
- **Header is 64 px** (69 with the ribbon). Sticky offsets under it use 69 px. While the opener plays, `main` sits above
  the header (`html.has-opener body > main`), so nothing shows over the curtain.
- **Footer is its own material, in the same heritage language as the page**: dark felt carrying the page's diamond
  lattice with the cross and four firesteels (ocila) in every diamond; a woven kilim band of stepped diamonds (red,
  cream, blue) as its top edge; a large embossed cross with firesteels cropped into the bottom-right corner, never
  under text. No generic patterns (waves, dots, stripes) anywhere: a texture is a Serbian motif or a material (paper,
  linen, leather). Firesteels turn their backs to the cross and open outward, as in the arms (the far background
  layer was drawn the other way round and is corrected). Brand lockup and tagline first, then four link columns and a
  base line. Same dark surface in light mode. It fades in once when it first comes into view; nothing moves.
- **Flow instead of scroll effects.** On client-side navigation the page's sections glide in once (`main.page-in`,
  0.6 s, layout effect so nothing flashes; the class is removed by a timer so a frozen tab can never keep content
  hidden). The first server-rendered paint is left alone. `[data-reveal]` elements in the first viewport arrive in one
  short cascade; everything below is simply there (`.rv-static`). No flips, wings or slide-ins triggered by scrolling.
- **Map panel.** On the home map the hovered district's totals sit in a panel beside the country (`.map-side` in 2D,
  the dock in 3D), never below the stage. 2D is drawn as a lit slab with a blue ramp, pill labels (largest districts
  first, labels that would collide are dropped unless hovered) and the hovered district lifted in red.

## 22. Documents as objects (2026-11-10, late night)

- **What.** A guide about a document shows that document in its hero (`components/Doc3D.tsx`, spec per guide slug in
  `lib/guide-docs.ts`). Three families: **card** (ID-1 proportions: identity card, driving licence, health card,
  registration card, residence permit, bank card, student card), **booklet** (passport, student book, school report
  book) and **sheet** (A4 certificates and decisions, a notary sheet with the tricolour cord, a landscape diploma).
- **Interaction, same bar as the passports.** It floats, leans toward the pointer with a moving sheen (and a hologram
  on ID cards), and answers a click, Enter or Space: a card flips to its back (MRZ, categories, barcode or magnetic
  stripe), a booklet opens to its data page, a sheet takes its stamp where "M.P." was. Reduced motion: no float or
  lean, the state still changes.
- **Honest illustration.** No state emblems, no personal data, generic field labels with bars for values, "UZORAK /
  SPECIMEN" in the machine-readable lines, and the caption says "Ilustracija dokumenta". Titles are the Serbian names
  with an English second line, as printed.
- **Layout.** With a document, the hero is text and municipality picker on the left, the document stage (`.docstage`)
  on the right; on phones the stage follows the picker. A guide without a spec keeps the old hero.
- **Adding one**: add the slug to `GUIDE_DOCS` with a form, colours and fields. CSS 3D only, no WebGL, no images.

## 23. Journey board, second pass (2026-11-10, late night)

- **Close-ups.** The building keeps the full frame; every other station fills the frame with its own model
  (`zooms`, about 2.5× closer), centred on the model's height so the dock never covers it. The camera dwells on a
  station for the first half of its section, then pulls back a little and travels on.
- **Models** (`lib/journey-props.ts`): who = three people of different ages with a suitcase behind a queue rope;
  documents = an open folder with fanned sheets, passport, ID card, photos and a pen; fees = a counter with a glass
  screen, card terminal, receipt, coins and notes under a sign ("RSD" on guides, neutral on visa pages via
  `Station.mark`); steps = a numbered staircase with a flag and a climber; tips = a lit bulb on a notebook;
  duration = a desk calendar and an alarm clock; questions = two people with a question and an answer bubble;
  apply = a laptop with the form, an envelope and a stamp. The first station gets trees and a street lamp.
- **Light.** The sun's shadow frustum follows the camera target with a tight extent, so shadows stay crisp close up.
  The model at the active station turns slowly and lifts a little; the rest are still.

## 24. Landmarks: every place has its own sight (2026-11-10)

- **What.** Each of the 145 cities and municipalities, the 27 city municipalities and the 25 districts shows a 3D emblem
  of the sight it is known for instead of the generic town hall: a monastery, fortress, tower, bridge, spa, mountain,
  lake, monument, what it grows, or the industry it lives from. A district takes the landmark of its seat.
- **Where.** In the hero of the district, city and municipality pages (live turntable, with the caption
  "Simbol: <name>"), on every municipality card of a district page, and on the city-municipality cards of a city.
- **How it is built.** Archetypes, not 172 hand-made models: `lib/emblems/landmarks.mjs` and `landmarks2.mjs` hold
  about 30 kinds (church, monastery, cathedral, mosque, fortress, tower, cityhall, palace, monument, bridge, spa,
  mountain, rocks, lake, river, dam, cave, windmill, farm, vineyard, produce, object, train, mine, powerplant,
  archaeology, ethno, park, highrise, civic), each with styles and a few options (wall and roof colour, number of
  domes, towers or arches). `lib/emblems/landmark-table.mjs` maps `lm-<slug>` (or `lm-<city>-<slug>`) to
  `[kind, style, options]`; `lib/landmarks.json` holds the name shown on the page, the source and whether the pick
  was edited. A seed per place varies trees and heights, so two churches are not identical.
- **Rendering.** Same pipeline as every emblem: `tools/emblems/render.py lm-<key> …` writes the poster PNGs and the
  manifest; the live stage builds the same scene. Pass keys through `xargs` (zsh does not split a variable).
- **Picks.** One web-checked pick per place (local tourist organisation or municipal site preferred), then an editorial
  pass that replaced weak or misplaced picks (for example Lepenski Vir for Majdanpek, Rtanj for Boljevac, Vinča for
  Grocka, the Bubanj fists for Niš-Palilula, Pobednik for the City of Belgrade and the Temple for Vračar). Places with
  no single famous building get what they are honestly known for (a river, a plain, a fruit), never an invented sight.
- **Adding or changing one**: edit the row in `landmark-table.mjs` and the name in `landmarks.json`, render that key.

## 25. Scale rules that came out of the second audit (2026-11-10, after the registry batch)

The site went from 15,000 to 28,000 entries in a day and pages that listed "everything" broke. Rules now in force:

- **No page lists by the thousand.** A city or municipality page shows each type that is small there in full (up to 12)
  and one tile per larger type with its count; the tile opens `/<type>?mesto=<place>` (city municipalities:
  `mesto=<city>/<municipality>`). A type page over 250 rows is paged (60 a page) with name, place and, where set,
  field filters. A national network on one page (bank branches, post offices) uses light one-line rows.
- **A one-city district is the city.** `/okrug/grad-beograd` redirects to `/beograd`; the home map and district tiles
  link there directly; the city page drops the district crumb.
- **City municipalities are looked up inside their city** (`getGO(parentId, slug)`): Belgrade and Niš both have a Palilula.
- **Counts per unit are one grouped query** (`UNIT_COUNTS` in `lib/db.ts`), never a correlated subquery per unit.
- **An entry's page says only what is true of it.** "Osnivač" appears only for budget users (they have a JBKJS); the
  source sentence and the correction block name the real source from `provenance`; register facts stored with the
  entry are shown with readable labels (`FACT_LABEL`), technical keys stay hidden.
- **People are not institutions.** Person registers (experts, mediators, administrators, appraisers, interpreters,
  notaries, enforcement officers, lawyers) are counted as "upisanih u registar".
- **Type names follow the locale** in the heading and the page title.
- **Audit method** (repeatable): a sweep of every page kind from the database (all districts, cities, municipalities
  and types, two entries per type, guides, a sample of countries, the other locales, filters and not-found), recording
  status, time, size, missing headings and raw-data leaks; then a sample of 700 internal links and all emblem images;
  then the main journey in a real browser with the console open.

## 26. Dropdowns, eyebrows and theme (2026-11-10, third audit)

- **A dropdown list never lives inside the thing it belongs to.** `Combobox` renders its list in a portal on `<body>`
  with fixed position, so a card with `overflow: hidden` (plinths, decks) cannot cut it. It opens downward, flips up
  when there is no room, is at least 260 px wide and never passes the screen edge. Use `Combobox` for every picker with
  more than a handful of options; native `<select>` only inside the short lead form.
- **Nothing scrolls sideways without saying so.** Brand chips wrap on a desktop; on a phone the row scrolls and fades
  at the right edge. The selected chip is ink on paper in both themes (`html:root .quick-chip.is-on`).
- **Names are never clipped to nonsense.** Lists that hold proper names wrap to two lines instead of one line with an
  ellipsis (vital block). A legal-form prefix is dropped only when a proper name follows it.
- **Uneven cards flow in columns, not in a grid** (`.vital-grid` uses CSS columns), so a tall card never leaves a hole.
- **Eyebrow** = the display face (Unbounded, 10 px, tracked) with the cross and four firesteels as its mark (`--crest`,
  a CSS mask, so it takes the text colour). No dash, no mono face. One rule in §51 of `globals.css` covers every small
  label that plays this role.
- **Theme.** Light and dark are both first-class. `ThemeToggle` writes `html[data-theme]` and `localStorage["gdi-theme"]`;
  the inline head script applies it before paint; without a stored choice the system setting decides. Every rule
  written for system dark needs its `[data-theme="dark"]` twin.
- **Header.** Logo, search (from `lg`), Guides, Roadmap, languages, theme, menu. The menu button is always there and
  holds what the bar does not: search (below `lg`), For foreigners, Visas, and on a phone the two nav links and the
  four languages. Do not add a fifth inline link; German and Russian labels will not fit.
- **Footer.** Three columns: guides, site, sources. Sources are links to the registers' own sites. No second language
  switch and no "Home" link (the logo is the home link).

## 27. Putokaz: roadmaps by situation (2026-11-10)

- `/putokaz` and `/putokaz/<slug>`; data in `lib/roadmaps.ts`, pages in `components/roadmap.tsx`. Five situations:
  coming to work, coming to study, starting a first business, moving with a family, new citizen or returnee.
- **A step is a pointer, never a copy.** Each step names a guide, a type of institution or the visa pages, with one
  sentence on why it comes at that point. Fees, deadlines and documents stay in the guide (one place to keep correct).
  A guide that is not published is simply not a step.
- The road is a numbered `ol` with a dashed spine; the first node is red. On a phone the jump chips are hidden (the
  road starts right under the title).
- Entry points: header link, home index tab and deck card, the foreigners page (situations first, then the offices,
  un-numbered so there is one order on the site, not two), and the sidebar of every city page.
- Each roadmap page carries `HowTo` structured data.

## 28. Four languages, all the way down (2026-11-10)

- **Interface text** uses `pick(locale, sr, en, ru, de)` from `lib/i18n.ts` or a per-locale table. A two-way
  `locale === "sr" ? … : "English"` switch is a bug: Russian and German readers get English.
- **Institution-type names** go through `tn(type, locale)`; guide categories through `catName()` (`lib/guide-cats.ts`).
- **Content the database holds in Serbian only** (guide deadlines, fee lines and their basis, type descriptions and
  FAQs, partner-form pitches, ad-slot notes) is translated in `lib/content-i18n/*.json`, keyed by the exact Serbian
  string and read with `tx(text, locale)`. A string that changes in the database falls back to Serbian until its
  translation is added, so nothing breaks. Server-side only (the files are large).
- **Stays Serbian by design:** institution and unit names, addresses, opening-hours text, landmark names, titles of
  laws and sources, text on the 3D documents. The generic unit name "Sedište" is the one exception (`unitName()`).
- Numbers and dates follow the locale (`toLocaleString(locale === "sr" ? "sr-Latn" : locale)`).
- Check: `scratchpad/i18n/rendered_scan.py <base> <locale>` lists Serbian interface words left on rendered pages.

## 29. Search engines (2026-11-10)

- `lib/seo.ts` `pageMeta()` builds the head for every page: canonical, hreflang for the four languages plus
  `x-default`, Open Graph and Twitter card with `/og.png` (1200×630, rendered from `scratchpad/og/og.html`).
- **Which query strings are pages.** On a type page `?mesto=` (a place), `?brend=` and `?strana=` are pages of their
  own: they stay in the canonical and the title names the place. `?q=` and `?oblast=` are search views: `noindex, follow`.
  The site search is `noindex` and disallowed in robots.
- Titles and descriptions are written per page kind in all four languages (`generateMetadata` in the catch-all route).
- Structured data: `WebSite` + `SearchAction` + `Organization` (home), `BreadcrumbList` (emitted by `Breadcrumbs`
  itself, so it always matches what is shown), `GovernmentOffice` / `LocalBusiness` / `ProfessionalService` with
  address, phone, hours and area served (institution pages; no coordinates for natural persons), `FAQPage` (guides and
  types), `HowTo` (roadmaps).
- `/sitemap.xml` is an index of the chunked sitemaps; robots lists it. Ownership tags for Search Console, Bing and
  Yandex come from the env vars `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `YANDEX_VERIFICATION`.
- Known limit: `<html lang>` is set to the page language on the client; the server HTML says `sr-Latn` with the right
  `lang` on the content wrapper.

## 30. Search: type what you need (2026-11-11)

- **One box, any wording.** The search answers needs, not just names: "izgubio sam pasoš", "zubar", "nema vode",
  "прописка", "Führerschein umtauschen", "apoteka novi sad", "banka intesa čačak", "kragujeavc". It runs on Postgres
  and plain code; there is no language model in it.
- **Lexicon** (`lib/search-lexicon.json`, about 4,300 terms in four languages for every guide, institution type,
  roadmap and section) maps everyday words, life events and problems to the target. `lib/search-lexicon-extra.json`
  is the hand-kept file: add a missing word there (`t` strong terms, `w` weak hints, optional `b` preference).
  The stored `search_synonyms` rows are still read (once, cached) and count as well.
- **Matching** (`lib/search-lexicon.ts`): diacritics and Cyrillic fold to one form; a light stemmer handles case
  endings; the word being typed matches as a prefix; one typo is forgiven from 5 letters and two from 9; a phrase
  that explains more of the query scores higher; a word that names few targets decides more than one that names many.
- **Places** are detected in Serbian case forms, in other languages' names (Belgrade, Белград, Belgrad) and with typos.
  A word the lexicon knows is never read as a place guess ("medijator" is not Medijana). "Opština", "grad", "city"
  next to a place belong to the place.
- **One scale, one best match** (`suggest()` in `lib/search.ts`). Every row gets a relevance figure: a recognised
  need about 2.3, an exact name 3 or more, a loose text match under 2. The best row leads as "Najbolji rezultat" when
  it is a clear answer and is preselected, so Enter opens it. Groups follow in the order of their best row.
  Rules: a guide leads over the office behind it for the same words; type + place opens the list of that type in that
  place (`/<type>?mesto=<place>#lista`) with the count there; a brand in a place leads unless the words are only a type.
- **Reachable everywhere.** Wide screens have the field in the bar. Elsewhere a search button in the header drops
  the spotlight under the bar (`HeaderSearch`). `Ctrl/Cmd+K` or `/` goes to the field on screen, else opens it.
- **The results page** (`/pretraga`) uses the same needs: best answer, roadmaps and sections under "Počnite ovde",
  guides, types (in the place when one was named), places, institutions. With no result it offers starting points.
- **Measuring.** `python3 tools/search/run.py <base> tools/search/cases_dev.py show` runs real queries against
  `/api/suggest` and checks the expected answer is within the first rows. `cases_dev.py` (224) is what the engine was
  tuned on; `cases_unseen_1.py` (122) and `cases_unseen_2.py` (52) were written afterwards. Before the rewrite the
  first set passed 130 of 224. A miss is fixed in the engine when it is a pattern, in the extra lexicon when it is a
  missing word. The `search_log` table records what people ran on the results page, with the result count.

## 31. Roadmaps by topic, calmer boards, search feedback (2026-11-11)

- **Roadmaps cover life, not only arrival.** 41 roadmaps in 11 topics (`ROAD_GROUPS` in `lib/roadmaps.ts`): the five
  newcomer ones are written in code, the life-situation ones live in `lib/roadmaps-more.json` (same shape plus `group`
  and search `terms`). The hub is grouped by topic with jump chips; the home card and the foreigners page show topic
  tiles or one topic, never all tiles. A step may carry an `only` tag ("ako ste nezaposleni"), which is how one road
  covers variants. Rules stay as in §27: a step points at a guide, a type or a page; no fees, deadlines or promises in
  the one-line reason. Health cards are "issued", never "stamped" (overa no longer exists).
- **Journey boards** sit further back (`WIDE`, `near` in `lib/journey-stage.ts`) so the next station is in view, and the
  camera follows the scroll at a capped speed (`FOLLOW`, `MAX_SPEED`), frame-rate independent.
- **Content that arrives on the same path is shown at once** (`Motion.tsx` watches for new `[data-reveal]` nodes):
  a new `?opstina=`, a filter or a page must never wait for a reveal that already ran.
- **Search order on equal evidence:** guide, then roadmap, then institution type. A roadmap is named by a phrase; a
  single word only hints at it. Guides and types are matched in memory (`getCatalog()`), so a keystroke costs one
  database round. A query that rests in the box without a best match is logged (`/api/suggest?miss=1`);
  `tools/search/misses.py` lists them so the word can be added to `search-lexicon-extra.json`.
- **Database use is a cost.** Run the search case files and page sweeps only when a change needs them, not as a habit.

## 32. Static by default (2026-11-11, after the Neon quota outage)

- **A page view must not cost database time.** Canonical pages (`/beograd`, `/banka`, `/vodic/pasos`, an institution,
  a roadmap) are static: `app/[...path]/page.tsx` is `force-static` with `revalidate = 86400`, made on the first visit
  and re-made once a day. Query parameters and cookies arrive empty there.
- **Request-time views go through the twin.** `middleware.ts` rewrites a request that has a view parameter
  (`q`, `mesto`, `strana`, `brend`, `oblast`, `opstina`), and a guide visit with a remembered municipality cookie, to
  `app/dyn/[...path]/page.tsx`, which renders the same page on demand. The address bar does not change; a direct visit
  to `/dyn/...` redirects to the real address; robots disallows `/dyn/`.
- **Adding a view parameter:** add it to `VIEW_PARAMS` in `middleware.ts`, or the static page will ignore it.
- Why: on 2026-11-11 the database plan quota ran out and every page returned 500, because every view queried the
  database. With static pages the database wakes for searches, filtered views, the daily re-make and imports only.
- Data changes show within a day. After a large import, redeploy (or add on-demand revalidation) to show it at once.

## 33. Phone walkthrough rules (2026-11-13)

A walk through the site at 375 px wide (home, search, menus, 21 structural pages, 28 institution pages of the 20 commonest
kinds, the three forms up to the submit button) found no page that scrolls sideways. What it did find became rules:

- **A map never traps the page.** `SerbiaMap` sets `touch-action: pan-y` at the whole-country view, so a finger drag
  that starts on the map scrolls the page; once the map is zoomed in or a district is open it is `none` and the drag
  moves the map. The home button brings back the whole country and with it page scrolling.
- **Clip, not hidden, around decoration.** A box with `overflow: hidden` can still be scrolled sideways by focus or by
  `scrollIntoView`; the home hero slid 140 px that way. Where decoration is wider than a phone (`.hero-open`,
  `.site-footer`, `.heritage`) the rule is `overflow: hidden; overflow: clip;`.
- **The action row is one row.** `.act-row` (call, directions, website under the page head) never wraps: below 430 px the
  word "Pozovi" is left out (the icon and the number say it, the link keeps its `aria-label`), and a longer language
  scrolls the row sideways. Wrapped, the sticky row and the header took a fifth of the screen.
- **A label column needs room for its longest word.** Below 480 px `.vital-row` puts the label above its values; the
  84 px column broke "administracija" in the middle of the word.
- **Finger sizes.** On a coarse pointer the branch-list toggle is 44 px high, branch rows get 9 px of padding, and form
  checkboxes are 18 px.
- **Form buttons are `btn-primary`.** A utility-class button (`bg-accent text-white`) lost its text colour to the global
  button rule and showed dark text on navy. Phone fields are `type="tel"`.
- **Related entries are the same kind first.** The "Povezano" list on an institution page orders the same kind first,
  then the same city municipality; before, a lawyer's page listed exchange offices because they sort first.
- **No jurisdiction line for a map-sourced private entry**, and its text block is headed "O instituciji", not
  "Podaci iz registra": the block itself says the data is not from a register.

Left as it is, noted for later: the national list of a branch network is long on a phone (health centres: 86 screens;
the place filter is at the top), eyebrow labels are 10 px, and the ad placeholder names the desktop size.

## 34. Page speed on phones (2026-11-13)

Measured with Lighthouse 12 (mobile, simulated slow 4G, 4x CPU slowdown) on nine live page types. Before: home 43;
institution page 83; list pages 88 and 99; Belgrade 84; guide 82; search 99; visas 72; roadmaps 99. No layout shift anywhere.

- **Serbian letters come from 3 kB files.** Fontsource keeps č ć đ š ž in each font's whole latin-ext file (Unbounded:
  118 kB), so every page fetched 160 kB of fonts for ten letters. `app/fonts/*-sr-wght-normal.woff2` hold only those
  letters (cut with `pyftsubset` from the Fontsource files, weight axis kept) and the `@font-face` rules at the end of
  `globals.css` come last, so they win. The full latin-ext file loads only on a page with another latin-ext letter.
  To re-cut after a font update: `pyftsubset <latin-ext file> --unicodes="U+0106,U+0107,U+010C,U+010D,U+0110,U+0111,U+0160,U+0161,U+017D,U+017E" --flavor=woff2 --layout-features='*'`.
- **Links do not prefetch.** `components/Link.tsx` is `next/link` with `prefetch={false}`; every component imports it
  instead of `next/link`. A directory page has hundreds of links and each one in view was fetched: Belgrade pulled 380 kB
  of other pages, and every prefetch is a request against the hosting plan. Pass `prefetch` to turn it on for one link.
- **No intro curtain on phones** (Nick, 2026-11-13). Below 768 px the home page shows at once: the curtain kept anything
  readable off the screen for about 3.6 s on a first visit, and up to 4 s blank on a slow phone before it gave up. The
  test is made twice and must stay the same in both places: the inline script in `app/layout.tsx` and `Opener.tsx`.
  From 768 px up the intro plays as before.
- **After the first two fixes:** home 85, institution page 96, lists 92 and 97, Belgrade 97, guide 94, search 100,
  visas 94, roadmaps 100; pages are 200 to 500 kB lighter.
- **Open, Nick's call.** The visa page loads the 3D globe on phones too (172 kB of script, about 2 s of processor time
  on a mid-range phone).
