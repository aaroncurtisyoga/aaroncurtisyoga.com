import { FC } from "react";
import {
  Event as PrismaEvent,
  Category,
  EventUser,
  Location as PrismaLocation,
} from "@prisma/client";
import Attendees from "@/app/(root)/events/[id]/_components/Attendees";
import Checkout from "@/app/(root)/events/[id]/_components/Checkout";
import DateAndTime from "@/app/(root)/events/[id]/_components/DateAndTime";
import DescriptionRichTextEditor from "@/app/(root)/events/[id]/_components/DescriptionDisplay";
import Headline from "@/app/(root)/events/[id]/_components/Headline";
import Hero from "@/app/(root)/events/[id]/_components/Hero";
import Location from "@/app/(root)/events/[id]/_components/Location";
import RefundPolicy from "@/app/(root)/events/[id]/_components/RefundPolicy";
import Subheading from "@/app/(root)/events/[id]/_components/Subheadline";
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
    <section className="flex flex-col w-full md:items-center pb-10 gap-3">
      <Hero imageUrl={event.imageUrl ?? ""} />
      <Subheading
        category={event.category.name}
        id={event.id}
        startDateTime={event.startDateTime}
        event={event}
      />
      <div className={"wrapper-width flex flex-col md:flex-row"}>
        <div className={"flex-1"}>
          <div>
            <Headline title={event.title} />
            <DateAndTime
              startDateTime={event.startDateTime}
              endDateTime={event.endDateTime}
            />
            <Location location={event.location} />
            <DescriptionRichTextEditor description={event.description ?? ""} />
            <Attendees
              attendees={event.attendees.map((attendee) => attendee.user)}
            />
            {!event.isFree && <RefundPolicy />}
          </div>
        </div>
        <Checkout event={event} className={"justify-center"} />
      </div>
    </section>
  );
};

export default EventPage;
