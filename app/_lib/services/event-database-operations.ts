import prisma from "@/app/_lib/prisma";
import { SyncEventData } from "@/app/_lib/types/event";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  reconcileCalendarEvent,
} from "@/app/_lib/google-calendar";

// Concurrency limit to avoid overwhelming Google Calendar API
const GOOGLE_CALENDAR_CONCURRENCY = 5;

// Helper to process array in batches with concurrency limit
async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

export class EventDatabaseOperations {
  async batchUpsertEvents(eventUpdates: SyncEventData[], sourceType: string) {
    // Deduplicate input array by sourceId (crawler may return same event multiple times
    // when it appears in multiple month views, e.g., as a padding day)
    const uniqueEventUpdates = Array.from(
      new Map(eventUpdates.map((e) => [e.sourceId, e])).values(),
    );

    if (uniqueEventUpdates.length < eventUpdates.length) {
      console.log(
        `[Cron Sync] Deduplicated ${eventUpdates.length - uniqueEventUpdates.length} duplicate events from crawler input`,
      );
    }

    const existingEvents = await prisma.event.findMany({
      where: {
        sourceType,
        sourceId: { in: uniqueEventUpdates.map((e) => e.sourceId) },
      },
      select: { id: true, sourceId: true, googleEventId: true },
    });

    const existingMap = new Map(existingEvents.map((e) => [e.sourceId, e]));

    const eventsToCreate = uniqueEventUpdates.filter(
      (e) => !existingMap.has(e.sourceId),
    );
    const eventsToUpdate = uniqueEventUpdates.filter((e) =>
      existingMap.has(e.sourceId),
    );

    // Process creates and updates in parallel
    await Promise.all([
      this.createNewEvents(eventsToCreate),
      this.updateExistingEvents(eventsToUpdate, existingMap),
    ]);
  }

