import { FC } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { AttendeeUser } from "@/app/_lib/types";

interface AttendeesProps {
  attendees: AttendeeUser[];
}

const Attendees: FC<AttendeesProps> = ({ attendees }) => {
  const maxAvatarsShown = 5;
  const totalAvatarsHidden = attendees.length - maxAvatarsShown;
  if (!attendees) return null;

  return (
    <div>
      <h2 className={"text-2xl font-bold mb-3"}>
        Attendees ({attendees.length})
      </h2>
      <div className="flex items-center -space-x-3 mb-6 md:mb-8">
        {attendees.slice(0, maxAvatarsShown).map((attendee, index) => (
          <Avatar
            key={`${index}-${attendee.firstName}`}
            className="border-2 border-background"
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
          <Avatar className="border-2 border-background">
            <AvatarFallback className="text-xs">
              +{totalAvatarsHidden}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
};

export default Attendees;
