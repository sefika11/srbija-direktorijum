"""ABS list of approved CPC training centres (professional drivers) -> rows for importers.jobs.load_orgs_json.

  python -m tools.reach.cpc_centres <spisak-centara-za-obuku-cpc.pdf> <out.json>

Source: https://www.abs.gov.rs/static/uploads/15971_spisak-centara-za-obuku-cpc.pdf (Agencija za bezbednost saobraćaja).
One record per ordinal: business name, registry number, street, phones, city (upper case), e-mail, site, what it may teach.
A record that does not split cleanly into those parts is printed and left out.
"""
import json, re, sys
from pypdf import PdfReader
from importers.common.normalize import cyr_to_lat

PDF, OUT = sys.argv[1], sys.argv[2]
SRC = "https://www.abs.gov.rs/static/uploads/15971_spisak-centara-za-obuku-cpc.pdf"
txt = re.sub(r"\s+", " ", " ".join(p.extract_text() for p in PdfReader(PDF).pages))
pos, n, start = [], 1, 0
while True:  # ordinals in sequence: "1. ", then the next "2. " after it, ...
    m = re.search(rf"(?<![\d/.]){n}\. (?=\S)", txt[start:])
    if not m: break
    pos.append((n, start + m.start(), start + m.end())); start += m.end(); n += 1
recs = [(k, txt[b:(pos[i + 1][1] if i + 1 < len(pos) else len(txt))].strip()) for i, (k, a, b) in enumerate(pos)]
UP = "A-ZČĆŠŽĐА-ЯЂЈЉЊЋЏ"
rows, bad = [], []
for k, r in recs:
    r = re.sub(r"\s\d+\s*$", "", r)  # page number
    m = re.match(rf"^(?P<name>.+?) (?P<mb>\d{{7,8}}) (?P<addr>.+?) (?P<ph>0\d\d?[\d /;,\-–]{{6,}}?) (?P<city>[{UP}][{UP} ]{{2,}}?) (?P<rest>[a-z0-9].*@.*)$", r)
    if not m: bad.append((k, r)); continue
    # the PDF breaks e-mail addresses and site names across cells, so neither is taken from it
    phones = [p.strip() for p in re.split(r"[;,]| (?=0\d{2}[ /])", m["ph"]) if len(re.sub(r"\D", "", p)) >= 8]
    land = [p for p in phones if not re.match(r"^06", re.sub(r"\D", "", p))]; phones = (land + [p for p in phones if p not in land])[:2]
    city = re.sub(r" (\w)$", lambda x: x.group(1).lower(), cyr_to_lat(m["city"]).title()); addr = cyr_to_lat(m["addr"]).strip(" ,").replace("Spoljnostarčeva čka", "Spoljnostarčevačka")  # one street name is broken across a cell line
    op = re.sub(r"\s+", " ", cyr_to_lat(m["name"])).strip(" -–")
    rows.append({"name": f"CPC centar {op}", "type_slug": "cpc-centar", "town": city, "municipality": city, "address": addr, "phones": phones,
                 "extra": {"Pravno lice": op, "Matični broj": m["mb"], "Obuka": "prevoz tereta i putnika" if m["rest"].count("+") >= 2 else "prevoz tereta ili prevoz putnika"}, "source_url": SRC})
seen = {}
for r in rows:  # one operator can run two centres in a town: the street tells them apart
    key = (r["name"], r["town"]); seen[key] = seen.get(key, 0) + 1
for r in rows:
    if seen[(r["name"], r["town"])] > 1: r["name"] += f', {r["address"].split(",")[0]}'
json.dump({"source": {"name": "ABS – Spisak centara za obuku za sticanje CPC", "url": SRC, "fetched_at": "2026-11-11"}, "rows": rows}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(recs), "records,", len(rows), "parsed,", len(bad), "left out")
for k, r in bad: print("  LEFT OUT", k, r[:200])
