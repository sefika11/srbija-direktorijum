"""Veterinary Directorate register of animal shelters -> rows for importers.jobs.load_orgs_json.

  python -m tools.reach.animal_shelters <Registar-prihvatilista.xls> <out.json>

Source: https://www.vet.minpolj.gov.rs/storage/2025/04/Registar-prihvatilista.xls (columns: operator, operator's address,
animals, address of the shelter). No phones in the register. Rows run by a natural person or a sole proprietor are left
out (we publish no private address). The place is read from the shelter's address, then from the operator's address,
then from the operator's name outside its quoted part; a row whose place cannot be told is printed and left out.
The street is kept only when a part of the shelter's own address looks like one; a plot or a field name goes to the
description instead. The operator's office address is described, never used as the shelter's address.
"""
import json, re, sys
import xlrd
from importers.common import db
from importers.sources.rfzo_apoteke import LatinResolver, fold

XLS, OUT = sys.argv[1], sys.argv[2]
SRC = "https://www.vet.minpolj.gov.rs/storage/2025/04/Registar-prihvatilista.xls"
ORG = re.compile(r"(?i)\bj\.?k\.?p\b|\bkjp\b|\bjpk\b|\bjp\b|\bkp\b|javn|udru[zž]|dru[sš]tvo|\bd\.?o\.?o\b|\bvs\b|v\.s\.|veterinar|op[sš]tin|ustanov|\bzoo|agencij|fond|centar|azil|prihvat|\ba\.?d\.?\b|preduze|komunal|savez|klub|zavod|zadruga|organizacij|\"")
SOLE = re.compile(r"(?i)\bPR\b|preduzetnik|\bs\.?z\.?r\b|\bsur\b|\bsztr\b")
PERSON = r"[A-ZČĆŠŽĐ][a-zčćšžđ]+ [A-ZČĆŠŽĐ][a-zčćšžđ]+"
NOT_STREET = re.compile(r"(?i)\bk\.?p\b|parcel|lokacij|\blok\.|reon|potes|\bko\b|k\.o\.|van gradske|teritorij|\bselo\b|naselje|zaseok|\bmesto\b")
HINT = {"s mitrovica": "Sremska Mitrovica", "baric": "Obrenovac"}  # an abbreviation, and a settlement the lookup does not hold

def clean(s):
    s = str(s or "").replace("''", '"').replace("´", "'")
    for a, b in (("lј", "lj"), ("nј", "nj"), ("Lј", "Lj"), ("Nј", "Nj"), ("ј", "j"), ("а", "a"), ("е", "e"), ("о", "o")):  # Cyrillic look-alikes typed into Latin words
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip(" ,")
def is_person(name):
    return bool(SOLE.search(name)) or (not ORG.search(name) and bool(re.match(rf"^{PERSON}( [A-ZČĆŠŽĐ][a-zčćšžđ]+)?$", name)))
def street_of(addr, town):
    """The part of the shelter's address that is a street with a number (or bb), if any."""
    for part in (x.strip() for x in addr.split(",")):
        part = re.sub(r"(?i)^ul\.?\s*", "", part)
        if re.search(r"\d|\bbb\b", part, re.I) and not NOT_STREET.search(part) and not (fold(part) + " ").startswith(fold(town) + " ") and re.search(r"[A-Za-zČĆŠŽĐčćšžđ]{3}", part) and not re.match(r"^\d{5}\b", part):
            return part
    return None

sh = xlrd.open_workbook(XLS).sheet_by_index(0)
rows, skipped, lost = [], [], []
with db.conn() as c, c.cursor() as cur:
    R = LatinResolver(cur)
    def named(cand):
        cand = re.sub(r"^\d{5}\s+", "", cand.strip(" .\"'-"))
        if fold(cand) in HINT: return HINT[fold(cand)]
        return cand if len(cand) >= 2 and not cand.isdigit() and R.resolve(cand) else None
    def place_of(obj, op_addr, op):
        """(town, municipality): the municipality is the one written after 'opština' when the address says so."""
        for t in (obj, op_addr):
            m = re.search(r"(?i)op[sš]tin[ae]\s+([A-ZČĆŠŽĐ][\w ]+?)\s*(?:,|$)", t)
            muni = named(m.group(1)) if m else None
            t2 = re.sub(r"(?i)\b(op[sš]tin[ae]|grad|selo|mesto)\b", " ", t)
            parts = [x.strip() for x in t2.split(",") if x.strip()]
            for part in list(reversed(parts[1:])) + parts[:1]:  # the place closes an address, or opens it ("Ripanj, Put za ... 1a")
                for cand in ([part.split("-")[0]] if "-" in part else []) + [part]:  # "Niš-Palilula" is Niš
                    if named(cand): return named(cand), muni or named(cand)
            if muni: return muni, muni
        w = re.sub(r"[,()]", " ", re.sub(r'"[^"]*"?', " ", op)).split()  # the quoted part is a name, not a place
        for n in (3, 2, 1):
            for i in range(len(w) - n, -1, -1):
                if named(" ".join(w[i:i + n])): return named(" ".join(w[i:i + n])), named(" ".join(w[i:i + n]))
        return None, None
    for r in range(1, sh.nrows):
        v = [clean(x) for x in sh.row_values(r)]
        if len(v) < 5 or not v[1]: continue
        op, op_addr, animals, obj = v[1], v[2], v[3], v[4]
        if is_person(op): skipped.append(op); continue
        op = re.sub(rf"^{PERSON}\s*[,-]\s*(?=\S)", "", op) if ORG.search(re.sub(rf"^{PERSON}", "", op)) else op  # "Ime Prezime, Udruženje X": the association runs it
        town, muni = place_of(obj, op_addr, op)
        if not town: lost.append((op, op_addr, obj)); continue
        st = street_of(obj, town)
        extra = {"Upravlja": op, "Životinje": animals}
        if op_addr and fold(op_addr) != fold(obj): extra["Adresa upravljača"] = op_addr
        if obj and not st: extra["Lokacija objekta"] = obj
        rows.append({"name": f"Prihvatilište za životinje {op}", "type_slug": "prihvatiliste-za-zivotinje", "town": town, "municipality": muni,
                     "address": st, "phones": [], "extra": extra, "source_url": SRC, "_obj": obj})
seen = {}
for x in rows: seen[(x["name"], x["town"])] = seen.get((x["name"], x["town"]), 0) + 1
for x in rows:  # one operator with several shelters in a town: the street or the plot tells them apart
    if seen[(x["name"], x["town"])] > 1: x["name"] += f', {(x["address"] or x["_obj"]).split(",")[0]}'
for x in rows: del x["_obj"]
json.dump({"source": {"name": "Uprava za veterinu – Registar prihvatilišta", "url": SRC, "fetched_at": "2026-11-11"}, "rows": rows}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sh.nrows - 1, "register rows;", len(rows), "kept;", len(skipped), "run by a person, left out;", len(lost), "place not told, left out;", sum(1 for x in rows if x["address"]), "with a street")
for x in skipped: print("  PERSON", x)
for x in lost: print("  NO PLACE", x)
