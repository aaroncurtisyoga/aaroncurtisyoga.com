const SITE_URL = "https://www.aaroncurtisyoga.com";
const INSTAGRAM_URL = "https://www.instagram.com/aaroncurtisyoga/";
const YOUTUBE_URL = "https://www.youtube.com/channel/UCwwNWri2IhKxXKmQkCpj-uw";
// Where a reader who was forwarded an issue can sign up.
const SUBSCRIBE_URL = `${SITE_URL}/#newsletter`;
// The email mirrors the homepage palette (see the token block in
// app/globals.css). Keep these in step with it, and with NAVY in
// scripts/generate-email-icons.ts, which draws the footer badges.
const MOSS = "#3f4a35"; // accent: links, the masthead rule, CTA fills
const INK = "#23281f"; // headings, the wordmark, rules
const SAND = "#ece6da"; // ground behind the white letter
const MUTED = "#67676f"; // fine print; 4.5:1 on SAND at 12px
const INK_MUTED = "#55594d"; // body copy, the homepage's ink-muted
const LINE = "#c5bfae"; // hairline rules, the homepage's line
// The homepage's faces, each with a fallback: Apple Mail and iOS load the
// Google Fonts link in <head>, Gmail and Outlook drop it and use the next name.
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Karla, Helvetica, Arial, sans-serif";

/**
 * Resend substitutes {{{contact.*}}} merge tags per-recipient only when a
 * broadcast actually sends. Previews, the sent-newsletter viewer, and test
 * sends go through APIs that DON'T substitute, so resolve the tags ourselves in
 * those contexts — using the supplied values, or each tag's own |fallback (or
 * empty when it has none) — so nobody sees a raw "{{{contact.first_name}}}".
 * Leaves {{{RESEND_UNSUBSCRIBE_URL}}} untouched (handled via unsubscribeUrl).
 */
export function resolveMergeTags(
  html: string,
  values: { firstName?: string; lastName?: string; email?: string } = {},
): string {
  const map: Record<string, string | undefined> = {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
  };
  return html.replace(
    /\{\{\{\s*contact\.(first_name|last_name|email)\s*(?:\|([^}]*))?\}\}\}/g,
    (_match, field: string, fallback = "") => {
      const value = map[field];
      return (value && value.trim()) || fallback.trim();
    },
  );
}

/**
 * Placeholder strings shipped by the starter template and snippets — a send
 * that still contains one is a mistake, full stop. Keep in sync with
 * app/admin/newsletter/_lib/templates.ts.
 */
const TEMPLATE_PLACEHOLDERS = [
  "[Your message here]",
  "[Workshop name]",
  "[When · where]",
  "[What it is and why it's worth coming to]",
];

const VALID_MERGE_TAG =
  /^\{\{\{\s*(?:contact\.(?:first_name|last_name|email)\s*(?:\|[^}]*)?|RESEND_UNSUBSCRIBE_URL\s*)\}\}\}$/;

export interface NewsletterContentIssues {
  /** Certain mistakes — sending is refused while any of these exist. */
  blockers: string[];
  /** Probable mistakes — surfaced in the Send dialog but not enforced. */
  warnings: string[];
}

/**
 * Pre-send sanity check for the newsletter body. Broadcasts fire with no undo,
 * so template scaffolds ("[Your message here]") and merge tags Resend won't
 * substitute (a typo like {{{contact.firstname}}}, or double braces) are
 * blockers; other [bracketed] text — usually a note-to-self — is a warning.
 * Checked by sendNewsletter and previewed in the composer's Send dialog.
 */
