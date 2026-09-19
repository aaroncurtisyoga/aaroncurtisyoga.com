import { DCBPCrawler } from "@/app/_lib/crawlers/dcbp-crawler";
import { SyncEventData } from "@/app/_lib/types/event";
import { EventDatabaseOperations } from "./event-database-operations";
import { LocationCategoryService } from "./location-category-service";
import {
  withRetry,
  isBrowserlessRateLimit,
} from "@/app/_lib/utils/retry-helper";
import { SOURCE_TYPES } from "@/app/_lib/constants";
import { escapeHtml } from "@/app/_lib/email/event-html";

export class DCBPSyncService {
  private crawler = new DCBPCrawler();
  private dbOperations = new EventDatabaseOperations();
  private locationCategoryService = new LocationCategoryService();
  private sourceType = SOURCE_TYPES.DCBP;

  async syncEvents() {
    try {
      console.log("Starting DCBP sync...");

      const [externalClasses, locationId, categoryId] = await Promise.all([
        withRetry(() => this.crawler.getScheduledClasses(), {
          maxAttempts: 3,
          baseDelay: 5000,
          maxDelay: 20000,
          retryCondition: isBrowserlessRateLimit,
        }),
        this.locationCategoryService.getDCBPLocationId(),
        this.locationCategoryService.getDefaultCategoryId(),
      ]);

      const eventUpdates: SyncEventData[] = externalClasses.map((cls) => ({
        title: cls.title,
        startDateTime: cls.startDateTime,
        endDateTime: cls.endDateTime,
        sourceType: this.sourceType,
        sourceId: cls.id,
        externalUrl: "https://dcboulderingproject.com/dc/yoga",
        isExternal: true,
        lastSynced: new Date(),
        locationId,
        categoryId,
        isFree: false,
        isHostedExternally: true,
        price: "25",
        description: `Join Aaron Curtis for ${escapeHtml(cls.title)} at DC Bouldering Project. Visit DCBP website for more information.`,
        isActive: true,
      }));

      await this.dbOperations.batchUpsertEvents(eventUpdates, this.sourceType);

      console.log(`Synced ${externalClasses.length} classes from DCBP`);

      const deactivatedCount = await this.dbOperations.deactivateOldEvents(
        this.sourceType,
        externalClasses.length,
      );

      return {
        synced: externalClasses.length,
        deactivated: deactivatedCount,
      };
    } catch (error) {
      console.error("DCBP sync failed:", error);
      throw error;
    }
  }
}
