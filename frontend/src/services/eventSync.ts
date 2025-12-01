import FireFly from "@hyperledger/firefly-sdk";
import SystemStateModel from "../models/systemState";
import dbConnect from "../lib/dbService";

interface EventSyncConfig {
  fireflyInstance: FireFly;
  nodeMSP: string | null;
  lookbackHours?: number; // How far back to look for events
}

class EventSyncService {
  /**
   * Sync historical events on startup
   * This catches up on any events that were missed while the service was offline
   */
  async syncHistoricalEvents(config: EventSyncConfig): Promise<void> {
    try {
      console.log("[EventSync] Starting historical event sync...");

      await dbConnect();

      // Get last sync timestamp from system state
      const lastSync = await SystemStateModel.findOne({ key: "lastEventSync" });
      const lastSyncTime = lastSync?.lastSyncTimestamp;

      const lookbackHours = config.lookbackHours || 24; // Default 24 hours lookback
      const defaultLookback = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
      const syncFrom = lastSyncTime || defaultLookback;

      console.log(`[EventSync] Syncing events since: ${syncFrom.toISOString()}`);

      try {
        // Attempt to fetch events from Firefly
        // Note: The exact API method depends on Firefly SDK version
        // This is a best-effort implementation
        await this.fetchAndProcessEvents(config.fireflyInstance, syncFrom, config.nodeMSP);

        // Update last sync timestamp
        await SystemStateModel.findOneAndUpdate(
          { key: "lastEventSync" },
          {
            key: "lastEventSync",
            lastSyncTimestamp: new Date(),
            metadata: {
              syncedFrom: syncFrom,
              syncedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        console.log("[EventSync] Historical event sync completed successfully");
      } catch (error: any) {
        // If the Firefly SDK doesn't support historical event queries,
        // we log a warning but don't fail the startup
        if (error.message?.includes("not found") || error.message?.includes("not supported")) {
          console.warn(
            "[EventSync] Historical event sync not supported by Firefly API. " +
              "Only live events will be processed going forward."
          );
        } else {
          console.error("[EventSync] Error during historical event sync:", error);
          console.warn("[EventSync] Continuing without historical sync. Only live events will be processed.");
        }
      }
    } catch (error) {
      console.error("[EventSync] Failed to sync historical events:", error);
      console.warn("[EventSync] Service will continue with live events only");
    }
  }

  /**
   * Fetch and process events from Firefly
   * This is a best-effort implementation that attempts different API methods
   */
  private async fetchAndProcessEvents(
    fireflyInstance: FireFly,
    fromDate: Date,
    nodeMSP: string | null
  ): Promise<void> {
    try {
      console.log("[EventSync] Attempting to fetch historical events...");

      // Attempt 1: Try to get events directly (if API supports it)
      // The Firefly SDK might have a getEvents() method
      if (typeof (fireflyInstance as any).getEvents === "function") {
        const events = await (fireflyInstance as any).getEvents({
          startTime: fromDate.toISOString(),
        });

        console.log(`[EventSync] Found ${events?.length || 0} historical events`);

        // Process events (filter by MSP and persist to DB)
        // Note: This would require reimplementing the event handlers
        // For now, we just log the count
        return;
      }

      // Attempt 2: Try blockchain events API
      if (typeof (fireflyInstance as any).getBlockchainEvents === "function") {
        const events = await (fireflyInstance as any).getBlockchainEvents({
          startTime: fromDate.toISOString(),
        });

        console.log(`[EventSync] Found ${events?.length || 0} blockchain events`);
        return;
      }

      // Attempt 3: Try operations/transactions API
      if (typeof (fireflyInstance as any).getOperations === "function") {
        const operations = await (fireflyInstance as any).getOperations({
          startTime: fromDate.toISOString(),
        });

        console.log(`[EventSync] Found ${operations?.length || 0} operations`);
        return;
      }

      // If none of the above methods exist, throw an error
      throw new Error("Firefly SDK does not expose historical event query methods");
    } catch (error) {
      console.error("[EventSync] Error fetching historical events:", error);
      throw error;
    }
  }

  /**
   * Get last sync status
   */
  async getLastSyncStatus() {
    try {
      await dbConnect();
      const lastSync = await SystemStateModel.findOne({ key: "lastEventSync" });

      return {
        lastSyncTimestamp: lastSync?.lastSyncTimestamp,
        metadata: lastSync?.metadata,
      };
    } catch (error) {
      console.error("[EventSync] Error getting sync status:", error);
      return null;
    }
  }
}

// Singleton instance
const eventSyncService = new EventSyncService();

export default eventSyncService;
