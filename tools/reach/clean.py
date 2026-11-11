"""Clean the agents' output of the reach pass before it is applied.

  python tools/reach/clean.py <targets_dir> <contacts_dir> <out_file.json> [--report]

Keeps a value only when the target row needed it, the source is not a directory or a social network, and the match holds up:
  - a location row must name a location of its own target file; one official branch feeds one location
  - a claimed address match is checked against the address we hold (street words must overlap)
  - phones are normalised and capped at three; hours must look like hours
The result is one array for importers.jobs.apply_contacts (rows keyed by location_id or org_slug). Reads no database.
"""
import glob, json, os, re, sys, collections, unicodedata

TARGETS, CONTACTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
BLOCK = ("planplus", "011info", "navidiku", "yellowpages", "zutestrane", "cylex", "facebook.", "instagram.", "google.", "goo.gl", "booking.com", "tripadvisor",
         "infostud", "poslovnabaza", "companywall", "bisnode", "kompass", "mojabaza", "firmaimenik", "srbijafirme", "privredni-imenik", "poslovni-imenik",
         "foursquare", "waze.", "linkedin.", "wikipedia.", "wikimapia", "telefonski-imenik", "pronadjime", "kvalitetno", "najboljeusrbiji", "moja-delatnost", "biznis-vodic")
CHAINS = ("net-banka", "net-apotekarska", "net-osiguravajuce", "net-small")
stats = collections.Counter()

def fold(s):
    s = unicodedata.normalize("NFD", (s or "").lower().replace("đ", "dj"))
    return re.sub(r"[^a-z0-9 ]+", " ", "".join(ch for ch in s if not unicodedata.combining(ch)))
STREET_STOP = {"ulica", "ul", "bb", "br", "broj", "bulevar", "bul", "trg", "put", "kej", "i", "lokal", "tc", "sprat"}
def street_words(addr):
    head = (addr or "").split(",")[0]
    return {w for w in fold(head).split() if len(w) > 2 and not w.isdigit() and w not in STREET_STOP}
def blocked(url): return any(b in (url or "").lower() for b in BLOCK)
def clean_phones(v):
    out = []
    for p in (v if isinstance(v, list) else [v] if v else []):
        if not isinstance(p, str): continue
        for part in re.split(r"[;,/]| i ", p):
            d = re.sub(r"\D", "", part)
            if d.startswith("381"): d = "0" + d[3:]
            if d.startswith("00381"): d = "0" + d[5:]
            if 8 <= len(d) <= 11 and d.startswith("0") and d not in out: out.append(d)
    return out[:3]
def clean_hours(v):
    if not isinstance(v, str): return None
    v = re.sub(r"\s+", " ", v).strip(" .;")
    if not (5 <= len(v) <= 160): return None
    if not re.search(r"\d{1,2}[:.h]?\d{0,2}\s?[-–]\s?\d{1,2}", v): return None
    if re.search(r"(?i)nije objavljeno|nepoznat|n/a|unknown|not (found|published)", v): return None
    return v
def clean_address(v):
    if not isinstance(v, str): return None
    v = re.sub(r"\s+", " ", v).strip(" ,.;")
    if len(v) < 6 or len(v) > 140 or not re.search(r"\d|\bbb\b", v, re.I): return None
    if re.search(r"(?i)nepoznat|n/a|unknown|not (found|published)", v): return None
    return v
def clean_site(v):
    if not isinstance(v, str): return None
    v = v.strip()
    if not re.match(r"https?://[^\s/]+\.[a-z]{2,}", v, re.I) or blocked(v): return None
    return v
