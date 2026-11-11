"""Normalizers for Serbian administrative data: phones, script, hours, addresses."""
from __future__ import annotations

import re
from dataclasses import dataclass

import phonenumbers

_CYR = "АБВГДЂЕЖЗИЈКЛМНОПРСТЋУФХЦЧШабвгдђежзијклмнопрстћуфхцчш"
_LAT = "ABVGDĐEŽZIJKLMNOPRSTĆUFHCČŠabvgdđežzijklmnoprstćufhcčš"
_DIGRAPHS = [("Љ", "Lj"), ("Њ", "Nj"), ("Џ", "Dž"), ("љ", "lj"), ("њ", "nj"), ("џ", "dž")]
_TABLE = str.maketrans(_CYR, _LAT)


_DIGRAPHS_UPPER = [("Љ", "LJ"), ("Њ", "NJ"), ("Џ", "DŽ")]


def cyr_to_lat(s: str | None) -> str | None:
    if s is None:
        return None
    # inside an all-caps word a digraph must be all caps too: УПРАВЉАЊЕ → UPRAVLJANJE, not UPRAVLjANjE
    def tr_word(w: str) -> str:
        pairs = _DIGRAPHS_UPPER if (w.isupper() and len(w) > 1) else _DIGRAPHS
        for c, l in pairs:
            w = w.replace(c, l)
        return w.translate(_TABLE)
    return " ".join(tr_word(w) for w in s.split(" "))


def is_cyrillic(s: str) -> bool:
    return bool(re.search(r"[Ѐ-ӿ]", s))


def clean_ws(s: str | None) -> str | None:
    return re.sub(r"\s+", " ", s).strip() if s else None


# -- phones -------------------------------------------------------------------
PHONE_RE = re.compile(r"(?:\+?381|0)[\s/().-]*\d(?:[\s/().-]*\d){5,9}")


@dataclass(frozen=True)
class Phone:
    e164: str
    display: str
    kind: str  # phone | mobile | fax (fax only when labelled by caller)


def phones_in(text: str) -> list[Phone]:
    """Find RS phone numbers in free text; return E.164 + national display form."""
    out: list[Phone] = []
    seen: set[str] = set()
    for m in PHONE_RE.finditer(text):
        raw = m.group(0)
        try:
            n = phonenumbers.parse(raw, "RS")
        except phonenumbers.NumberParseException:
            continue
        if not phonenumbers.is_valid_number(n):
            continue
        e164 = phonenumbers.format_number(n, phonenumbers.PhoneNumberFormat.E164)
        if e164 in seen:
            continue
        seen.add(e164)
        ntype = phonenumbers.number_type(n)
        kind = "mobile" if ntype == phonenumbers.PhoneNumberType.MOBILE else "phone"
        display = phonenumbers.format_number(n, phonenumbers.PhoneNumberFormat.NATIONAL)
        out.append(Phone(e164, display, kind))
    return out


# -- hours --------------------------------------------------------------------
DAY_WORDS = {
    "pon": 1, "ponedeljak": 1, "uto": 2, "utorak": 2, "sre": 3, "sreda": 3, "čet": 4, "cet": 4,
    "četvrtak": 4, "cetvrtak": 4, "pet": 5, "petak": 5, "sub": 6, "subota": 6, "ned": 7, "nedelja": 7,
    "radnim danima": (1, 5), "radni dani": (1, 5), "svakog radnog dana": (1, 5),
}
TIME_RE = r"(\d{1,2})[:.,h]?\s?(\d{2})?\s?(?:h|č|c|časova|casova|sati)?"
RANGE_RE = re.compile(rf"{TIME_RE}\s?(?:-|–|—|do)\s?{TIME_RE}")


@dataclass(frozen=True)
class HoursRow:
    day_from: int
    day_to: int
    opens: str   # 'HH:MM'
    closes: str
    hours_type: str  # rad_sa_strankama | radno_vreme


