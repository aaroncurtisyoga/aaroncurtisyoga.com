import Image from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";
import { mergeAttributes } from "@tiptap/react";

/**
 * The stock Image node plus an optional `href`. Images here are block nodes,
 * and the Link mark only applies to inline text, so a clickable image (a
 * video still, a flyer that opens a sign-up page) has to carry its own link.
 * Stored as `<a href><img></a>`, which the email template and the public
 * archive already know how to render.
 */
const LinkedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        // Read from the wrapping anchor, and only when the image is all the
        // anchor holds: an image pasted inside a sentence-long link shouldn't
        // inherit it.
        parseHTML: (element) => {
          const anchor = element.parentElement;
          if (!anchor || anchor.tagName !== "A") return null;
          if (anchor.textContent?.trim()) return null;
          const href = anchor.getAttribute("href") ?? "";
          return /^https?:\/\//i.test(href) ? href : null;
        },
        // Rendered on the wrapper below, not on the <img>
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const img = [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ] as const;
    const href = node.attrs.href as string | null;
    if (!href) return img;
    return [
      "a",
      { href, target: "_blank", rel: "noopener noreferrer" },
      img,
    ] as const;
  },

  // The wrapping <a> isn't editable content, so the browser would follow it:
  // clicking the image to select it would open the link. Swallow that click.
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        props: {
          handleDOMEvents: {
            click: (_view, event) => {
              const target = event.target as HTMLElement | null;
              if (target?.tagName === "IMG" && target.closest("a")) {
                event.preventDefault();
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

export default LinkedImage;
