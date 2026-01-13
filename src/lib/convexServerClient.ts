/**
 * Convex client for server-side operations (EventListener)
 * Uses HTTP API to call Convex mutations from Node.js
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

class ConvexServerClient {
  private client: ConvexHttpClient | null = null;

  constructor() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
    
    if (!convexUrl) {
      console.warn("[ConvexServerClient] CONVEX_URL not set, client will not function");
      return;
    }

    this.client = new ConvexHttpClient(convexUrl);
    console.log("[ConvexServerClient] Initialized with URL:", convexUrl);
  }

  getClient() {
    if (!this.client) {
      throw new Error("Convex client not initialized - check CONVEX_URL environment variable");
    }
    return this.client;
  }

  isInitialized() {
    return this.client !== null;
  }

  // Package mutations
  async createPackage(args: any) {
    return await this.getClient().mutation(api.mutations.packages.create, args);
  }

  async updatePackageStatus(args: any) {
    return await this.getClient().mutation(api.mutations.packages.updateStatus, args);
  }

  async deletePackage(args: any) {
    return await this.getClient().mutation(api.mutations.packages.deletePackage, args);
  }

  async updatePackageDetails(args: any) {
    return await this.getClient().mutation(api.mutations.packages.updateDetails, args);
  }

  // Transfer mutations
  async createTransfer(args: any) {
    return await this.getClient().mutation(api.mutations.transfers.create, args);
  }

  async updateTransferStatus(args: any) {
    return await this.getClient().mutation(api.mutations.transfers.updateStatus, args);
  }

  async executeTransfer(args: any) {
    return await this.getClient().mutation(api.mutations.transfers.execute, args);
  }

  // Announcement mutations
  async createAnnouncement(args: any) {
    return await this.getClient().mutation(api.mutations.announcements.create, args);
  }

  async updateAnnouncementStatus(args: any) {
    return await this.getClient().mutation(api.mutations.announcements.updateStatus, args);
  }

  async deactivateAnnouncements(args: any) {
    return await this.getClient().mutation(api.mutations.announcements.deactivate, args);
  }

  // Offer mutations
  async createOffer(args: any) {
    return await this.getClient().mutation(api.mutations.offers.create, args);
  }

  async updateOffer(args: any) {
    return await this.getClient().mutation(api.mutations.offers.update, args);
  }

  // System state mutations
  async setSystemState(args: any) {
    return await this.getClient().mutation(api.mutations.systemState.set, args);
  }

  async getSystemState(args: any) {
    return await this.getClient().mutation(api.mutations.systemState.get, args);
  }

  // System state helper object
  systemState = {
    get: async (key: string) => {
      return await this.getSystemState({ key });
    },
    set: async (key: string, value?: string, lastSyncTimestamp?: number, metadata?: any) => {
      return await this.setSystemState({ key, value, lastSyncTimestamp, metadata });
    }
  };

  // Query methods (for EventListener to check existence)
  async getPackageByExternalId(externalId: string) {
    return await this.getClient().query(api.queries.packages.getByExternalId, { externalId });
  }

  async getTransferByTransferId(transferId: string) {
    return await this.getClient().query(api.queries.transfers.getByTransferId, { transferId });
  }

  async getAnnouncementsByPackage(externalId: string) {
    return await this.getClient().query(api.queries.announcements.getByPackage, { externalId });
  }

  async getOfferByPackage(externalId: string) {
    const offers = await this.getClient().query(api.queries.offers.getByPackage, { externalId });
    return offers?.[0]; // Return first offer if exists
  }

  // Activity event logging
  async logActivityEvent(args: any) {
    return await this.getClient().mutation(api.mutations.activityEvents.logEvent, args);
  }
}

// Singleton instance
export const convexServerClient = new ConvexServerClient();

export default convexServerClient;
