"use client";

import { FC } from "react";
import { Location } from "@prisma/client";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";

interface GoogleMapProps extends Pick<Location, "lat" | "lng"> {
  /** Sizes the map; it fills this box. */
  className?: string;
}

const GoogleMap: FC<GoogleMapProps> = ({ lat, lng, className }) => {
  // Without coordinates there's nothing to plot — render nothing rather than
  // centering the map on (0, 0).
  if (lat == null || lng == null) return null;
  const position = { lat, lng };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <div className={className ?? "h-[400px] w-[400px]"}>
        {/* Cooperative gestures, so scrolling past the map on a page scrolls
            the page instead of zooming the map. */}
        <Map
          defaultCenter={position}
          defaultZoom={15}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
        >
          <Marker position={position} />
        </Map>
      </div>
    </APIProvider>
  );
};

export default GoogleMap;
