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

export const ImageBubble = ({ editor }: { editor: Editor }) => {
  const alt = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor.getAttributes("image").alt as string) || "",
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubble"
      options={{ placement: "bottom", offset: 8 }}
      shouldShow={({ editor: e, element }) =>
        e.isEditable && e.isActive("image") && isFocusedWithin(e, element)
      }
      className={cn(cardClass, "gap-2 p-2")}
    >
      <label className="flex items-center gap-2">
        <span
          className={cn(
            "whitespace-nowrap text-xs font-medium",
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              editor.commands.focus();
            }
          }}
          placeholder="Describe the image"
          className="h-8 w-60"
          title="Shown when an email app blocks images, and read aloud by screen readers"
        />
      </label>
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
