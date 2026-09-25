import { FC } from "react";
import { Location as LocationPrisma } from "@prisma/client";
import DirectionLinks from "@/app/(home)/events/[id]/_components/DirectionLinks";
import GoogleMap from "@/app/_components/GoogleMap";
import SectionHeading from "./SectionHeading";

interface LocationProps {
  location: LocationPrisma;
}
const Location: FC<LocationProps> = ({ location }) => {
  return (
    <section>
      <SectionHeading>Location</SectionHeading>
      <p className="text-[17px] font-medium text-ink">{location.name}</p>
      <p className="mt-0.5 text-[17px] text-ink-muted">
        {location.formattedAddress}
      </p>
      <div className="mt-5 overflow-hidden rounded-[20px] bg-sand-deep">
        <GoogleMap
          lat={location.lat}
          lng={location.lng}
          className="aspect-[16/10] w-full"
        />
      </div>
      <DirectionLinks lat={location.lat} lng={location.lng} />
    </section>
  );
};

export default Location;
