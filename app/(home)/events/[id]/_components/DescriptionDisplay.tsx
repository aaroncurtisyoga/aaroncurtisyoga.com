"use client";

import { FC } from "react";
import RichTextContent, {
  isRichTextEmpty,
} from "@/app/_components/Tiptap/RichTextContent";
import SectionHeading from "./SectionHeading";

interface DescriptionProps {
  description: string;
}

const DescriptionDisplay: FC<DescriptionProps> = ({ description }) => {
  if (isRichTextEmpty(description)) {
    return null;
  }

  return (
    <section>
      <SectionHeading>About this event</SectionHeading>
      <RichTextContent
        content={description}
        className="max-w-[62ch] text-[17px] text-ink-muted [&_a]:text-moss [&_a]:underline [&_strong]:font-semibold [&_strong]:text-ink"
      />
    </section>
  );
};

export default DescriptionDisplay;
