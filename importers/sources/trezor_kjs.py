"""Tier 0: Uprava za trezor, Spisak korisnika javnih sredstava (KJS) — the universe of public bodies.

Verified layout of the monthly XLS (2026-10-31 snapshot, 10,363 data rows, sheet 'Списак КЈС'):
  header at row 5, 9 columns:
    0 Ознака трезора        '601' republic, '581' AP Vojvodina, else a LOCAL treasury code = one JLS / gradska opština
    1 Јединствени број КЈС  JBKJS, 5 chars today, alphanumeric from 2026 → text
    2 Назив КЈС             UPPERCASE Cyrillic
    3 Место КЈС             seat place, mixed case, sometimes 'Београд (Нови Београд)'
    4 Матични број          8 digits — NOT unique per KJS (indirect users carry the parent's MB)
    5 ПИБ                   9 digits — same caveat
    6 Тип КЈС               0 budget itself · 1 direct budget user · 2 indirect budget user · 6 agencies/other public
                            7 companies (JP, d.o.o.) · 9 social-insurance orgs (RFZO, PIO, NSZ) · 10 RFZO-funded health inst.
    7 ДБК                   'code-NAME' of the direct budget user above this row (a KJS or a budget programme line)
    8 ОЈ Управе за трезор   'code-NAME' of the Treasury branch serving this KJS (146 distinct → uprava-za-trezor locations)
  section rows (col1 empty): 'ГРАДОВИ', 'ОПШТИНЕ', 'Трезор 581', 'II ОСТАЛИ ...' give jurisdiction context.

Snapshot URL: https://www.trezor.gov.rs/files/services/kjs/arhiva/{YYYY}/Spisak KJS_{YYYY}_{MM}_{DD}.xls

  python -m importers.sources.trezor_kjs --inspect [--file path.xls]
  python -m importers.sources.trezor_kjs [--date 2026-10-31] [--file path.xls]
"""
from __future__ import annotations

import argparse
import calendar
import collections
import datetime as dt
import json
import re
import sys
from pathlib import Path

import xlrd

from ..common import db
from ..common.http import PoliteClient
from ..common.normalize import clean_ws, cyr_to_lat

SOURCE = "trezor_kjs"
ARCHIVE = "https://www.trezor.gov.rs/files/services/kjs/arhiva/{y}/Spisak%20KJS_{y}_{m:02d}_{d:02d}.xls"
REPUBLIC, VOJVODINA = "601", "581"

