"use client";

import Image from "@tiptap/extension-image";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  useEditor,
  useEditorState,
  EditorContent,
  Editor,
  Extension,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { uploadEditorImage } from "@/app/_components/Tiptap/image-upload";
import { isRichTextEmpty } from "@/app/_components/Tiptap/RichTextContent";
import {
  looksLikeHtmlSource,
  stripCodeFence,
} from "@/app/_components/Tiptap/paste-html";
import styles from "@/app/_components/Tiptap/index.module.css";
import Toolbar from "@/app/_components/Tiptap/Toolbar";
import { Label } from "@/components/ui/label";

interface TiptapProps {
  description?: string;
  placeholder?: string;
  errorMessage?: string;
  onChange: (richText: string) => void;
  initialContent?: string;
  isDisabled?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  onEditorReady?: (editor: Editor) => void;
  /** Registers the image node + upload-on-drop/paste. Keep constant per mount. */
  enableImages?: boolean;
}

const Tiptap = memo(
  ({
    description,
    placeholder = "Start typing...",
    errorMessage,
    onChange,
    initialContent = "",
    isDisabled = false,
    maxLength,
    showCharacterCount = true,
    onEditorReady,
    enableImages = false,
  }: TiptapProps) => {
    // Referenced from handlePaste (which is created before `editor` exists);
    // populated once the editor is ready, below.
    const editorRef = useRef<Editor | null>(null);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const labelId = useId();

    const handleUpdate = useCallback(
      ({ editor }: { editor: Editor }) => {
        const html = editor.getHTML();
        // Sanitize HTML before passing to parent. DOMPurify strips `target`
        // by default; keep it so "open in new tab" survives (links always
        // carry rel="noopener noreferrer")
        const sanitizedHtml =
          typeof window !== "undefined"
            ? DOMPurify.sanitize(html, { ADD_ATTR: ["target"] })
            : html;
        onChange(sanitizedHtml);
      },
      [onChange],
    );

    // Upload to Vercel Blob, then insert the image node where it was dropped
    // (or at the caret when no position is given). The loading toast is the
    // only sign anything is happening on slow connections — without it a
    // second paste (and a duplicate image) is almost guaranteed.
    const insertUploadedImage = useCallback((file: File, pos?: number) => {
      const toastId = toast.loading("Uploading image…");
      uploadEditorImage(file)
        .then((url) => {
          const activeEditor = editorRef.current;
          if (!activeEditor) return;
          const node = {
            type: "image",
            attrs: { src: url, alt: file.name.replace(/\.[^.]+$/, "") },
          };
          if (pos !== undefined) {
            // The document may have changed (or shrunk) during the upload —
            // clamp so a stale drop position can't throw out of range.
            const insertAt = Math.min(pos, activeEditor.state.doc.content.size);
            activeEditor.chain().insertContentAt(insertAt, node).run();
          } else {
            activeEditor.chain().focus().insertContent(node).run();
          }
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to upload image",
          );
        })
        .finally(() => {
          toast.dismiss(toastId);
        });
    }, []);

    const extensions = useMemo(
      () => [
        // StarterKit v3 already includes Link and Underline — configure
        // Link here rather than registering it twice. Nodes carry no classes:
        // the stored HTML goes into emails and the event page, which style
        // it themselves, and the editor styles it in index.module.css.
        StarterKit.configure({
          bulletList: { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            HTMLAttributes: {
              target: "_blank",
              rel: "noopener noreferrer",
            },
            shouldAutoLink: (url) => /^https?:\/\//i.test(url),
          },
        }),
        // ⌘K / Ctrl+K opens the link dialog, as the toolbar tooltip promises
        Extension.create({
          name: "linkDialogShortcut",
          addKeyboardShortcuts: () => ({
            "Mod-k": () => {
              setIsLinkDialogOpen(true);
              return true;
            },
          }),
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        CharacterCount.configure({
          limit: maxLength,
        }),
        // Block-level images, URL-only (no base64 blobs in stored HTML)
        ...(enableImages
          ? [Image.configure({ inline: false, allowBase64: false })]
          : []),
      ],
      [placeholder, maxLength, enableImages],
    );

    const editor = useEditor({
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class: `${styles.tiptap} rounded-md border border-input bg-background px-5 py-4 focus:outline-none focus:ring-1 focus:ring-ring ${
            errorMessage ? styles.hasError : ""
          } ${isDisabled ? styles.disabled : ""}`,
          role: "textbox",
          "aria-multiline": "true",
          ...(description
            ? { "aria-labelledby": labelId }
            : { "aria-label": placeholder }),
          ...(errorMessage ? { "aria-invalid": "true" } : {}),
        },
        // Render pasted HTML *source* (e.g. AI-generated markup copied as text)
        // as formatted content instead of literal tags. Skipped inside code
        // blocks so raw HTML can still be pasted as code when that's intended.
        handlePaste: (_view, event) => {
          const activeEditor = editorRef.current;
          if (!activeEditor) return false;

          // Pasted image files (screenshots, copied images) upload to Blob
          // and land at the caret. Only when there's no text flavor alongside:
          // Office apps put both text AND a rendered bitmap on the clipboard,
          // and the text is what the user means to paste.
          if (enableImages) {
            const hasTextFlavor = Boolean(
              event.clipboardData?.getData("text/plain") ||
              event.clipboardData?.getData("text/html"),
            );
            const imageFiles = Array.from(
              event.clipboardData?.files ?? [],
            ).filter((file) => file.type.startsWith("image/"));
            if (imageFiles.length > 0 && !hasTextFlavor) {
              imageFiles.forEach((file) => insertUploadedImage(file));
              return true;
            }
          }

          if (activeEditor.isActive("codeBlock")) return false;

          const source = stripCodeFence(
            event.clipboardData?.getData("text/plain") ?? "",
          );
          if (!looksLikeHtmlSource(source)) return false;

          // Parse through the schema (drops anything unsupported) after a
          // DOMPurify pass, matching the sanitization used in handleUpdate.
          const clean =
            typeof window !== "undefined"
              ? DOMPurify.sanitize(source, { ADD_ATTR: ["target"] })
              : source;
          activeEditor.commands.insertContent(clean);
          return true;
        },
        // Dropped image files upload to Blob and land where they were dropped
        // (`moved` means a node being dragged within the doc — let ProseMirror
        // handle that natively).
        handleDrop: (view, event, _slice, moved) => {
          if (!enableImages || moved) return false;
          const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(
            (file) => file.type.startsWith("image/"),
          );
          if (imageFiles.length === 0) return false;

          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          imageFiles.forEach((file) => insertUploadedImage(file, coords?.pos));
          return true;
        },
      },
      onUpdate: handleUpdate,
      autofocus: false,
      editable: !isDisabled,
    });

    const counts = useEditorState({
      editor,
      selector: (ctx) => ({
        characters: ctx.editor?.storage.characterCount.characters() ?? 0,
        words: ctx.editor?.storage.characterCount.words() ?? 0,
      }),
    });

    // Sync editable state when isDisabled changes. emitUpdate: false —
    // otherwise this fires onChange on mount and dirties a pristine form
    useEffect(() => {
      if (editor) {
        editor.setEditable(!isDisabled, false);
      }
    }, [editor, isDisabled]);

    // Expose the editor instance to parents that need programmatic access,
    // and to handlePaste via editorRef.
    useEffect(() => {
      if (editor) {
        editorRef.current = editor;
        onEditorReady?.(editor);
      }
    }, [editor, onEditorReady]);

    // Sync externally-changed content; skip while the user is typing so a
    // round-tripped form value can't reset the cursor
    useEffect(() => {
      if (!editor || editor.isFocused) return;

      const currentContent = editor.getHTML();
      if (
        !isRichTextEmpty(initialContent) &&
        initialContent !== currentContent
      ) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }, [initialContent, editor]);

    const characterCount = counts?.characters ?? 0;
    const wordCount = counts?.words ?? 0;

    if (!editor) {
      return (
        <div
          className={`min-h-[240px] rounded-md border border-input ${styles.editorContainer}`}
        />
      );
    }

    return (
      <div className={styles.editorContainer}>
        {description && (
          <Label id={labelId} className="mb-2">
            {description}
          </Label>
        )}
        <Toolbar
          editor={editor}
          isDisabled={isDisabled}
          isLinkDialogOpen={isLinkDialogOpen}
          onLinkDialogOpenChange={setIsLinkDialogOpen}
        />
        <EditorContent editor={editor} />
        <div className={styles.footer}>
          {errorMessage && (
            <p className={styles.errorMessage}>{errorMessage}</p>
          )}
          {showCharacterCount && (
            <div className={styles.characterCount}>
              {wordCount} {wordCount === 1 ? "word" : "words"}
              {maxLength && (
                <span
                  className={
                    characterCount > maxLength ? styles.overLimit : undefined
                  }
                >
                  {" "}
                  · {characterCount}/{maxLength} characters
                </span>
              )}
              {!maxLength && <span> · {characterCount} characters</span>}
            </div>
          )}
        </div>
      </div>
    );
  },
);

Tiptap.displayName = "Tiptap";

export default Tiptap;
