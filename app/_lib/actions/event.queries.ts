import { unstable_cache } from "next/cache";
import {
  getUpcomingEvents,
  getEventById,
} from "@/app/_lib/actions/event.actions";
import { EVENTS_CACHE_TAG } from "@/app/_lib/constants/cache-tags";

/**
 * Cached reads for the public event pages (homepage and event detail).
 *
 * These run on every visitor *and* every bot/crawler request. The homepage
 * renders per request (it awaits `connection()` so "today / in N days" uses
 * the real clock), so route-level ISR doesn't apply; without caching, each
 * request would fire live Postgres queries and keep the Neon database awake
 * around the clock even when nobody's really using the site.
 *
 * Caching at the data layer fixes that: identical queries reuse a cached result
 * for up to REVALIDATE_SECONDS, so repeated/crawler traffic no longer touches
 * the DB. Any event mutation busts the shared tag (see `revalidateTag` calls in
 * event.actions.ts), so admin edits still appear immediately rather than after
 * the TTL.
 */
const REVALIDATE_SECONDS = 900; // 15 minutes

// Filters on `startDateTime >= now` at fill time, so a class that has just
// started can linger as "next" for up to the TTL. An acceptable trade for not
// hitting the DB on every request.
export const getUpcomingEventsCached = unstable_cache(
  (limit?: number) => getUpcomingEvents(limit),
  ["upcoming-events"],
  { tags: [EVENTS_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);

// Public event detail page, cached per event id. The query includes the
// registered-attendee list, so that list can be up to REVALIDATE_SECONDS stale
// on the *public* page. Acceptable for a class page (it's not a live seat map),
// and the "events" tag is busted on any event mutation. Admin / edit routes must
// keep calling the uncached getEventById so they always see current data.
export const getEventByIdCached = unstable_cache(
  (eventId: string) => getEventById(eventId),
  ["event-by-id"],
  { tags: [EVENTS_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);
