/**
 * Renders the social share card used by app/opengraph-image.png and
 * app/twitter-image.png.
 *
 *   npx tsx scripts/generate-og-image.ts            # writes both files
 *   npx tsx scripts/generate-og-image.ts --verify <outDir>
 *
 * The card is the homepage hero laid out for 1200x630, so the image someone
 * sees in a Slack or iMessage unfurl matches the page the link opens. Keep the
 * copy and the palette in step with app/(home)/_components/HomeHero.tsx and the
 * token block in app/globals.css.
 *
 * Why a checked-in PNG rather than a next/og route: Satori can't read the
 * woff2 files next/font caches, and a static file costs nothing at request
 * time. The trade is that this script must be re-run by hand whenever the card
 * changes, which is also why it fails loudly if the webfonts don't load. A
 * silent fallback to a system serif would ship a card that isn't Cormorant.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const ROOT = process.cwd();
const outIdx = process.argv.indexOf("--verify");
const OUT = outIdx !== -1 ? process.argv[outIdx + 1] : null;

const WIDTH = 1200;
const HEIGHT = 630;

const cutout = readFileSync(
  path.join(ROOT, "public/assets/images/handstand_cutout.png"),
);
const cutoutUri = `data:image/png;base64,${cutout.toString("base64")}`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Karla:wght@400;500&display=block" rel="stylesheet" />
<style>
  :root {
    --sand: #ece6da;
    --moss: #3f4a35;
    --ink: #23281f;
    --ink-muted: #55594d;
    --ink-label: #6b7360;
    --line: #c5bfae;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--sand); }

  .card {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: var(--sand);
    color: var(--ink);
    font-family: "Karla", sans-serif;
    line-height: normal;
  }

  .wordmark {
    position: absolute;
    left: 56px;
    top: 44px;
    font-family: "Cormorant Garamond", serif;
    font-weight: 500;
    font-size: 28px;
    line-height: 1;
  }

  .copy { position: absolute; left: 56px; top: 186px; width: 560px; }
  h1 {
    margin: 0;
    font-family: "Cormorant Garamond", serif;
    font-weight: 400;
    font-size: 112px;
    line-height: 0.95;
    letter-spacing: -0.02em;
  }
  h1 em { font-style: italic; }
  .tagline {
    margin: 34px 0 0;
    max-width: 560px;
    font-size: 26px;
    line-height: 1.5;
    color: var(--ink-muted);
  }

  /* Fine print: texture at unfurl size, readable when the image is opened. */
  .meta {
    position: absolute;
    left: 56px;
    right: 56px;
    top: 549px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 24px;
    border-top: 1px solid var(--line);
    padding-top: 18px;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-label);
    white-space: nowrap;
  }
  .meta .domain { color: var(--moss); }

  /* Same arch geometry as the homepage hero, at 7:9. */
  .figure { position: absolute; top: 40px; right: 56px; width: 396px; height: 509px; }
  .arch {
    position: absolute;
    left: 7%; right: 7%; top: 11%; bottom: 0;
    background: var(--moss);
    border-radius: 50% 50% 24px 24px / 43% 43% 24px 24px;
  }
  .figure img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
</style>
</head>
<body>
  <div class="card">
    <span class="wordmark">Aaron Curtis Yoga</span>
    <div class="copy">
      <h1>An honest<br /><em>practice.</em></h1>
      <p class="tagline">Yoga, movement &amp; sound in Washington, DC.</p>
    </div>
    <div class="meta">
      <span>Sunrise flows &middot; Power vinyasa &middot; Sound baths</span>
      <span class="domain">aaroncurtisyoga.com</span>
    </div>
    <div class="figure">
      <div class="arch"></div>
      <img src="${cutoutUri}" alt="" />
    </div>
  </div>
</body>
</html>`;

async function main() {
  if (OUT) await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  try {
    // Shoot at 2x and downsample, so the serif stays crisp at 1200x630.
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() => ({
      cormorant: document.fonts.check('112px "Cormorant Garamond"'),
      cormorantItalic: document.fonts.check(
        'italic 112px "Cormorant Garamond"',
      ),
      karla: document.fonts.check('26px "Karla"'),
      overflow:
        document.documentElement.scrollWidth +
        "x" +
        document.documentElement.scrollHeight,
    }));
    if (!loaded.cormorant || !loaded.cormorantItalic || !loaded.karla) {
      throw new Error(
        `webfonts did not load (cormorant=${loaded.cormorant}, italic=${loaded.cormorantItalic}, karla=${loaded.karla}). ` +
          `The card would silently fall back to a system serif, so refusing to write it.`,
      );
    }
    if (loaded.overflow !== `${WIDTH}x${HEIGHT}`) {
      throw new Error(`card overflows its frame: ${loaded.overflow}`);
    }

    const shot = await page.screenshot({
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    const png = await sharp(shot).resize(WIDTH, HEIGHT).png().toBuffer();

    for (const rel of ["app/opengraph-image.png", "app/twitter-image.png"]) {
      const dest = OUT
        ? path.join(OUT, rel.replace(/\//g, "__"))
        : path.join(ROOT, rel);
      await writeFile(dest, png);
      console.log(
        `   ${OUT ? "preview" : "wrote"} ${rel} (${WIDTH}x${HEIGHT}, ${png.length} bytes)`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
