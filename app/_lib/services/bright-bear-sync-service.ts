import { BrightBearCrawler } from "@/app/_lib/crawlers/bright-bear-crawler";
import { SyncEventData } from "@/app/_lib/types/event";
import { EventDatabaseOperations } from "./event-database-operations";
import { LocationCategoryService } from "./location-category-service";
import {
  withRetry,
  isBrowserlessRateLimit,
} from "@/app/_lib/utils/retry-helper";
import { SOURCE_TYPES } from "@/app/_lib/constants";
import { escapeHtml } from "@/app/_lib/email/event-html";

export class BrightBearSyncService {
  private crawler = new BrightBearCrawler();
  private dbOperations = new EventDatabaseOperations();
  private locationCategoryService = new LocationCategoryService();
  private sourceType = SOURCE_TYPES.BRIGHT_BEAR;

  async syncEvents() {
    try {
      console.log("[Bright Bear] Starting sync...");

      const [externalClasses, locationId, categoryId] = await Promise.all([
        withRetry(() => this.crawler.getAaronClasses(), {
          maxAttempts: 3,
          baseDelay: 5000,
          maxDelay: 20000,
          retryCondition: isBrowserlessRateLimit,
        }),
        this.locationCategoryService.getBrightBearLocationId(),
        this.locationCategoryService.getDefaultCategoryId(),
      ]);

      console.log(
        `[Bright Bear] Found ${externalClasses.length} classes to sync`,
      );

      const eventUpdates: SyncEventData[] = externalClasses.map((cls) => ({
        title: cls.title,
        startDateTime: cls.startDateTime,
        endDateTime: cls.endDateTime,
        sourceType: this.sourceType,
        sourceId: cls.id,
        externalUrl: cls.bookingUrl,
        isExternal: true,
        lastSynced: new Date(),
        locationId,
        categoryId,
        isFree: false,
        isHostedExternally: true,
        price: cls.price?.replace("$", "") || "20",
        description: `Join Aaron Curtis for ${escapeHtml(cls.title)} at Bright Bear Yoga DC. Click "Register at Bright Bear" to book your spot.`,
        isActive: true,
      }));

      await this.dbOperations.batchUpsertEvents(eventUpdates, this.sourceType);

      const deactivatedCount = await this.dbOperations.deactivateOldEvents(
        this.sourceType,
        externalClasses.length,
      );

      console.log(
        `[Bright Bear] Sync complete: ${externalClasses.length} synced, ${deactivatedCount} deactivated`,
      );

      return {
        synced: externalClasses.length,
        deactivated: deactivatedCount,
      };
    } catch (error) {
      console.error("[Bright Bear] Sync failed:", error);
      throw error;
    }
  }
}
