"""Ministry of Tourism and Youth: unified register of youth associations -> rows for importers.jobs.load_orgs_json.

  python -m tools.reach.youth_associations <evidencija.xlsx> <apr_ngo.json> <out.json>

Source: https://www.mto.gov.rs/tekst/1265/evidencija-udruzenja.php (file /extfile/sr/1282/072026.xlsx: name, registry
number, tax number, place, district, municipality, address, founding date, field of work, form). No phones or sites.
An association is kept only when the business registry still lists its registry number (APR open data,
https://openapi.apr.gov.rs/api/opendata/ngo, cut-off 2026-10-31) and its row is not marked as deleted there.
"""
import json, re, sys
import openpyxl
from importers.common.normalize import cyr_to_lat

XLSX, APR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PAGE = "https://www.mto.gov.rs/tekst/1265/evidencija-udruzenja.php"
alive = {k.lstrip("0") for k in json.load(open(APR, encoding="utf-8"))["Podaci"]}
def lat(x): return re.sub(r"\s+", " ", cyr_to_lat(str(x)).replace("\n", " ")).strip(" ,") if x not in (None, "") else ""
def year(x):
    m = re.search(r"(19|20)\d\d", str(x) if x else ""); return m.group(0) if m else None
FORM = {"udruzenje mladih": "udruženje mladih", "udruzenje za mlade": "udruženje za mlade"}
rows, gone, bad, seen = [], 0, 0, set()
for r in list(openpyxl.load_workbook(XLSX, read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True))[1:]:
    if len(r) < 18 or not r[3]: continue
    name, mb, place, muni, addr = lat(r[3]), re.sub(r"\D", "", str(r[4] or "")), lat(r[6]), lat(r[8]), lat(r[9])
    if re.search(r"(?i)brisan", name) or mb.lstrip("0") not in alive: gone += 1; continue
    if not name or not (place or muni) or mb in seen: bad += 1; continue
    seen.add(mb)
    form = re.sub(r"\s+", " ", lat(r[17]).lower()); field = lat(r[15])
    extra = {"Oblik": form, "Matični broj": mb.zfill(8)}
    if lat(r[5]): extra["PIB"] = lat(r[5])
    if year(r[10]): extra["Osnovano"] = year(r[10])
    if field: extra["Oblast rada"] = field[:220] + ("…" if len(field) > 220 else "")
    rows.append({"name": name, "type_slug": "omladinsko-udruzenje", "town": place or muni, "municipality": muni or place,
                 "address": addr if re.search(r"\d|\bbb\b", addr, re.I) else None, "phones": [], "extra": extra, "source_url": PAGE})
json.dump({"source": {"name": "Ministarstvo turizma i omladine – Jedinstvena evidencija udruženja mladih, udruženja za mlade i njihovih saveza", "url": PAGE, "fetched_at": "2026-11-11"}, "rows": rows},
          open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(rows), "kept;", gone, "no longer in the business registry or marked deleted;", bad, "without a name or place, or listed twice;", sum(1 for x in rows if x["address"]), "with a street")
for x in rows[:3] + rows[-2:]: print("  ", x["name"][:50], "|", x["town"], "|", x["municipality"], "|", x["address"], "|", x["extra"]["Oblik"])
