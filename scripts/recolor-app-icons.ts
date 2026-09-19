/**
 * Recolor the "AC" app icons into the homepage's moss + sand palette.
 *
 *   npx tsx scripts/recolor-app-icons.ts --verify <outDir>   # preview only
 *   npx tsx scripts/recolor-app-icons.ts --apply             # overwrite public/
 *
 * History: these icons started cobalt #2749e0, were remapped to the royal
 * anchor #0842a0 when the blue system landed, and move to moss here. Each pass
 * rewrites this file's FROM/TO constants rather than stacking scripts.
 *
 * The art is a flat field with a bold white "AC" on top, so we recolor rather
 * than redesign: a per-channel affine map f(x) = a*x + b pinned at two anchors,
 * the field color and the glyph color. Affine maps carry blends exactly, so
 * every anti-aliased edge pixel lands on the matching blend of the new pair and
 * the glyph keeps its shape without a font or vector source. Alpha rides
 * through with an identity coefficient.
 *
 * Why moss field and sand glyph, rather than the inverse: at 16px a sand field
 * disappears into a light browser tab strip, and an ink field disappears into a
 * dark one. Moss holds its tile shape against both.
 *
 * favicon.ico is NOT built here. It needs an optical crop to stay readable at
 * 16px, so it has its own script: run `npx tsx scripts/generate-favicon.ts`
 * after this one. When there's finally a real vector logo, replace this recolor
 * step with a proper generate-from-SVG script.
 *
 * Rounding note: an affine map can't land both anchors exactly at integer
 * precision. This pass stored the field as rgb(62,74,53), one below nominal
 * moss #3f4a35, exactly as the royal pass stored rgb(7,66,160). A future pass
 * should pin FROM_FIELD to the measured value again, not to the token.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const outIdx = process.argv.indexOf("--verify");
const OUT = outIdx !== -1 ? process.argv[outIdx + 1] : null;
if (!APPLY && !OUT) {
  throw new Error("pass --apply or --verify <outDir>");
}

/**
 * Source anchors, measured from the shipped PNGs rather than assumed: the
 * royal remap left the field one unit off nominal #0842a0, and pinning the map
 * to the real value is what makes the new field land exactly on moss.
 */
const FROM_FIELD = [7, 66, 160]; //   royal, as actually stored
const FROM_GLYPH = [255, 255, 255]; // white "AC"

const TO_FIELD = [0x3f, 0x4a, 0x35]; // moss  #3f4a35
const TO_GLYPH = [0xec, 0xe6, 0xda]; // sand  #ece6da

// Solve a, b per channel from the two anchors.
const a = TO_FIELD.map(
  (to, i) => (to - TO_GLYPH[i]) / (FROM_FIELD[i] - FROM_GLYPH[i]),
);
const b = a.map((ai, i) => TO_GLYPH[i] - FROM_GLYPH[i] * ai);
const A = [...a, 1]; // RGBA — alpha identity
const B = [...b, 0];

const PNGS = [
  "public/icons/icon-192x192.png",
  "public/icons/icon-512x512.png",
  "public/icons/apple-touch-icon.png",
  "public/apple-touch-icon.png",
];

function remap(inputPath: string) {
  return sharp(inputPath).linear(A, B);
}

async function sample(buf: Buffer, points: Array<[number, number]>) {
  const { data, info } = await sharp(buf)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return points.map(([x, y]) => {
    const i = (y * info.width + x) * info.channels;
    return `(${x},${y})=rgba(${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]})`;
  });
}

async function main() {
  if (OUT) await mkdir(OUT, { recursive: true });
  console.log("linear A(RGBA):", A.map((n) => n.toFixed(4)).join(", "));
  console.log("linear B(RGBA):", B.map((n) => n.toFixed(2)).join(", "));

  // Idempotency guard: the map assumes a FROM_FIELD source. Running it against
  // already-moss icons would push the field somewhere meaningless, so refuse
  // unless the 512's background still matches.
  const g = await sharp(path.join(ROOT, "public/icons/icon-512x512.png"))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const gi = (256 * g.info.width + 20) * g.info.channels; // left-edge background
  const [gr, gg, gb] = [g.data[gi], g.data[gi + 1], g.data[gi + 2]];
  if (
    Math.hypot(gr - FROM_FIELD[0], gg - FROM_FIELD[1], gb - FROM_FIELD[2]) > 30
  ) {
    throw new Error(
      `icon-512 background is rgb(${gr},${gg},${gb}), not the expected ` +
        `rgb(${FROM_FIELD.join(",")}); icons look already recolored. ` +
        `Refusing to double-remap.`,
    );
  }

  for (const rel of PNGS) {
    const buf = await remap(path.join(ROOT, rel)).png().toBuffer();
    const meta = await sharp(buf).metadata();
    if (rel.endsWith("icon-512x512.png")) {
      const pts = await sample(buf, [
        [20, 256], // left edge, background (expect moss)
        [256, 40], // top edge, background (expect moss)
        [200, 300], // inside the A stroke (expect sand)
      ]);
      console.log("   512 samples:", pts.join("  "));
    }
    const dest = APPLY
      ? path.join(ROOT, rel)
      : path.join(OUT!, rel.replace(/\//g, "__"));
    await writeFile(dest, buf);
    console.log(
      `   ${APPLY ? "wrote" : "preview"} ${rel} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`,
    );
  }

  console.log(
    "   next: npx tsx scripts/generate-favicon.ts to rebuild public/favicon.ico",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
