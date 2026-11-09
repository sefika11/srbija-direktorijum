# Srbija Direktorijum javne uprave
## Blueprint, Part 2: Monetization placement map and the institution page template

Version 0.1, 2026-11-09. Covers brief items 3 (where ads and lead forms go, and how they stay inside Google's rules) and 5 (the page template). Builds on `db/schema.sql` and `db/seed_core.sql` from Part 1; every slot named here is a row in `ad_slots`. Two slots are added by `db/seed_patch_002_slots.sql`. Companion files: `templates/location_page.md` (the template), `templates/example_poreska_uprava_filijala_nis.md` (filled example), and the labelled wireframe artifact.

---

## 0. The principle that decides every placement

**The user gets what they came for before they see anything commercial.** A person landing on "Poreska uprava Filijala Niš" wants a phone number, an address and today's hours. Those three things are above the fold on every device, with no ad between the H1 and the first phone number. Every monetized element sits *after* a block that delivered value, and the lead form is phrased around the task the user is visibly doing.

This is not just manners. It is what keeps the site inside Google's rules (ads must not push content out of the first screen, ad density under 30% on mobile), it is what makes sponsors convert (a sponsor card under the address is read by someone who just solved their problem and is receptive), and it is what makes the site shareable, which is the only cheap traffic a directory gets.

---

## 1. The location page, zone by zone

Desktop is a two-column layout: main column 720px, right rail 300px, 1,056px content width. Mobile is one column with the rail's content folded into the flow. Numbers below are the rendered heights the CSS reserves.

| # | Zone | Desktop | Mobile | Slot (`ad_slots.code`) | Kind |
|---|---|---|---|---|---|
| 1 | Breadcrumb | main | full | | content |
| 2 | Leaderboard | 728×90 under breadcrumb | 320×100 | `loc_top_leaderboard` | programmatic |
| 3 | H1 + org name + verification chip + "Prijavi grešku" link | main | full | | content |
| 4 | Quick actions: Pozovi · Uputstva · Sajt · "Danas otvoreno do 15:00" | inline under H1 | sticky bar under header, 56px | | content |
| 5 | Key facts card: address (copy), phones, email, website, static map thumbnail | main | full | | content |
| 6 | Sponsor native card, labelled "Sponzor stranice" | main, full width, 120px | full, 140px | `loc_after_address_native` | sponsor (fallback: programmatic 336×280) |
| 7 | Opening hours: rad sa strankama + radno vreme + exceptions | main | full | | content |
| 8 | Nadležnost: municipalities covered (chips) + child units (ispostave) | main | full | | content |
| 9 | Lead form, vertical from `vertical_triggers` | main, 360px | full, collapsed to CTA button, expands in place | `loc_lead_form` | lead_form |
| 10 | Usluge na ovoj lokaciji: service list with documents + fees | main | full | | content |
| 11 | Affiliate line under the fees table (e.g. insurance on registracija vozila) | inline text | inline text | `loc_affiliate_after_fees` | affiliate |
| 12 | In-content ad | 336×280 | 336×280 (or 300×250) | `loc_in_content_1` | programmatic |
| 13 | O instituciji (org `description_md`) | main | full | | content |
| 14 | Česta pitanja (org type `faq_md` + location notes), FAQPage schema | main | full | | content |
| 15 | Povezano: other units of the same org nearby; same category in this JLS; "Takođe u Nišu" | main | full | | content |
| 16 | Correction block: "Izmeni podatke" button, last verification date, sources | main | full | | content |
| 17 | Bottom leaderboard | 728×90 | 320×100 | `loc_bottom_leaderboard` (new) | programmatic |
| R1 | Rail: sponsor card 300×250, sticky | rail top | folded after zone 7 as 300×250 card | `loc_sidebar_sponsor` | sponsor (fallback: programmatic 300×250) |
| R2 | Rail: "Druge jedinice u okrugu" + quick facts | rail | folded into zone 15 | | content |
| R3 | Rail: half-page ad 300×600, sticky below R2 | rail | not shown | `loc_sidebar_programmatic` (new) | programmatic |
| A | Mobile anchor 320×50, AdSense anchor format only | not shown | fixed bottom, dismissible | `loc_sticky_bottom_mobile` | programmatic |

### 1.1 Why each monetized zone is where it is

- **Zone 2, top leaderboard.** Standard, high viewability, and the only ad above the H1. On mobile it is 320×100, never 300×250, so the H1 and first phone number remain in the first screen on a 390px phone.
- **Zone 6, sponsor native card under the address.** The most valuable pixel on the site. The user has just read the address and phone; the card says "Knjigovodstvena agencija Kontić, Niš · Otvaranje firme i vođenje knjiga · Pozovi · Sajt". It is sold as a fixed monthly fee per location or per city. Same component as the rail card so one sponsor can buy both.
- **Zone 9, lead form after hours and coverage.** This is where the user has finished reading the "where and when" and is thinking about the "how". The form heading names the task ("Otvarate firmu? Lokalni knjigovođa vam šalje ponudu danas"). On mobile it is a single CTA button that expands the form in place, so the page stays short for people who only wanted the phone number.
- **Zone 11, affiliate line in the fees block.** Only where a service with fees is listed and an `affiliate_links` row matches. Marked "sponzorisani link", `rel="sponsored nofollow"`.
- **Zone 12, in-content ad after services.** Deep enough that only engaged readers see it; placed between two content blocks so it is never adjacent to a button.
- **Rail sponsor card (R1).** Sticky, so a desktop sponsor is on screen for the whole visit. On mobile it folds into the flow after the hours block as a second card, so sponsors buying the rail still get mobile exposure.
- **Rail half-page (R3)** only loads on desktop viewports ≥1200px. Highest-RPM programmatic unit in the layout.
- **Bottom leaderboard and mobile anchor** are pure programmatic floor.

### 1.2 Density check

| | Content height (typical page) | Programmatic ad pixels | Sponsor pixels | Ad share |
|---|---|---|---|---|
| Desktop main column | ~3,200px | 90 + 280 + 90 = 460 | 120 | 18% |
| Desktop rail | ~1,400px visible | 600 | 250 | rail is 22% of width |
| Mobile | ~3,600px | 100 + 280 + 100 + 50 anchor = 530 | 140 + 250 = 390 | 26% incl. sponsors, 15% programmatic |

Better Ads Standards cap mobile ad density at 30% of page height. We stay under it with sponsors counted, and well under with programmatic alone. The `lead_form` does not count as an ad.

---

## 2. Policy rules each slot must respect

The directory lives or dies by its AdSense account, and later by Ezoic's acceptance. These are the rules, mapped to how the template enforces them.

### 2.1 Google AdSense program policies

| Rule | Enforcement in the template |
|---|---|
| Ads must be clearly distinguishable from content; allowed labels are "Oglasi" / "Sponzorisani linkovi" (Google's "Advertisements" / "Sponsored Links"). No "Preporučujemo", no "Korisni linkovi" | Every programmatic container carries the label `Oglas`. Sponsor cards carry `Sponzor stranice`. Affiliate links carry `sponzorisani link` in-line. |
| No placement that encourages accidental clicks: never under a navigation element, never adjacent to a button, never mimicking the content's card style | The quick-action bar (zone 4) has no ad within 100px below it. Zone 12 sits between two text blocks. Sponsor cards use a visibly different surface (tinted background + label). |
| No more ads than content ("valuable inventory") | Density table above. Pages with `noindex` (thin data) render no programmatic units at all, only the sponsor fallback to house promos. |
| Ads must not be placed on pages without publisher content | A location page renders ads only when it has address plus at least one of contact or hours (the same rule as the index gate). |
| Sticky/anchor ads: on mobile use AdSense's own anchor format; custom fixed ads must not overlap content, must be dismissible, and must not exceed 30% of the viewport | Zone A is the AdSense anchor unit. The desktop rail is sticky because it is a normal unit inside a sticky column, which Google allows since the layout does not overlap content. |
| Privacy policy page required, and a TCF-registered consent management platform for EEA/UK visitors | `/privatnost` page in the footer of every template; CMP script loads before AdSense; Serbia is not EEA but the diaspora in Germany, Austria and Switzerland is. |
| No ads in emails, pop-ups, or on pages with the AdSense code inside iframes you don't control | Not applicable; one page, no pop-ups. |

### 2.2 Better Ads Standards (Chrome will filter all ads on a site that violates these)

Prohibited on mobile: pop-up ads, prestitials with or without countdown, ad density above 30%, flashing animated ads, auto-play video with sound, post-stitial with countdown, full-screen scroll-over ads, large sticky ads (over 30% of viewport). Prohibited on desktop: pop-ups, auto-play video with sound, prestitial with countdown, large sticky ads.

None of the slots above is any of these. The one thing to police is sponsor creatives: `creatives.is_approved` is set by an editor after checking no animation beyond a hover state, no "Kliknite ovde" bait, no imitation of system dialogs.

### 2.3 Google Search policies that touch monetization

- **Site reputation abuse**: applies to hosting third-party content for ranking purposes. Sponsor cards and lead forms are first-party commercial elements and are fine. Never let a sponsor publish articles under our domain.
- **Affiliate links**: `rel="sponsored"` on every affiliate and sponsor outbound link. Internal redirect `/go/{sponsorship_id}` logs the click to `ad_events` and 302s with the `rel` attribute on the anchor, not on the redirect.
- **Page experience**: every ad container has fixed `min-height` from `ad_slots.width/height`, so CLS stays near zero even when the ad does not fill.

### 2.4 Serbian law

- **Zakon o oglašavanju** requires advertising to be identifiable as such and the advertiser to be identifiable. The sponsor card shows the partner's name; the label says "Sponzor stranice".
- **Zakon o zaštiti podataka o ličnosti (ZZPL)** for lead forms: identify the controller (the site operator), the purpose (forwarding the request to one named partner), the retention (180 days, `leads.purge_after`), and the right to withdraw. One checkbox, unticked by default, linking to `/privatnost`. The consent text version is stored on the lead.
- Lead forms never ask for JMBG, ID numbers, or anything beyond name, phone, email and a free-text description.

---

## 3. Lead form: design for conversion without looking like a trap

### 3.1 Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ ● Lokalni partner                                        │  eyebrow, small caps
│ Otvarate firmu? Lokalni knjigovođa vam šalje ponudu     │  H3 from lead_verticals.pitch_lat
│ danas.                                                   │
│ Besplatno, bez obaveze. Odgovor radnim danima u roku     │  reassurance line
│ od 24h.                                                  │
│ ┌──────────────────┐ ┌──────────────────┐               │
│ │ Ime i prezime    │ │ Telefon          │               │  2 required fields
│ └──────────────────┘ └──────────────────┘               │
│ ┌──────────────────────────────────────────┐ ▾          │  1 select from form_schema
│ │ Oblik poslovanja                          │            │
│ └──────────────────────────────────────────┘            │
│ ☐ Kontaktirajte me preko Vibera                          │  Serbia-specific
│ ☐ Slažem se da se moj upit prosledi jednom partneru.     │  ZZPL consent, unticked
│   Politika privatnosti                                   │
│            [ Pošalji upit ]                              │  one button
│ Partner: Knjigovodstvo Kontić, Niš · Proveren partner    │  who receives it, when routed
└─────────────────────────────────────────────────────────┘
```

Rules:

- **Three visible fields maximum** on first render. Everything else from `form_schema` is shown after the first field gets focus (progressive disclosure), or on the thank-you step.
- **Phone is required, email optional.** Serbian SMBs call back; they do not email.
- **Viber checkbox.** Half of Serbia's business communication runs on Viber. Partners who can call back on Viber close more.
- **Name the recipient when there is one.** "Partner: Knjigovodstvo Kontić, Niš" turns an anonymous form into a referral. When no partner covers the territory, the line reads "Prosleđujemo proverenim knjigovođama u vašem gradu" and the lead is stored as `status = 'new'`, `partner_id = NULL`.
- **Unrouted leads are a sales asset.** "We have 14 unanswered accountant requests from Pirot this month" is the opening line of the sponsorship sales call. The admin view groups unrouted leads by vertical × okrug.
- **Thank-you step** shows the partner's phone (so the user can also call), a "Šta dalje" line, and nothing else. No upsell on the thank-you.
- **Anti-spam** without CAPTCHA: honeypot field, server-side rate limit per `ip_hash`, `dedupe_hash` per day. CAPTCHA kills conversion on Serbian mobile traffic.

### 3.2 Which vertical shows where

Resolved in this order: `services.lead_vertical_id` of the page's primary service → `vertical_triggers` by `org_type_id` (lowest priority number wins) → `vertical_triggers` by `service_category_id` → none (slot collapses, no empty box).

| Page | Vertical | Form heading |
|---|---|---|
| APR, Poreska uprava, LPA | knjigovodstvo | Otvarate firmu ili menjate knjigovođu? |
| RGZ katastar | geometar | Treba vam geometar za snimanje, parcelaciju ili ozakonjenje? |
| Osnovni / Viši / Privredni sud, javni izvršitelj | advokat | Treba vam advokat? Besplatna prva konsultacija. |
| MUP (registracija vozila service) | osiguranje-vozila | Registrujete vozilo? Uporedite ponude za obavezno osiguranje. |
| Dom zdravlja, RFZO | privatna-zdravstvena-ustanova | Želite pregled bez čekanja? |
| Predškolska ustanova | privatni-vrtic | Nema mesta u državnom vrtiću? |
| JP Urbanizam, sekretarijat za urbanizam | projektovanje-i-legalizacija | Gradite ili ozakonjujete? |
| Matična služba | sudski-prevodilac | Treba vam overeni prevod izvoda? |

Pages with no trigger (vodovod, biblioteka, mesna zajednica) show no form; the sponsor card and programmatic units carry those pages.

---

## 4. Sponsor card: the product we sell

One component, two sizes (full-width native 120px tall in zone 6; 300×250 in the rail), one data source (`creatives` joined through `sponsorships`).

```
┌──────────────────────────────────────────────────────────────┐
│ SPONZOR STRANICE                                             │
│ [logo]  Knjigovodstvo Kontić · Niš                           │
│         Otvaranje firme, paušal, DOO. Prva konsultacija      │
│         besplatna.                                           │
│         [ Pozovi 018 … ]  [ Sajt ↗ ]                         │
└──────────────────────────────────────────────────────────────┘
```

- Logo, name, city, one sentence (max 90 characters), two buttons. No more.
- "Pozovi" is a `tel:` link that also logs a `click` event; "Sajt" goes through `/go/{sponsorship_id}`.
- Surface is tinted (not white), with the label in small caps, so it is never mistaken for the institution's own contact block.
- Pricing is per target: a single location page, a whole JLS (every page inside the ltree subtree), or an okrug. The admin shows 30-day pageviews of the target from `page_stats_daily` next to the price so you can quote from data.

Suggested launch tiers (adjust once traffic data exists): one location page 3,000 to 6,000 RSD/month; a city's full set of pages 10,000 to 25,000 RSD/month for the 10 biggest cities; a vertical on a service page nationally, negotiated.

---

## 5. User correction block ("Prijavi grešku / Izmeni podatke")

Appears twice: as a small text link next to the verification chip under the H1, and as a full block at the bottom (zone 16).

```
┌──────────────────────────────────────────────────────────────┐
│ Da li su podaci tačni?                                       │
│ Poslednja provera: 12. okt 2026 · Izvor: purs.gov.rs,        │
│ sajt Grada Niša                                              │
│ [ Izmeni podatke ]  [ Prijavi da je zatvoreno / preseljeno ] │
│ Ispravke pregleda urednik pre objave. Hvala!                 │
└──────────────────────────────────────────────────────────────┘
```

Clicking opens an inline panel (not a modal on mobile) with the current values pre-filled and editable: street, number, phones, hours, website. The diff becomes `edit_suggestions.patch`. Optional email for "Javite mi kad bude ispravljeno". No account needed. Submission shows "Hvala, pregledaćemo u roku od 3 dana" and sets a 24-hour localStorage flag so the same person is not asked again on that page.

---

## 6. Mobile behaviour summary

- Header 56px + sticky quick-action bar 56px. Everything else scrolls.
- First screen on a 390×844 phone: breadcrumb, 320×100 ad, H1, verification chip, quick actions, start of the key facts card with the first phone number visible. Measured in the wireframe.
- Lead form collapsed to one 48px button "Zatraži ponudu knjigovođe" until tapped.
- Rail sponsor card folds in after hours; half-page unit not rendered.
- Anchor ad is AdSense's own, dismissible.

---

## 7. What the template encodes

`templates/location_page.md` is the canonical layout, in the order above, with `{{placeholders}}` bound to the columns and views from `schema.sql` (`v_location_page`, `location_contacts`, `opening_hours`, `location_coverage`, `location_services`, `pick_sponsorship()`, `vertical_triggers`). `templates/example_poreska_uprava_filijala_nis.md` is the same template filled for the Niš tax office with sample values, marked where a value must come from the database rather than from this document.

The wireframe artifact shows the same zones drawn to the reserved sizes at desktop and phone width, with each slot labelled by its `ad_slots.code`.
