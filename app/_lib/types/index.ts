import {
  Category,
  Event,
  EventUser,
  Location,
  OrderType,
  User,
} from "@prisma/client";

export type GetAllEventsParams = {
  query: string;
  category: string;
  limit: number;
  page: number;
  isActive?: boolean;
};

// ====== CATEGORY PARAMS
export type CreateCategoryParams = {
  categoryName: string;
};

// ====== ORDER PARAMS
export type CheckoutOrderParams = {
  buyerId: string;
  eventId?: string;
  isFree: boolean;
  name: string;
  price: string;
  type: OrderType;
};

export type CreateOrderParams = {
  buyerId: string;
  createdAt: Date;
  eventId?: string;
  stripeId: string;
  totalAmount: string;
  type: OrderType;
};

export type GetOrdersByEventParams = {
  eventId: string;
  searchString: string;
};

export type GetOrdersByUserParams = {
  userId: string | null;
  limit?: number;
  page: string | number | null;
};

// ====== URL QUERY PARAMS
export type TravelMode = "driving" | "walking" | "transit" | "bicycling";

export interface TravelOption {
  travelMode: TravelMode;
  icon: React.ElementType;
}

export type PlaceDetails = {
  formattedAddress: string;
  lat: number;
  lng: number;
  name: string;
  placeId: string;
};

export type EventWithLocationAndCategory = Event & {
  location: Location;
  category: Category;
};

// Full event detail (adds attendees), as returned by getEventById.
/** The attendee fields the public event page renders. Deliberately not the
 *  whole User row: that read is unauthenticated. */
export type AttendeeUser = Pick<
  User,
  "id" | "firstName" | "lastName" | "photo"
>;

export type EventWithDetails = EventWithLocationAndCategory & {
  attendees: (EventUser & { user: AttendeeUser })[];
};

export interface GetAllEventsResponse {
  data: EventWithLocationAndCategory[];
  totalPages: number;
  hasFiltersApplied: boolean;
  totalCount: number;
}
