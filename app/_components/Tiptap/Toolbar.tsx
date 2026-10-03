"use client";

import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/app/_lib/utils";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Link as LinkIcon,
  List,
  ListOrdered,
  type LucideIcon,
  MessageSquareQuote,
  Minus,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Redo2,
} from "lucide-react";
import { useState, memo } from "react";
import ImageGalleryDialog from "@/app/_components/ImageGalleryDialog";
import LinkDialog from "./LinkDialog";
import EmojiPicker from "./EmojiPicker";

interface ToolbarProps {
  editor: Editor | null;
  isDisabled?: boolean;
  /** Owned by the editor so its ⌘K shortcut can open the dialog too */
  isLinkDialogOpen: boolean;
  onLinkDialogOpenChange: (open: boolean) => void;
}

const isMac = () =>
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

// Helper to format keyboard shortcuts for display
const formatShortcut = (mac: string, win: string) => (isMac() ? mac : win);

interface ToolbarButtonProps {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** Set for toggles (bold, lists...); leave undefined for one-shot actions */
  isActive?: boolean;
}

const ToolbarButton = ({
  label,
  shortcut,
  icon: Icon,
  onClick,
  disabled,
  isActive,
}: ToolbarButtonProps) => (
  <SimpleTooltip content={shortcut ? `${label} (${shortcut})` : label}>
    <Button
      size="icon"
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "h-8 w-8",
        isActive &&
          "bg-background text-primary shadow-sm ring-1 ring-border hover:bg-background hover:text-primary",
      )}
    >
      <Icon size={18} />
    </Button>
  </SimpleTooltip>
);

const ToolbarSeparator = () => (
  <Separator orientation="vertical" className="mx-1 my-auto h-6" />
);

