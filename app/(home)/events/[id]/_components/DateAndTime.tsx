import { FC } from "react";
import { formatDateTime } from "@/app/_lib/utils";
import SectionHeading from "./SectionHeading";

interface DateAndTimeProps {
  endDateTime: Date;
  startDateTime: Date;
}

const DateAndTime: FC<DateAndTimeProps> = ({ endDateTime, startDateTime }) => {
  const start = formatDateTime(startDateTime);
  const end = formatDateTime(endDateTime);
  return (
    <section>
      <SectionHeading>Date and time</SectionHeading>
      <p className="text-[17px] text-ink-muted">
        {start.dateLongWithoutYear} · {start.timeOnly.toLowerCase()} to{" "}
        {end.timeOnly.toLowerCase()}
      </p>
    </section>
  );
};

export default DateAndTime;
