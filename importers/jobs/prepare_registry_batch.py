"""Prepare a batch of registry files (db/imports/*_<date>.json written by research agents) for loading.

  python -m importers.jobs.prepare_registry_batch 2026-11-10            # dry run: report only
  python -m importers.jobs.prepare_registry_batch 2026-11-10 --write    # write clean files, contacts and the retype list
  python -m importers.jobs.prepare_registry_batch 2026-11-10 --retype   # apply the retype list (after the type seed patch)
  ... --only <stem> [<stem> …]   one or more files;   --before <timestamp>   when re-running after a load (see --help)

What it does, per file (see PLAN below):
- cleans rows: merges exact duplicates, tells apart several offices of one name in one town by their address, repairs
  "settlement, municipality" towns, resolves the municipality (rows that resolve to no municipality are dropped);
- for PUBLIC institutions, looks the row up among organisations the database already holds (same municipality, same
  normalised name). A hit is not loaded again: the existing organisation gets the more specific type (retype list) and
  the row's contacts go to db/contacts/<file>_contacts_<date>.json for importers.jobs.apply_contacts;
- natural persons (court experts, mediators, administrators, appraisers): town, phone, e-mail and field only; the
  street address in the register is not republished.
Output: db/imports/clean_<date>/<file>.json (load with importers.jobs.load_orgs_json), db/contacts/*, retype_<date>.json.
"""
from __future__ import annotations
import argparse, collections, json, os, re
from ..common import db
from ..common.normalize import clean_ws
from ..sources.rfzo_apoteke import LatinResolver, fold
from .load_orgs_json import lat, nice_case, slugify

# file stem -> (data source code, mode, options)   mode: "new" = insert only, "match" = retype existing + insert the rest, "skipmatch" = insert only what is not there yet
PLAN: dict[str, tuple[str, str, dict]] = {
    "menjacnice": ("nbs_registri", "new", {}), "platne_institucije": ("nbs_registri", "new", {}), "lizing": ("nbs_registri", "new", {}), "penzijski_fondovi": ("nbs_registri", "new", {}),
    "sudski_vestaci": ("mpravde_registri", "new", {"person": True}), "medijatori": ("mpravde_registri", "new", {"person": True}),
    "stecajni_upravnici": ("alsu_imenik", "new", {"person": True}), "procenitelji": ("mfin_registri", "new", {"person": True}), "revizorske_kuce": ("kor_registar", "new", {}),
    "hoteli_kategorisani": ("mto_registri", "new", {}), "agencije_za_zaposljavanje": ("minrzs_licence", "new", {}), "usluge_socijalne_zastite": ("minrzs_licence", "new", {"merge": "service"}),
    "laboratorije": ("ats_registar", "new", {"drop": r"klini[cč]ki centar|zavod za javno|institut za plu[cć]ne|medicine rada|zdravstvenu za[sš]titu radnika|univerzitetski"}),
    "carinarnice": ("carina_rs", "new", {}), "granicni_prelazi": ("carina_rs", "new", {}),
    "specijalne_bolnice": ("zdravlje_mreza", "match", {}), "klinike_instituti": ("zdravlje_mreza", "match", {}), "gerontoloski_centri": ("minrzs_licence", "match", {}),
    "domovi_ucenika": ("mpntr_registar", "match", {}), "muzicke_skole": ("mpntr_registar", "match", {}), "privatne_skole": ("mpntr_registar", "new", {}),  # public schools share these names; never match
    "arhivi": ("arhiv_srbije", "match", {}), "zavodi_spomenici": ("rzzsk_mreza", "match", {}), "skole_za_odrasle": ("azk_noks", "skipmatch", {}),  # organisers that are schools or faculties keep their own type
    "privatne_visokoskolske": ("mpntr_registar", "skipmatch", {"kind_type": {"univerzitet": "univerzitet", "fakultet": "fakultet", "visoka škola": "visoka-skola"}}),
}
TOWN_FIX = {"mladenova c": "Mladenovac", "petrovarad in": "Petrovaradin", "smederevsk a palanka": "Smederevska Palanka", "petrovcu na mlavi": "Petrovac na Mlavi", "petrovac": "Petrovac na Mlavi"}
STOP = re.compile(r"\b(javna ustanova|ustanova|ju|doo|d o o|ad|a d|pr|u likvidaciji|sa p o|sa po|privredno drustvo|drustvo sa ogranicenom odgovornoscu)\b")

def key(name: str) -> str:
    k = fold(lat(name) or "").lower(); k = re.sub(r"[\"'„“”’`´«»().,;:\-–—/]", " ", k); k = STOP.sub(" ", k)
    return re.sub(r"\s+", " ", k).strip()

