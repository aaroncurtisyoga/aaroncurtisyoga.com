import { FC } from "react";
import { instructorEmailAddress } from "@/app/_lib/constants";
import SectionHeading from "./SectionHeading";

const RefundPolicy: FC = () => {
  return (
    <section>
      <SectionHeading>Refund policy</SectionHeading>
      <p className="max-w-[62ch] text-[17px] text-ink-muted">
        To get a refund,{" "}
        <a
          href={`mailto:${instructorEmailAddress}`}
          className="text-moss underline underline-offset-2"
        >
          send me an email
        </a>{" "}
        and I&rsquo;ll refund you in full. No questions asked.
      </p>
    </section>
  );
};

export default RefundPolicy;
