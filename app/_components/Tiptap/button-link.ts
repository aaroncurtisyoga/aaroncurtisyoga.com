import Link from "@tiptap/extension-link";

/**
 * The stock Link mark plus an optional `button` flag, stored as a
 * `data-button` attribute on the anchor. A button is still a link (same
 * bubble, same dialog, editable label); the flag only changes how it's
 * drawn. The editor styles it in index.module.css and the newsletter template
 * turns it into an inline-styled pill at render time (styleButtonLinks).
 */
const ButtonLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      button: {
        default: null,
        parseHTML: (element) =>
          element.hasAttribute("data-button") ? true : null,
        renderHTML: (attributes) =>
          attributes.button ? { "data-button": "true" } : {},
      },
    };
  },
});

/** Ready-to-insert button: a paragraph holding one flagged link. */
export function buttonHtml({
  label,
  href,
}: {
  label: string;
  href: string;
}): string {
  const escape = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return `<p><a href="${escape(href)}" data-button="true">${escape(label)}</a></p>`;
}

export default ButtonLink;
