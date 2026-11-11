"""Hours that follow from a rule, not from the institution's own page. Stored with a note so the page says so.

  python -m tools.reach.rule_hours            # dry run
  python -m tools.reach.rule_hours --write

Two rules, both only where a location has no hours at all:
  po propisu      ministries, the Treasury's branches, administrative districts and state-administration bodies named as an
                  uprava, direkcija, inspektorat, sekretarijat or kancelarija: Monday to Friday 07:30-15:30. Basis: the
                  Government's decision of 1 May 2014 that ministries, special organisations and government services work
                  07:30-15:30 (srbija.gov.rs/vest/en/100708), confirmed in 2026 by the Treasury's Informator o radu and by
                  every branch page read in the reach pass (RFZO, prosecutors' offices).
  dežurna služba  professional fire and rescue units: every day 00-24 (the 193 service). Volunteer societies (DVD) and
                  office seats are left out.
Nothing else is assumed: municipal offices, schools, police counters and private businesses differ too much.
"""
import json, re, sys, time, collections
from importers.common import db
from importers.common.match import add_hours
from importers.common.normalize import parse_hours

WRITE = "--write" in sys.argv
STATE = re.compile(r"^([A-ZŠĐŽČĆ]{2,6}\s[–-]\s)?(uprava|direkcija|republička direkcija|inspektorat|generalni sekretarijat|republički sekretarijat|kancelarija)\b", re.I)
FIRE = re.compile(r"vatrogasn", re.I)
BASIS = "https://www.srbija.gov.rs/vest/en/100708/new-working-hours-for-public-administration.php"
made = []; stats = collections.Counter()
with db.conn() as c, c.cursor() as cur:
    cur.execute("""
      select l.id, t.slug as ty, o.name_lat as org, l.unit_name_lat as unit
      from locations l join organizations o on o.id = l.org_id and o.status = 'active' join org_types t on t.id = o.org_type_id
      where l.status = 'active' and l.hours_text is null and not exists (select 1 from opening_hours h where h.location_id = l.id)
        and t.slug in ('ministarstvo', 'uprava-za-trezor', 'upravni-okrug', 'drzavni-organ', 'uprava-za-vanredne-situacije')""")
    for r in cur.fetchall():
        if r["ty"] == "uprava-za-vanredne-situacije":
            if not FIRE.search(r["unit"] or "") or re.search(r"\bdvd\b|dobrovoljn", (r["unit"] or "").lower()): continue
            text, note = "pon-ned 00:00-24:00", "dežurna služba"
        else:
            if r["ty"] == "drzavni-organ" and not STATE.search(r["org"] or ""): continue
            text, note = "pon-pet 07:30-15:30", "po propisu"
        stats[f"{note}: {r['ty']}"] += 1; made.append({"location_id": r["id"], "hours": text, "note": note, "org": r["org"], "unit": r["unit"]})
        if WRITE:
            add_hours(cur, r["id"], parse_hours(text), text)
            cur.execute("update opening_hours set note = %s where location_id = %s and department_id is null", (note, r["id"]))
            db.provenance(cur, "location", r["id"], "hours", "manual", BASIS if note == "po propisu" else "", 0.5, {"rule": note, "hours": text})
    if not WRITE: c.rollback()
print(dict(stats), len(made))
for m in [x for x in made if x["note"] == "po propisu"][::25][:8]: print("  ", m["org"][:60], "|", m["unit"])
if WRITE:
    path = f"db/fixes/rule_hours_{time.strftime('%Y-%m-%d_%H%M%S')}.json"
    json.dump(made, open(path, "x", encoding="utf-8"), ensure_ascii=False, indent=0); print("written", path)
