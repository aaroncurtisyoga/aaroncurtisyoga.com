import Link from "next/link";
import {
  formatDateTime,
  getEventBookingLink,
  richTextToPlainText,
} from "@/app/_lib/utils";
import type { HomepageClass } from "../_lib/types";

/**
 * Events starred in admin (workshops, sound baths). They sit above the weekly
 * classes and stay up until their end time passes. The card copy is the
 * event's own description, so the "how do I get in" details live with the
 * event rather than in this component.
 */
export default function FeaturedEvents({
  events,
}: {
  events: HomepageClass[];
}) {
  return (
    <section
      data-testid="featured-events"
      aria-label="Featured events"
      className="px-gutter pb-section"
    >
      <ul className="flex flex-col gap-5">
        {events.map((event) => (
          <li key={event.id}>
            <FeaturedCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeaturedCard({ event }: { event: HomepageClass }) {
  const start = formatDateTime(event.startDateTime);
  const end = formatDateTime(event.endDateTime);
  const { href, external } = getEventBookingLink(event);
  // The first paragraph is the lead, set large, so put the thing people most
  // need to know there (for a studio workshop: just show up).
  const [lead, ...rest] = (event.description ?? "")
    .split(/<\/p>/i)
    .map(richTextToPlainText)
    .filter(Boolean);
  const place = event.location?.name;

  return (
    <article className="grid gap-[clamp(24px,4vw,56px)] rounded-[28px] bg-ink px-[clamp(24px,4vw,56px)] py-[clamp(28px,4vw,52px)] text-sand md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col justify-between gap-6 md:border-r md:border-sand/20 md:pr-[clamp(24px,4vw,56px)]">
        <p className="text-[13px] uppercase tracking-[0.16em] text-sand/70">
          Special event
        </p>
        <div>
          <p className="font-cormorant text-[clamp(64px,9vw,120px)] leading-[0.9] tracking-[-0.02em]">
            {start.dateShortWithoutYear}
          </p>
          <p className="mt-3 text-[17px] text-sand/80">
            {start.timeOnly.toLowerCase()} to {end.timeOnly.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-7">
        <div>
          <h2 className="font-cormorant text-[clamp(34px,4vw,52px)] font-normal leading-[1.05] text-balance">
            {event.title}
          </h2>
          {place && (
            <p className="mt-3 text-[13px] uppercase tracking-[0.12em] text-sand/70">
              {place}
            </p>
          )}
          {lead && (
            <p className="mt-6 max-w-[560px] font-cormorant text-[clamp(24px,2.4vw,30px)] leading-[1.25] text-pretty">
              {lead}
            </p>
          )}
          {rest.slice(0, 2).map((paragraph) => (
            <p
              key={paragraph}
              className="mt-3 max-w-[560px] text-[clamp(16px,1.3vw,18px)] leading-[1.55] text-sand/75 text-pretty"
            >
              {paragraph}
            </p>
          ))}
        </div>
        <Link
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="self-start rounded-full bg-sand px-7 py-3.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-80"
        >
          Details
        </Link>
      </div>
    </article>
  );
}
