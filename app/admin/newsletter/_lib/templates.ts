// Starter content and reusable snippets for the newsletter composer. All HTML
// here must use only nodes the Tiptap schema knows (p, headings, lists, hr,
// a, strong/em) so it round-trips the editor unchanged.

// What a new newsletter opens with: greeting merge tag, a placeholder to
// replace, and the usual sign-off — so composing starts from the shape of a
// finished email instead of a blank page.
export const STARTER_TEMPLATE_HTML =
  "<p>Hey {{{contact.first_name}}}</p>" +
  "<p></p>" +
  "<p>[Your message here]</p>" +
  "<p></p>" +
  "<p>~ Aaron</p>";

export type Snippet = {
  label: string;
  html: string;
};

export const SNIPPETS: Snippet[] = [
  {
    label: "Greeting",
    // No fallback word and no trailing comma on purpose: with a name it reads
    // "Hey Aaron"; with none it's just "Hey".
    html: "<p>Hey {{{contact.first_name}}}</p>",
  },
  {
    label: "Sign-off",
    html: "<p>~ Aaron</p>",
  },
  {
    label: "Reply prompt",
    // Replies land in the inbox set as replyTo on the broadcast.
    html: "<p>Hit reply and tell me how your practice is going. Every reply comes straight to me.</p>",
  },
  {
    label: "Workshop announcement",
    html:
      "<h2>[Workshop name]</h2>" +
      "<p>[When · where]</p>" +
      "<p>[What it is and why it's worth coming to]</p>",
  },
  {
    label: "Divider",
    html: "<hr>",
  },
];
