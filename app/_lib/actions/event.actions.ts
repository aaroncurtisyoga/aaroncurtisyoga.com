"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { EVENTS_CACHE_TAG } from "@/app/_lib/constants/cache-tags";
import prisma from "@/app/_lib/prisma";
import { requireAdmin } from "@/app/_lib/auth";
import {
  EventWithDetails,
  EventWithLocationAndCategory,
  GetAllEventsParams,
  GetAllEventsResponse,
} from "@/app/_lib/types";
import { CreateEventData, UpdateEventData } from "@/app/_lib/types/event";
import { handleError } from "@/app/_lib/utils";
import { serialize, type Serialized } from "@/app/_lib/utils/serialize";
import {
  calculateSkipAmount,
  calculateTotalPages,
} from "@/app/_lib/utils/pagination";
import {
  buildEventSearchConditions,
  buildWeekDateRange,
  buildMonthGridRange,
} from "@/app/_lib/utils/query-builders";
import { Prisma } from "@prisma/client";
import { generateMockEvents } from "@/app/_lib/utils/mock-events";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  buildCalendarEventData,
  reconcileCalendarEvent,
} from "@/app/_lib/google-calendar";

export async function createEvent({
  event,
  path,
}: {
  event: CreateEventData;
  path: string;
}) {
  try {
    await requireAdmin();

    // Validate required fields
    if (!event.location || !event.location.placeId) {
      throw new Error("Location is required and must have a valid placeId");
    }

    // Convert date strings to UTC ISO strings
    const startDateTimeISO = new Date(event.startDateTime).toISOString();
    const endDateTimeISO = new Date(event.endDateTime).toISOString();

    // Handle location creation/connection first
    const location = await prisma.location.upsert({
      where: {
        placeId: event.location.placeId,
      },
      create: {
        ...event.location,
      },
      update: {
        ...event.location,
      },
    });

    // Check for existing events at the same time to prevent duplicates
    // Since you can only be in one place at once, we only check startDateTime
    const duplicateEvent = await prisma.event.findFirst({
      where: {
        startDateTime: startDateTimeISO,
        isActive: true,
      },
    });

    if (duplicateEvent) {
      throw new Error(
        `An event already exists at this time. Please choose a different time.`,
      );
    }

    const newEvent = await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        startDateTime: startDateTimeISO,
        endDateTime: endDateTimeISO,
        price: event.price,
        // Only set maxAttendees for internally hosted events
        maxAttendees: event.isHostedExternally ? null : event.maxAttendees,
        imageUrl: event.imageUrl,
        externalRegistrationUrl: event.externalRegistrationUrl,
        isFree: event.isFree ?? (!event.price || Number(event.price) === 0),
        isHostedExternally: event.isHostedExternally ?? false,
        // Use scalar field assignments instead of nested connects
        categoryId: event.category,
        locationId: location.id,
      },
    });

    // Sync with Google Calendar
    console.log("[Event Creation] Syncing new event with Google Calendar...");
    const calendarResult = await createCalendarEvent(
      buildCalendarEventData(
        {
          ...event,
          startDateTime: startDateTimeISO,
          endDateTime: endDateTimeISO,
        },
        location.formattedAddress || location.name || undefined,
        newEvent.id,
      ),
    );

    // Update event with Google Calendar details if sync was successful
    if (calendarResult) {
      console.log(
        "[Event Creation] Updating event with Google Calendar details",
      );
      await prisma.event.update({
        where: { id: newEvent.id },
        data: {
          googleEventId: calendarResult.googleEventId,
          googleEventLink: calendarResult.googleEventLink,
        },
      });
    } else {
      console.warn(
        "[Event Creation] Google Calendar sync failed, but event was created in database",
      );
    }

    revalidatePath(path);
    revalidateTag(EVENTS_CACHE_TAG, { expire: 0 });
    return serialize(newEvent);
  } catch (error) {
    handleError(error);
    return null;
  }
}

export async function deleteEvent(
  eventId: string,
): Promise<{ success: boolean }> {
  try {
    await requireAdmin();

    // First, get the event to check for Google Calendar ID
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { googleEventId: true, title: true },
    });

    if (!event) {
      console.error("[Event Deletion] Event not found:", eventId);
      return { success: false };
    }

    // Delete from Google Calendar if it exists there
    if (event.googleEventId) {
      console.log(
        "[Event Deletion] Deleting event from Google Calendar:",
        event.title,
      );
      const calendarDeleted = await deleteCalendarEvent(event.googleEventId);
      if (!calendarDeleted) {
        console.warn(
          "[Event Deletion] Failed to delete from Google Calendar, but continuing with database deletion",
        );
      }
    }

    // Delete from database
    const deletedEvent = await prisma.event.delete({
      where: { id: eventId },
    });

    if (deletedEvent) {
      console.log("[Event Deletion] Event deleted successfully from database");
      revalidatePath("/");
      revalidatePath("/admin/events");
      revalidateTag(EVENTS_CACHE_TAG, { expire: 0 });
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    return handleError(error);
  }
}

