"""Tier 4: RZS codebooks (verified 2026-11-09 on opendata.stat.gov.rs).

  SIFOPS  206 rows  {MBOPS, nOPS, IDNSTJ}  municipality code, name (Cyrillic), NUTS3 okrug code (RS110 ...)
                    includes gradske opštine ('Палилула (Београд)', 'Нови Београд') and city aggregates ('Град Ниш').
  SIFNAS  6170 rows {MBNAS, nNAS, MBOPS}   settlement code, name, parent municipality code.
Loads both into staging.rzs_naselja (settlements with their municipality) and writes rzs_code / nuts3_code
onto territorial_units. Settlement → JLS resolution is then a lookup used by the KJS importer.

  python -m importers.sources.rzs_codebooks
"""
from __future__ import annotations

import json
import re

from ..common import db
from ..common.http import PoliteClient
from ..common.normalize import cyr_to_lat

SOURCE = "rzs"
BASE = "https://opendata.stat.gov.rs/data/WcfJsonRestService.Service1.svc/dataset/{ds}/1/json"
PAREN = re.compile(r"^(?P<name>.+?)\s*\((?P<city>[^)]+)\)\s*$")


def fetch(client: PoliteClient, ds: str) -> list[dict]:
    r = client.get(BASE.format(ds=ds))
    return json.loads(r.content.decode("utf-8-sig"))


class UnitIndex:
    """All JLS and gradske opštine keyed by Python-uppercased Cyrillic name (SQL upper() is locale-bound)."""

    def __init__(self, cur):
        cur.execute("select id, name_cyr, name_lat, level, parent_id from territorial_units where level in ('jls','gradska_opstina')")
        self.by_cyr: dict[str, list[dict]] = {}
        self.by_lat: dict[str, list[dict]] = {}
        for r in cur.fetchall():
            if r["name_cyr"]:
                self.by_cyr.setdefault(r["name_cyr"].upper(), []).append(r)
            self.by_lat.setdefault(cyr_to_lat(r["name_lat"]).upper(), []).append(r)

    def resolve(self, name_cyr: str) -> int | None:
        """'Бабушница' → JLS; 'Палилула (Београд)' → gradska opština under Beograd; 'Град Ниш' → the city JLS."""
        name = name_cyr.strip()
        if name.startswith("Град "):
            name = name[5:]
        m = PAREN.match(name)
        if m:
            gos = [u for u in self.by_cyr.get(m.group("name").strip().upper(), []) if u["level"] == "gradska_opstina"]
            cities = [u for u in self.by_cyr.get(m.group("city").strip().upper(), []) if u["level"] == "jls"]
            for g in gos:
                if cities and g["parent_id"] == cities[0]["id"]:
                    return g["id"]
            return gos[0]["id"] if len(gos) == 1 else None
        cands = self.by_cyr.get(name.upper(), []) or self.by_lat.get(cyr_to_lat(name).upper(), [])
        jls = [u for u in cands if u["level"] == "jls"]
        if jls:
            return jls[0]["id"]
        return cands[0]["id"] if len(cands) == 1 else None


def main() -> None:
    client = PoliteClient()
    ops = fetch(client, "SIFOPS")
    nas = fetch(client, "SIFNAS")
    stats = {"opstine": len(ops), "naselja": len(nas), "units_coded": 0, "nuts3_set": 0, "unresolved_ops": []}
    with db.conn() as c, c.cursor() as cur:
        idx = UnitIndex(cur)
        op_unit: dict[str, int | None] = {}
        op_name: dict[str, str] = {}
        for o in ops:
            code, name = str(o["MBOPS"]), o["nOPS"]
            op_name[code] = name
            if not str(o.get("IDNSTJ") or "").startswith("RS"):
                continue  # 'Иностранство', prisons etc.
            uid = idx.resolve(name)
            op_unit[code] = uid
            if uid is None:
                stats["unresolved_ops"].append(name)
                continue
            if not name.startswith("Град "):
                cur.execute("update territorial_units set rzs_code = %s where id = %s and rzs_code is null", (code, uid))
                stats["units_coded"] += cur.rowcount
            # NUTS3 → okrug of this unit
            cur.execute(
                """update territorial_units o set nuts3_code = %s
                   from territorial_units u where u.id = %s and o.level = 'okrug' and o.path @> u.path and o.nuts3_code is null""",
                (o["IDNSTJ"], uid))
            stats["nuts3_set"] += cur.rowcount
        cur.execute("truncate staging.rzs_naselja")
        cur.executemany(
            """insert into staging.rzs_naselja (sifra, naziv_cyr, naziv_lat, opstina_sifra, opstina_naziv, jls_id)
               values (%s, %s, %s, %s, %s, %s) on conflict (sifra) do nothing""",
            [(str(n["MBNAS"]), n["nNAS"], cyr_to_lat(n["nNAS"]), str(n["MBOPS"]), op_name.get(str(n["MBOPS"])),
              op_unit.get(str(n["MBOPS"]))) for n in nas])
        # a gradska opština id is fine as jls_id's target type, but name it honestly: it is the finest unit known
        cur.execute("update data_sources set last_fetched_at = now() where code = %s", (SOURCE,))
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
