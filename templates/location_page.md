<!--
  Location page template (page_template = 'location')
  Bindings: v_location_page (one row), location_contacts, opening_hours, opening_exceptions,
  location_coverage, locations (children), location_services + services, org_types,
  pick_sponsorship(), vertical_triggers + lead_verticals, affiliate_links, seo_overrides.
  Slot markers <!-- slot:CODE --> correspond to ad_slots.code. A slot with no sponsorship
  falls back to ad_slots.adsense_unit; a lead slot with no vertical collapses.
-->

<!-- head: title = seo_overrides.title ?? org_types.seo_title_tpl rendered; canonical; JSON-LD GovernmentOffice + BreadcrumbList + FAQPage -->

Početna › {{jls_name_lat}} › {{org_type_name_lat}} › {{unit_name_lat}}

<!-- slot:loc_top_leaderboard  728×90 desktop / 320×100 mobile · label "Oglas" -->

# {{org_name_lat}} – {{unit_name_lat}}
{{org_official_name_lat}}
{{#if verification == 'human_verified'}}✓ Provereno {{verified_at | date}}{{else}}Nepotvrđeno{{/if}} · [Prijavi grešku](#izmeni)

[📞 Pozovi]({{primary_phone | tel}}) · [Uputstva]({{maps_url}}) · [Sajt ↗]({{org_website}}) · {{today_status}}  <!-- "Danas otvoreno do 15:00" / "Danas zatvoreno" from opening_hours + opening_exceptions -->

## Kontakt i adresa
| | |
|---|---|
| Adresa | {{address_display}}{{#if address_extra}}, {{address_extra}}{{/if}}, {{postal_code}} {{settlement_name_lat ?? jls_name_lat}} [Kopiraj] |
| Telefon | {{#each contacts kind=phone}}{{value_display}}{{#if label}} ({{label}}){{/if}}{{/each}} |
| Email | {{#each contacts kind=email}}{{value}}{{/each}} |
| Sajt | {{org_website}} |
| Danas | {{today_hours_line}} |

![Mapa]({{static_map_url}}) <!-- static image, lazy, links to maps_url -->

<!-- slot:loc_after_address_native  native card · label "Sponzor stranice" · fallback programmatic 336×280 -->

## Radno vreme
**Rad sa strankama**
| Dan | Vreme |
|---|---|
{{#each hours type=rad_sa_strankama}}| {{day_name}} | {{opens}}–{{closes}}{{#if break_start}} (pauza {{break_start}}–{{break_end}}){{/if}} |{{/each}}

**Radno vreme zaposlenih**: {{hours_summary type=radno_vreme}}
{{#if exceptions}}**Izuzeci**: {{#each exceptions}}{{on_date}} – {{reason}}{{/each}}{{/if}}
{{#if hours_text}}_{{hours_text}}_{{/if}}

## Nadležnost
Ova jedinica je nadležna za: {{#each coverage}}[{{tu_name_lat}}](/{{tu_slug}}){{/each}}
{{#if children}}**Ispostave i odeljenja**: {{#each children}}[{{unit_name_lat}}](/{{org_slug}}/{{slug}}) – {{address_display}}{{/each}}{{/if}}
{{#if parent_location}}Matična jedinica: [{{parent.unit_name_lat}}](/{{org_slug}}/{{parent.slug}}){{/if}}

<!-- slot:loc_lead_form  vertical = resolve(service → org_type → category) · collapsed to CTA on mobile -->
> **Lokalni partner** · {{vertical.pitch_lat}}
> Besplatno, bez obaveze. Odgovor radnim danima u roku od 24h.
> [Ime i prezime] [Telefon] [{{form_schema[2].label}} ▾]
> ☐ Kontaktirajte me preko Vibera   ☐ Slažem se da se moj upit prosledi jednom partneru. [Politika privatnosti](/privatnost)
> [ Pošalji upit ]
> {{#if routed_partner}}Partner: {{partner.name}}, {{partner_city}} · Proveren partner{{else}}Prosleđujemo proverenim partnerima u vašem gradu.{{/if}}

## Usluge na ovoj lokaciji
{{#each services}}
### [{{name_lat}}](/usluge/{{slug}}/{{jls_slug}})
{{summary}}
**Potrebna dokumenta**: {{#each required_documents}}{{.}}; {{/each}}
**Takse**: {{#each fees}}{{name}} {{amount_rsd}} RSD (račun {{account}}, model {{model}}){{/each}}{{#if local_fee_rsd}} · Lokalna taksa {{local_fee_rsd}} RSD{{/if}}
{{#if note}}_{{note}}_{{/if}}{{#if online_available}} · [Dostupno online na eUpravi ↗]({{euprava_url}}){{/if}}
<!-- slot:loc_affiliate_after_fees  inline, rel="sponsored nofollow", label "sponzorisani link" · only if affiliate_links matches -->
{{/each}}

<!-- slot:loc_in_content_1  336×280 · label "Oglas" -->

## O instituciji
{{org_description_md}}

## Česta pitanja
{{org_type_faq_md}}
{{#if notes_md}}**Napomena za ovu lokaciju**: {{notes_md}}{{/if}}

## Povezano
**Druge jedinice: {{org_name_lat}} u {{okrug_name_lat}}u** – {{#each siblings_in_okrug}}[{{unit_name_lat}}](/{{org_slug}}/{{slug}}){{/each}}
**{{org_group_label}} u {{jls_name_lat}}u** – {{#each same_group_in_jls}}[{{org_name_lat}}](/{{org_type_slug}}/{{org_slug}}){{/each}}
**Takođe u {{jls_name_lat}}u** – [Sve institucije](/{{jls_slug}})

## Da li su podaci tačni? {#izmeni}
Poslednja provera: {{verified_at | date}} · Izvor: {{#each sources}}{{name}}{{/each}}
[ Izmeni podatke ]  [ Prijavi da je zatvoreno / preseljeno ]
Ispravke pregleda urednik pre objave.

<!-- slot:loc_bottom_leaderboard  728×90 / 320×100 · label "Oglas" -->

<!-- rail (desktop ≥1024): slot:loc_sidebar_sponsor 300×250 sticky · "Druge jedinice u okrugu" · slot:loc_sidebar_programmatic 300×600 (≥1200 only) -->
<!-- mobile: slot:loc_sticky_bottom_mobile  AdSense anchor 320×50, dismissible -->

Footer: O sajtu · Partneri i oglašavanje · Politika privatnosti · Uslovi · Izvori podataka