export function findNewsletterContentIssues(
  html: string,
): NewsletterContentIssues {
  const blockers: string[] = [];
  const warnings: string[] = [];
  // Scan visible text so placeholders split across inline marks still match
  // and curly braces inside attributes can't false-positive.
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

  for (const placeholder of TEMPLATE_PLACEHOLDERS) {
    if (text.includes(placeholder)) {
      blockers.push(`replace the template placeholder “${placeholder}”`);
    }
  }

  const bracketed = new Set(text.match(/\[[^\[\]]{1,80}\]/g) ?? []);
  for (const match of bracketed) {
    if (!TEMPLATE_PLACEHOLDERS.includes(match)) {
      warnings.push(`“${match}” looks like an unfinished placeholder`);
    }
  }

  // Alt text is what shows in place of an image when an email app blocks
  // images, which several do by default
  const imagesWithoutAlt = (html.match(/<img\b[^>]*>/gi) ?? []).filter(
    (tag) => !/\balt\s*=\s*("\s*\S[^"]*"|'\s*\S[^']*')/i.test(tag),
  ).length;
  if (imagesWithoutAlt > 0) {
    warnings.push(
      imagesWithoutAlt === 1
        ? "an image has no alt text (click it in the editor to add a short description)"
        : `${imagesWithoutAlt} images have no alt text (click each in the editor to add a short description)`,
    );
  }

  const tagCandidates = new Set(text.match(/\{\{+[^{}]*\}\}+/g) ?? []);
  for (const candidate of tagCandidates) {
    if (!VALID_MERGE_TAG.test(candidate)) {
      blockers.push(
        `fix the merge tag “${candidate}” — only {{{contact.first_name}}}, {{{contact.last_name}}}, and {{{contact.email}}} (triple braces) get filled in`,
      );
    }
  }

  return { blockers, warnings };
}

/**
 * Stamp every <img> with inline max-width/height styles. The <head> <style>
 * rule that normally constrains images is stripped by some clients (Gmail for
 * non-Gmail accounts, some Outlooks), and a full-resolution phone photo would
 * otherwise render at native width and blow out the 600px layout. Inline
 * styles survive those clients. No width attribute on purpose: without the
 * intrinsic size we'd either upscale small images or do nothing. (The video
 * card knows its size and sets its own width attribute.) The rounded corners
 * match the card the content sits in; Outlook ignores them and shows square.
 */
function makeImagesEmailSafe(html: string): string {
  const IMG_STYLE = "max-width:100%;height:auto;border-radius:12px;";
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const styleAttr = tag.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
    if (!styleAttr) {
      return tag.replace(/^<img\b/i, `<img style="${IMG_STYLE}"`);
    }
    const existing = styleAttr[2] ?? styleAttr[3] ?? "";
    if (/max-width/i.test(existing)) return tag;
    const merged = `${existing.trim().replace(/;?$/, ";")}${IMG_STYLE}`;
    return tag.replace(styleAttr[0], `style="${merged}"`);
  });
}

/**
 * Dress the composer's button links for email. In the stored HTML a button is
 * an ordinary link carrying data-button (see Tiptap/button-link.ts); the pill
 * has to be inline styles because Gmail drops <head> styles for some accounts.
 * Same look as the "Sign up" button on a featured event.
 */
function styleButtonLinks(html: string): string {
  // Full width of the letter, on phones and desktop alike.
  const BUTTON_STYLE = `display:block;text-align:center;background-color:${MOSS};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:1.25;padding:16px 24px;border-radius:999px;`;
  return html.replace(/<a\b[^>]*\bdata-button\b[^>]*>/gi, (tag) =>
    /\bstyle\s*=/i.test(tag)
      ? tag
      : tag.replace(/^<a\b/i, `<a style="${BUTTON_STYLE}"`),
  );
}

/** Minimal entity decode for the plain-text part (TipTap escapes only these). */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Which fine print closes the email. "broadcast" is a regular issue: why
 * you're getting it, the unsubscribe link, and a subscribe link for anyone it
 * was forwarded to. "welcome" is the one-off sent on signup through the
 * transactional API, which has no unsubscribe link to offer, so it asks for a
 * reply instead.
 */
type NewsletterFooter = "broadcast" | "welcome";

interface RenderNewsletterTextParams {
  contentHtml: string;
  /** Same contract as renderNewsletterHtml — test sends pass a real URL. */
  unsubscribeUrl?: string;
  footer?: NewsletterFooter;
}

