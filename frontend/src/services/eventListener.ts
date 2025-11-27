import FireFly from "@hyperledger/firefly-sdk";
import { PackageService, isPackageDetailsMessage } from "fraktal-lib";
import type {
  BlockchainEventDelivery,
  CreatePackageEvent,
  StatusUpdatedEvent,
  DeletePackageEvent,
  ProposeTransferEvent,
  AcceptTransferEvent,
  TransferExecutedEvent,
  FireFlyDatatypeMessage,
} from "fraktal-lib";
import dbConnect from "../lib/dbService";
import PackageModel, { PackageDocument } from "../models/package";
import TransferModel, { TransferStatus } from "../models/transfer";
import SystemStateModel from "../models/systemState";
import PackageAnnouncementModel, {
  PackageAnnouncementDocument,
} from "../models/packageAnnouncement";
import eventBus from "../lib/eventBus";
import { PackageAnnouncement } from "@/types/package";

interface EventListenerConfig {
  fireflyHost?: string;
  fireflyNamespace?: string;
  isTransporter?: boolean;
}

class EventListenerService {
  private packageService: PackageService | null = null;
  private fireflyInstance: FireFly | null = null;
  private nodeMSP: string | null = null;
  private nodeOrg: string | null = null;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000; // 5 seconds

  /**
   * Initialize the event listener service
   */
  async initialize(config: EventListenerConfig = {}): Promise<void> {
    try {
      console.log("[EventListener] Initializing...");

      // Connect to MongoDB
      await dbConnect();
      console.log("[EventListener] MongoDB connected");

      // Initialize Firefly
      const defaultHost =
        (config.isTransporter ?? process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE")
          ? "http://localhost:8000"
          : "http://localhost:8001";

      this.fireflyInstance = new FireFly({
        host: config.fireflyHost || process.env.FIREFLY_HOST || defaultHost,
        namespace:
          config.fireflyNamespace || process.env.FIREFLY_NAMESPACE || "default",
      });

      // Initialize PackageService
      this.packageService = new PackageService(this.fireflyInstance);
      await this.packageService.initalize();
      console.log("[EventListener] Firefly PackageService initialized");

      // Get node identity and extract MSP
      await this.fetchNodeIdentity();

      // Store node identity in system state
      await this.storeNodeIdentity();

      // Set up event listeners
      await this.setupEventListeners();

      this.isRunning = true;
      this.reconnectAttempts = 0;
      console.log(
        `[EventListener] Successfully initialized. Node MSP: ${this.nodeMSP}`,
      );
    } catch (error) {
      console.error("[EventListener] Initialization failed:", error);
      await this.handleReconnect();
      throw error;
    }
  }

  /**
   * Fetch the node's identity and extract MSP
   */
  private async fetchNodeIdentity(): Promise<void> {
    try {
      if (!this.fireflyInstance) {
        throw new Error("Firefly instance not initialized");
      }

      // Get status to then get verifier msp
      const status = await this.fireflyInstance.getStatus();

      if (
        !status ||
        !status.org.verifiers ||
        status.org.verifiers.length === 0 ||
        !status.org.name
      ) {
        throw new Error("No verifiers found for this Firefly node");
      }

      // Get the first verifier (our node)
      const ourVerifier = status.org.verifiers[0];
      const ourIdentity = status.org.name;

      // Extract MSP from the verifier's value (signing key)
      // Format: "MSP_ID:certificate..."
      if (ourVerifier.value) {
        const msp = ourVerifier.value.split(":")[0];
        this.nodeMSP = msp;
        this.nodeOrg = ourIdentity;
        console.log(
          `[EventListener] Detected node MSP: ${this.nodeMSP}, ${this.nodeOrg}`,
        );
      } else {
        console.warn(
          "[EventListener] Could not extract MSP from verifier or node org identity, will process all events",
        );
        this.nodeMSP = null;
      }
    } catch (error) {
      console.error("[EventListener] Failed to fetch node identity:", error);
      console.warn(
        "[EventListener] Continuing without MSP filtering (will process all events)",
      );
      this.nodeMSP = null;
      this.nodeOrg = null;
    }
  }

  /**
   * Store node identity in system state for reference
   */
  private async storeNodeIdentity(): Promise<void> {
    try {
      if (this.nodeMSP) {
        await SystemStateModel.findOneAndUpdate(
          { key: "nodeMSP" },
          {
            key: "nodeMSP",
            value: this.nodeMSP,
            lastSyncTimestamp: new Date(),
          },
          { upsert: true, new: true },
        );
        console.log("[EventListener] Node MSP stored in system state");
      }
    } catch (error) {
      console.error("[EventListener] Failed to store node identity:", error);
    }
  }

  /**
   * Check if an event is relevant to our node based on MSP
   * An event is relevant if:
   * - For blockchain events: caller matches our MSP, OR any of ownerOrgMSP, newOwner, toMSP, fromMSP match our MSP
   * - For messages: signingKey (extracted MSP) matches our MSP
   */
  private isRelevantEvent(
    event: BlockchainEventDelivery | FireFlyDatatypeMessage,
  ): boolean {
    // If no MSP filtering is configured, accept all events
    if (!this.nodeMSP) {
      return true;
    }

    // For blockchain events, check the output fields
    if ("output" in event && event.output) {
      const output = event.output;

      // Check caller field (present in all blockchain events)
      if (output.caller === this.nodeMSP) {
        return true;
      }

      // Check transfer-related fields
      if (output.fromMSP === this.nodeMSP || output.toMSP === this.nodeMSP) {
        return true;
      }

      // Check ownership fields
      if (
        output.ownerOrgMSP === this.nodeMSP ||
        output.newOwner === this.nodeMSP
      ) {
        return true;
      }

      // Also check nested terms object for transfer events
      if (output.terms) {
        if (
          output.terms.fromMSP === this.nodeMSP ||
          output.terms.toMSP === this.nodeMSP
        ) {
          return true;
        }
      }

      console.log(
        `[EventListener] Filtering out event - no matching MSP fields (ours: ${this.nodeMSP})`,
      );
      return false;
    }

    // For FireFly datatype messages, check signingKey
    if ("signingKey" in event && event.signingKey) {
      const eventMSP = event.signingKey.split(":")[0];
      const isRelevant = eventMSP === this.nodeMSP;

      if (!isRelevant) {
        console.log(
          `[EventListener] Filtering out message from MSP: ${eventMSP} (ours: ${this.nodeMSP})`,
        );
      }

      return isRelevant;
    }

    // If we can't determine, log and accept to be safe
    console.warn(
      "[EventListener] Could not determine event MSP, accepting event",
    );
    return true;
  }

  /**
   * Extract MSP ID from an event
   * - For blockchain events: Use the caller field from output
   * - For messages: Extract from signingKey field (before first ":")
   */
  private extractMSP(
    event: BlockchainEventDelivery | FireFlyDatatypeMessage,
  ): string | undefined {
    // For blockchain events, use the caller field
    if ("output" in event && event.output && event.output.caller) {
      return event.output.caller;
    }

    // For messages, extract from signingKey
    if ("signingKey" in event && event.signingKey) {
      return event.signingKey.split(":")[0];
    }

    return undefined;
  }

  /**
   * Set up event listeners for all blockchain events
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.packageService) {
      throw new Error("PackageService not initialized");
    }

    console.log("[EventListener] Setting up blockchain event listeners...");

    // CreatePackage event
    await this.packageService.onEvent(
      "CreatePackage",
      async (
        event: BlockchainEventDelivery & { output: CreatePackageEvent },
      ) => {
        console.log("[EventListener] CreatePackage event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleCreatePackage(event);
          eventBus.emitBlockchainEvent("CreatePackage", event);
        } catch (error) {
          console.error("[EventListener] Error handling CreatePackage:", error);
        }
      },
    );

    // StatusUpdated event
    await this.packageService.onEvent(
      "StatusUpdated",
      async (
        event: BlockchainEventDelivery & { output: StatusUpdatedEvent },
      ) => {
        console.log("[EventListener] StatusUpdated event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleStatusUpdated(event);
          eventBus.emitBlockchainEvent("StatusUpdated", event);
        } catch (error) {
          console.error("[EventListener] Error handling StatusUpdated:", error);
        }
      },
    );

    // ProposeTransfer event
    await this.packageService.onEvent(
      "ProposeTransfer",
      async (
        event: BlockchainEventDelivery & { output: ProposeTransferEvent },
      ) => {
        console.log("[EventListener] ProposeTransfer event received");

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleProposeTransfer(event);
          eventBus.emitBlockchainEvent("ProposeTransfer", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling ProposeTransfer:",
            error,
          );
        }
      },
    );

    // AcceptTransfer event
    await this.packageService.onEvent(
      "AcceptTransfer",
      async (
        event: BlockchainEventDelivery & { output: AcceptTransferEvent },
      ) => {
        console.log("[EventListener] AcceptTransfer event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleAcceptTransfer(event);
          eventBus.emitBlockchainEvent("AcceptTransfer", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling AcceptTransfer:",
            error,
          );
        }
      },
    );

    // TransferExecuted event (note: fraktal-lib uses "TransferExecuted" not "ExecuteTransfer")
    await this.packageService.onEvent(
      "TransferExecuted",
      async (
        event: BlockchainEventDelivery & { output: TransferExecutedEvent },
      ) => {
        console.log("[EventListener] TransferExecuted event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleTransferExecuted(event);
          eventBus.emitBlockchainEvent("TransferExecuted", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling TransferExecuted:",
            error,
          );
        }
      },
    );

    // DeletePackage event
    await this.packageService.onEvent(
      "DeletePackage",
      async (
        event: BlockchainEventDelivery & { output: DeletePackageEvent },
      ) => {
        console.log("[EventListener] DeletePackage event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleDeletePackage(event);
          eventBus.emitBlockchainEvent("DeletePackage", event);
        } catch (error) {
          console.error("[EventListener] Error handling DeletePackage:", error);
        }
      },
    );

    // Message event (private messages from FireFly datatypes)
    await this.packageService.onEvent(
      "message",
      async (event: FireFlyDatatypeMessage) => {
        console.log("[EventListener] message event received: ", event);

        try {
          // Check if this is a PACKAGE_ANNOUNCE message with package details
          const messageTag = (event as any).tag || event.header?.tag;
          if (
            messageTag === "PACKAGE_ANNOUNCE" &&
            isPackageDetailsMessage(event)
          ) {
            console.log("[EventListener] PACKAGE_ANNOUNCE message detected");
            await this.handlePackageAnnouncement(event);
            // Emit specific event for package announcements
            eventBus.emitBlockchainEvent("PackageAnnouncement", event);
          } else {
            // Emit generic message event for other message types
            eventBus.emitBlockchainEvent("message", event);
          }
        } catch (error) {
          console.error("[EventListener] Error handling message:", error);
        }
      },
    );

    console.log("[EventListener] All event listeners registered successfully");
  }

  /**
   * Handle CreatePackage event - persist to MongoDB
   */
  private async handleCreatePackage(
    event: BlockchainEventDelivery & { output: CreatePackageEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      // Check if package already exists (may have been created via API with packageDetails)
      const existing = await PackageModel.findOne({ packageID: output.externalId });

      if (existing) {
        // Package already exists - only update blockchain-related fields
        await PackageModel.findOneAndUpdate(
          { packageID: output.externalId },
          {
            $set: {
              status: output.status,
              mspId: this.extractMSP(event),
              active: "true", // Mark as active when blockchain confirms creation
            },
          },
          { new: true },
        );
        console.log(
          `[EventListener] Package blockchain status updated: ${output.externalId}`,
        );
      } else {
        // New package from blockchain - create minimal record
        const packageData = {
          packageID: output.externalId,
          externalId: output.externalId,
          status: output.status,
          mspId: this.extractMSP(event),
          active: "true",
        } as Partial<PackageDocument>;

        await PackageModel.create(packageData);
        console.log(
          `[EventListener] Package created from blockchain: ${output.externalId}`,
        );
      }
    } catch (error) {
      console.error("[EventListener] Error persisting CreatePackage:", error);
      throw error;
    }
  }

  /**
   * Handle StatusUpdated event - update package status
   */
  private async handleStatusUpdated(
    event: BlockchainEventDelivery & { output: StatusUpdatedEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      await PackageModel.findOneAndUpdate(
        { packageID: output.externalId },
        {
          status: output.status,
          mspId: this.extractMSP(event),
        },
        { new: true },
      );

      console.log(
        `[EventListener] Package status updated: ${output.externalId} -> ${output.status}`,
      );
    } catch (error) {
      console.error("[EventListener] Error updating package status:", error);
      throw error;
    }
  }

  /**
   * Handle ProposeTransfer event - create transfer record
   */
  private async handleProposeTransfer(
    event: BlockchainEventDelivery & { output: ProposeTransferEvent },
  ): Promise<void> {
    try {
      const output = event.output;
      // Find package by externalId and link it
      const pkg = await PackageModel.findOne({
        externalId: output.externalId,
      });

      if (!pkg) {
        throw new Error("ProposeTransfer event for unknown package");
      }

      const transferData: Record<string, any> = {
        transferId: output.termsId,
        externalId: output.externalId,
        fromMSP: output.terms.fromMSP,
        toMSP: output.terms.toMSP,
        status: TransferStatus.PROPOSED,
        mspId: this.extractMSP(event) || "",
        blockchainTxId: event.txid,
        blockchainData: output,
      };

      transferData.packageId = pkg._id;

      await TransferModel.findOneAndUpdate(
        { transferId: transferData.transferId },
        transferData,
        { upsert: true, new: true },
      );

      console.log(
        `[EventListener] Transfer proposed: ${transferData.transferId}`,
      );
    } catch (error) {
      console.error("[EventListener] Error persisting ProposeTransfer:", error);
      throw error;
    }
  }

  /**
   * Handle AcceptTransfer event - update transfer status
   */
  private async handleAcceptTransfer(
    event: BlockchainEventDelivery & { output: AcceptTransferEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      await TransferModel.findOneAndUpdate(
        { transferId: output.termsId },
        {
          status: TransferStatus.ACCEPTED,
          mspId: this.extractMSP(event),
          blockchainTxId: event.txid,
        },
        { new: true },
      );

      console.log(`[EventListener] Transfer accepted: ${output.termsId}`);
    } catch (error) {
      console.error(
        "[EventListener] Error updating transfer acceptance:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle TransferExecuted event - finalize transfer
   */
  private async handleTransferExecuted(
    event: BlockchainEventDelivery & { output: TransferExecutedEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      await TransferModel.findOneAndUpdate(
        { transferId: output.termsId },
        {
          status: TransferStatus.EXECUTED,
          mspId: this.extractMSP(event),
          blockchainTxId: event.txid,
        },
        { new: true },
      );

      // Mark all active announcements for this package as inactive
      // since it has been transferred to a new owner
      await PackageAnnouncementModel.updateMany(
        {
          packageExternalId: output.externalId,
          isActive: true,
        },
        {
          $set: { isActive: false },
        },
      );

      console.log(`[EventListener] Transfer executed: ${output.termsId}`);
      console.log(
        `[EventListener] Marked announcements as inactive for package: ${output.externalId}`,
      );
    } catch (error) {
      console.error(
        "[EventListener] Error updating transfer execution:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle DeletePackage event - soft delete or mark as deleted
   */
  private async handleDeletePackage(
    event: BlockchainEventDelivery & { output: DeletePackageEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      // Soft delete by setting status to failed
      await PackageModel.findOneAndUpdate(
        { packageID: output.externalId },
        {
          status: "failed",
          mspId: this.extractMSP(event),
        },
        { new: true },
      );

      // Mark all active announcements for this package as inactive
      await PackageAnnouncementModel.updateMany(
        {
          packageExternalId: output.externalId,
          isActive: true,
        },
        {
          $set: { isActive: false },
        },
      );

      console.log(`[EventListener] Package deleted: ${output.externalId}`);
      console.log(
        `[EventListener] Marked announcements as inactive for deleted package: ${output.externalId}`,
      );
    } catch (error) {
      console.error("[EventListener] Error handling delete package:", error);
      throw error;
    }
  }

  /**
   * Handle PACKAGE_ANNOUNCE message - track package announcements for bidding
   */
  private async handlePackageAnnouncement(
    event: FireFlyDatatypeMessage,
  ): Promise<void> {
    try {
      // Extract MSP from signingKey (format: "MSP_ID:certificate...")
      const announcerMSP = event.signingKey.split(":")[0];
      const announcerNode = event.author;

      // The value should contain package details with an id field
      const packageExternalId = event.value.externalId;

      if (!packageExternalId) {
        console.warn(
          "[EventListener] PACKAGE_ANNOUNCE message missing package id, skipping",
        );
        return;
      }

      // Try to find the package in our database
      const pkg = await PackageModel.findOne({
        externalId: packageExternalId,
      });

      const announcementData = {
        messageId: event.id,
        messageHash: event.hash,
        packageExternalId: packageExternalId,
        packageId: pkg ? pkg._id : undefined,
        announcerMSP: announcerMSP,
        announcerNode: announcerNode,
        isActive: true,
        price: event.value.price || undefined,
        messageData: event.value,
        expiresAt: event.value.expiresAt ? event.value.expiresAt : undefined,
      } as Partial<PackageAnnouncementDocument>;

      // Upsert announcement (create or update if exists)
      await PackageAnnouncementModel.findOneAndUpdate(
        { messageId: event.id },
        announcementData,
        { upsert: true, new: true },
      );

      console.log(
        `[EventListener] Package announcement stored: ${packageExternalId} from ${announcerMSP}`,
      );
    } catch (error) {
      console.error(
        "[EventListener] Error handling package announcement:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[EventListener] Max reconnection attempts reached. Giving up.",
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[EventListener] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error("[EventListener] Reconnection failed:", error);
      }
    }, delay);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nodeMSP: this.nodeMSP,
      nodeOrg: this.nodeOrg,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("[EventListener] Shutting down...");
    this.isRunning = false;
    // The PackageService doesn't expose cleanup methods, so we just mark as not running
    console.log("[EventListener] Shutdown complete");
  }
}

// Singleton instance
const eventListenerService = new EventListenerService();

export default eventListenerService;