def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("date"); ap.add_argument("--write", action="store_true"); ap.add_argument("--retype", action="store_true"); ap.add_argument("--only", nargs="*", help="file stems to process (default: all in PLAN)")
    ap.add_argument("--before", help="match only against organisations created before this timestamp (re-running after a load: pass the time the batch started, so rows do not match their own earlier insert)"); a = ap.parse_args()
    outdir = f"db/imports/clean_{a.date}"; retype_path = f"{outdir}/retype_{a.date}.json"
    with db.conn() as c, c.cursor() as cur:
        if a.retype:
            todo = json.load(open(retype_path)); cur.execute("select id, slug from org_types"); tid = {r["slug"]: r["id"] for r in cur.fetchall()}; n = 0
            for x in todo:
                if x["type_slug"] in tid: cur.execute("update organizations set org_type_id = %s, updated_at = now() where id = %s and org_type_id <> %s", (tid[x["type_slug"]], x["org_id"], tid[x["type_slug"]])); n += cur.rowcount
            c.commit(); print(json.dumps({"retyped": n, "listed": len(todo)})); return
        res = LatinResolver(cur)
        cur.execute("select id, name_lat, level::text as level, parent_id from territorial_units where level in ('jls', 'gradska_opstina')"); units = {r["id"]: r for r in cur.fetchall()}
        jname = {i: u["name_lat"] for i, u in units.items() if u["level"] == "jls"}
        cur.execute("""select o.id, o.slug, o.name_lat, t.slug as type,
                              (select j.id from territorial_units j where j.level = 'jls' and j.path @> coalesce(p.path, f.path) limit 1) as jid
                       from organizations o join org_types t on t.id = o.org_type_id
                       left join territorial_units f on f.id = o.founder_unit_id
                       left join locations l on l.org_id = o.id and l.is_primary left join territorial_units p on p.id = l.territorial_unit_id
                       where o.status = 'active' and t.slug not in ('mesna-zajednica') and (%s::timestamptz is null or o.created_at < %s::timestamptz)""", (a.before, a.before))
        by_jls: dict = collections.defaultdict(list); by_key: dict = collections.defaultdict(list)
        for r in cur.fetchall(): k = key(r["name_lat"]); by_jls[r["jid"]].append((k, r)); by_key[k].append(r)

        def resolve(row) -> int | None:
            town = clean_ws(lat(row.get("town")) or ""); muni = clean_ws(lat(row.get("municipality")) or "")
            town = TOWN_FIX.get(fold(town).lower(), town); row["town"] = town
            cands = [muni, town] + [p.strip() for p in re.split(r"\s*[,/]\s*|\s+-\s+|-", town) if p.strip()][::-1]
            for cand in cands:
                if cand and cand.lower() != "null":
                    j = res.resolve(cand)
                    if j and j not in jname and j in units: j = units[j]["parent_id"]  # a city municipality resolves to its city
                    if j in jname: return j
            return None

        def find(row, jid):
            k = key(row["name"]); hits = [r for kk, r in by_jls.get(jid, []) if kk == k or (len(k) >= 14 and len(kk) >= 14 and (k in kk or kk in k) and min(len(k), len(kk)) / max(len(k), len(kk)) >= 0.55)]
            if not hits: hits = [r for r in by_key.get(k, []) if r["jid"] is None]
            return hits

        report, retype = [], []
        for stem, (source, mode, opt) in PLAN.items():
            if a.only and stem not in a.only: continue
            path = f"db/imports/{stem}_{a.date}.json"
            if not os.path.exists(path): continue
            doc = json.load(open(path, encoding="utf-8")); rows = doc["rows"]; st = collections.Counter(rows=len(rows))
            if opt.get("drop"): rows = [r for r in rows if not re.search(opt["drop"], fold(r["name"]).lower())]; st["dropped_public"] = st["rows"] - len(rows)
            # resolve places, drop what has no municipality
            keep = []
            for r in rows:
                j = resolve(r)
                if not j: st["unresolved"] += 1; continue
                r["_jid"] = j; r["municipality"] = jname[j]; keep.append(r)
            # merge exact duplicates; tell apart several offices of the same name in one town by address
            groups: dict = collections.defaultdict(list)
            for r in keep: groups[(key(r["name"]), r["_jid"])].append(r)
            rows = []
            for (_, _), g in groups.items():
                if len(g) == 1: rows.append(g[0]); continue
                by_addr: dict = collections.OrderedDict()
                for r in g: by_addr.setdefault(fold(r.get("address") or "").lower(), []).append(r)
                for i, (addr, same) in enumerate(by_addr.items()):
                    r = same[0]; st["merged"] += len(same) - 1
                    for o in same[1:]:
                        for f in ("phones", "emails"): r[f] = list(dict.fromkeys((r.get(f) or []) + (o.get(f) or [])))[:3]
                        mk = opt.get("merge")
                        if mk and (o.get("extra") or {}).get(mk): r.setdefault("extra", {})[mk] = "; ".join(dict.fromkeys(str((r.get("extra") or {}).get(mk, "")).split("; ") + [str(o["extra"][mk])]))
                    if len(by_addr) > 1 and not opt.get("person"): r["name"] = f"{r['name']} – {r.get('address') or f'lokacija {i + 1}'}"; st["office_suffix"] += 1
                    rows.append(r)
            # the loader derives the web address (slug) from type + name + town and cuts it at 80 characters: make sure no two
            # rows end up on the same one, by shortening the name and adding the street (or a counter) where they would
            def slug_of(r):
                name = nice_case(clean_ws(lat(r["name"]) or "")); town = clean_ws(lat(r.get("town")) or ""); t = r["type_slug"]
                return slugify(f"{name}-{town}") if slugify(name).startswith(slugify(t).split("-")[0]) else slugify(f"{t}-{name}-{town}")
            seen: dict = {}
            for r in rows:
                sl = slug_of(r); n, cut, base, addr = 1, 38, r["name"], (r.get("address") or "").strip()
                if opt.get("person"):  # two people with one name in one town: tell them apart by field, never by street
                    ex = r.get("extra") or {}; f = ex.get("oblasti") or ex.get("oblast") or ex.get("zvanje") or ""
                    addr = (f[0] if isinstance(f, list) and f else f if isinstance(f, str) else "").split("–")[0].strip()
                while (sl in seen or (n > 1 and len(sl) >= 79)) and n < 400:
                    if n > 1 and len(sl) >= 79 and cut > 8: cut -= 6   # the cut-off would swallow the distinguishing tail: shorten the name part
                    else: n += 1
                    if n == 1: n = 2
                    tail = addr[:22] if (n == 2 and addr) else (f"{addr[:16]} {n}".strip())
                    r["name"] = f"{base[:cut].rstrip(' –-')} – {tail}"; sl = slug_of(r)
                if n > 1: st["renamed_unique"] += 1
                seen[sl] = True
            clean, contacts = [], []
            for r in rows:
                jid = r.pop("_jid")
                if opt.get("person"): r["address"] = None; r["extra"] = {k: v for k, v in (r.get("extra") or {}).items() if k in {"oblasti", "oblast", "zvanje", "sud", "kind", "licence", "licenca", "jezici", "specijalnost", "field", "fields"}}
                if opt.get("kind_type"): r["type_slug"] = opt["kind_type"].get(((r.get("extra") or {}).get("kind") or "").lower(), r["type_slug"])
                if mode in ("match", "skipmatch"):
                    hits = find(r, jid)
                    if len(hits) == 1:
                        h = hits[0]; st["matched"] += 1
                        if mode == "match" and h["type"] != r["type_slug"]: retype.append({"org_id": h["id"], "org_slug": h["slug"], "from": h["type"], "type_slug": r["type_slug"], "file": stem, "existing": h["name_lat"], "row": r["name"]}); st["retype"] += 1
                        if r.get("address") or r.get("phones") or r.get("emails") or r.get("website"):
                            contacts.append({"org_id": h["id"], "website": r.get("website"), "phones": r.get("phones") or [], "email": (r.get("emails") or [None])[0], "address": r.get("address"), "hours": r.get("hours"), "source_url": r.get("source_url") or doc["source"].get("url")})
                        continue
                    if len(hits) > 1: st["ambiguous_skipped"] += 1; continue
                clean.append(r)
            st["to_insert"] = len(clean); report.append((stem, source, mode, dict(st)))
            if a.write:
                os.makedirs(outdir, exist_ok=True)
                json.dump({"source": doc["source"], "note": doc.get("note"), "rows": clean}, open(f"{outdir}/{stem}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
                if contacts: json.dump(contacts, open(f"db/contacts/{stem}_contacts_{a.date}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        if a.write and not a.only and not a.before: json.dump(retype, open(retype_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        for stem, source, mode, st in report: print(f"{stem:28} {mode:9} {source:17} {st}")
        for x in retype:
            if key(x["existing"]) != key(x["row"]): print("  ~", x["from"], "->", x["type_slug"], "|", x["existing"][:70], "<=", x["row"][:70])
        print("retype by from-type:", dict(collections.Counter((x["from"], x["type_slug"]) for x in retype)))

if __name__ == "__main__":
    main()
