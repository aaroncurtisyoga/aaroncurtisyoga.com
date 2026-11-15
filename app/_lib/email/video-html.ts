import { escapeHtml } from "@/app/_lib/email/event-html";

/**
 * A video card for the newsletter body: the play-button still linked to the
 * video, with a text link under it for readers whose email app blocks images.
 * Like eventCardHtml this round-trips through Tiptap, so it sticks to nodes
 * the editor schema knows (a linked img, p, a, strong).
 */
export function videoCardHtml({
  imageUrl,
  watchUrl,
  title,
}: {
  imageUrl: string;
  watchUrl: string;
  title: string;
}): string {
  const href = escapeHtml(watchUrl);
  const alt = escapeHtml(
    title ? `Watch the video: ${title}` : "Watch the video",
  );
  const link = `target="_blank" rel="noopener noreferrer"`;

  return (
    `<a href="${href}" ${link}><img src="${escapeHtml(imageUrl)}" alt="${alt}"></a>` +
    `<p><a href="${href}" ${link}><strong>Watch the video →</strong></a></p>`
  );
}
