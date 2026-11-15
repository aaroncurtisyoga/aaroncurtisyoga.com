"use server";

import { put } from "@vercel/blob";
import sharp from "sharp";
import { requireAdmin } from "@/app/_lib/auth";
import { parseYouTubeUrl } from "@/app/_lib/utils/youtube";

export type VideoThumbnailResult =
  | {
      ok: true;
      imageUrl: string;
      title: string;
      watchUrl: string;
    }
  | { ok: false; error: string };

// Email can't play video, so the newsletter shows a still with a play button
// baked in and links it to YouTube. Sized at 2x the 528px email column.
const LANDSCAPE = { width: 1200, height: 675 };
// A full 9:16 Short would run three screens tall on a phone; 4:5 keeps the
// portrait feel at a sane height.
const PORTRAIT = { width: 1080, height: 1350 };

const playButtonSvg = (size: number) => {
  const r = size / 2;
  // Triangle nudged right of center, where it looks centered to the eye
  const t = size * 0.2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${r}" cy="${r}" r="${r - 4}" fill="rgba(20,22,18,0.62)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
      <path d="M ${r - t * 0.75} ${r - t} L ${r + t * 1.15} ${r} L ${r - t * 0.75} ${r + t} Z" fill="#ffffff"/>
    </svg>`,
  );
};

async function fetchImage(url: string): Promise<Buffer | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

/**
 * YouTube serves several stills per video and not every size exists for
 * every upload, so walk from best to worst. Shorts have a portrait original
 * ("oardefault"); the others are 16:9, or 4:3 with black bars that the cover
 * crop below trims off.
 */
async function fetchBestStill(
  id: string,
  isShort: boolean,
): Promise<Buffer | null> {
  const names = [
    ...(isShort ? ["oardefault"] : []),
    "maxresdefault",
    "sddefault",
    "hqdefault",
  ];
  for (const name of names) {
    const image = await fetchImage(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
    // A missing size comes back as a tiny gray placeholder on some videos
    if (image && image.byteLength > 2000) return image;
  }
  return null;
}

async function fetchTitle(watchUrl: string): Promise<string> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return "";
    const data = (await response.json()) as { title?: string };
    return (data.title ?? "").replace(/\s*#\w+/g, "").trim();
  } catch {
    return "";
  }
}

/**
 * Build the clickable still for a YouTube link: fetch the video's thumbnail,
 * crop it, stamp a play button on it and store it in Blob so the email points
 * at our own image. Expected failures (a bad link, a private video) come back
 * as `{ ok: false }` with a message the dialog can show.
 */
export async function createVideoThumbnail(
  url: string,
): Promise<VideoThumbnailResult> {
  await requireAdmin();

  const video = parseYouTubeUrl(url);
  if (!video) {
    return { ok: false, error: "That doesn't look like a YouTube link." };
  }

  try {
    const [still, title] = await Promise.all([
      fetchBestStill(video.id, video.isShort),
      fetchTitle(video.watchUrl),
    ]);
    if (!still) {
      return {
        ok: false,
        error:
          "Couldn't load that video's thumbnail. Check that the video is public.",
      };
    }

    const meta = await sharp(still).metadata();
    const portrait = (meta.height ?? 0) > (meta.width ?? 0);
    const size = portrait ? PORTRAIT : LANDSCAPE;
    const buttonSize = Math.round(size.width * 0.17);

    const image = await sharp(still)
      // Center crop on purpose. sharp's "attention" crop was tried and went
      // for the busiest texture (a wall calendar) over the person.
      .resize(size.width, size.height, { fit: "cover", position: "centre" })
      .composite([{ input: playButtonSvg(buttonSize), gravity: "centre" }])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const blob = await put(`newsletter/video-${video.id}.jpg`, image, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });

    return {
      ok: true,
      imageUrl: blob.url,
      title,
      watchUrl: video.watchUrl,
    };
  } catch (error) {
    console.error("createVideoThumbnail failed:", error);
    return {
      ok: false,
      error: "Couldn't build the video thumbnail. Try again in a moment.",
    };
  }
}