# ---------------------------------------------------------------------------------------------
# Classification: ordered rules on the UPPERCASE Cyrillic name → org_types.slug. First hit wins.
# ---------------------------------------------------------------------------------------------
RULES: list[tuple[str, re.Pattern]] = [(slug, re.compile(rx)) for slug, rx in [
    ("mup-policijska-uprava",   r"^МИНИСТАРСТВО УНУТРАШЊИХ ПОСЛОВА|^ПОЛИЦИЈСКА УПРАВА"),
    ("lokalna-poreska-administracija", r"ЛОКАЛН[АЕ] ПОРЕСК|ГРАДСКА ПОРЕСКА|ОПШТИНСКА ПОРЕСКА|ПОРЕСКА АДМИНИСТРАЦИЈА"),
    ("poreska-uprava",          r"^(МФ-)?ПОРЕСКА УПРАВА"),
    ("uprava-za-trezor",        r"УПРАВА ЗА ТРЕЗОР"),
    ("rgz-katastar",            r"РЕПУБЛИЧКИ ГЕОДЕТСКИ ЗАВОД"),
    ("apr",                     r"АГЕНЦИЈА ЗА ПРИВРЕДНЕ РЕГИСТРЕ"),
    ("rfzo",                    r"РЕПУБЛИЧКИ ФОНД ЗА ЗДРАВСТВЕНО ОСИГУРАЊЕ"),
    ("pio-fond",                r"ФОНД (ЗА )?ПИО|ФОНД ЗА ПЕНЗИЈСКО"),
    ("nsz",                     r"НАЦИОНАЛНА СЛУЖБА ЗА ЗАПОШЉАВАЊЕ"),
    ("ministarstvo",            r"^МИНИСТАРСТВО"),
    ("upravni-okrug",           r"УПРАВНИ ОКРУГ"),
    ("pokrajinski-sekretarijat", r"ПОКРАЈИНСКИ СЕКРЕТАРИЈАТ"),
    ("apelacioni-sud",          r"АПЕЛАЦИОНИ СУД"),
    ("upravni-sud",             r"УПРАВНИ СУД"),
    ("privredni-sud",           r"ПРИВРЕДНИ СУД|ПРИВРЕДНИ АПЕЛАЦИОНИ"),
    ("prekrsajni-sud",          r"ПРЕКРШАЈНИ СУД|ПРЕКРШАЈНИ АПЕЛАЦИОНИ"),
    ("visi-sud",                r"ВИШИ СУД"),
    ("osnovni-sud",             r"ОСНОВНИ СУД"),
    ("vise-javno-tuzilastvo",   r"ВИШЕ ЈАВНО ТУЖИЛАШТВО"),
    ("osnovno-javno-tuzilastvo", r"ОСНОВНО ЈАВНО ТУЖИЛАШТВО"),
    ("pravosudni-organ",        r"СУД|ТУЖИЛАШТВО"),
    ("centar-za-socijalni-rad", r"ЦЕНТАР ЗА СОЦИЈАЛНИ РАД"),
    ("dom-zdravlja",            r"ДОМ ЗДРАВЉА"),
    ("zavod-za-javno-zdravlje", r"(ЗАВОД|ИНСТИТУТ) ЗА ЈАВНО ЗДРАВЉЕ"),
    ("apoteka",                 r"АПОТЕК"),
    ("opsta-bolnica",           r"ОПШТА БОЛНИЦА|СПЕЦИЈАЛНА БОЛНИЦА|КЛИНИЧК|ЗДРАВСТВЕНИ ЦЕНТАР|^ИНСТИТУТ ЗА|БОЛНИЦА"),
    ("fakultet",                r"ФАКУЛТЕТ"),
    ("univerzitet",             r"УНИВЕРЗИТЕТ"),
    ("visoka-skola",            r"ВИСОКА ШКОЛА|АКАДЕМИЈА СТРУКОВНИХ|ВИСОКА ТЕХНИЧКА|ВИСОКА ПОСЛОВНА|ВИСОКА ЗДРАВСТВЕНА|^АКАДЕМИЈА"),
    ("studentski-dom",          r"СТУДЕНТСКИ ЦЕНТАР|СТУДЕНТСКИ ДОМ|ДОМ УЧЕНИКА|УЧЕНИЧКИ ДОМ|СТУДЕНТСКО ОДМАРАЛИШТЕ"),
    ("predskolska-ustanova",    r"ПРЕДШКОЛСКА УСТАНОВА|ДЕЧ(И|Ј)ЈИ ВРТИЋ|^ПУ "),
    ("osnovna-skola",           r"ОСНОВНА ШКОЛА|^ОШ |ОСНОВНА МУЗИЧКА|ШКОЛА ЗА ОСНОВНО"),
    ("srednja-skola",           r"ГИМНАЗИЈА|СРЕДЊА|ТЕХНИЧКА ШКОЛА|ЕКОНОМСК[АО] ШКОЛА|МЕДИЦИНСКА ШКОЛА|ШКОЛСКИ ЦЕНТАР|ПОЉОПРИВРЕДНА ШКОЛА|ХЕМИЈСК|МАШИНСКА ШКОЛА|ЕЛЕКТРОТЕХНИЧКА|УГОСТИТЕЉСК|ТРГОВАЧКА ШКОЛА|ШКОЛА"),
    ("narodna-biblioteka",      r"БИБЛИОТЕКА"),
    ("muzej",                   r"МУЗЕЈ|АРХИВ|ГАЛЕРИЈА"),
    ("kulturni-centar",         r"КУЛТУРН|ДОМ КУЛТУРЕ|ЦЕНТАР ЗА КУЛТУРУ|ПОЗОРИШТЕ"),
    ("sportski-centar",         r"СПОРТСК|СПОРТА"),
    ("turisticka-organizacija", r"ТУРИСТИЧКА ОРГАНИЗАЦИЈА"),
    ("jkp-vodovod",             r"ВОДОВОД"),
    ("jkp-toplana",             r"ТОПЛАНА|ГРЕЈАЊЕ|ТОПЛИФИКАЦИЈ|ЕНЕРГЕТИКА"),
    ("jkp-parking-servis",      r"ПАРКИНГ"),
    ("jkp-zelenilo",            r"ЗЕЛЕНИЛО"),
    ("jkp-pijace",              r"ПИЈАЦ|ТРЖНИЦ"),
    ("jkp-pogrebne-usluge",     r"ПОГРЕБН|ГРОБЉ"),
    ("jkp-gradski-prevoz",      r"ГРАДСКИ ПРЕВОЗ|ГРАДСКО САОБРАЋАЈНО|АУТОТРАНСПОРТ|ПРЕВОЗ ПУТНИКА"),
    ("jkp-cistoca",             r"ЧИСТОЋА|КОМУНАЛАЦ|КОМУНАЛНО|ХИГИЈЕНА|^ЈКП|ЈАВНО КОМУНАЛНО"),
    ("jp-urbanizam",            r"УРБАНИЗ|ДИРЕКЦИЈА ЗА (ИЗГРАДЊУ|УРБАНИЗАМ|ПЛАНИРАЊЕ)"),
    ("jp-posta-srbije",         r"ПОШТА СРБИЈЕ"),
    ("eps-distribucija",        r"ЕЛЕКТРОДИСТРИБУЦИЈА|ЕЛЕКТРОПРИВРЕДА"),
    ("uprava-gradske-opstine",  r"ГРАДСКА ОПШТИНА"),
    ("gradska-uprava",          r"ГРАДСКА УПРАВА"),
    ("opstinska-uprava",        r"ОПШТИНСКА УПРАВА"),
    ("mesna-zajednica",         r"МЕСНА ЗАЈЕДНИЦА|^МЗ "),
    ("sekretarijat",            r"СЕКРЕТАРИЈАТ|ОДЕЉЕЊЕ ЗА|СЛУЖБА ЗА|УПРАВА ЗА"),
]]
FALLBACK = {  # (tip, scope) → generic slug
    ("1", "local"): "organ-jls", ("1", "republic"): "drzavni-organ", ("1", "pokrajina"): "drzavni-organ",
    ("2", "local"): "ustanova", ("2", "republic"): "ustanova", ("2", "pokrajina"): "ustanova",
    ("10", "republic"): "ustanova", ("10", "local"): "ustanova", ("10", "pokrajina"): "ustanova",
    ("6", "republic"): "drzavni-organ", ("6", "local"): "organ-jls", ("6", "pokrajina"): "drzavni-organ",
    ("9", "republic"): "drzavni-organ",
    ("7", "republic"): "javno-preduzece", ("7", "local"): "javno-preduzece", ("7", "pokrajina"): "javno-preduzece",
}
ACRONYMS = {"ЈКП", "ЈП", "ЈКСП", "ЈУ", "ОШ", "СШ", "ПУ", "ЦСР", "ДЗ", "АП", "РС", "МУП", "РФЗО", "ПИО", "НСЗ", "АПР",
            "РГЗ", "ЗЗЈЗ", "ОЈТ", "ВЈТ", "ДОО", "АД", "ЈВП", "ЈПК", "КБЦ", "КЦ", "СЦ", "ТО", "МЗ", "УГ", "ГО", "СО", "МФ",
            "ЕПС", "ЕМС", "ЈАТ", "РТС", "РТВ", "ПТТ", "НБС", "СПЦ", "ХЕ", "ТЕ", "ПД", "ОД", "КОД", "ПИБ"}
