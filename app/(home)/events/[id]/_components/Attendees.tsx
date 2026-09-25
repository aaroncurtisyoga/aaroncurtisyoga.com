import { FC } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { AttendeeUser } from "@/app/_lib/types";
import SectionHeading from "./SectionHeading";

interface AttendeesProps {
  attendees: AttendeeUser[];
}

const Attendees: FC<AttendeesProps> = ({ attendees }) => {
  const maxAvatarsShown = 5;
  const totalAvatarsHidden = attendees.length - maxAvatarsShown;
  // An empty "Attendees (0)" reads as "nobody's coming", and studio events
  // never have sign-ups here at all.
  if (attendees.length === 0) return null;

  return (
    <section>
      <SectionHeading>Attendees ({attendees.length})</SectionHeading>
      <div className="flex items-center -space-x-3">
        {attendees.slice(0, maxAvatarsShown).map((attendee, index) => (
          <Avatar
            key={`${index}-${attendee.firstName}`}
            className="border-2 border-sand"
          >
            {attendee.photo ? (
              <AvatarImage
                src={attendee.photo}
                alt={`${attendee.firstName} ${attendee.lastName}`}
              />
            ) : null}
            <AvatarFallback>
              {attendee.firstName?.charAt(0)}
              {attendee.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
        {totalAvatarsHidden > 0 && (
          <Avatar className="border-2 border-sand">
            <AvatarFallback className="text-xs">
              +{totalAvatarsHidden}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </section>
  );
};

export default Attendees;
