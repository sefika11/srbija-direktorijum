"""Private layer, tier 1: RFZO list of contracted private pharmacies and their branches.

Source (verified 2026-11-10): https://www.rfzo.rs/dokumenta/apo1-1(2).xlsx linked from
https://www.rfzo.rs/davaoci-zdravstvenih-usluga/ugovaranje-apoteke/priv-apo — XLSX, header in row 3:
Rb | Redni broj Filijale | Mesto | Filijala | NAZIV | Adresa (sedište) | Red.br. ogranka | Ogranak | Adresa ogranka | Telefon | E-mail
One row per pharmacy unit; the seat address is on the first row of each pharmacy, branch rows carry the
branch name + address. 3,416 rows on 06.03.2026. Loaded as organizations of type `apoteka` with
is_private = true, one location per row, phones and emails as contacts, coverage = the unit's JLS.
"""
from __future__ import annotations

import io, json, re, unicodedata
import openpyxl

from ..common import db
from ..common.http import PoliteClient
from ..common.match import add_contact, add_coverage, upsert_location
from ..common.normalize import clean_ws, phones_in, split_address

SOURCE = "rfzo_apoteke"
URL = "https://www.rfzo.rs/dokumenta/apo1-1(2).xlsx"
QUOTES = str.maketrans({"“": '"', "”": '"', "„": '"', "‘": "'", "’": "'"})


def fold(s: str) -> str:
    s = s.replace("đ", "dj").replace("Đ", "Dj")
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in s if not unicodedata.combining(c)).lower()).strip()


class LatinResolver:
    """Latin settlement/municipality name → JLS id (territorial_units first, then RZS settlements)."""
    def __init__(self, cur):
        cur.execute("select id, name_lat, level, parent_id from territorial_units where level in ('jls','gradska_opstina')")
        self.units: dict[str, list] = {}
        for r in cur.fetchall():
            self.units.setdefault(fold(r["name_lat"]), []).append(r)
        cur.execute("select naziv_lat, jls_id from staging.rzs_naselja where jls_id is not null and naziv_lat is not null")
        self.nas: dict[str, set] = {}
        for r in cur.fetchall():
            n = fold(r["naziv_lat"]); base = re.sub(r"\s*\(.*\)\s*$", "", r["naziv_lat"])
            self.nas.setdefault(n, set()).add(r["jls_id"]); self.nas.setdefault(fold(base), set()).add(r["jls_id"])
        self.cache: dict[str, int | None] = {}

    def resolve(self, place: str | None, hint_filijala: str | None = None) -> int | None:
        if not place: return None
        key = fold(place)
        # 'Beograd - Zemun', 'Borča, Beograd', 'Beograd-Novi Beograd' → the Belgrade part names the city, the other part a GO/settlement
        if "beograd" in key and key not in self.units:
            parts = [p.strip() for p in re.split(r"\s*[-,]\s*", place) if p.strip()]
            other = [p for p in parts if fold(p) not in ("beograd", "novi beograd")]
            for cand in (other + ["Beograd"]):
                r = self.resolve(cand) if fold(cand) != key else None
                if r: self.cache[key] = r; return r
        if key in self.cache: return self.cache[key]
        res = None
        cands = self.units.get(key, [])
        jls = [u for u in cands if u["level"] == "jls"]
        if jls: res = jls[0]["id"]
        elif cands: res = cands[0]["parent_id"]  # gradska opština → its city
        else:
            ids = self.nas.get(key, set())
            if len(ids) == 1: res = next(iter(ids))
            elif len(ids) > 1 and hint_filijala:
                # prefer the settlement inside the filijala's seat municipality
                h = self.units.get(fold(hint_filijala), [])
                hid = next((u["id"] for u in h if u["level"] == "jls"), None)
                res = hid if hid in ids else next(iter(ids))
        self.cache[key] = res
        return res