def _hhmm(h: str, m: str | None) -> str:
    return f"{int(h):02d}:{int(m or 0):02d}"


# a weekday as a word of its own: "pon", "ponedeljak", "subotom" - never "ponuda", "sati" or "sredstva"
_DAY = r"(pon|uto|sre|[čc]et|pet|sub|ned)(?:edelj[a-zčćšž]{1,3}|r(?:ak|ka|kom|ku)|d(?:a|e|u|om|i|ama)|vrt[a-zčćšž]{1,4}|ak|ka|kom|ot[a-zčćšž]{1,3}|elj[a-zčćšž]{1,3})?\.?(?![a-zčćšž])"
_OSM = {"Mo": "pon", "Tu": "uto", "We": "sre", "Th": "čet", "Fr": "pet", "Sa": "sub", "Su": "ned"}
_OSM_RE = re.compile(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b")
_DAY_RANGE = re.compile(rf"\b{_DAY}\s?(?:-|–|—|/|do)\s?{_DAY}")
_CLOSED = re.compile(r"zatvoren|ne radi|neradn|\b(off|closed)\b")
_FILLER = re.compile(r"radno vreme|rad sa strankama|radnim danima|radnim danom|radni dani|svakog radnog dana|svakog dana|svaki dan|casova|časova|sati|\b(od|do|i|h|c|č)\b")


def _labelled(part: str) -> bool:
    """True when a part says more than days and times ("rad sa novcem ...", "(krediti)", a season): a schedule of its own."""
    rest = _DAY_RANGE.sub(" ", part)
    rest = _DAY_ONE.sub(" ", rest)
    rest = RANGE_RE.sub(" ", _FILLER.sub(" ", rest))
    return bool(re.search(r"[a-zčćšžđ0-9]", rest))
_DAY_ONE = re.compile(rf"\b{_DAY}")
_SPANS = {"radnim danima": (1, 5), "radni dani": (1, 5), "svakog radnog dana": (1, 5), "radnim danom": (1, 5), "svakog dana": (1, 7), "svaki dan": (1, 7)}


def _day_no(word: str) -> int:
    return DAY_WORDS["čet" if word in ("cet", "čet") else word]  # type: ignore[return-value]


def _segment_days(seg: str) -> list[int] | None:
    """The weekdays one part of an hours text speaks about; None when it names none."""
    days: set[int] = set()
    rest = seg
    for m in _DAY_RANGE.finditer(seg):
        d1, d2 = _day_no(m.group(1)), _day_no(m.group(2))
        days.update(range(d1, d2 + 1) if d1 <= d2 else [*range(d1, 8), *range(1, d2 + 1)])
        rest = rest.replace(m.group(0), " ")
    for m in _DAY_ONE.finditer(rest):   # single days and lists: "sub", "pon, sre, pet"
        days.add(_day_no(m.group(1)))
    for phrase, (d1, d2) in _SPANS.items():
        if phrase in seg:
            days.update(range(d1, d2 + 1))
    return sorted(days) or None


def parse_hours(text: str) -> list[HoursRow]:
    """Recognise the common Serbian patterns; anything else returns [] and the caller keeps hours_text.

    Handles: 'Radno vreme: ponedeljak - petak 07:30-15:30', 'Rad sa strankama 08-14h',
    'radnim danima od 7.30 do 15.30 časova', and texts in parts: 'pon-pet 07:00-20:00; sub 07:00-14:00',
    'pon, sre, pet 08:00-14:00; uto, čet 12:00-18:00'. One row per run of days; the first range of a part is its
    schedule (breaks and second shifts stay in hours_text). A text with no weekday at all means working days, except
    a bare '00-24', which means every day. A text of several parts is all or nothing: when a part names no weekday
    (departments, seasons) or two parts give one day different hours, nothing is parsed and the text is shown as it is.
    """
    t = cyr_to_lat(text)
    if re.search(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b\s?(?:[-,]\s?(?:Mo|Tu|We|Th|Fr|Sa|Su)\b\s?)*\d", t):   # map data: "Mo-Fr 08:00-16:00; Sa 08:00-12:00"
        t = _OSM_RE.sub(lambda m: _OSM[m.group(1)], t)
    t = t.lower()
    t = t.replace("od ", "").replace(" do ", "-")
    hours_type = "rad_sa_strankama" if "strank" in t else "radno_vreme"
    osm = bool(re.search(r"\bph\b", t)) or t != cyr_to_lat(text).lower().replace("od ", "").replace(" do ", "-")
    parts: list[str] = []
    for x in re.split(r"[;|\n]", t):
        pieces = [y.strip() for y in x.split(",")]
        # "ponedeljak-petak 7-15h, subota 8-12h" and "pon-pet 8-15, sub-ned zatvoreno" are two parts each;
        # "pon, sre, pet 08-14" and "pon-pet 10-12, 17-19" (a second shift) are one
        whole = lambda y: bool(_segment_days(y)) and bool(RANGE_RE.search(y) or _CLOSED.search(y))
        parts += pieces if len(pieces) > 1 and all(whole(y) for y in pieces) else [x.strip()]
    parts = [x for x in parts if x and not re.match(r"ph\b", x)]   # public-holiday rules of map data are not weekdays
    seen_days = [_segment_days(x) for x in parts]
    by_day: dict[int, tuple[str, str]] = {}
    for i, part in enumerate(parts):
        if _CLOSED.search(part):
            continue
        m = next((m for m in RANGE_RE.finditer(part) if 0 <= int(m.group(1)) <= 24 and 0 <= int(m.group(3)) <= 24), None)
        if not m:
            continue
        days = seen_days[i]
        if days is None:
            others = [d for j, ds in enumerate(seen_days) if j != i and ds for d in ds]
            if len(parts) == 1:
                days = list(range(1, 8)) if re.fullmatch(r"\s*0?0(?::00)?\s?[-–]\s?24(?::00)?\s*h?", part) else list(range(1, 6))
            elif i == 0 and others and set(others) <= {6, 7} and not _labelled(part):
                days = list(range(1, 6))   # "09:00-18:30; subotom 09-14": the unnamed days are the working days
            else:
                return []
        h1, m1, h2, m2 = m.groups()
        val = (_hhmm(h1, m1), _hhmm(h2, m2))
        clash = [d for d in days if d in by_day and by_day[d] != val]
        if clash:
            if _labelled(part):
                continue          # a sub-service ("rad sa novcem") does not replace the main hours
            if not osm:
                return []         # two plain schedules for one day (seasons): show the text
        for d in days:
            if osm or d not in by_day:
                by_day[d] = val   # in map data a later rule overrides an earlier one
    rows: list[HoursRow] = []
    for d in sorted(by_day):   # consecutive days with the same hours become one row
        o, c = by_day[d]
        if rows and rows[-1].day_to == d - 1 and (rows[-1].opens, rows[-1].closes) == (o, c):
            rows[-1] = HoursRow(rows[-1].day_from, d, o, c, hours_type)
        else:
            rows.append(HoursRow(d, d, o, c, hours_type))
    return rows


# -- addresses ----------------------------------------------------------------
ADDR_RE = re.compile(r"^(?P<street>[^\d,]+?)\s+(?P<number>\d+[a-zA-Z]?(?:/\d+)?|bb|b\.b\.)\b", re.IGNORECASE)


def split_address(s: str) -> tuple[str | None, str | None]:
    """'Nikole Pašića 24a' → ('Nikole Pašića', '24a'); 'Trg Republike bb' → ('Trg Republike', 'bb')."""
    s = clean_ws(cyr_to_lat(s)) or ""
    s = re.sub(r"^(ul\.|ulica)\s+", "", s, flags=re.IGNORECASE)
    m = ADDR_RE.match(s)
    if not m:
        return (s or None, None)
    return (m.group("street").strip(), m.group("number").lower().replace("b.b.", "bb"))
