"use client";

import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonHtml } from "@/app/_components/Tiptap/button-link";

interface InsertButtonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives ready-to-insert, Tiptap-schema-safe button HTML. */
  onInsert: (html: string) => void;
}

const LABEL_MAX = 40;

// Web links get https:// when it's left off; mailto: links pass through so a
// button can open a new email.
const toButtonHref = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(trimmed)) return trimmed;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
};

/**
 * A standalone call-to-action button for the newsletter body: "Book a
 * private", "Take the survey". Event cards and videos have their own inserts.
 */
const InsertButtonDialog: FC<InsertButtonDialogProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setLabel("");
      setUrl("");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleInsert = () => {
    const href = toButtonHref(url);
    if (!label.trim()) {
      setError("Give the button a label.");
      return;
    }
    if (!href) {
      setError("That link doesn't look right. Paste the full address.");
      return;
    }
    onInsert(buttonHtml({ label: label.trim(), href }));
    handleOpenChange(false);
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        // The insert focuses the editor; don't let Radix pull focus back to
        // the Insert dropdown trigger.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Insert a button</DialogTitle>
          <DialogDescription>
            Adds a button on its own line. Keep the label short, and say what
            happens when someone taps it.
          </DialogDescription>
        </DialogHeader>

        {/* No <form>: this dialog renders inside the composer's form, and a
            submit here would bubble up and save the newsletter. */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="button-label">Label</Label>
            <Input
              id="button-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={onEnter}
              placeholder="Book a private session"
              maxLength={LABEL_MAX}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="button-url">Link</Label>
            <Input
              id="button-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={onEnter}
              placeholder="https://…"
              inputMode="url"
              autoComplete="off"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "button-error" : undefined}
            />
          </div>
          {error && (
            <p id="button-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            disabled={!label.trim() || !url.trim()}
          >
            Insert button
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsertButtonDialog;