SMALL = {"и", "за", "у", "на", "о", "од", "из", "са", "при", "по", "ка", "до", "без", "кроз", "а", "ни", "те", "ради"}
# common institutional vocabulary (inflected forms) that Serbian orthography writes in lowercase inside a name
COMMON_LOWER = set("""
УПРАВА УПРАВЕ УПРАВУ ОПШТИНСКА ОПШТИНСКЕ ОПШТИНСКИ ГРАДСКА ГРАДСКЕ ГРАДСКИ ГРАДСКО МЕСНА МЕСНЕ ЗАЈЕДНИЦА ЗАЈЕДНИЦЕ ОСНОВНА ОСНОВНЕ
ОСНОВНИ ОСНОВНО ШКОЛА ШКОЛЕ ШКОЛСКИ ДОМ ДОМА ЗДРАВЉА ЦЕНТАР ЦЕНТРА СОЦИЈАЛНИ СОЦИЈАЛНЕ СОЦИЈАЛНУ РАД РАДА ЈАВНО ЈАВНА ЈАВНИ ЈАВНЕ
КОМУНАЛНО КОМУНАЛНА КОМУНАЛНЕ КОМУНАЛНИХ КОМУНАЛНУ ПРЕДУЗЕЋЕ ПРЕДУЗЕЋА БИБЛИОТЕКА БИБЛИОТЕКЕ НАРОДНА НАРОДНИ НАРОДНО ПРЕДШКОЛСКА
УСТАНОВА УСТАНОВЕ СУД СУДА ТУЖИЛАШТВО ВИШИ ВИШЕ ПРИВРЕДНИ ПРЕКРШАЈНИ АПЕЛАЦИОНИ УПРАВНИ ГИМНАЗИЈА СРЕДЊА ТЕХНИЧКА ЕКОНОМСКА
ЕКОНОМСКО МЕДИЦИНСКА ПОЉОПРИВРЕДНА ХЕМИЈСКО ХЕМИЈСКА МАШИНСКА ЕЛЕКТРОТЕХНИЧКА САОБРАЋАЈНА ГРАЂЕВИНСКА ТРГОВИНСКА УГОСТИТЕЉСКО
ТУРИСТИЧКА ТУРИСТИЧКО ОРГАНИЗАЦИЈА КУЛТУРНИ КУЛТУРНО КУЛТУРЕ КУЛТУРУ СПОРТСКИ СПОРТСКО СПОРТА СПОРТ РЕКРЕАЦИЈУ МУЗЕЈ АРХИВ ЗАВОД
ИНСТИТУТ АГЕНЦИЈА ФОНД ДИРЕКЦИЈА СЛУЖБА СЛУЖБЕ ОДЕЉЕЊЕ СЕКРЕТАРИЈАТ МИНИСТАРСТВО РЕПУБЛИЧКИ РЕПУБЛИЧКА РЕПУБЛИКЕ РЕПУБЛИКА СРБИЈЕ
СРБИЈА ГРАДА ГРАД ОПШТИНЕ ОПШТИНА ВОДОВОД КАНАЛИЗАЦИЈА КАНАЛИЗАЦИЈУ ТОПЛАНА ЧИСТОЋА ЗЕЛЕНИЛО ПИЈАЦЕ ПАРКИНГ СЕРВИС ДЕЧЈИ ДЕЧИЈИ
ВРТИЋ СТУДЕНТСКИ УЧЕНИЧКИ СПЕЦИЈАЛНА БОЛНИЦА ОПШТА КЛИНИЧКИ КЛИНИЧКО АПОТЕКА АПОТЕКАРСКА ЗДРАВСТВЕНИ ЗДРАВСТВЕНА ЗДРАВСТВЕНО
ЗАШТИТЕ ЗАШТИТУ ДЕЦУ ДЕЦЕ ОМЛАДИНУ ОМЛАДИНЕ СТАРЕ СТАРИХ ЛИЦА ЛИЦЕ ПОЗОРИШТЕ РАЗВОЈ РАЗВОЈНА РЕГИОНАЛНА РЕГИОНАЛНИ ЛОКАЛНИ ЛОКАЛНА
ЕКОНОМСКИ ПРОИЗВОДЊУ ИСПОРУКУ ТОПЛОТНЕ ЕНЕРГИЈЕ СТАМБЕНА СТАМБЕНО СТАМБЕНИХ УРБАНИЗАМ УРБАНИЗМА ПЛАНИРАЊЕ ИЗГРАДЊУ ИЗГРАДЊЕ
ПУТЕВЕ ПУТЕВА ОДРЖАВАЊЕ УПРАВЉАЊЕ КОНТРОЛУ ЛОГИСТИКУ ЈАВНОГ ПРЕВОЗА ПРЕВОЗ ПУТНИКА ГРАДСКОГ САОБРАЋАЈНО ОСИГУРАЊЕ ОСИГУРАЊА
ЗАПОШЉАВАЊЕ ЗАПОШЉАВАЊА ПЕНЗИЈСКО ИНВАЛИДСКО ГЕОДЕТСКИ ПРИВРЕДНЕ РЕГИСТРЕ УНУТРАШЊИХ ПОСЛОВА ФИНАНСИЈА ПРАВДЕ ПРОСВЕТЕ ОДБРАНЕ
ПРИВРЕДЕ ПОЉОПРИВРЕДЕ ШУМАРСТВА ВОДОПРИВРЕДЕ ТРГОВИНЕ ТУРИЗМА ТЕЛЕКОМУНИКАЦИЈА РУДАРСТВА ЕНЕРГЕТИКЕ ЗДРАВЉЕ ИНФОРМИСАЊА ПОРЕСКА
АДМИНИСТРАЦИЈА ТРЕЗОР ОКРУГ ОКРУГА ПОКРАЈИНСКИ ПОКРАЈИНСКА СКУПШТИНА СКУПШТИНЕ ИЗВРШНО ВЕЋЕ ВЛАДА ВЛАДЕ КАНЦЕЛАРИЈА ДРУШТВО
ДРУШТВА ДРУШТВЕНИХ ДЕЛАТНОСТИ ДЕЛАТНОСТ ПРИВРЕДНО ПРИВРЕДНА ОГРАНИЧЕНОМ ОДГОВОРНОШЋУ ОГРАНИЧЕНОМ ВЕТЕРИНАРСКА ВЕТЕРИНАРСКИ СТАНИЦА
ХИТНУ ХИТНА ПОМОЋ МЕДИЦИНСКУ СТУДЕНАТА УЧЕНИКА ДОМОВИ ГАЛЕРИЈА ЗБИРКА ИСТОРИЈСКИ ЗАВИЧАЈНИ ЕТНОГРАФСКИ ПРИРОДЊАЧКИ ТЕХНИЧКИ
НАЦИОНАЛНА НАЦИОНАЛНИ ПАРК СЛУЖБЕНИ ГЛАСНИК ЈАВНОГ ЗДРАВЉА ЗДРАВСТВЕНЕ РАДНИКА ЗАШТИТУ ОБРАЗОВАЊЕ ОБРАЗОВАЊА ОДРАСЛИХ МУЗИЧКА
БАЛЕТСКА УМЕТНИЧКА УМЕТНОСТИ ФИЛОЛОШКА МАТЕМАТИЧКА СПОРТСКА СА ЗА И У О ОД ИЗ НА ПО ПРИ КА ДО БЕЗ КРОЗ ТЕ
""".split())


