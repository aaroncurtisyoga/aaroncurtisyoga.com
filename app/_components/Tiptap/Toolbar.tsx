"use client";

import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/app/_lib/utils";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Check,
  ChevronDown,
  Italic,
  ImagePlus,
  Link as LinkIcon,
  List,
  ListOrdered,
  type LucideIcon,
  MessageSquareQuote,
  Minus,
  MoreHorizontal,
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
  <Separator orientation="vertical" className="mx-0.5 my-auto h-6" />
);

interface MoreItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  shortcut?: string;
  isActive?: boolean;
}

/** The less frequent tools, so the main row fits a half-width column. */
const MoreMenu = ({
  editor,
  items,
  disabled,
}: {
  editor: Editor;
  items: MoreItem[];
  disabled?: boolean;
}) => (
  <DropdownMenu>
    <SimpleTooltip content="More formatting">
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            // Flag when something in here applies to the current text
            items.some((item) => item.isActive) && "text-primary",
          )}
          aria-label="More formatting"
        >
          <MoreHorizontal size={18} />
        </Button>
      </DropdownMenuTrigger>
    </SimpleTooltip>
    <DropdownMenuContent
      align="end"
      className="w-64"
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        editor.commands.focus();
      }}
    >
      {items.map(({ label, icon: Icon, onSelect, shortcut, isActive }) => (
        <DropdownMenuItem key={label} onSelect={onSelect}>
          <Icon className={cn(isActive && "text-primary")} />
          <span className={cn(isActive && "font-medium text-primary")}>
            {label}
          </span>
          {isActive && <Check className="text-primary" />}
          {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

type BlockStyle = "paragraph" | 1 | 2 | 3;

const BLOCK_STYLES: {
  value: BlockStyle;
  label: string;
  shortcut: [string, string];
  previewClass: string;
}[] = [
  {
    value: "paragraph",
    label: "Normal text",
    shortcut: ["⌥⌘0", "Ctrl+Alt+0"],
    previewClass: "text-sm",
  },
  {
    value: 1,
    label: "Heading 1",
    shortcut: ["⌥⌘1", "Ctrl+Alt+1"],
    previewClass: "font-cormorant text-2xl font-medium",
  },
  {
    value: 2,
    label: "Heading 2",
    shortcut: ["⌥⌘2", "Ctrl+Alt+2"],
    previewClass: "font-cormorant text-xl font-medium",
  },
  {
    value: 3,
    label: "Heading 3",
    shortcut: ["⌥⌘3", "Ctrl+Alt+3"],
    previewClass: "font-cormorant text-lg font-medium",
  },
];

/** "Normal text / Heading 1..." picker that also shows the current style. */
const BlockStyleMenu = ({
  editor,
  current,
  disabled,
}: {
  editor: Editor;
  current: BlockStyle | null;
  disabled?: boolean;
}) => {
  const currentLabel =
    BLOCK_STYLES.find((style) => style.value === current)?.label ??
    "Normal text";

  return (
    <DropdownMenu>
      <SimpleTooltip content="Text style">
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-28 justify-between px-2 font-normal"
            aria-label={`Text style: ${currentLabel}`}
          >
            {currentLabel}
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
      </SimpleTooltip>
      <DropdownMenuContent
        align="start"
        className="w-60"
        // Send focus back to the text, not the trigger, so typing carries on
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.commands.focus();
        }}
      >
        {BLOCK_STYLES.map((style) => (
          <DropdownMenuItem
            key={style.value}
            onSelect={() =>
              style.value === "paragraph"
                ? editor.chain().focus().setParagraph().run()
                : editor
                    .chain()
                    .focus()
                    .setHeading({ level: style.value })
                    .run()
            }
          >
            <Check
              className={cn(
                "size-4",
                current === style.value ? "opacity-100" : "opacity-0",
              )}
            />
            <span className={style.previewClass}>{style.label}</span>
            <DropdownMenuShortcut>
              {formatShortcut(...style.shortcut)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
          blockStyle: ((): BlockStyle | null => {
            for (const level of [1, 2, 3] as const) {
              if (ctx.editor.isActive("heading", { level })) return level;
            }
            return ctx.editor.isActive("paragraph") ? "paragraph" : null;
          })(),
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
        <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-muted p-1.5">
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

          <BlockStyleMenu
            editor={editor}
            current={state.blockStyle}
            disabled={isDisabled}
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
            label={state.isLink ? "Edit link" : "Add link"}
            shortcut={formatShortcut("⌘K", "Ctrl+K")}
            icon={LinkIcon}
            onClick={() => onLinkDialogOpenChange(true)}
            disabled={isDisabled}
            isActive={state.isLink}
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

          <ToolbarSeparator />

          {/* Only when the editor was created with the Image node */}
          {editor.schema.nodes.image && (
            <ToolbarButton
              label="Insert image"
              icon={ImagePlus}
              onClick={() => setIsImageDialogOpen(true)}
              disabled={isDisabled}
            />
          )}
          <EmojiPicker editor={editor} isDisabled={isDisabled} />

          <MoreMenu
            editor={editor}
            disabled={isDisabled}
            items={[
              {
                label: "Underline",
                icon: Underline,
                shortcut: formatShortcut("⌘U", "Ctrl+U"),
                isActive: state.isUnderline,
                onSelect: () => chain().toggleUnderline().run(),
              },
              {
                label: "Strikethrough",
                icon: Strikethrough,
                shortcut: formatShortcut("⇧⌘S", "Ctrl+Shift+S"),
                isActive: state.isStrike,
                onSelect: () => chain().toggleStrike().run(),
              },
              {
                label: "Quote",
                icon: MessageSquareQuote,
                shortcut: formatShortcut("⇧⌘B", "Ctrl+Shift+B"),
                isActive: state.isBlockquote,
                onSelect: () => chain().toggleBlockquote().run(),
              },
              {
                label: "Divider line",
                icon: Minus,
                onSelect: () => chain().setHorizontalRule().run(),
              },
              {
                label: "Clear formatting",
                icon: RemoveFormatting,
                onSelect: () => chain().unsetAllMarks().clearNodes().run(),
              },
            ]}
          />
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
