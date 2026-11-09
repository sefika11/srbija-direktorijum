"""Police directorate / station / branch phones from the ministry's own PDF (lat-PU-PS-PI 28.01.2025).

Source (verified 2026-11-10): https://www.mup.gov.rs/wps/wcm/connect/19428e8f-5466-41b3-96fb-dd160f1d7db5/lat-PU-PS-PI+28.01.2025..pdf
Two-column tables per directorate: unit name | phone(s). Produces .cache/mup/pu_contacts_pdf.json in the
apply_contacts format (org_id of our PU organization, PU phones, stations[] and branches as stations).
Run:  python -m importers.sources.mup_pdf_contacts && python -m importers.jobs.apply_contacts .cache/mup/pu_contacts_pdf.json --source mup_portal --confidence 0.95
"""
from __future__ import annotations
import json, re
import pdfplumber
from ..common import db
from ..sources.rfzo_apoteke import fold
from ..sources.rfzo_filijale import resolve_jls

PDF = ".cache/mup/pu-ps-pi-2025.pdf"
OUT = ".cache/mup/pu_contacts_pdf.json"
SRC = "https://www.mup.gov.rs/wps/wcm/connect/19428e8f-5466-41b3-96fb-dd160f1d7db5/lat-PU-PS-PI+28.01.2025..pdf"


def parse() -> list[dict]:
    blocks: list[dict] = []; cur = None; curkey = None
    with pdfplumber.open(PDF) as pdf:
        for p in pdf.pages:
            for tb in p.extract_tables():
                for row in tb:
                    # the Latin PDF carries stray Cyrillic letters (ј, љ, њ) inside Latin words
                    cells = [(c or "").replace("\n", " ").replace("ј", "j").replace("љ", "lj").replace("њ", "nj").replace("Ј", "J").replace("Љ", "Lj").replace("Њ", "Nj").strip() for c in row]
                    name = cells[0]; phone = next((c for c in cells[1:] if re.search(r"\d{3}", c)), "")
                    if not name: continue
                    low = name.lower()
                    if low.startswith("policijska uprava"):
                        key = fold(re.sub(r"^policijska uprava\s*(za grad|u)?\s*", "", low))
                        if key != curkey:
                            cur = {"pu": name, "key": key, "phones": [], "extra": [], "stations": []}; blocks.append(cur); curkey = key
                        if phone: cur["phones"].append(phone)
                        continue
                    if cur is None: continue
                    if low.startswith("policijska stanica") or low.startswith("policijska ispostava") or low.startswith("saobraćajna policijska ispostava"):
                        cur["stations"].append({"name": name, "phones": [phone] if phone else [], "source_url": SRC})
                    else:
                        cur["extra"].append({"label": name, "phone": phone})
    return blocks


def main() -> None:
    blocks = parse()
    out, unmatched = [], []
    with db.conn() as c, c.cursor() as cur:
        cur.execute("select o.id, o.slug, o.name_lat from organizations o join org_types t on t.id = o.org_type_id where t.slug = 'mup-policijska-uprava' and o.name_lat like 'Policijska uprava%'")
        pus = cur.fetchall()
        cur.execute("select id, slug from territorial_units where level = 'jls'"); slug_by_id = {r["id"]: r["slug"] for r in cur.fetchall()}
        for b in blocks:
            if b["key"] in ("grad beograd", "beograd"):
                org = next((p for p in pus if "beograd" in p["slug"]), None)
            else:
                jid = resolve_jls(cur, b["key"]); jslug = slug_by_id.get(jid)
                org = next((p for p in pus if p["slug"] == f"policijska-uprava-{jslug}"), None) if jslug else None
            if not org: unmatched.append(b["pu"]); continue
            # keep the dežurna služba and traffic police as labelled extra phones on the PU seat
            extra_phones = [e["phone"] for e in b["extra"] if e["phone"] and re.search(r"dežurn|saobraćajn", e["label"], re.I)]
            out.append({"org_slug": org["slug"], "phones": b["phones"] + extra_phones, "source_url": SRC, "stations": b["stations"], "pu_pdf_name": b["pu"]})
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"pu_blocks": len(blocks), "matched": len(out), "unmatched": unmatched, "stations": sum(len(o["stations"]) for o in out)}))


if __name__ == "__main__":
    main()