def clean_email(v):
    if isinstance(v, str) and re.match(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", v.strip(), re.I): return v.strip().lower()
    return None

def load(path):
    try:
        d = json.load(open(path, encoding="utf-8"))
        return d if isinstance(d, list) else d.get("rows", []) if isinstance(d, dict) else []
    except Exception:
        stats["unreadable_files"] += 1; return []

# branch rows merged into their official twin since the targets were built: nothing is applied to them
MERGED = {x["location_id"] for f in glob.glob("db/fixes/merged_map_rows_*.json") for x in json.load(open(f, encoding="utf-8"))}
out = []; report = []
for tf in sorted(glob.glob(os.path.join(TARGETS, "*.json"))):
    fid = os.path.basename(tf)[:-5]
    if fid.startswith("_") or fid == "reg-education": continue
    cf = os.path.join(CONTACTS, fid + ".json")
    if not os.path.exists(cf): stats["no_output"] += 1; continue
    t = json.load(open(tf, encoding="utf-8")); rows = load(cf); kept = 0
    if t["kind"] == "network":
        ours = {r["location_id"]: r for o in t["orgs"] for r in o["rows"]}
        org_of = {r["location_id"]: o["org_slug"] for o in t["orgs"] for r in o["rows"]}
        place_n = collections.Counter((o["org_slug"], r["place"]) for o in t["orgs"] for r in o["rows"] if r["location_id"] not in MERGED)
        seen = set(); addr_use = collections.Counter(fold(r.get("address") or "") for r in rows if isinstance(r, dict) and r.get("address"))
        for r in rows:
            if not isinstance(r, dict): continue
            lid = r.get("location_id"); o = ours.get(lid)
            if not o: stats["net_unknown_location"] += 1; continue
            if lid in MERGED: stats["net_merged_duplicate"] += 1; continue
            if lid in seen: stats["net_duplicate_location"] += 1; continue
            if blocked(r.get("source_url")): stats["blocked_source"] += 1; continue
            addr = clean_address(r.get("address"))
            if addr and o["address"] and re.search(r"\d", o["address"]):
                # we hold an address: the official one must be the same street, else the match is wrong and nothing of the row is kept
                a, b = street_words(o["address"]), street_words(addr)
                if a and b and not (a & b) and not any(x[:5] == y[:5] for x in a for y in b): stats["net_address_mismatch"] += 1; continue
            if addr and fid.startswith(CHAINS) and addr_use[fold(addr)] > 1: stats["net_shared_address"] += 1; continue
            if r.get("match") != "address" and not o["phones"] and place_n[(org_of[lid], o["place"])] > 1 and not (street_words(addr or "") & set(fold(o["unit"]).split())):
                stats["net_ambiguous_place"] += 1; continue
            row = {"location_id": lid, "source_url": r.get("source_url")}
            if addr and "address" in o["need"]: row["address"] = addr
            ph = clean_phones(r.get("phones"))
            if ph and "phones" in o["need"]: row["phones"] = ph
            hr = clean_hours(r.get("hours"))
            if hr and not o["hours"]: row["hours"] = hr
            em = clean_email(r.get("email"))
            if em: row["email"] = em
            if len(row) > 2: seen.add(lid); out.append(row); kept += 1
    else:
        ours = {r["org_slug"]: r for r in t["rows"]}; seen = set()
        for r in rows:
            if not isinstance(r, dict): continue
            o = ours.get(r.get("org_slug"))
            if not o: stats["org_unknown"] += 1; continue
            if o["org_slug"] in seen: continue
            if blocked(r.get("source_url")): stats["blocked_source"] += 1; continue
            row = {"org_slug": o["org_slug"], "source_url": r.get("source_url")}
            addr = clean_address(r.get("address"))
            if addr and "address" in o["need"]: row["address"] = addr
            ph = clean_phones(r.get("phones"))
            if ph and "phones" in o["need"]: row["phones"] = ph
            hr = clean_hours(r.get("hours"))
            if hr and not o["have"]["hours"]: row["hours"] = hr
            site = clean_site(r.get("website"))
            if site and not o["website"]: row["website"] = site
            em = clean_email(r.get("email"))
            if em: row["email"] = em
            if len(row) > 2: seen.add(o["org_slug"]); out.append(row); kept += 1
    n_t = sum(len(o["rows"]) for o in t["orgs"]) if t["kind"] == "network" else len(t["rows"])
    report.append((fid, n_t, len(rows), kept))
    stats["files"] += 1; stats["agent_rows"] += len(rows); stats["kept_rows"] += kept

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
for f in ("address", "phones", "hours", "website", "email"): stats["with_" + f] = sum(1 for r in out if r.get(f))
print(json.dumps(dict(stats), indent=1))
if "--report" in sys.argv:
    for fid, n_t, n_a, kept in report: print(f"{fid:58s} targets {n_t:4d}  agent rows {n_a:4d}  kept {kept:4d}")