def parse(content: bytes) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    out, header_seen = [], False
    for row in ws.iter_rows(values_only=True):
        if not header_seen:
            if row and row[0] == "Rb": header_seen = True
            continue
        if not row or not isinstance(row[0], (int, float)): continue
        rb, fil_no, mesto, filijala, naziv, adresa, og_no, ogranak, og_adresa, tel, email = (list(row) + [None] * 11)[:11]
        if not naziv: continue
        out.append({"rb": int(rb), "filijala": clean_ws(str(filijala or "")), "mesto": clean_ws(str(mesto or "")),
                    "naziv": clean_ws(str(naziv).translate(QUOTES)), "adresa": clean_ws(str(adresa)) if adresa else None,
                    "ogranak": clean_ws(str(ogranak).translate(QUOTES)) if ogranak else None, "og_adresa": clean_ws(str(og_adresa)) if og_adresa else None,
                    "tel": clean_ws(str(tel)) if tel else None, "email": clean_ws(str(email)) if email else None})
    return out


def main() -> None:
    client = PoliteClient()
    rows = parse(client.get(URL).content)
    if len(rows) < 2500:
        raise SystemExit(f"Parsed only {len(rows)} rows; layout changed? {URL}")
    with db.conn() as c, c.cursor() as cur:
        db.stage_rows(cur, SOURCE, URL, [(str(r["rb"]), r) for r in rows])
        res = LatinResolver(cur)
        cur.execute("select id from org_types where slug = 'apoteka'"); type_id = cur.fetchone()["id"]
        orgs: dict[tuple, int] = {}; seat_addr: dict[tuple, str | None] = {}; has_primary: set = set()
        made_orgs = made_locs = unresolved = 0
        for r in rows:
            jls = res.resolve(r["mesto"], r["filijala"])
            if not jls:
                unresolved += 1; print("unresolved mesto:", r["mesto"], "|", r["filijala"]); continue
            key = (r["naziv"].lower(), r["filijala"])
            if key not in orgs:
                seat_addr[key] = r["adresa"]
                cur.execute("""insert into organizations (slug, org_type_id, jurisdiction, founder_unit_id, name_lat, legal_form, status, verification, is_private, last_seen_at)
                               values (slugify_sr(%s), %s, 'jls', %s, %s, 'ostalo', 'active', 'auto_verified', true, now())
                               on conflict (slug) do update set last_seen_at = now(), is_private = true returning id""",
                            (f"{r['naziv']} {r['mesto']}", type_id, jls, r["naziv"]))
                orgs[key] = cur.fetchone()["id"]; made_orgs += 1
            org_id = orgs[key]
            addr = r["og_adresa"] or r["adresa"] or seat_addr.get(key)
            street, number = split_address(addr) if addr else (None, None)
            is_branch = bool(r["ogranak"]) and bool(r["og_adresa"])
            unit_name = r["ogranak"] if is_branch else ("Apoteka" if not r["ogranak"] else r["ogranak"])
            primary = key not in has_primary
            has_primary.add(key)
            slug = "sediste" if primary else f"jedinica-{r['rb']}"
            loc_id = upsert_location(cur, org_id=org_id, slug=slug, unit_name_lat=unit_name[:120], unit_kind="ogranak" if is_branch else "sediste",
                                     territorial_unit_id=jls, street=street, street_number=number, is_primary=primary)
            for p in phones_in(r["tel"] or ""):
                add_contact(cur, loc_id, p.kind, p.e164, p.display)
            for em in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", r["email"] or "")[:2]:
                add_contact(cur, loc_id, "email", em.strip(".,;"), None)
            add_coverage(cur, loc_id, jls, SOURCE)
            db.provenance(cur, "location", loc_id, None, SOURCE, URL, 0.9, r)
            made_locs += 1
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps({"rows": len(rows), "organizations": made_orgs, "locations": made_locs, "unresolved": unresolved}))


if __name__ == "__main__":
    main()
