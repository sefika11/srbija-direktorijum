# informator.poverenik.rs scout (2026-11-12)

Verdict: OPEN for reading. No login, CAPTCHA, bot check or rate-limit message met. Everything below was done anonymously, <=1 request/s, normal browser UA.
Total requests made: ~1 (shell) + 1 (bundle) + 151 list calls (+2 reconnects) + 61 method calls for 30 booklets + a few probes.

## 1. List of bodies
* Meteor 2.8.2 app. Root HTML is a shell; one bundle `/3b2920e1...js?meteor_js_resource=true` (8.4 MB). Hash changes on deploy.
* Public front page (`/`, `/naslovna`) calls the DDP **method** `front_org.search` (anonymous).
  * `front_org.search({published:true})` -> `{result:[50 rows], total_count, load_more:{timestamp, load_more}}`
  * Row: `{org_id, naziv, sediste, categories_label ("A | B | C" category path), publishedDate (display string)}`
  * Next page: same call with `{published:true, publishedAt:{$lt:<load_more.timestamp>}}` (newest first). Repeat until `result` empty / `load_more.load_more` false.
  * Other keys the UI puts in the same query object: `searchField:{$regex:...}` (name search), plus filter keys named after the filter type (place = `sediste`, category fields) - not needed.
* **Bodies with a published booklet: 7,519** (151 pages x 50; verified by crawling all; saved in `bodies_list.json`). Unpublished/inactive bodies are not listed.
* Mix (by name/category): ~1,216 state primary schools, ~460 secondary schools, ~2,335 names starting "Месна заједница" (mesne zajednice DO exist), ~213 Opštinska/Gradska uprava, 113 domovi zdravlja, 131 centri za socijalni rad, 64 osnovni sudovi, 25 ministries, ~72 public enterprises etc. Category path in `categories_label` also encodes the city/municipality for local bodies.
* Other public methods in the bundle: `registerSearch` (login-area, not needed), `org.one`, `sidebar.one`, `chapterPubOne`, `chaptersPubAll`. `chapterspubgen`/`publishReqcheck`/`auth.*`/`super_admin.*` need login - not used.

## 2. What a booklet holds
`org.one(org_id)` (anonymous) returns only the thin record: `_id, naziv, kategorija, prvaKlasifikacija, drugaKlasifikacija, adresa, sediste, activStatus, published, publishedAt (ms), firstTimePublishedAt, pub_times[]`. (`adresa` is just the street; no phone/mail.)

`chaptersPubAll({org_id, publishedAt})` (publishedAt = value from org.one) returns the whole booklet: a list of ~21 chapters (`title_cir`, `sections[]` -> `cards[]` -> `components[]`, each component `{label_cir, value, metapub}`; rich text is Quill `{ops:[{insert}]}`).
Chapter "Основни подаци о органу јавне власти и информатору", section "Основни подаци о органу јавне власти", card "Основни подаци" - exact `label_cir` values (present in 30/30 sampled):
| field | label_cir |
|---|---|
| name | Назив |
| address | Адреса (улица и број) |
| postal code | Поштански број |
| seat/city | Седиште |
| registry no. (MB) | Матични број (МБ) |
| tax no. (PIB) | Порески идентификациони број (ПИБ) |
| e-mail | Адреса електронске поште одређене за пријем електронских поднесака органа |
| website | Интернет страница органа јавне власти |
| hours | Подаци о радном времену органа јавне власти |
| accessibility | Подаци о приступачности особама са инвалидитетом објеката које орган јавне власти користи |

* **There is NO switchboard/general phone field** in the basic data. Phones exist only as per-person contacts: (a) same chapter, later cards: "Лице одређено за унос података" and "Лице овлашћено за поступање по захтевима" each with `Контакт телефон` + `Адреса електронске поште`; (b) chapter "Имена, подаци за контакт и опис функција руководилаца организационих јединица": per head `Име и презиме / Контакт телефон / Адреса електронске поште / Назив функције / Опис функције` (head of body first, then "Руководилац унутрашње организационе јединице" list). Phones there are often direct lines or the shared switchboard (RGZ: 0700 500 500).
* **Organisational units**: chapter "Организациона структура (органиграм)" is only an uploaded chart (file ids) + link to systematisation; units are NOT structured with their own address/phone/hours. Only the unit heads (name, function, phone, mail) are structured. No per-unit address or hours field exists. (Branches/separate buildings occasionally appear as free text in the address, e.g. court "Трг ослобођења 30, као и пр...", or in rich-text `hours`.)
* Other chapters (21 total): legal basis, competences, services, public procurement, finances, salaries, registers, etc. - rich text/tables/uploads, not needed for contact data.

