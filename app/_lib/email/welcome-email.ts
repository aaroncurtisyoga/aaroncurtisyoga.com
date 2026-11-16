import { escapeHtml, NEWSLETTER_SITE_URL } from "@/app/_lib/email/event-html";
import {
  renderNewsletterHtml,
  renderNewsletterText,
} from "@/app/_lib/email/newsletter-template";

export const WELCOME_SUBJECT = "You're on the list";

/**
 * The one-off email a new subscriber gets right after signing up, so the
 * first thing they hear isn't an issue two or three weeks later. Sent through
 * the transactional API from addNewsletterEntry, in the same letter layout as
 * a regular issue. Edit the copy here; the frequency line should match what
 * the signup section on the homepage promises.
 */
export function renderWelcomeEmail({ firstName }: { firstName?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const name = firstName?.trim();
  const contentHtml =
    `<p>Hey${name ? ` ${escapeHtml(name)}` : ""}</p>` +
    `<p>Thanks for signing up. About once a month I'll send a short note: what I'm teaching, where to find me, and one small thing to take onto the mat.</p>` +
    `<p>If you'd like to practice together before the next one lands, my classes are on the site.</p>` +
    `<p><a href="${NEWSLETTER_SITE_URL}/#classes" data-button="true">See this week's classes</a></p>` +
    `<p>You can catch up on <a href="${NEWSLETTER_SITE_URL}/newsletter">past issues</a> any time. And if you have a question, hit reply. It comes straight to me.</p>` +
    `<p>~ Aaron</p>`;

  return {
    subject: WELCOME_SUBJECT,
    html: renderNewsletterHtml({
      contentHtml,
      previewText: "Here's what to expect, and where to find me this week.",
      footer: "welcome",
    }),
    text: renderNewsletterText({ contentHtml, footer: "welcome" }),
  };
}
