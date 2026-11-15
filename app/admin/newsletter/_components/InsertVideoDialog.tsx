"use client";

import { FC, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { createVideoThumbnail } from "@/app/_lib/actions/video.actions";
import { videoCardHtml } from "@/app/_lib/email/video-html";
import { parseYouTubeUrl } from "@/app/_lib/utils/youtube";

interface InsertVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives ready-to-insert, Tiptap-schema-safe card HTML. */
  onInsert: (html: string) => void;
}

/**
 * Paste a YouTube link and get a video card at the caret. Email apps strip
 * embedded players, so the card is a still with a play button that opens the
 * video on YouTube.
 */
const InsertVideoDialog: FC<InsertVideoDialogProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (isWorking) return;
    if (!next) {
      setUrl("");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleInsert = async () => {
    if (isWorking) return;
    if (!parseYouTubeUrl(url)) {
      setError("Paste a YouTube link, like youtube.com/shorts/… or youtu.be/…");
      return;
    }

    setError(null);
    setIsWorking(true);
    try {
      const result = await createVideoThumbnail(url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onInsert(videoCardHtml(result));
      setUrl("");
      onOpenChange(false);
    } catch {
      setError("Couldn't add the video. Try again in a moment.");
    } finally {
      setIsWorking(false);
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
          <DialogTitle>Insert a video</DialogTitle>
          <DialogDescription>
            Email can&apos;t play video, so this adds a still from the video
            with a play button. Tapping it opens the video on YouTube.
          </DialogDescription>
        </DialogHeader>

        {/* No <form>: this dialog renders inside the composer's form, and a
            submit here would bubble up and save the newsletter. */}
        <div className="space-y-2">
          <Label htmlFor="video-url">YouTube link</Label>
          <Input
            id="video-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleInsert();
              }
            }}
            placeholder="https://youtube.com/shorts/…"
            inputMode="url"
            autoComplete="off"
            disabled={isWorking}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "video-url-error" : undefined}
          />
          {error && (
            <p id="video-url-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleInsert()}
            disabled={isWorking || !url.trim()}
          >
            {isWorking && <Loader2 className="h-4 w-4 animate-spin" />}
            {isWorking ? "Building the still…" : "Insert video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsertVideoDialog;
