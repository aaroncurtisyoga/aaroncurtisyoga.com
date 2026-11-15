"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ExternalLink, Pencil, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/app/_lib/utils";

// Small cards that appear next to a link or image, the way Google Docs and
// Notion show a link's URL when the cursor lands on it. Both hide once the
// editor (and the card itself) loses focus, so they never linger over the
// rest of the form.

const cardClass =
  "z-50 flex items-center gap-1 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md";

const isFocusedWithin = (editor: Editor, element: HTMLElement) =>
  editor.view.hasFocus() || element.contains(document.activeElement);

interface LinkBubbleProps {
  editor: Editor;
  onEditLink: () => void;
}

export const LinkBubble = ({ editor, onEditLink }: LinkBubbleProps) => {
  const href = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor.getAttributes("link").href as string) || "",
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubble"
      options={{ placement: "bottom-start", offset: 6 }}
      // A caret inside a link, not a selection: a selection is about to be
      // formatted, and the toolbar is the place for that
      shouldShow={({ editor: e, element, state }) =>
        e.isEditable &&
        state.selection.empty &&
        e.isActive("link") &&
        isFocusedWithin(e, element)
      }
      className={cardClass}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex max-w-64 items-center gap-1.5 truncate px-2 text-primary underline-offset-2 hover:underline"
        title={href}
      >
        <ExternalLink className="size-3.5 shrink-0" />
        <span className="truncate">{href.replace(/^https?:\/\//, "")}</span>
      </a>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEditLink}
        aria-label="Edit link"
      >
        <Pencil /> Edit
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor.chain().focus().extendMarkRange("link").unsetLink().run()
        }
        aria-label="Remove link"
      >
        <Unlink /> Remove
      </Button>
    </BubbleMenu>
  );
};

// Only http(s) links are kept; anything else clears the link.
const toImageHref = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
};

export const ImageBubble = ({ editor }: { editor: Editor }) => {
  const { alt, href } = useEditorState({
    editor,
    selector: (ctx) => {
      const attrs = ctx.editor.getAttributes("image");
      return {
        alt: (attrs.alt as string) || "",
        href: (attrs.href as string) || "",
      };
    },
  });

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      // Blur first so the link field commits before focus moves on
      e.currentTarget.blur();
      editor.commands.focus();
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubble"
      options={{ placement: "bottom", offset: 8 }}
      shouldShow={({ editor: e, element }) =>
        e.isEditable && e.isActive("image") && isFocusedWithin(e, element)
      }
      className={cn(cardClass, "items-start gap-2 p-2")}
    >
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2">
          <span
            className={cn(
              "w-16 whitespace-nowrap text-xs font-medium",
              alt ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {alt ? "Alt text" : "Add alt text"}
          </span>
          <Input
            value={alt}
            // Updates as you type; undo history groups the keystrokes
            onChange={(e) =>
              editor
                .chain()
                .updateAttributes("image", { alt: e.target.value })
                .run()
            }
            onKeyDown={blurOnEnter}
            placeholder="Describe the image"
            className="h-8 w-60"
            title="Shown when an email app blocks images, and read aloud by screen readers"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-16 whitespace-nowrap text-xs font-medium text-muted-foreground">
            Link
          </span>
          <Input
            // Uncontrolled, and committed on blur: a half-typed URL isn't
            // one, so it shouldn't be written to the image as you type.
            // Keyed so it refreshes when another image is selected.
            key={href}
            defaultValue={href}
            onBlur={(e) =>
              editor
                .chain()
                .updateAttributes("image", {
                  href: toImageHref(e.target.value),
                })
                .run()
            }
            onKeyDown={blurOnEnter}
            placeholder="Optional: where a tap goes"
            className="h-8 w-60"
            inputMode="url"
          />
        </label>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        aria-label="Remove image"
        title="Remove image"
      >
        <Trash2 />
      </Button>
    </BubbleMenu>
  );
};
