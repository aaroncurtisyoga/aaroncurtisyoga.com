// Pure helpers for the newsletter's "Insert video" card. No DOM and no
// network, so both the dialog (client) and the thumbnail action (server) can
// use them.

export interface YouTubeVideoRef {
  id: string;
  /** Shorts are portrait, so their thumbnail gets a different crop. */
  isShort: boolean;
  /** Canonical link the card points at. */
  watchUrl: string;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

/**
 * Accepts the link shapes YouTube hands out (watch?v=, youtu.be/, /shorts/,
 * /live/, /embed/) and returns null for anything else. The id is validated
 * against YouTube's 11-character format because it ends up in a URL the
 * server fetches.
 */
export function parseYouTubeUrl(input: string): YouTubeVideoRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  let isShort = false;

  if (host === "youtu.be") {
    id = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    id = url.searchParams.get("v");
  } else if (segments[0] === "shorts") {
    id = segments[1] ?? null;
    isShort = true;
  } else if (segments[0] === "live" || segments[0] === "embed") {
    id = segments[1] ?? null;
  }

  if (!id || !VIDEO_ID.test(id)) return null;

  return {
    id,
    isShort,
    watchUrl: isShort
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
  };
}
