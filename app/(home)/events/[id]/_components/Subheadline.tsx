import { FC } from "react";
import ShareEvent from "@/app/(home)/events/[id]/_components/ShareEvent";
import AddToCalendarButtons from "@/app/(home)/events/[id]/_components/AddToCalendarButtons";
import { formatDateTime } from "@/app/_lib/utils";

interface SubheadingProps {
  category: string;
  id: string;
  startDateTime: Date;
  event: {
    title: string;
    description?: string | null;
    startDateTime: Date | string;
    endDateTime: Date | string;
    location?: {
      formattedAddress?: string | null;
      name?: string | null;
    } | null;
  };
}
const Subheading: FC<SubheadingProps> = ({
  category,
  id,
  startDateTime,
  event,
}) => {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <p className="text-[13px] uppercase tracking-[0.12em] text-ink-label">
        {formatDateTime(startDateTime).dateOnlyWithoutYear} · {category}
      </p>
      <div className="flex items-center gap-2">
        <AddToCalendarButtons event={event} />
        <ShareEvent eventId={id} />
      </div>
    </div>
  );
};

export default Subheading;
