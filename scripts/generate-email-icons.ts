/**
 * Regenerates the social icons used in the newsletter email footer.
 *
 *   npx tsx scripts/generate-email-icons.ts
 *
 * Email clients strip inline SVG (Gmail/Outlook) and can't render relative
 * paths or data URIs reliably, so the footer references hosted PNGs. These are
 * "badge" marks: a filled moss circle with a white glyph, drawn at 2x (56px)
 * for retina and displayed at 28px. The baked-in moss/white contrast is why
 * they survive client dark-mode inversion (image pixels aren't inverted, only
 * CSS backgrounds/text are). Output lands in public/email/, served at
 * https://www.aaroncurtisyoga.com/email/<name>.png once deployed.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Matches MOSS in app/_lib/email/newsletter-template.ts
const MOSS = "#3f4a35";
const OUT_DIR = path.join(process.cwd(), "public", "email");

// 56x56 canvas = 2x the 28px display size. Glyphs are authored directly in the
// 56px coordinate space (no nested transforms) so the geometry is easy to read.
const instagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <circle cx="28" cy="28" r="28" fill="${MOSS}"/>
  <rect x="15" y="15" width="26" height="26" rx="8" fill="none" stroke="#ffffff" stroke-width="3.4"/>
  <circle cx="28" cy="28" r="6.5" fill="none" stroke="#ffffff" stroke-width="3.4"/>
  <circle cx="38.5" cy="17.5" r="2" fill="#ffffff"/>
</svg>`;

const youtubeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <circle cx="28" cy="28" r="28" fill="${MOSS}"/>
  <rect x="13" y="17.5" width="30" height="21" rx="6" fill="#ffffff"/>
  <path d="M24 22 L34.5 28 L24 34 Z" fill="${MOSS}"/>
</svg>`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const icons: Array<[string, string]> = [
    ["instagram.png", instagramSvg],
    ["youtube.png", youtubeSvg],
  ];
  for (const [name, svg] of icons) {
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, name));
    console.log(`wrote ${path.join("public", "email", name)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