def smart_case(upper_cyr: str) -> str:
    """ОПШТИНСКА УПРАВА БАБУШНИЦА → Општинска управа Бабушница; ОШ "ВУК КАРАЏИЋ" → ОШ "Вук Караџић"."""
    out = []
    first_done = False
    for w in upper_cyr.split():
        core = w.strip('"„“(),.;-')
        if not core:
            out.append(w); continue
        if core in ACRONYMS or (core.replace(".", "") in ACRONYMS):
            out.append(w)
        elif "." in core and len(core) <= 6 and not core[0].isdigit():      # д.о.о., о.ш.
            out.append(w.lower())
        elif first_done and (core in COMMON_LOWER or w.lower() in SMALL):
            out.append(w.lower())
        elif "-" in core and all(part in ACRONYMS or len(part) <= 3 for part in core.split("-") if part):
            out.append(w)                                                        # МФ-ПУ style codes stay as written
        elif "-" in core and core.split("-")[0] in ACRONYMS:
            head, _, tail = w.partition("-")                                      # МФ-ПОРЕСКА → МФ-Пореска
            out.append(head + "-" + tail[:1].upper() + tail[1:].lower())
        else:
            def cap(part: str) -> str:
                i = next((k for k, ch in enumerate(part) if ch.isalpha()), None)
                return part if i is None else part[:i] + part[i].upper() + part[i + 1:].lower()
            out.append("-".join(cap(part) for part in w.split("-")))                # ВОДОВОД-ШАБАЦ → Водовод-Шабац
        first_done = True
    return " ".join(out)