// Local dev only: MOCK_EVENTS=true serves fixtures from mock-events.ts
// instead of Postgres. Not exported, so it isn't a callable server action.
function mockEventsEnabled() {
  return (
    process.env.NODE_ENV === "development" && process.env.MOCK_EVENTS === "true"
  );
}

export async function getAllEvents({
  query,
  limit = 8,
  page,
  category,
  isActive = true,
}: GetAllEventsParams): Promise<GetAllEventsResponse> {
  try {
    // Public POST endpoint by virtue of "use server". Its callers are the admin
    // events table and the newsletter insert dialog, and it takes an unclamped
    // row limit plus an isActive filter, so it checks the caller itself.
    await requireAdmin();

    // In dev mode with MOCK_EVENTS=true, return mock events for UI testing
    const useMockEvents = mockEventsEnabled();

    if (useMockEvents) {
      const mockEvents = generateMockEvents(20);
      const skipAmount = calculateSkipAmount(Number(page), limit);
      const paginatedMockEvents = mockEvents.slice(
        skipAmount,
        skipAmount + limit,
      );

      return {
        data: paginatedMockEvents,
        hasFiltersApplied: false,
        totalPages: calculateTotalPages(mockEvents.length, limit),
        totalCount: mockEvents.length,
      };
    }

    const whereConditions = buildEventSearchConditions(
      query,
      category,
      isActive,
    );
    const skipAmount = calculateSkipAmount(Number(page), limit);

    const [events, eventsCount] = await Promise.all([
      prisma.event.findMany({
        where: whereConditions,
        orderBy: { startDateTime: "asc" },
        take: limit,
        skip: skipAmount,
        include: {
          category: true,
          location: true,
        },
      }),
      prisma.event.count({
        where: whereConditions,
      }),
    ]);

    const hasFiltersApplied: boolean = !!query || !!category;

    return {
      data: serialize(events) as unknown as EventWithLocationAndCategory[],
      hasFiltersApplied,
      totalPages: calculateTotalPages(eventsCount, limit),
      totalCount: eventsCount,
    };
  } catch (error) {
    handleError(error);
    return {
      data: [],
      hasFiltersApplied: false,
      totalPages: 0,
      totalCount: 0,
    };
  }
}

export async function getEventById(
  eventId: string,
): Promise<EventWithDetails | null> {
  try {
    // In dev mode with MOCK_EVENTS=true, return mock event for UI testing
    const useMockEvents = mockEventsEnabled();

    if (useMockEvents && eventId.startsWith("mock-event-")) {
      const mockEvents = generateMockEvents(20);
      const mockEvent = mockEvents.find((e) => e.id === eventId);
      if (mockEvent) {
        return serialize({
          ...mockEvent,
          attendees: [],
        }) as unknown as EventWithDetails;
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          include: {
            // Only what Attendees.tsx renders. This read is public (the event
            // page and getEventByIdCached), and `user: true` shipped every
            // attendee's email and clerkId to the browser.
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
              },
            },
          },
        },
        category: true,
        location: true,
      },
    });

    if (!event) return null;

    return serialize(event) as unknown as EventWithDetails;
  } catch (error) {
    handleError(error);
    return null;
  }
}

/**
 * Aaron's own upcoming one-off events (sound baths, workshops), excluding
 * externally synced studio classes. Feeds the newsletter's Upcoming block.
 * `from` is the "upcoming as of when?" cutoff: the newsletter passes its
 * scheduled send time so a Friday-composed, Monday-sent email doesn't feature
 * events that will already be over.
 */
export async function getFeaturedEvents(limit = 2, from: Date = new Date()) {
  try {
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startDateTime: { gte: from },
        // Show anything explicitly featured (incl. synced events) plus
        // manually-created events, which default into the Upcoming block.
        OR: [{ isFeatured: true }, { sourceType: null, isExternal: false }],
      },
      orderBy: { startDateTime: "asc" },
      take: limit,
      include: {
        category: true,
        location: true,
      },
    });

    return serialize(events) as unknown as EventWithLocationAndCategory[];
  } catch (error) {
    // Degrade gracefully: a failure here should just omit the Upcoming
    // block, not fail the whole send (handleError rethrows).
    console.error(
      "[getFeaturedEvents] Failed to fetch featured events:",
      error,
    );
    return [];
  }
}

