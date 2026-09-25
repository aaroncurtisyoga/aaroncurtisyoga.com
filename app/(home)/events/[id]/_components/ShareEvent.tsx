"use client";

import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { Check, Share } from "lucide-react";

interface ShareEventProps {
  eventId: string;
}
const ShareEvent: FC<ShareEventProps> = ({ eventId }) => {
  const [isRecentlyCopied, setIsRecentlyCopied] = useState<boolean>(false);
  useEffect(() => {
    if (isRecentlyCopied === true) {
      setTimeout(() => {
        setIsRecentlyCopied(false);
      }, 2000);
    }
  }, [isRecentlyCopied]);
  const handleClick = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/events/${eventId}`,
    );
    setIsRecentlyCopied(true);
  };

  return (
    <SimpleTooltip content="Copy link to event">
      <Button
        size="icon"
        onClick={handleClick}
        variant="ghost"
        className="rounded-full text-ink hover:bg-sand-deep hover:text-ink"
        aria-label="Copy link to event"
      >
        {isRecentlyCopied ? <Check /> : <Share />}
      </Button>
    </SimpleTooltip>
  );
};

export default ShareEvent;
