import { FC } from "react";
import { Location } from "@prisma/client";
import { travelOptions } from "@/app/_lib/constants";
import { generateDirectionsUrl } from "@/app/_lib/utils/travelLinks";

interface DirectionLinksProps extends Pick<Location, "lat" | "lng"> {}

const LABELS: Record<string, string> = {
  driving: "Drive",
  walking: "Walk",
  transit: "Transit",
  bicycling: "Bike",
};

const DirectionLinks: FC<DirectionLinksProps> = ({ lat, lng }) => {
  // Directions need coordinates; render nothing if the location has none.
  if (lat == null || lng == null) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <span className="mr-1 text-[13px] uppercase tracking-[0.12em] text-ink-label">
        Directions
      </span>
      {travelOptions.map((option) => (
        <a
          key={option.travelMode}
          href={generateDirectionsUrl(lat, lng, option.travelMode)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[15px] text-ink transition-colors hover:bg-sand-deep"
        >
          <option.icon className="h-4 w-4" aria-hidden="true" />
          {LABELS[option.travelMode] ?? option.travelMode}
        </a>
      ))}
    </div>
  );
};

export default DirectionLinks;