/**
 * Feature/unfeature an event. One star drives both the homepage's featured
 * section and the newsletter's Upcoming block. Works for synced events too,
 * since featuring is independent of source.
 */
export async function toggleEventFeatured(
  eventId: string,
  isFeatured: boolean,
): Promise<{ success: boolean }> {
  try {
    await requireAdmin();
    await prisma.event.update({
      where: { id: eventId },
      data: { isFeatured },
    });
    // The homepage reads isFeatured through the cached queries, so a star has
    // to evict them or it wouldn't show for up to 15 minutes.
    revalidateTag(EVENTS_CACHE_TAG, { expire: 0 });
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * The next `limit` upcoming active events from any source, plus how many are
 * still ahead in total, for the homepage hero card and Upcoming section.
 *
 * A failure here is thrown, not swallowed. The caller sits behind
 * `unstable_cache`, which stores whatever the callback resolves to, so
 * returning an empty list would pin "no classes" on the homepage for the full
 * 15-minute TTL after a single Neon cold-start blip. A rejected promise is
 * never cached, so the homepage degrades for one request and the next one
 * retries. The page catches it.
 */
export async function getUpcomingEvents(
  limit = 3,
  from: Date = new Date(),
  excludeIds: string[] = [],
): Promise<{
  events: Serialized<EventWithLocationAndCategory>[];
  total: number;
}> {
  // excludeIds keeps the homepage's featured events out of the class list so
  // nothing shows up twice. Capped for the same reason as `take` below.
  if (mockEventsEnabled()) {
    const upcoming = generateMockEvents(20).filter(
      (e) => e.startDateTime >= from && !excludeIds.includes(e.id),
    );
    return {
      events: serialize(upcoming.slice(0, limit)),
      total: upcoming.length,
    };
  }

  const where = {
    isActive: true,
    startDateTime: { gte: from },
    ...(excludeIds.length > 0 && {
      id: { notIn: excludeIds.slice(0, 12) },
    }),
  };
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDateTime: "asc" },
      // Clamped: every export in this "use server" module is reachable by POST
      // from any client, and the homepage only ever asks for 3.
      take: Math.min(Math.max(limit, 1), 12),
      include: { category: true, location: true },
    }),
    prisma.event.count({ where }),
  ]);
  return { events: serialize(events), total };
}

/**
 * Events starred in admin, for the homepage's featured section. Unlike the
 * class list this keys on `endDateTime`, so a workshop stays up until it's
 * over rather than vanishing the minute it starts.
 */
export async function getHomepageFeaturedEvents(
  limit = 2,
  from: Date = new Date(),
): Promise<Serialized<EventWithLocationAndCategory>[]> {
  if (mockEventsEnabled()) {
    return serialize(
      generateMockEvents(20)
        .filter((e) => e.isFeatured && e.endDateTime >= from)
        .slice(0, limit),
    );
  }

  const events = await prisma.event.findMany({
    where: { isActive: true, isFeatured: true, endDateTime: { gte: from } },
    orderBy: { startDateTime: "asc" },
    take: Math.min(Math.max(limit, 1), 4),
    include: { category: true, location: true },
  });
  return serialize(events);
}

/**
 * Start time of the soonest still-upcoming active event (any source), or null
 * when nothing is on the calendar ahead of `from`. Lets the newsletter roll its
 * weekly-classes block forward to the next week that actually has events instead
 * of going blank the moment the current week is over.
 */
export async function getNextEventStart(
  from: Date = new Date(),
): Promise<Date | null> {
  try {
    const next = await prisma.event.findFirst({
      where: { isActive: true, startDateTime: { gte: from } },
      orderBy: { startDateTime: "asc" },
      select: { startDateTime: true },
    });
    return next ? new Date(next.startDateTime) : null;
  } catch (error) {
    console.error("[getNextEventStart] Failed to fetch next event:", error);
    return null;
  }
}

export async function getEventsByWeek(weekStartISO: string) {
  try {
    const { start, end } = buildWeekDateRange(new Date(weekStartISO));

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startDateTime: { gte: start, lt: end },
      },
      orderBy: { startDateTime: "asc" },
      include: {
        category: true,
        location: true,
      },
    });

    return serialize(events) as unknown as EventWithLocationAndCategory[];
  } catch (error) {
    handleError(error);
    return [];
  }
}

