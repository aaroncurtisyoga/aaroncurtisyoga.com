/**
 * Rebuilds public/favicon.ico from public/icons/icon-512x512.png.
 *
 *   npx tsx scripts/generate-favicon.ts             # writes public/favicon.ico
 *   npx tsx scripts/generate-favicon.ts --verify <outDir>
 *
 * Re-run this whenever the 512 changes (see scripts/recolor-app-icons.ts).
 *
 * The one thing this does that a plain resize doesn't: it crops to the "AC"
 * before scaling down. In the 512 the letters fill about half the tile, which
 * leaves roughly eight pixels for two letters at 16px and reads as a smear.
 * Cropping to the glyph plus a margin, so the letters fill ~80% of the tile,
 * takes the share of glyph-bright pixels at 16px from 14% to 36% and the mark
 * becomes readable in a tab strip. Optical sizing like this is normal for
 * favicons; the large icons keep the roomier original crop.
 *
 * No sharpening pass: at 16px it rings visibly around the stems and looks
 * worse than the clean Lanczos downscale.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const outIdx = process.argv.indexOf("--verify");
const OUT = outIdx !== -1 ? process.argv[outIdx + 1] : null;

const SRC = path.join(ROOT, "public/icons/icon-512x512.png");
const SIZES = [16, 32];

/** Bounding box of the light glyph against the dark field. */
async function glyphBox(file: string) {
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  let minX = w,
    maxX = -1,
    minY = h,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const lum =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum > 150) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`no glyph found in ${file}`);
  return { minX, maxX, minY, maxY, w, h };
}

// Minimal PNG-in-ICO container builder.
function buildIco(entries: Array<{ size: number; png: Buffer }>) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + 16 * entries.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

const GLYPH_SHARE = 0.8; // how much of the small tile the letters should fill

async function main() {
  if (OUT) await mkdir(OUT, { recursive: true });

  const box = await glyphBox(SRC);
  const glyphW = box.maxX - box.minX + 1;
  const glyphH = box.maxY - box.minY + 1;
  const tile = Math.round(Math.max(glyphW, glyphH) / GLYPH_SHARE);
  const cx = box.minX + glyphW / 2;
  const cy = box.minY + glyphH / 2;
  const left = Math.max(0, Math.round(cx - tile / 2));
  const top = Math.max(0, Math.round(cy - tile / 2));
  const size = Math.min(tile, box.w - left, box.h - top);
  console.log(
    `glyph ${glyphW}x${glyphH} at (${box.minX},${box.minY}) in ${box.w}x${box.h} -> crop ${size}x${size} at (${left},${top})`,
  );

  const cropped = sharp(SRC).extract({ left, top, width: size, height: size });
  const entries: Array<{ size: number; png: Buffer }> = [];
  for (const s of SIZES) {
    const png = await cropped.clone().resize(s, s).png().toBuffer();
    entries.push({ size: s, png });
    if (OUT) await writeFile(path.join(OUT, `favicon-${s}.png`), png);
  }

  const ico = buildIco(entries);
  const dest = OUT
    ? path.join(OUT, "favicon.ico")
    : path.join(ROOT, "public/favicon.ico");
  await writeFile(dest, ico);
  console.log(
    `   ${OUT ? "preview" : "wrote"} ${path.relative(ROOT, dest)} (${SIZES.join("+")}px, ${ico.length} bytes)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