  private async createNewEvents(eventsToCreate: SyncEventData[]) {
    if (eventsToCreate.length === 0) return;

    console.log(`[Cron Sync] Creating ${eventsToCreate.length} new events...`);

    // Step 1: Check for time-based duplicates in parallel. Any active event
    // that overlaps the slot counts, since Aaron can't teach two things at
    // once. Overlap rather than an exact start match, so a hand-entered
    // workshop still blocks the synced copy when the ZoomShift shift starts a
    // little early for setup.
    const duplicateChecks = await Promise.all(
      eventsToCreate.map(async (eventData) => {
        const duplicate = await prisma.event.findFirst({
          where: {
            // The exact-start arm still catches a crawled event whose end
            // equals its start, which the overlap test alone would miss.
            OR: [
              { startDateTime: eventData.startDateTime },
              {
                startDateTime: { lt: eventData.endDateTime },
                endDateTime: { gt: eventData.startDateTime },
              },
            ],
            isActive: true,
            NOT: {
              AND: [
                { sourceType: eventData.sourceType },
                { sourceId: eventData.sourceId },
              ],
            },
          },
          select: { id: true, title: true, sourceType: true },
        });
        return { eventData, isDuplicate: !!duplicate, duplicate };
      }),
    );

    const nonDuplicateEvents = duplicateChecks.filter((c) => !c.isDuplicate);
    const duplicateEvents = duplicateChecks.filter((c) => c.isDuplicate);

    // Log duplicates
    for (const { eventData, duplicate } of duplicateEvents) {
      console.log(
        `[Cron Sync] Skipping duplicate: "${eventData.title}" - conflicts with "${duplicate?.title}" (${duplicate?.sourceType || "manual"})`,
      );
    }

    if (nonDuplicateEvents.length === 0) {
      console.log("[Cron Sync] No new events to create after duplicate check");
      return;
    }

    // Step 2: Create all events in database (parallel)
    const createResults = await Promise.allSettled(
      nonDuplicateEvents.map(async ({ eventData }) => {
        const newEvent = await prisma.event.create({
          data: eventData,
          include: { location: true },
        });
        return { eventData, newEvent };
      }),
    );

    const createdEvents = createResults
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          eventData: SyncEventData;
          newEvent: any;
        }> => r.status === "fulfilled",
      )
      .map((r) => r.value);

    const createFailures = createResults.filter((r) => r.status === "rejected");
    if (createFailures.length > 0) {
      console.error(
        `[Cron Sync] Failed to create ${createFailures.length} events in database`,
      );
    }

    console.log(
      `[Cron Sync] Created ${createdEvents.length} events in database`,
    );

    // Step 3: Sync to Google Calendar in parallel (with concurrency limit)
    const calendarResults = await processInBatches(
      createdEvents,
      async ({ eventData, newEvent }) => {
        const calendarResult = await createCalendarEvent({
          title: eventData.title,
          description: eventData.description || undefined,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          location:
            newEvent.location?.formattedAddress ||
            newEvent.location?.name ||
            undefined,
          price: eventData.price || undefined,
          isFree: eventData.isFree,
          externalRegistrationUrl: eventData.externalUrl || undefined,
          databaseEventId: newEvent.id,
        });
        return { newEvent, calendarResult };
      },
      GOOGLE_CALENDAR_CONCURRENCY,
    );

    // Step 4: Update database with Google Calendar IDs (parallel)
    const successfulCalendarSyncs = calendarResults
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          newEvent: any;
          calendarResult: { googleEventId: string; googleEventLink: string };
        }> => r.status === "fulfilled" && r.value.calendarResult !== null,
      )
      .map((r) => r.value);

    if (successfulCalendarSyncs.length > 0) {
      await Promise.all(
        successfulCalendarSyncs.map(({ newEvent, calendarResult }) =>
          prisma.event.update({
            where: { id: newEvent.id },
            data: {
              googleEventId: calendarResult.googleEventId,
              googleEventLink: calendarResult.googleEventLink,
            },
          }),
        ),
      );
    }

    const calendarFailures = calendarResults.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.calendarResult),
    );

    console.log(
      `[Cron Sync] Synced ${successfulCalendarSyncs.length}/${createdEvents.length} events to Google Calendar` +
        (calendarFailures.length > 0
          ? ` (${calendarFailures.length} failed)`
          : ""),
    );
  }

  private async updateExistingEvents(
    eventsToUpdate: SyncEventData[],
    existingMap: Map<
      string | null,
      { id: string; sourceId: string | null; googleEventId: string | null }
    >,
  ) {
    if (eventsToUpdate.length === 0) return;

    console.log(
      `[Cron Sync] Updating ${eventsToUpdate.length} existing events...`,
    );

    // Step 1: Update all events in database (parallel)
    const updateResults = await Promise.allSettled(
      eventsToUpdate.map(async (eventData) => {
        const existingEvent = existingMap.get(eventData.sourceId)!;
        const updatedEvent = await prisma.event.update({
          where: { id: existingEvent.id },
          data: {
            title: eventData.title,
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime,
            externalUrl: eventData.externalUrl,
            lastSynced: eventData.lastSynced,
            price: eventData.price,
            description: eventData.description,
            isActive: eventData.isActive,
          },
          include: { location: true },
        });
        return { eventData, existingEvent, updatedEvent };
      }),
    );

    const updatedEvents = updateResults
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          eventData: SyncEventData;
          existingEvent: {
            id: string;
            sourceId: string;
            googleEventId: string | null;
          };
          updatedEvent: any;
        }> => r.status === "fulfilled",
      )
      .map((r) => r.value);

    console.log(
      `[Cron Sync] Updated ${updatedEvents.length} events in database`,
    );

    // Step 2: Categorize events by Google Calendar status
    const eventsWithGoogleId = updatedEvents.filter(
      (e) => e.existingEvent.googleEventId,
    );
    const eventsWithoutGoogleId = updatedEvents.filter(
      (e) => !e.existingEvent.googleEventId,
    );

    // Step 3: Update Google Calendar events (parallel with concurrency limit)
    if (eventsWithGoogleId.length > 0) {
      const gcalUpdateResults = await processInBatches(
        eventsWithGoogleId,
        async ({ eventData, existingEvent, updatedEvent }) => {
          return updateCalendarEvent(existingEvent.googleEventId!, {
            title: eventData.title,
            description: eventData.description || undefined,
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime,
            location:
              updatedEvent.location?.formattedAddress ||
              updatedEvent.location?.name ||
              undefined,
            price: eventData.price || undefined,
            isFree: eventData.isFree,
            externalRegistrationUrl: eventData.externalUrl || undefined,
          });
        },
        GOOGLE_CALENDAR_CONCURRENCY,
      );

      const successCount = gcalUpdateResults.filter(
        (r) => r.status === "fulfilled" && r.value,
      ).length;
      console.log(
        `[Cron Sync] Updated ${successCount}/${eventsWithGoogleId.length} events in Google Calendar`,
      );
    }

    // Step 4: Handle events without Google Calendar IDs (need to find or create)
    if (eventsWithoutGoogleId.length > 0) {
      await this.linkOrCreateGoogleCalendarEvents(eventsWithoutGoogleId);
    }
  }

  private async linkOrCreateGoogleCalendarEvents(
    events: Array<{
      eventData: SyncEventData;
      existingEvent: {
        id: string;
        sourceId: string;
        googleEventId: string | null;
      };
      updatedEvent: any;
    }>,
  ) {
    console.log(
      `[Cron Sync] Linking/creating Google Calendar events for ${events.length} events...`,
    );

    // Process in batches to respect API limits
    const results = await processInBatches(
      events,
      async ({ eventData, existingEvent, updatedEvent }) => {
        // Find-or-create-then-update, shared with the admin CRUD path.
        const result = await reconcileCalendarEvent(existingEvent.id, {
          title: eventData.title,
          description: eventData.description || undefined,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          location:
            updatedEvent.location?.formattedAddress ||
            updatedEvent.location?.name ||
            undefined,
          price: eventData.price || undefined,
          isFree: eventData.isFree,
          externalRegistrationUrl: eventData.externalUrl || undefined,
        });

        if (result) {
          await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              googleEventId: result.googleEventId,
              googleEventLink: result.googleEventLink,
            },
          });
          return { action: "linked", title: eventData.title };
        }
        return { action: "failed", title: eventData.title };
      },
      GOOGLE_CALENDAR_CONCURRENCY,
    );

    const successful = results.filter(
      (r) =>
        r.status === "fulfilled" &&
        (r.value.action === "linked" || r.value.action === "created"),
    );
    console.log(
      `[Cron Sync] Linked/created ${successful.length}/${events.length} Google Calendar events`,
    );
  }

  async deactivateOldEvents(
    sourceType: string,
    scrapedCount: number,
  ): Promise<number> {
    // Safety guard: an empty scrape is far more likely a crawler/selector
    // failure (Momence/ZoomShift markup changed, filter no longer matches,
    // dates unparseable) than a genuinely empty schedule. Because deactivation
    // keys only on a stale `lastSynced`, a 0-result run would sweep away every
    // future event for this source — silently wiping a weekly-teaching
    // instructor's classes. Skip deactivation entirely and let the existing
    // rows stand until a successful scrape refreshes their `lastSynced`.
    if (scrapedCount === 0) {
      console.warn(
        `[Cron Sync] Skipping ${sourceType} deactivation: crawler returned 0 events (treated as a scrape failure, not an empty schedule).`,
      );
      return 0;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find events that need to be deactivated
    const eventsToDeactivate = await prisma.event.findMany({
      where: {
        sourceType,
        lastSynced: { lt: oneHourAgo },
        startDateTime: { gt: new Date() },
        isActive: true,
      },
      select: { id: true, title: true, googleEventId: true },
    });

    if (eventsToDeactivate.length === 0) {
      console.log("[Cron Sync] No old events to deactivate");
      return 0;
    }

    console.log(
      `[Cron Sync] Deactivating ${eventsToDeactivate.length} old events...`,
    );

    // Separate events with and without Google Calendar IDs
    const eventsWithGoogleId = eventsToDeactivate.filter(
      (e) => e.googleEventId,
    );
    const eventsWithoutGoogleId = eventsToDeactivate.filter(
      (e) => !e.googleEventId,
    );

    // Delete from Google Calendar in parallel (with concurrency limit)
    const googleDeleteResults = await processInBatches(
      eventsWithGoogleId,
      async (event) => {
        await deleteCalendarEvent(event.googleEventId!);
        return event.id;
      },
      GOOGLE_CALENDAR_CONCURRENCY,
    );

    // Only deactivate events that successfully deleted from Google Calendar
    // (or never had a Google Calendar ID)
    const successfullyDeletedIds = googleDeleteResults
      .filter(
        (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
      )
      .map((r) => r.value);

    const failedDeletes = googleDeleteResults.filter(
      (r) => r.status === "rejected",
    );
    if (failedDeletes.length > 0) {
      console.warn(
        `[Cron Sync] Failed to delete ${failedDeletes.length} events from Google Calendar - skipping deactivation to prevent orphans`,
      );
    }

    // Combine: events without Google ID + events successfully deleted from Google
    const idsToDeactivate = [
      ...eventsWithoutGoogleId.map((e) => e.id),
      ...successfullyDeletedIds,
    ];

    if (idsToDeactivate.length === 0) {
      console.log(
        "[Cron Sync] No events to deactivate after Google Calendar cleanup",
      );
      return 0;
    }

    // Deactivate in database
    const deletedCount = await prisma.event.updateMany({
      where: { id: { in: idsToDeactivate } },
      data: {
        isActive: false,
        googleEventId: null,
        googleEventLink: null,
      },
    });

    console.log(
      `[Cron Sync] Deactivated ${deletedCount.count} old ${sourceType} events`,
    );

    return deletedCount.count;
  }
}