export async function updateEvent({
  event,
  path,
}: {
  event: UpdateEventData;
  path: string;
}) {
  try {
    await requireAdmin();

    const {
      category,
      location,
      startDateTime,
      endDateTime,
      maxAttendees,
      isHostedExternally,
      ...eventData
    } = event;

    const eventId = event.id;
    if (!eventId) {
      return handleError("updateEvent called without an event id");
    }

    // In dev mode with MOCK_EVENTS=true, simulate successful update for mock events
    const useMockEvents = mockEventsEnabled();

    if (useMockEvents && eventId?.startsWith("mock-event-")) {
      console.log("[Mock] Simulating event update for:", eventId, event);
      revalidatePath(path);
      return { success: true, id: eventId };
    }

    const categoryToConnect = category;

    // Convert datetime strings to ISO format
    let processedStartDateTime = startDateTime;
    let processedEndDateTime = endDateTime;

    if (startDateTime && typeof startDateTime === "string") {
      processedStartDateTime = new Date(startDateTime).toISOString();
    }

    if (endDateTime && typeof endDateTime === "string") {
      processedEndDateTime = new Date(endDateTime).toISOString();
    }

    // If datetime is being updated, check for duplicates
    // Since you can only be in one place at once, we only check startDateTime
    if (processedStartDateTime) {
      const duplicateEvent = await prisma.event.findFirst({
        where: {
          id: { not: eventId }, // Exclude the current event being updated
          startDateTime: processedStartDateTime,
          isActive: true,
        },
      });

      if (duplicateEvent) {
        throw new Error(
          `Another event already exists at this time. Please choose a different time.`,
        );
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...eventData,
        ...(processedStartDateTime
          ? { startDateTime: processedStartDateTime }
          : {}),
        ...(processedEndDateTime ? { endDateTime: processedEndDateTime } : {}),
        // Only set maxAttendees for internally hosted events, null it out for external events
        ...(isHostedExternally !== undefined
          ? {
              isHostedExternally,
              maxAttendees: isHostedExternally ? null : maxAttendees,
            }
          : maxAttendees !== undefined
            ? { maxAttendees }
            : {}),
        isFree: event.isFree ?? (!event.price || Number(event.price) === 0),
        ...(categoryToConnect
          ? { category: { connect: { id: categoryToConnect } } }
          : {}),
        ...(location &&
        location.placeId &&
        location.name &&
        location.formattedAddress
          ? {
              location: {
                connectOrCreate: {
                  create: {
                    name: location.name,
                    formattedAddress: location.formattedAddress,
                    placeId: location.placeId,
                    lat: location.lat,
                    lng: location.lng,
                  },
                  where: { placeId: location.placeId },
                },
              },
            }
          : {}),
      },
      include: {
        location: true,
      },
    });

    // Sync with Google Calendar (find-or-create-then-update lives in one place).
    const locationStr =
      updatedEvent.location?.formattedAddress ||
      updatedEvent.location?.name ||
      undefined;
    const calendarData = buildCalendarEventData(updatedEvent, locationStr);

    const calendarResult = await reconcileCalendarEvent(
      eventId,
      calendarData,
      updatedEvent.googleEventId,
    );

    // Persist the link only when the row didn't already carry one; an existing
    // googleEventId was just updated in place and needs no rewrite.
    if (calendarResult && !updatedEvent.googleEventId) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          googleEventId: calendarResult.googleEventId,
          googleEventLink: calendarResult.googleEventLink,
        },
      });
    }

    revalidatePath(path);
    revalidateTag(EVENTS_CACHE_TAG, { expire: 0 });

    return serialize(updatedEvent);
  } catch (error) {
    handleError(error);
    return null;
  }
}

export async function getEventsByMonth({
  year,
  month,
  query,
  category,
  isActive,
}: {
  year: number;
  month: number;
  query?: string;
  category?: string;
  isActive?: boolean;
}): Promise<EventWithLocationAndCategory[]> {
  try {
    // Admin calendar only, and reachable by POST like every other export here.
    await requireAdmin();

    const { gridStart, gridEnd } = buildMonthGridRange(year, month);

    const conditions: Prisma.EventWhereInput[] = [
      { startDateTime: { gte: gridStart, lte: gridEnd } },
    ];

    if (query) {
      conditions.push({ title: { contains: query } });
    }

    if (category) {
      conditions.push({ category: { id: category } });
    }

    if (typeof isActive === "boolean") {
      conditions.push({ isActive });
    }

    const events = await prisma.event.findMany({
      where: { AND: conditions },
      orderBy: { startDateTime: "asc" },
      include: {
        category: true,
        location: true,
      },
    });

    return serialize(events) as unknown as EventWithLocationAndCategory[];
  } catch (error) {
    handleError(error);
    return [];
  }
}
