import Link from "next/link";
import { formatDateTime, getEventBookingLink } from "@/app/_lib/utils";
import type { HomepageClass } from "../_lib/types";

interface UpcomingClassesProps {
  events: HomepageClass[];
  /** Count of every class still ahead, including those beyond the three cards. */
  total: number;
}

export default function UpcomingClasses({
  events,
  total,
}: UpcomingClassesProps) {
  return (
    <section
      data-testid="upcoming-classes"
      className="bg-moss px-gutter py-section text-sand"
    >
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-cormorant text-[clamp(40px,4.5vw,56px)] font-normal">
          Upcoming
        </h2>
        <p className="text-[13px] uppercase tracking-[0.12em] opacity-85">
          {total} {total === 1 ? "class" : "classes"} on the calendar
        </p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
        {events.map((event) => (
          <li key={event.id}>
            <ClassCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClassCard({ event }: { event: HomepageClass }) {
  const { dateShortWithoutYear, timeOnly } = formatDateTime(
    event.startDateTime,
  );
  const { href, external } = getEventBookingLink(event);
  const place = event.location?.name;

  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-full min-h-[200px] flex-col justify-between gap-6 rounded-[20px] bg-sand p-7 text-ink transition-opacity hover:opacity-70"
    >
      <span className="font-cormorant text-[40px] leading-none">
        {dateShortWithoutYear}
      </span>
      <span>
        <span className="block text-[20px] font-medium">{event.title}</span>
        <span className="mt-1.5 block text-ink-muted">
          {timeOnly.toLowerCase()}
          {place && ` · ${place}`}
        </span>
      </span>
    </Link>
  );
}
