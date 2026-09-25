import { FC } from "react";
import {
  Event as PrismaEvent,
  Category,
  EventUser,
  Location as PrismaLocation,
} from "@prisma/client";
import Attendees from "@/app/(home)/events/[id]/_components/Attendees";
import Checkout from "@/app/(home)/events/[id]/_components/Checkout";
import DateAndTime from "@/app/(home)/events/[id]/_components/DateAndTime";
import DescriptionRichTextEditor from "@/app/(home)/events/[id]/_components/DescriptionDisplay";
import Headline from "@/app/(home)/events/[id]/_components/Headline";
import Hero from "@/app/(home)/events/[id]/_components/Hero";
import Location from "@/app/(home)/events/[id]/_components/Location";
import RefundPolicy from "@/app/(home)/events/[id]/_components/RefundPolicy";
import Subheading from "@/app/(home)/events/[id]/_components/Subheadline";
import { getEventByIdCached as getEventById } from "@/app/_lib/actions/event.queries";
import type { AttendeeUser } from "@/app/_lib/types";
import { handleError } from "@/app/_lib/utils";

type Event = PrismaEvent & {
  category: Category;
  attendees: (EventUser & { user: AttendeeUser })[];
  location: PrismaLocation;
};

interface EventPageProps {
  params: Promise<{ id: string }>;
}

const EventPage: FC<EventPageProps> = async ({ params }) => {
  const { id } = await params;
  let event: Event | null = null;

  try {
    event = await getEventById(id);
  } catch (error) {
    handleError(error);
  }

  if (!event) {
    return handleError("Event Page: No event found");
  }

  return (
    <article className="px-gutter pb-section">
      <Subheading
        category={event.category.name}
        id={event.id}
        startDateTime={event.startDateTime}
        event={event}
      />
      <Headline title={event.title} />
      <Hero imageUrl={event.imageUrl ?? ""} />
      <div className="mt-[clamp(32px,5vw,64px)] grid items-start gap-[clamp(32px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex flex-col gap-[clamp(32px,4vw,48px)]">
          <DateAndTime
            startDateTime={event.startDateTime}
            endDateTime={event.endDateTime}
          />
          <Location location={event.location} />
          <DescriptionRichTextEditor description={event.description ?? ""} />
          <Attendees
            attendees={event.attendees.map((attendee) => attendee.user)}
          />
          {/* Only events sold here are refunded here. */}
          {!event.isFree && !event.isHostedExternally && <RefundPolicy />}
        </div>
        {/* First on a phone, so the price and how to get in come before the
            details; sticky beside them on wider screens. */}
        <div className="-order-1 md:sticky md:top-8 md:order-none">
          <Checkout event={event} />
        </div>
      </div>
    </article>
  );
};

export default EventPage;