/**
 * Plain-text alternative for the newsletter. A missing text/plain part is a
 * classic spam-score ding, and deliverability is the whole game for a small
 * personal list. Callers should resolve contact merge tags first (see
 * resolveMergeTags) so text-only readers never see raw handlebars; the
 * unsubscribe placeholder stays for Resend to substitute.
 */
export function renderNewsletterText({
  contentHtml,
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
  footer = "broadcast",
}: RenderNewsletterTextParams): string {
  const body = contentHtml
    // Links become "label (url)" so CTAs survive without markup. Skip
    // self-referential labels to avoid "https://x (https://x)".
    .replace(
      /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
      (_match, hrefDq, hrefSq, label) => {
        const href = (hrefDq ?? hrefSq ?? "").trim();
        const labelText = label.replace(/<[^>]*>/g, "").trim();
        // A linked image (a video still, say) has no text of its own. Use
        // its alt text as the label, on its own line, unless the same link
        // appears again as text, the way the video card repeats it underneath.
        if (!labelText && /<img\b/i.test(label)) {
          const repeated =
            href !== "" &&
            contentHtml.split(`href="${hrefDq ?? hrefSq ?? ""}"`).length > 2;
          if (repeated || !href) return "";
          const alt = label.match(/\balt\s*=\s*"([^"]*)"/i)?.[1]?.trim();
          return `${alt ? `${alt} (${href})` : href}\n\n`;
        }
        if (!labelText) return href;
        if (!href || labelText === href) return labelText;
        return `${labelText} (${href})`;
      },
    )
    // Structure → whitespace before all remaining tags are stripped.
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\b[^>]*>/gi, "\n\n---\n\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    // The event sections lay out description/CTA lines as display:block
    // spans; without breaks on both edges they'd glue onto adjacent text.
    .replace(/<span\b[^>]*display\s*:\s*block[^>]*>/gi, "\n")
    .replace(/<\/span>/gi, "\n")
    .replace(/<\/(?:h1|h2|h3|p|ul|ol|blockquote|div|tr)>/gi, "\n\n")
    .replace(/<\/li>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "");

  const text = decodeEntities(body)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return [
    "aaron curtis yoga",
    "",
    text,
    "",
    "---",
    `Instagram: ${INSTAGRAM_URL}`,
    `YouTube: ${YOUTUBE_URL}`,
    "",
    ...(footer === "welcome"
      ? [
          `You're receiving this because you just signed up at ${SITE_URL}`,
          "Not you? Reply and I'll take you off the list.",
        ]
      : [
          `Got this from a friend? Subscribe: ${SUBSCRIBE_URL}`,
          `You're receiving this because you signed up at ${SITE_URL}`,
          `Unsubscribe: ${unsubscribeUrl}`,
        ]),
    "",
  ].join("\n");
}

interface RenderNewsletterHtmlParams {
  contentHtml: string;
  previewText?: string;
  /**
   * Resend replaces this placeholder per-recipient when sending a broadcast.
   * For test sends (transactional API), pass a real URL instead since no
   * substitution happens there.
   */
  unsubscribeUrl?: string;
  /**
   * Public archive URL for this issue. Real sends pass it so image-blocking
   * or mangled-rendering readers have an escape hatch; previews and test
   * sends omit it (there's no archive page for an unsent draft).
   */
  viewInBrowserUrl?: string;
  footer?: NewsletterFooter;
}

/**
 * Wraps TipTap-generated HTML in an email-safe, table-based layout with the
 * Aaron Curtis Yoga wordmark (royal/navy accents) and the CAN-SPAM-required
 * unsubscribe link.
 */
