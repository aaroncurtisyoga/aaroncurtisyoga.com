import { EventWithLocationAndCategory } from "@/app/_lib/types";
import { formatDateTime, richTextToPlainText } from "@/app/_lib/utils";

// Shared by the newsletter's auto-appended sections (server) and the
// composer's "Insert event" picker (client) — keep this module pure.

export const NEWSLETTER_SITE_URL = "https://www.aaroncurtisyoga.com";
// Matches MOSS in app/_lib/email/newsletter-template.ts. White on moss is
// 9.4:1, so the filled button clears AA comfortably.
export const CTA = "#3f4a35";
// The rest of the email palette and the heading face, for the blocks below
// that carry their own inline styles. Same values as newsletter-template.ts.
const EMAIL_INK = "#23281f";
const EMAIL_INK_MUTED = "#55594d";
const EMAIL_INK_LABEL = "#6b7360";
const EMAIL_SAND = "#ece6da";
const EMAIL_LINE = "#c5bfae";
const EMAIL_SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const DESCRIPTION_MAX_CHARS = 160;

// Quotes too: escaped output also lands inside attribute values (alt="…").
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Trim to a word boundary near the limit and add an ellipsis.
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

/**
 * Synced events (Momence/DCBP) store their booking link in externalUrl;
 * admin-created external events use externalRegistrationUrl. Link straight to
 * whichever real booking page exists, else the event page on our site.
 */
export function eventHref(event: EventWithLocationAndCategory): string {
  const bookingUrl = event.externalRegistrationUrl || event.externalUrl;
  return (event.isHostedExternally || event.isExternal) && bookingUrl
    ? bookingUrl
    : `${NEWSLETTER_SITE_URL}/events/${event.id}`;
}

export function eventWhenLabel(event: EventWithLocationAndCategory): string {
  // Same shape as the homepage cards: "Wed, Oct 14 · 8:00 pm".
  const { dateShortWithoutYear, timeOnly } = formatDateTime(
    event.startDateTime,
  );
  return `${dateShortWithoutYear} · ${timeOnly.toLowerCase()}`;
}

// The stock line the sync services write for a studio class (see
// bright-bear-sync-service.ts and dcbp-sync-service.ts). It points at a button
// that only exists on the event page, so anywhere else it's noise. The sync
// also uses this to tell its own copy from a description written by hand.
export function isGeneratedSyncDescription(
  description: string | null | undefined,
): boolean {
  const text = (description ?? "").trim();
  if (!text) return true;
  return (
    text.startsWith("Join Aaron Curtis for ") &&
    (text.endsWith('Click "Register at Bright Bear" to book your spot.') ||
      text.endsWith("Visit DCBP website for more information."))
  );
}

function eventWhereLabel(event: EventWithLocationAndCategory): string {
  // Titles and locations come from external scrapers too, so escape them.
  return event.location?.name ? ` · ${escapeHtml(event.location.name)}` : "";
}

/**
 * A starred event in the newsletter's auto-appended section: a sand panel with
 * the date line, the title in the heading face, and a filled button. Appended
 * at send time and never parsed by the editor, so tables and inline styles are
 * fine here. Paragraphs and block spans keep the plain-text part readable.
 */
export function featuredEventHtml(
  event: EventWithLocationAndCategory,
  { withDescription = false }: { withDescription?: boolean } = {},
): string {
  const href = escapeHtml(eventHref(event));

  // Descriptions are TipTap HTML on the site — flatten, truncate, re-escape
  // (richTextToPlainText decodes entities back to raw <, >, & characters).
  let description = "";
  if (withDescription && !isGeneratedSyncDescription(event.description)) {
    const text = richTextToPlainText(event.description);
    if (text) {
      description = `<p style="margin:10px 0 0; color:${EMAIL_INK_MUTED}; font-size:15px; line-height:1.55;">${escapeHtml(
        truncate(text, DESCRIPTION_MAX_CHARS),
      )}</p>`;
    }
  }

  // A booking page gets "Sign up"; our own event page, which explains how to
  // get in (walk-in tickets at a studio, say), gets "Details".
  const ctaLabel = eventHref(event).startsWith(NEWSLETTER_SITE_URL)
    ? "Details"
    : "Sign up";

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr>` +
    // nl-panel: the template's phone styles tighten this padding
    `<td class="nl-panel" style="background-color:${EMAIL_SAND}; border-radius:16px; padding:24px 26px 26px;">` +
    `<p style="margin:0 0 8px; color:${EMAIL_INK_LABEL}; font-size:12px; line-height:1.5; letter-spacing:0.1em; text-transform:uppercase;">${eventWhenLabel(event)}${eventWhereLabel(event)}</p>` +
    `<p style="margin:0; font-family:${EMAIL_SERIF}; color:${EMAIL_INK}; font-size:26px; font-weight:500; line-height:1.15;">${escapeHtml(event.title)}</p>` +
    description +
    `<p style="margin:18px 0 0;"><a href="${href}" style="display:block; text-align:center; background-color:${CTA}; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px; line-height:1.25; padding:16px 24px; border-radius:999px;">${ctaLabel}</a></p>` +
    `</td></tr></table>`
  );
}

/**
 * One class in the newsletter's weekly list: the linked title, then when and
 * where on a quieter line, with a hairline between rows. Wrap the rows in
 * classListHtml.
 */
export function classRowHtml(event: EventWithLocationAndCategory): string {
  const href = escapeHtml(eventHref(event));
  return (
    `<tr><td style="padding:12px 0; border-top:1px solid ${EMAIL_LINE};">` +
    `<a href="${href}" style="color:${CTA}; font-weight:700; text-decoration:none;">${escapeHtml(event.title)}</a>` +
    `<span style="display:block; margin-top:2px; color:${EMAIL_INK_MUTED}; font-size:14px; line-height:1.5;">${eventWhenLabel(event)}${eventWhereLabel(event)}</span>` +
    `</td></tr>`
  );
}

export function classListHtml(events: EventWithLocationAndCategory[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px; border-bottom:1px solid ${EMAIL_LINE};">${events
    .map(classRowHtml)
    .join("")}</table>`;
}

/**
 * A standalone event card for inserting into the newsletter *body*. Unlike
 * featuredEventHtml (appended at send time, never parsed by the editor), this
 * HTML round-trips through Tiptap, so it may only use nodes the editor schema
 * knows: img, h3, p, a, strong. No spans, tables, or inline styles — the email
 * template's `.content` styles dress it up at render time.
 */
export function eventCardHtml(
  event: EventWithLocationAndCategory,
  { withImage = true }: { withImage?: boolean } = {},
): string {
  const href = escapeHtml(eventHref(event));
  const title = escapeHtml(event.title);
  const location = event.location?.name
    ? ` · ${escapeHtml(event.location.name)}`
    : "";
  const image =
    withImage && event.imageUrl
      ? `<img src="${escapeHtml(event.imageUrl)}" alt="${title}">`
      : "";

  return `${image}<h3>${title}</h3><p>${eventWhenLabel(event)}${location}</p><p><a href="${href}" target="_blank" rel="noopener noreferrer"><strong>Sign up →</strong></a></p>`;
}
