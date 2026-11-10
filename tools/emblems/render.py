#!/usr/bin/env python3
"""Render the 3D emblem set.  Usage:  .venv/bin/python tools/emblems/render.py [key ...]
No keys = all.  Outputs apps/web/public/emblems/<key>.png (1024), <key>@256.png, manifest.json, _sheet.png and
apps/web/lib/emblems-manifest.json (copy for the TS import)."""
import base64, datetime, functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WEB = ROOT / "apps" / "web"
OUT = WEB / "public" / "emblems"
NODE_BIN = "/opt/homebrew/opt/node@22/bin"

class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?")[0]
        if path.startswith("/nm/"):
            return str(WEB / "node_modules" / path[4:])
        return str(HERE / path.lstrip("/"))
    def log_message(self, *a): pass

def serve():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve(); url = f"http://127.0.0.1:{srv.server_address[1]}/render.html"
    tmp = Path(tempfile.mkdtemp(prefix="emblems_"))
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
        pg = b.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
        pg.on("console", lambda m: print("  [console]", m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: print("  [pageerror]", e))
        pg.goto(url); pg.wait_for_function("window.ready === true", timeout=20000)
        allkeys = pg.evaluate("window.KEYS")
        keys = only or allkeys
        done = []
        for k in keys:
            try:
                data = pg.evaluate(f"window.renderScene({json.dumps(k)})")
            except Exception as e:
                print("FAILED", k, str(e)[:200]); continue
            (tmp / f"{k}.png").write_bytes(base64.b64decode(data.split(",", 1)[1])); done.append(k)
        b.close()
    srv.shutdown()
    env = dict(os.environ, PATH=NODE_BIN + ":" + os.environ["PATH"])
    subprocess.run(["node", str(HERE / "optimize.mjs"), str(tmp), str(OUT), *done], check=True, env=env, cwd=HERE)
    shutil.rmtree(tmp, ignore_errors=True)
    # manifest = every key that has a png on disk
    have = sorted(f.stem for f in OUT.glob("*.png") if "@" not in f.stem and not f.stem.startswith("_"))
    man = {"keys": have, "size": 1024, "generated": datetime.date.today().isoformat()}
    (OUT / "manifest.json").write_text(json.dumps(man, indent=1))
    (WEB / "lib").mkdir(exist_ok=True); (WEB / "lib" / "emblems-manifest.json").write_text(json.dumps(man, indent=1))
    sheet(have)
    print("rendered", len(done), "keys; manifest", len(have))

def sheet(keys):
    from PIL import Image, ImageDraw, ImageFont
    cols, cell, lab = 8, 240, 22
    rows = (len(keys) + cols - 1) // cols
    im = Image.new("RGB", (cols * cell, rows * (cell + lab)), "#fbfaf7"); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
    except Exception: f = ImageFont.load_default()
    for i, k in enumerate(keys):
        x, y = (i % cols) * cell, (i // cols) * (cell + lab)
        t = Image.open(OUT / f"{k}@256.png").convert("RGBA").resize((cell - 8, cell - 8))
        im.paste(t, (x + 4, y + 4), t); d.text((x + 8, y + cell - 4), k, fill="#333", font=f)
    im.save(OUT / "_sheet.png", optimize=True)

if __name__ == "__main__":
    main(sys.argv[1:])