### Sample fill rate (30 bodies, sample.json; field present and non-placeholder)
address 27-30 (3 are placeholders like "нема улице бб"/"Радљево"; some have 2 sites in one string), postal_code 30, city 30, MB 29, PIB 29, e-mail 29 (1 is "/"), website 28, hours 29 but free text (8 longer than 60 chars, e.g. "Радно време Мин. ..." / per-service schedules; not parseable uniformly). Heads' phones: 30/30 bodies have >=1, 27/30 have a real number other than the generic 0700 500 500. Placeholders "Нема података." appear (one mesna zajednica had MB/PIB/hours = that). Free-text formatting varies ("07,30 до 15,30", "7:30-15:30", "од 8,00 до 16,00"). All text is Serbian Cyrillic. Two mesne zajednice use their municipality's mail domain.
Data freshness: `publishedAt` per body (most recently re-published in 2026; RGZ re-published ~40 times).

## 3. Fetching without a browser
Yes. Plain DDP, anonymous, no token. 
* Transport gotcha: SockJS HTTP fallback (`/sockjs/<n>/<sid>/xhr` + `xhr_send`) does NOT work (xhr_send answers 404/500). Use the **WebSocket**: `wss://informator.poverenik.rs/sockjs/<3 digits>/<8 chars>/websocket`. Frames: server `o`, then `a["<json>"]`; client sends `["<json>"]`. DDP: send `{"msg":"connect","version":"1","support":["1"]}`, wait `connected`, then `{"msg":"method","method":"org.one","params":["gWH7wSzSea6tvjxLu"],"id":"1"}` -> `{"msg":"result","id":"1","result":{...}}`. Answer `{"msg":"ping"}` with pong. The server drops the socket about every 2,000-2,500 list rows with `c[3000,"No response from heartbeat"]` -> just reconnect and repeat the call (calls are stateless).
* No `websockets` lib in the venv (only `requests`), so `ddp.py` is a stdlib raw RFC6455 client (ssl+socket), throttled to 1 call/s. `fetch_one.py <org_id>` prints the structured JSON.
* Minimal example (RGZ):
  `python3 fetch_one.py gWH7wSzSea6tvjxLu` ->
  `{"name":"Републички геодетски завод","address":"Булевар војводе Мишића број 39","postal_code":"11040","city":"Београд","mb":"07004966","pib":"100147152","email":"office@rgz.gov.rs","website":"https://www.rgz.gov.rs/","hours":"7:30-15:30","contacts":[{"person":"Душица Лакић","phone":"011 715 26 50",...}], "unit_heads":[{"person":"Далибор Бабић","phone":"0700 500 500","email":"office@rgz.gov.rs","function":"в. д. директора"},...]}`
* Human URL pattern: `https://informator.poverenik.rs/informator?org=<org_id>` (optional `&code=<lang>`); also route `/informator/:org_id`. The "Преузимање" PDF is generated **in the browser** (pdfmake, from `chaptersPubAll`) - there is no server PDF URL, so nothing to download; the DDP data is the better source anyway. No JSON/REST endpoint was found.
* Caveat: the second part of the booklet contacts (`contacts`) was added to fetch_one.py after the 30-booklet cap was reached, so sample.json has `contacts` only for RGZ (verified offline on its saved chapters); the other 29 rows have `unit_heads` phones only.

## 4. Limits
* No login, CAPTCHA or bot check on any read path. The bundle contains reCAPTCHA/accounts code only for the editors' sign-up/login. No rate-limit response seen at 1 req/s (a short 151-call crawl). No terms-of-use text found in the bundle or routes (routes: /, /naslovna, /informator, /informator/:org_id, plus editor routes behind login). robots.txt = 404.
* Only the heartbeat disconnect noted above. Poverenik is the public-authority data controller; booklets are published public information, but a licence/reuse statement was not found - worth one line to Poverenik if the data is republished.
* Full read estimate: 151 list calls + 2 calls per body (org.one for `publishedAt`, then chaptersPubAll) = ~15,200 calls ~ 4.2 h at 1/s (one connection). If `chaptersPubAll` accepts a missing `publishedAt` (not tested; cap reached) it would be ~7,700 calls. Each booklet response is large (all 21 chapters, rich text), roughly a few hundred KB, so expect several GB in total for a full read.

Files: ddp.py, fetch_one.py, crawl_list.py (list crawler), run_sample.py, bodies_list.json (all 7,519), sample.json (30 bodies), sample_picks.json, chapters_rgz.json / org_one_rgz.json (raw RGZ booklet), app.js (bundle).