export function renderNewsletterHtml({
  contentHtml,
  previewText,
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
  viewInBrowserUrl,
  footer = "broadcast",
}: RenderNewsletterHtmlParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Karla:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  /* The design is light only. Saying so stops Apple Mail from inverting the
     sand and white in dark mode; Gmail's apps recolor on their own regardless. */
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin: 0; padding: 0; background-color: ${SAND}; }
  .content h1, .content h2, .content h3 {
    font-family: ${SERIF};
    color: ${INK};
    font-weight: 500;
    line-height: 1.15;
    margin: 30px 0 12px;
  }
  .content h1 { font-size: 36px; }
  .content h2 { font-size: 30px; }
  .content h3 { font-size: 24px; }
  .content p { margin: 0 0 16px; }
  .content ul, .content ol { margin: 0 0 16px; padding-left: 24px; }
  .content li { margin-bottom: 6px; }
  .content blockquote {
    border-left: 4px solid ${MOSS};
    margin: 18px 0;
    padding: 4px 0 4px 16px;
    color: ${INK_MUTED};
  }
  .content a { color: ${MOSS}; font-weight: 700; }
  .content img { max-width: 100%; height: auto; border-radius: 12px; }
  .content hr { border: none; border-top: 1px solid ${LINE}; margin: 30px 0; }
  /* Phones: the sand page, the white letter and an event panel each bring
     their own side padding, which left about 220px for text on a 375px
     screen. The letter goes edge to edge and the panel tightens up, so text
     and buttons get the width back. Clients that drop this block keep the
     desktop spacing. */
  @media only screen and (max-width: 480px) {
    .nl-outer { padding: 12px 0 24px !important; }
    .nl-card { padding: 28px 20px 32px !important; border-radius: 0 !important; }
    .nl-fine { padding-left: 20px !important; padding-right: 20px !important; }
    .nl-panel { padding: 20px 18px 20px !important; border-radius: 14px !important; }
    .content h1 { font-size: 31px !important; }
    .content h2 { font-size: 27px !important; }
  }
</style>
</head>
<body>
${
  previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : ""
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SAND};">
  <tr>
    <td class="nl-outer" align="center" style="padding: 24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
${
  viewInBrowserUrl
    ? `        <tr>
          <td class="nl-fine" style="padding: 0 8px 8px; text-align: right; font-family: ${SANS}; font-size: 11px; line-height: 1.4;">
            <a href="${viewInBrowserUrl}" style="color:${MUTED}; text-decoration: underline;">View in browser</a>
          </td>
        </tr>`
    : ""
}
        <tr>
          <td class="nl-card" style="background-color:#ffffff; border-radius: 20px; padding: 36px 36px 40px;">
            <div style="text-align: center; padding-bottom: 22px;">
              <a href="${SITE_URL}" style="font-family: ${SERIF}; font-size: 28px; font-weight: 500; color: ${INK}; text-decoration: none;">
                Aaron Curtis Yoga
              </a>
            </div>
            <div class="content" style="font-family: ${SANS}; font-size: 16px; line-height: 1.6; color: ${INK_MUTED};">
              ${styleButtonLinks(makeImagesEmailSafe(contentHtml))}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 26px 8px 4px; text-align: center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
              <tr>
                <td style="padding: 0 7px;">
                  <a href="${INSTAGRAM_URL}" style="text-decoration: none;">
                    <img src="${SITE_URL}/email/instagram.png" width="28" height="28" alt="Instagram" style="display: block; border: 0; width: 28px; height: 28px;">
                  </a>
                </td>
                <td style="padding: 0 7px;">
                  <a href="${YOUTUBE_URL}" style="text-decoration: none;">
                    <img src="${SITE_URL}/email/youtube.png" width="28" height="28" alt="YouTube" style="display: block; border: 0; width: 28px; height: 28px;">
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="nl-fine" style="padding: 4px 8px 0; text-align: center; font-family: ${SANS}; font-size: 12px; line-height: 2; color: ${MUTED};">
${
  footer === "welcome"
    ? `            You're receiving this email because you just signed up at
            <a href="${SITE_URL}" style="color:${MUTED};">aaroncurtisyoga.com</a>.
            <br>
            Not you? Reply and I'll take you off the list.`
    : `            Got this from a friend?
            <a href="${SUBSCRIBE_URL}" style="color:${MUTED};">Subscribe here</a>.
            <br>
            You're receiving this email because you signed up at
            <a href="${SITE_URL}" style="color:${MUTED};">aaroncurtisyoga.com</a>.
            <br>
            <a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a>`
}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
