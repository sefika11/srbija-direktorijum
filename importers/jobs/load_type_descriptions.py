"""Load db/types/*.json → org_types.description_md / faq_md (faq stored as JSON text in faq_md). Idempotent."""
from __future__ import annotations
import glob, json, os, sys
from ..common import db

def main() -> None:
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "db", "types")
    n = 0
    with db.conn() as c, c.cursor() as cur:
        for f in sorted(glob.glob(os.path.join(folder, "*.json"))):
            t = json.load(open(f, encoding="utf-8"))
            cur.execute("update org_types set description_md = %s, faq_md = %s where slug = %s",
                        (t["description_md"], json.dumps(t.get("faq", []), ensure_ascii=False), t["slug"]))
            if cur.rowcount == 0: print("unknown type", t["slug"])
            else: n += 1
    print(json.dumps({"updated": n}))

if __name__ == "__main__":
    main()
