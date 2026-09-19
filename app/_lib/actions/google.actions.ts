"use server";

import { requireAdmin } from "@/app/_lib/auth";

import {
  Client,
  PlaceAutocompleteResponse,
  PlaceDetailsResponse,
  PlaceDetailsResponseData,
} from "@googlemaps/google-maps-services-js";
import { handleError } from "@/app/_lib/utils";

const client = new Client({});

interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export const autocompleteSuggestions = async (
  search: string,
): Promise<AutocompletePrediction[]> => {
  // Billed Google Places call. Exported from a "use server" module, so this
  // is a public POST endpoint; the admin event form is its only caller.
  await requireAdmin();
  if (!search?.trim()) {
    return [];
  }

  try {
    const response: PlaceAutocompleteResponse = await client.placeAutocomplete({
      params: {
        input: search,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        language: "en",
        // types parameter removed as it's causing issues, will filter on client if needed
      },
    });

    return response.data.predictions || [];
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error_message || "Failed to fetch suggestions";
    handleError(errorMessage);
    console.error("Autocomplete error:", errorMessage);
    return [];
  }
};

export const placeDetails = async (
  placeId: string,
): Promise<PlaceDetailsResponseData["result"] | null> => {
  // Billed Google Places call. Exported from a "use server" module, so this
  // is a public POST endpoint; the admin event form is its only caller.
  await requireAdmin();
  if (!placeId) {
    return null;
  }

  try {
    const response: PlaceDetailsResponse = await client.placeDetails({
      params: {
        place_id: placeId,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        fields: [
          "formatted_address",
          "geometry",
          "name",
          "place_id",
          "types",
          "vicinity",
        ],
      },
    });

    return response.data.result;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error_message || "Failed to fetch place details";
    handleError(errorMessage);
    console.error("Place details error:", errorMessage);
    return null;
  }
};