const Toolbar = memo(
  ({
    editor,
    isDisabled = false,
    isLinkDialogOpen,
    onLinkDialogOpenChange,
  }: ToolbarProps) => {
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

    // Subscribe to editor transactions so active/enabled states stay fresh —
    // the editor is created with shouldRerenderOnTransaction: false
    const state = useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx.editor) return null;
        return {
          canUndo: ctx.editor.can().undo(),
          canRedo: ctx.editor.can().redo(),
          isBold: ctx.editor.isActive("bold"),
          isItalic: ctx.editor.isActive("italic"),
          isUnderline: ctx.editor.isActive("underline"),
          isStrike: ctx.editor.isActive("strike"),
          isHeading1: ctx.editor.isActive("heading", { level: 1 }),
          isHeading2: ctx.editor.isActive("heading", { level: 2 }),
          isHeading3: ctx.editor.isActive("heading", { level: 3 }),
          isBulletList: ctx.editor.isActive("bulletList"),
          isOrderedList: ctx.editor.isActive("orderedList"),
          isBlockquote: ctx.editor.isActive("blockquote"),
          isLink: ctx.editor.isActive("link"),
          linkHref: ctx.editor.getAttributes("link").href || "",
          linkOpensInNewTab:
            ctx.editor.getAttributes("link").target === "_blank",
        };
      },
    });

    if (!editor || !state) {
      return null;
    }

    const handleLinkSubmit = (url: string, openInNewTab: boolean) => {
      if (!url) return;
      const attrs = { href: url, target: openInNewTab ? "_blank" : null };

      // Nothing selected and not inside a link: setLink would have nothing to
      // wrap, so put the URL in as its own linked text instead. unsetMark
      // then drops the link from the caret, so what comes next isn't linked.
      if (editor.state.selection.empty && !editor.isActive("link")) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: url,
            marks: [{ type: "link", attrs }],
          })
          .unsetMark("link")
          .run();
        return;
      }

      editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    };

    const handleLinkRemove = () => {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    };

    const chain = () => editor.chain().focus();

    return (
      <>
        {/* Sticky so it stays in reach while writing something long */}
        <div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-1 rounded-md border border-border bg-muted p-2">
          <ToolbarButton
            label="Undo"
            shortcut={formatShortcut("⌘Z", "Ctrl+Z")}
            icon={Undo2}
            onClick={() => chain().undo().run()}
            disabled={isDisabled || !state.canUndo}
          />
          <ToolbarButton
            label="Redo"
            shortcut={formatShortcut("⇧⌘Z", "Ctrl+Y")}
            icon={Redo2}
            onClick={() => chain().redo().run()}
            disabled={isDisabled || !state.canRedo}
          />

          <ToolbarSeparator />

          <ToolbarButton
            label="Bold"
            shortcut={formatShortcut("⌘B", "Ctrl+B")}
            icon={Bold}
            onClick={() => chain().toggleBold().run()}
            disabled={isDisabled}
            isActive={state.isBold}
          />
          <ToolbarButton
            label="Italic"
            shortcut={formatShortcut("⌘I", "Ctrl+I")}
            icon={Italic}
            onClick={() => chain().toggleItalic().run()}
            disabled={isDisabled}
            isActive={state.isItalic}
          />
          <ToolbarButton
            label="Underline"
            shortcut={formatShortcut("⌘U", "Ctrl+U")}
            icon={Underline}
            onClick={() => chain().toggleUnderline().run()}
            disabled={isDisabled}
            isActive={state.isUnderline}
          />
          <ToolbarButton
            label="Strikethrough"
            shortcut={formatShortcut("⇧⌘S", "Ctrl+Shift+S")}
            icon={Strikethrough}
            onClick={() => chain().toggleStrike().run()}
            disabled={isDisabled}
            isActive={state.isStrike}
          />
          <ToolbarButton
            label="Clear formatting"
            icon={RemoveFormatting}
            onClick={() => chain().unsetAllMarks().clearNodes().run()}
            disabled={isDisabled}
          />

          <ToolbarSeparator />

          <ToolbarButton
            label="Heading 1"
            shortcut={formatShortcut("⌥⌘1", "Ctrl+Alt+1")}
            icon={Heading1}
            onClick={() => chain().toggleHeading({ level: 1 }).run()}
            disabled={isDisabled}
            isActive={state.isHeading1}
          />
          <ToolbarButton
            label="Heading 2"
            shortcut={formatShortcut("⌥⌘2", "Ctrl+Alt+2")}
            icon={Heading2}
            onClick={() => chain().toggleHeading({ level: 2 }).run()}
            disabled={isDisabled}
            isActive={state.isHeading2}
          />
          <ToolbarButton
            label="Heading 3"
            shortcut={formatShortcut("⌥⌘3", "Ctrl+Alt+3")}
            icon={Heading3}
            onClick={() => chain().toggleHeading({ level: 3 }).run()}
            disabled={isDisabled}
            isActive={state.isHeading3}
          />

          <ToolbarSeparator />

          <ToolbarButton
            label="Bullet list"
            shortcut={formatShortcut("⇧⌘8", "Ctrl+Shift+8")}
            icon={List}
            onClick={() => chain().toggleBulletList().run()}
            disabled={isDisabled}
            isActive={state.isBulletList}
          />
          <ToolbarButton
            label="Numbered list"
            shortcut={formatShortcut("⇧⌘7", "Ctrl+Shift+7")}
            icon={ListOrdered}
            onClick={() => chain().toggleOrderedList().run()}
            disabled={isDisabled}
            isActive={state.isOrderedList}
          />
          <ToolbarButton
            label="Quote"
            shortcut={formatShortcut("⇧⌘B", "Ctrl+Shift+B")}
            icon={MessageSquareQuote}
            onClick={() => chain().toggleBlockquote().run()}
            disabled={isDisabled}
            isActive={state.isBlockquote}
          />

          <ToolbarSeparator />

          <ToolbarButton
            label={state.isLink ? "Edit link" : "Add link"}
            shortcut={formatShortcut("⌘K", "Ctrl+K")}
            icon={LinkIcon}
            onClick={() => onLinkDialogOpenChange(true)}
            disabled={isDisabled}
            isActive={state.isLink}
          />
          <ToolbarButton
            label="Divider"
            icon={Minus}
            onClick={() => chain().setHorizontalRule().run()}
            disabled={isDisabled}
          />
          {/* Only when the editor was created with the Image node */}
          {editor.schema.nodes.image && (
            <ToolbarButton
              label="Insert image"
              icon={ImagePlus}
              onClick={() => setIsImageDialogOpen(true)}
              disabled={isDisabled}
            />
          )}

          <ToolbarSeparator />

          <EmojiPicker editor={editor} isDisabled={isDisabled} />
        </div>

        <LinkDialog
          isOpen={isLinkDialogOpen}
          onClose={() => onLinkDialogOpenChange(false)}
          onSubmit={handleLinkSubmit}
          onRemove={handleLinkRemove}
          initialUrl={state.linkHref}
          initialOpenInNewTab={state.isLink ? state.linkOpensInNewTab : true}
          hasExistingLink={state.isLink}
        />

        {editor.schema.nodes.image && (
          <ImageGalleryDialog
            open={isImageDialogOpen}
            onOpenChange={setIsImageDialogOpen}
            onSelect={(url) => chain().setImage({ src: url }).run()}
          />
        )}
      </>
    );
  },
);

Toolbar.displayName = "Toolbar";

export default Toolbar;