BUDGET_RE = re.compile(r"^(ГРАД|ОПШТИНА|ГРАДСКА ОПШТИНА)\s+(.+?)\s*-\s*БУЏЕТ", re.I)
CODE_NAME = re.compile(r"^(?P<code>[0-9A-Za-z]+)\s*-\s*(?P<name>.+)$")
PLACE_PAREN = re.compile(r"^(?P<city>[^(]+?)\s*\((?P<go>[^)]+)\)\s*$")


def last_day_of_prev_month(today: dt.date) -> dt.date:
    prev = today.replace(day=1) - dt.timedelta(days=1)
    return prev.replace(day=calendar.monthrange(prev.year, prev.month)[1])


def read_rows(xls: bytes) -> list[dict]:
    sh = xlrd.open_workbook(file_contents=xls).sheet_by_index(0)
    rows = [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    hdr = next(i for i, r in enumerate(rows) if any("Назив" in str(v) for v in r))
    section, scope, out = None, "republic", []
    for r in rows[hdr + 2:]:
        cell = [clean_ws(str(v)) if v not in ("", None) else None for v in r]
        if cell[1] is None:
            if cell[2]:
                section = cell[2]
                if "ГРАДОВИ" in section or "ОПШТИНЕ" in section or "ЛОКАЛН" in section:
                    scope = "local"
                elif "581" in section or "ВОЈВОДИН" in section:
                    scope = "pokrajina"
                elif section.startswith("II"):
                    scope = "outside_krt"
                else:
                    scope = "republic"
            continue
        if not cell[4] or not re.fullmatch(r"\d{8}(\.0)?", cell[4]):
            continue
        num = lambda s: s[:-2] if s and s.endswith(".0") else s
        trezor = num(cell[0]) or ""
        if trezor and trezor.isdigit():
            trezor = trezor.zfill(3)
        dbk = CODE_NAME.match(cell[7] or "")
        oj = CODE_NAME.match(cell[8] or "")
        out.append({
            "trezor": trezor, "jbkjs": num(cell[1]).zfill(5) if num(cell[1]).isdigit() else num(cell[1]),
            "naziv": cell[2], "mesto": cell[3], "mb": num(cell[4]), "pib": num(cell[5]), "tip": num(cell[6]) or "",
            "dbk_code": dbk.group("code") if dbk else None, "dbk_name": dbk.group("name") if dbk else cell[7],
            "oj_code": oj.group("code") if oj else None, "oj_name": oj.group("name") if oj else cell[8],
            "section": section, "outside_krt": scope == "outside_krt",
            # a local treasury code means a JLS (or gradska opština) founded it, inside or outside the treasury system
            "scope": "pokrajina" if trezor == VOJVODINA else ("republic" if trezor == REPUBLIC else "local"),
        })
    return out


def classify(rec: dict) -> str:
    name = rec["naziv"].upper()
    for slug, rx in RULES:
        if rx.search(name):
            return slug
    return FALLBACK.get((rec["tip"], rec["scope"] if rec["scope"] in ("local", "republic", "pokrajina") else "republic"),
                        "drzavni-organ")


# ---------------------------------------------------------------------------------------------
class Resolver:
    """Place name → territorial unit id, using territorial_units then staging.rzs_naselja."""

    def __init__(self, cur):
        # case folding happens in Python: SQL upper() does nothing to Cyrillic under a C locale
        cur.execute("select id, name_cyr, level, parent_id from territorial_units where level in ('jls','gradska_opstina') and name_cyr is not null")
        self.units = collections.defaultdict(list)
        for r in cur.fetchall():
            self.units[r["name_cyr"].upper()].append(r)
        cur.execute("select naziv_cyr, jls_id from staging.rzs_naselja where jls_id is not null")
        self.nas = collections.defaultdict(set)
        for r in cur.fetchall():
            n = r["naziv_cyr"].upper()
            self.nas[n].add(r["jls_id"])
            base = re.sub(r"\s*\(.*\)\s*$", "", n)       # 'ГУЧА (ВАРОШИЦА)' and 'ГУЧА (СЕЛО)' → 'ГУЧА'
            if base != n:
                self.nas[base].add(r["jls_id"])
        self.cache: dict[str, int | None] = {}

    def resolve(self, place: str | None) -> int | None:
        if not place:
            return None
        key = place.upper().replace("СРЕМ. ", "СРЕМСКА ").replace("СМЕД. ", "СМЕДЕРЕВСКА ").strip()
        if key in self.cache:
            return self.cache[key]
        res = None
        m = PLACE_PAREN.match(key)
        if m:
            gos = [u for u in self.units.get(m.group("go").strip(), []) if u["level"] == "gradska_opstina"]
            city = [u for u in self.units.get(m.group("city").strip(), []) if u["level"] == "jls"]
            if gos and city:
                res = next((g["id"] for g in gos if g["parent_id"] == city[0]["id"]), gos[0]["id"])
            elif city:
                res = city[0]["id"]
            else:  # 'МЛАДЕНОВАЦ (СЕЛО)': the parenthesis is a settlement qualifier, not a gradska opština
                res = self.resolve(m.group("city").strip())
        else:
            cands = self.units.get(key, [])
            jls = [u for u in cands if u["level"] == "jls"]
            if jls:
                res = jls[0]["id"]
            elif cands:
                res = cands[0]["id"]
            else:
                ids = self.nas.get(key, set())
                res = next(iter(ids)) if len(ids) == 1 else None
        self.cache[key] = res
        return res


def stage(cur, date: dt.date, recs: list[dict]) -> None:
    cur.executemany(
        """insert into staging.kjs_snapshot (snapshot_date, jbkjs, naziv, mb, pib, tip, nadredjeni, opstina, raw)
           values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb) on conflict (snapshot_date, jbkjs) do nothing""",
        [(date, r["jbkjs"], r["naziv"], r["mb"], r["pib"], r["tip"], r["dbk_code"], r["mesto"],
          json.dumps(r, ensure_ascii=False)) for r in recs])


def local_treasuries(cur, recs: list[dict], res: Resolver) -> dict[str, int]:
    """tip 0 rows 'ГРАД X-БУЏЕТ' with a local treasury code → treasury_code → territorial unit."""
    out: dict[str, int] = {}
    for r in recs:
        if r["tip"] != "0" or r["trezor"] in (REPUBLIC, VOJVODINA):
            continue
        m = BUDGET_RE.match(r["naziv"].upper())
        if m and m.group(1).upper() == "ГРАДСКА ОПШТИНА":
            pm = PLACE_PAREN.match((r["mesto"] or "").upper())
            city = pm.group("city").strip() if pm else (r["mesto"] or "").upper()
            uid = res.resolve(f"{city} ({m.group(2)})") or res.resolve(m.group(2))
        else:
            uid = res.resolve(m.group(2)) if m else res.resolve(r["mesto"])
        if uid:
            out[r["trezor"]] = uid
            cur.execute("""insert into staging.kjs_local_treasury (treasury_code, jls_id, budget_name) values (%s, %s, %s)
                           on conflict (treasury_code) do update set jls_id = excluded.jls_id, budget_name = excluded.budget_name""",
                        (r["trezor"], uid, r["naziv"]))
    return out


def load(cur, date: dt.date, recs: list[dict], source_url: str) -> dict:
    res = Resolver(cur)
    treas = local_treasuries(cur, recs, res)
    mb_count = collections.Counter(r["mb"] for r in recs)
    pib_count = collections.Counter(r["pib"] for r in recs)
    cur.execute("select slug from organizations")
    slugs = {r["slug"] for r in cur.fetchall()}
    cur.execute("select slug, id, default_legal_form from org_types")
    types = {r["slug"]: r for r in cur.fetchall()}
    cur.execute("select id, jbkjs from organizations where jbkjs is not null")
    existing = {r["jbkjs"]: r["id"] for r in cur.fetchall()}
    stats = collections.Counter()
    by_type = collections.Counter()
    oj_cov: dict[str, dict] = {}
    for r in recs:
        if r["tip"] == "0":
            stats["skipped_budget_rows"] += 1
            continue
        slug_type = classify(r)
        by_type[slug_type] += 1
        founder = treas.get(r["trezor"]) if r["scope"] == "local" else None
        place_id = res.resolve(r["mesto"])
        if r["oj_code"]:
            o = oj_cov.setdefault(r["oj_code"], {"name": r["oj_name"], "units": set(), "n": 0})
            o["n"] += 1
            if place_id:
                o["units"].add(place_id)
        jurisdiction = {"local": "jls", "pokrajina": "pokrajina"}.get(r["scope"], "republika")
        if founder:
            cur.execute("select level from territorial_units where id = %s", (founder,))
            if cur.fetchone()["level"] == "gradska_opstina":
                jurisdiction = "gradska_opstina"
        name_cyr = smart_case(r["naziv"])
        name_lat = cyr_to_lat(name_cyr)
        if r["jbkjs"] in existing:
            cur.execute("update organizations set last_seen_at = now(), status = case when status = 'inactive' then 'active' else status end where id = %s",
                        (existing[r["jbkjs"]],))
            stats["matched"] += 1
            continue
        base = cyr_to_lat(f"{name_cyr} {r['mesto'] or ''}")
        cur.execute("select slugify_sr(%s) s", (base,))
        slug = cur.fetchone()["s"][:100].rstrip("-")
        if slug in slugs:
            slug = f"{slug}-{r['jbkjs']}".lower()
        slugs.add(slug)
        t = types[slug_type]
        cur.execute(
            """insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, name_cyr, official_name_lat,
                                          legal_form, mb, pib, jbkjs, status, verification, last_seen_at)
               values (%s, %s, %s::jurisdiction_level, %s, %s, %s, %s, coalesce(%s::legal_form, 'ostalo'), %s, %s, %s,
                       'active', 'auto_verified', now()) returning id""",
            (slug, t["id"], jurisdiction, founder, name_lat, name_cyr, cyr_to_lat(r["naziv"]), t["default_legal_form"],
             r["mb"] if mb_count[r["mb"]] == 1 else None, r["pib"] if pib_count[r["pib"]] == 1 else None, r["jbkjs"]))
        org_id = cur.fetchone()["id"]
        existing[r["jbkjs"]] = org_id
        db.provenance(cur, "organization", org_id, None, SOURCE, source_url, 0.9, r)
        stats["new"] += 1
        if place_id:
            cur.execute("select name_lat, level from territorial_units where id = %s", (place_id,))
            tu = cur.fetchone()
            settlement = None
            if tu["level"] == "jls" and r["mesto"] and cyr_to_lat(r["mesto"]).upper() != tu["name_lat"].upper():
                settlement = cyr_to_lat(smart_case(r["mesto"].upper()))
            cur.execute(
                """insert into locations (org_id, slug, unit_name_lat, unit_kind, is_primary, territorial_unit_id, settlement_name_lat,
                                          status, verification, last_seen_at, geo_precision)
                   values (%s, 'sediste', 'Sedište', 'sediste', true, %s, %s, 'active', 'unverified', now(), 'jls')
                   on conflict (org_id, slug) do nothing returning id""",
                (org_id, place_id, settlement))
            stats["locations"] += 1
        else:
            stats["place_unresolved"] += 1
    # parents: DBK code that is itself a KJS
    cur.execute(
        """update organizations c set parent_org_id = p.id
           from staging.kjs_snapshot s join organizations p on p.jbkjs = s.nadredjeni
           where s.snapshot_date = %s and c.jbkjs = s.jbkjs and c.parent_org_id is null and p.id <> c.id""", (date,))
    stats["parents_linked"] = cur.rowcount
    # Treasury branches as locations of 'uprava-za-trezor' with coverage from the KJS they serve
    cur.execute("""select id from organizations where org_type_id = (select id from org_types where slug = 'uprava-za-trezor')
                   and f_unaccent(name_lat) ilike '%%uprava za trezor%%' order by length(name_lat) limit 1""")
    row = cur.fetchone()
    if row:
        ut = row["id"]
        for code, o in oj_cov.items():
            seat = res.resolve(o["name"])
            if not seat:
                stats["oj_unresolved"] += 1
                continue
            cur.execute(
                """insert into locations (org_id, slug, unit_name_lat, unit_kind, territorial_unit_id, status, verification, last_seen_at)
                   values (%s, %s, %s, 'filijala', %s, 'active', 'auto_verified', now())
                   on conflict (org_id, slug) do update set last_seen_at = now() returning id""",
                (ut, f"oj-{code}", f"Organizaciona jedinica {cyr_to_lat(smart_case(o['name']))}", seat))
            loc = cur.fetchone()["id"]
            cur.executemany(
                "insert into location_coverage (location_id, territorial_unit_id, source_id) values (%s, %s, (select id from data_sources where code = %s)) on conflict do nothing",
                [(loc, u, SOURCE) for u in o["units"]])
            stats["oj_locations"] += 1
    stats["by_type_top"] = by_type.most_common(12)
    return dict(stats)


def diff_against_previous(cur, date: dt.date) -> int:
    cur.execute(
        """with prev as (select max(snapshot_date) d from staging.kjs_snapshot where snapshot_date < %(d)s)
           insert into edit_suggestions (entity_type, entity_id, kind, patch, message, status)
           select 'organization', o.id, 'closed', '{}'::jsonb, 'Nestao iz Trezor KJS evidencije ' || %(d)s::text, 'pending'
           from prev, staging.kjs_snapshot old
           join organizations o on o.jbkjs = old.jbkjs
           where old.snapshot_date = prev.d
             and not exists (select 1 from staging.kjs_snapshot n where n.snapshot_date = %(d)s and n.jbkjs = old.jbkjs)""",
        {"d": date})
    return cur.rowcount


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date")
    ap.add_argument("--file", help="use an already downloaded XLS")
    ap.add_argument("--inspect", action="store_true")
    a = ap.parse_args()
    date = dt.date.fromisoformat(a.date) if a.date else last_day_of_prev_month(dt.date.today())
    url = ARCHIVE.format(y=date.year, m=date.month, d=date.day)
    xls = Path(a.file).read_bytes() if a.file else PoliteClient(delay=2.0).get(url).content
    recs = read_rows(xls)
    if a.inspect:
        print(f"{len(recs)} records; by tip: {collections.Counter(r['tip'] for r in recs).most_common()}")
        print("by scope:", collections.Counter(r["scope"] for r in recs).most_common())
        print("classification:", collections.Counter(classify(r) for r in recs if r["tip"] != "0").most_common(25))
        for r in recs[:2] + recs[5000:5002]:
            print(json.dumps(r, ensure_ascii=False))
        return
    with db.conn() as c, c.cursor() as cur:
        stage(cur, date, recs)
        stats = load(cur, date, recs, url)
        stats["vanished_flagged"] = diff_against_previous(cur, date)
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"date": str(date), "rows": len(recs), **stats}, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
