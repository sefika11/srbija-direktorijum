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


def parse_hours(text: str) -> list[HoursRow]:
    """Recognise the common Serbian patterns; anything else returns [] and the caller keeps hours_text.

    Handles: 'Radno vreme: ponedeljak - petak 07:30-15:30', 'Rad sa strankama 08-14h',
    'radnim danima od 7.30 do 15.30 časova'.
    """
    t = cyr_to_lat(text).lower()
    t = t.replace("od ", "").replace(" do ", "-")
    rows: list[HoursRow] = []
    hours_type = "rad_sa_strankama" if "strank" in t else "radno_vreme"
    day_span: tuple[int, int] = (1, 5)
    for word, val in DAY_WORDS.items():
        if word in t:
            if isinstance(val, tuple):
                day_span = val
            break
    m_days = re.search(r"\b(pon|uto|sre|[čc]et|pet|sub|ned)[a-z]*\s?(?:-|–|do)\s?(pon|uto|sre|[čc]et|pet|sub|ned)", t)
    if m_days:
        d1 = DAY_WORDS.get(m_days.group(1).replace("c", "č") if m_days.group(1) == "cet" else m_days.group(1))
        d2 = DAY_WORDS.get(m_days.group(2).replace("c", "č") if m_days.group(2) == "cet" else m_days.group(2))
        if isinstance(d1, int) and isinstance(d2, int):
            day_span = (d1, d2)
    for m in RANGE_RE.finditer(t):
        h1, m1, h2, m2 = m.groups()
        if not (0 <= int(h1) <= 24 and 0 <= int(h2) <= 24):
            continue
        rows.append(HoursRow(day_span[0], day_span[1], _hhmm(h1, m1), _hhmm(h2, m2), hours_type))
        break  # first range is the main schedule; breaks and second shifts stay in hours_text
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
