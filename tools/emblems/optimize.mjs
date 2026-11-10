// node optimize.mjs <inDir> <outDir> key [key...]  — palette-quantise 1024 PNGs and write @256 versions.
import { createRequire } from "node:module"; const sharp = createRequire(import.meta.url)("../../apps/web/node_modules/sharp");
import fs from "node:fs"; import path from "node:path";
const [inDir, outDir, ...keys] = process.argv.slice(2);
for (const k of keys) {
  const src = fs.readFileSync(path.join(inDir, k + ".png"));
  const big = await sharp(src).png({ palette: true, quality: 82, colours: 192, dither: 0.6, effort: 8 }).toBuffer();
  fs.writeFileSync(path.join(outDir, k + ".png"), big);
  const small = await sharp(src).resize(256, 256, { kernel: "lanczos3" }).png({ palette: true, quality: 90, colours: 128, effort: 8 }).toBuffer();
  fs.writeFileSync(path.join(outDir, k + "@256.png"), small);
  console.log(k, (big.length / 1024).toFixed(0) + "KB", (small.length / 1024).toFixed(0) + "KB");
}
