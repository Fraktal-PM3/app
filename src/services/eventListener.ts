import FireFly from "@hyperledger/firefly-sdk";
import type {
  BlockchainEventDelivery,
  CreatePackageEvent,
  DeletePackageEvent,
  FireFlyDatatypeMessage,
  StatusUpdatedEvent,
  StatusUpdatedAfterProposeEvent,
  StatusUpdatedAfterAcceptEvent,
  StoreObject,
  TransferExecutedEvent,
  TransferToPM3Event,
  TransferTerms,
} from "fraktal-lib";
import { PackageService, Status, isPackageDetailsMessage } from "fraktal-lib";
import convexServerClient from "../lib/convexServerClient";

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
  private processedEventsCache: Set<string> = new Set(); // Short-lived cache for recent events
  private readonly maxCacheSize: number = 20; // Keep only last 20 events

  /**
   * Initialize the event listener service
   */
  async initialize(config: EventListenerConfig = {}): Promise<void> {
    try {
      console.log("[EventListener] Initializing...");

      // Check Convex client
      if (!convexServerClient.isInitialized()) {
        throw new Error("Convex client not initialized - check CONVEX_URL environment variable");
      }
      console.log("[EventListener] Convex client ready");

      this.fireflyInstance = new FireFly({
        host: process.env.FIREFLY_NODE_URL || "",
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
        await convexServerClient.setSystemState({
          key: "nodeMSP",
          value: this.nodeMSP,
          lastSyncTimestamp: Date.now(),
        });
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

      // Check package recipient field (important for receiving packages)
      if (output.recipientOrgMSP === this.nodeMSP) {
        return true;
      }

      // Check sender field (for packages we're sending)
      if (output.senderOrgMSP === this.nodeMSP) {
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

      // Also check nested parsedTerms object for transfer events
      if (output.parsedTerms) {
        if (
          output.parsedTerms.fromMSP === this.nodeMSP ||
          output.parsedTerms.toMSP === this.nodeMSP
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
   * Generate a unique key for an event based on transaction ID and event name
   */
  private getEventKey(transactionId: string, eventName: string): string {
    return `${transactionId}:${eventName}`;
  }

  /**
   * Check if an event has already been processed
   * Uses short-lived in-memory cache (last 20 events)
   */
  private isEventProcessed(transactionId: string, eventName: string): boolean {
    const eventKey = this.getEventKey(transactionId, eventName);

    if (this.processedEventsCache.has(eventKey)) {
      console.log(
        `[EventListener] Duplicate event detected: ${eventName} - ${transactionId}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Mark an event as processed
   * Stores in short-lived in-memory cache (last 20 events)
   */
  private markEventAsProcessed(
    event: BlockchainEventDelivery,
    eventName: string,
  ): void {
    // For blockchain events, use info.transactionId
    // For message events, use event.id
    const transactionId = event.txid;

    if (!transactionId) {
      console.warn(
        `[EventListener] Cannot mark event as processed - missing transactionId/id: ${eventName}`,
      );
      return;
    }

    const eventKey = this.getEventKey(transactionId, eventName);
    this.addToCache(eventKey);
  }

  /**
   * Add event key to in-memory cache with FIFO eviction
   * Maintains a rolling window of the last N events
   */
  private addToCache(eventKey: string): void {
    // If cache is full, remove the oldest entry (first inserted)
    if (this.processedEventsCache.size >= this.maxCacheSize) {
      const firstKey = this.processedEventsCache.values().next().value;
      if (firstKey) {
        this.processedEventsCache.delete(firstKey);
      }
    }

    this.processedEventsCache.add(eventKey);
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
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName = "CreatePackage";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        this.markEventAsProcessed(event, eventName);

        const { ownerOrgMSP, recipientOrgMSP } = event.output;

        if (ownerOrgMSP !== this.nodeMSP && recipientOrgMSP !== this.nodeMSP)
          return;

        console.log("[EventListener] CreatePackage event received: ", event);

        try {
          await this.handleCreatePackage(event);
          // Convex handles reactivity automatically - no need to emit events
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
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName = "StatusUpdated";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        this.markEventAsProcessed(event, eventName);

        const packageData = await convexServerClient.getPackageByExternalId(
          event.output.externalId
        );

        if (!packageData) {
          console.log(
            "[EventListener] Status update event discarded, found no relevant package",
          );
          return;
        }

        try {
          await this.handleStatusUpdated(event);
          // Mark event as processed after successful handling
        } catch (error) {
          console.error("[EventListener] Error handling StatusUpdated:", error);
        }
      },
    );

    // StatusUpdatedAfterPropose event
    await this.packageService.onEvent(
      "StatusUpdatedAfterPropose",
      async (
        event: BlockchainEventDelivery & {
          output: StatusUpdatedAfterProposeEvent;
        },
      ) => {
        console.log("[EventListener] StatusUpdatedAfterPropose event received");
        console.log("[EventListener] Event details: ", event);
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName =
          (event as any).info?.eventName || "StatusUpdatedAfterPropose";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        this.markEventAsProcessed(event, eventName);

        if (
          event.output.toMSP !== this.nodeMSP &&
          event.output.caller !== this.nodeMSP
        ) {
          console.log(
            "[EventListener] StatusUpdatedAfterPropose event discarded, not addressed to this MSP",
          );
          return;
        }

        try {
          await this.handleStatusUpdatedAfterPropose(event);
          // Mark event as processed after successful handling
        } catch (error) {
          console.error(
            "[EventListener] Error handling StatusUpdatedAfterPropose:",
            error,
          );
        }
      },
    );

    // StatusUpdatedAfterAccept event
    await this.packageService.onEvent(
      "StatusUpdatedAfterAccept",
      async (
        event: BlockchainEventDelivery & {
          output: StatusUpdatedAfterAcceptEvent;
        },
      ) => {
        console.log(
          "[EventListener] StatusUpdatedAfterAccept event received: ",
          event,
        );

        // Check for duplicate event
        const transactionId = event.txid;
        if (
          transactionId &&
          this.isEventProcessed(transactionId, "StatusUpdatedAfterAccept")
        ) {
          return; // Skip duplicate event
        }

        this.markEventAsProcessed(event, "StatusUpdatedAfterAccept");

        const packageData = await convexServerClient.getPackageByExternalId(
          event.output.externalId
        );

        if (!packageData) {
          console.log(
            "[EventListener] StatusUpdatedAfterAccept event discarded, found no relevant package",
          );
          return;
        }

        // Check if this MSP is involved in the package or is the caller (accepter) of the transfer
        const isInvolved =
          packageData.senderOrgMSP === this.nodeMSP ||
          packageData.recipientOrgMSP === this.nodeMSP ||
          packageData.mspId === this.nodeMSP ||
          event.output.caller === this.nodeMSP; // The one accepting the transfer

        if (!isInvolved) {
          console.log(
            "[EventListener] StatusUpdatedAfterAccept event discarded, not addressed to this MSP",
          );
          return;
        }
        try {
          await this.handleStatusUpdatedAfterAccept(event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling StatusUpdatedAfterAccept:",
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

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName = "TransferExecuted";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        const transfer = await convexServerClient.getTransferByTransferId(
          event.output.termsId
        );

        console.log("TransferExecuted - found transfer:", transfer);

        const packageData = await convexServerClient.getPackageByExternalId(
          event.output.externalId
        );

        if (!transfer && !packageData) return;

        try {
          this.markEventAsProcessed(event, eventName);
          await this.handleTransferExecuted(event);
          // Mark event as processed after successful handling
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

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName = "DeletePackage";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        if (!this.isRelevantEvent(event)) return;

        try {
          this.markEventAsProcessed(event, eventName);
          await this.handleDeletePackage(event);
        } catch (error) {
          console.error("[EventListener] Error handling DeletePackage:", error);
        }
      },
    );

    await this.packageService.onEvent(
      "TransferToPM3",
      async (
        event: BlockchainEventDelivery & { output: TransferToPM3Event },
      ) => {
        console.log("[EventListener] TransferToPM3 event received: ", event);
        if (!this.packageService) return;

        // Check for duplicate event
        const transactionId = event.txid;
        const eventName = "TransferToPM3";
        if (transactionId && this.isEventProcessed(transactionId, eventName)) {
          return; // Skip duplicate event
        }

        this.markEventAsProcessed(event, eventName);

        // Check if we are tracking the package
        const pkg = await convexServerClient.getPackageByExternalId(
          event.output.externalId
        );
        
        if (!pkg) {
          console.log(
            "[EventListener] Not tracking package, discarding TransferToPM3Event",
          );
        }
        try {
          this.handleTransferToPM3(event);
          // Mark event as processed after successful handling
        } catch (error) {
          console.error("[EventListener] Error handling TransferToPM3:", error);
        }
      },
    );

    // Message event (private messages from FireFly datatypes)
    await this.packageService.onEvent(
      "message",
      async (event: FireFlyDatatypeMessage) => {
        console.log("[EventListener] message event received: ", event);

        try {
          // Check for duplicate message using message ID
          // For messages, we use the message ID as the transaction ID
          const messageTag =
            (event as any).tag || event.header?.tag || "message";

          if (
            messageTag === "PACKAGE_ANNOUNCE" &&
            isPackageDetailsMessage(event)
          ) {
            // Handle package announcements
            console.log("[EventListener] PACKAGE_ANNOUNCE message detected");
            await this.handlePackageAnnouncement(event);
            // Mark message as processed
          } else if (messageTag === "TRANSFER_OFFER") {
            // Handle transfer offers (private messages)
            console.log("[EventListener] TRANSFER_OFFER message detected");
            await this.handleTransferOffer(event);
            // Mark message as processed
          } else {
            // Emit generic message event for other message types
            // Mark message as processed
          }
        } catch (error) {
          console.error("[EventListener] Error handling message:", error);
        }
      },
    );

    console.log("[EventListener] All event listeners registered successfully");
  }

  /**
   * Handle CreatePackage event - only emit event, DB is managed via API endpoints
   * Package is already created in DB via POST /api/packages
   */
  private async handleCreatePackage(
    event: BlockchainEventDelivery & { output: CreatePackageEvent },
  ): Promise<void> {
    try {
      const output = event.output;
      console.log(
        `[EventListener] CreatePackage event received: ${output.externalId}`,
      );

      // Check if this node's MSP is involved in the package
      const isInvolved = 
        output.senderOrgMSP === this.nodeMSP ||
        output.ownerOrgMSP === this.nodeMSP ||
        output.recipientOrgMSP === this.nodeMSP;

      if (!isInvolved) {
        console.log(
          `[EventListener] Package ${output.externalId} does not involve this MSP (${this.nodeMSP}), skipping creation`,
        );
        return;
      }

      // Check if package already exists in Convex
      const existingPackage = await convexServerClient.getPackageByExternalId(output.externalId);
      
      if (existingPackage) {
        console.log(`[EventListener] Package ${output.externalId} already exists in Convex, logging activity event`);
        
        // Still log activity event for the blockchain confirmation
        await convexServerClient.logActivityEvent({
          type: "CreatePackage",
          packageExternalId: output.externalId,
          title: `Package Confirmed on Blockchain`,
          description: `Blockchain confirmation for package ${output.externalId}`,
          newStatus: output.status,
          metadata: {
            ownerOrgMSP: output.ownerOrgMSP,
            senderOrgMSP: output.senderOrgMSP,
            recipientOrgMSP: output.recipientOrgMSP,
            blockchainConfirmed: true,
          },
        });
        
        return;
      }

      // Create package in Convex
      await convexServerClient.createPackage({
        externalId: output.externalId,
        name: output.externalId, // Use externalId as name if not provided
        recipientOrgMSP: output.recipientOrgMSP,
        ownerOrgMSP: output.ownerOrgMSP,
        senderOrgMSP: output.senderOrgMSP,
        status: output.status,
        mspId: output.ownerOrgMSP,
      });

      // Log activity event
      await convexServerClient.logActivityEvent({
        type: "CreatePackage",
        packageExternalId: output.externalId,
        title: `Package Created: ${output.externalId}`,
        description: `Status: ${output.status}`,
        newStatus: output.status,
        metadata: {
          ownerOrgMSP: output.ownerOrgMSP,
          senderOrgMSP: output.senderOrgMSP,
          recipientOrgMSP: output.recipientOrgMSP,
        },
      });

      console.log(
        `[EventListener] Package created in Convex: ${output.externalId}`,
      );
    } catch (error) {
      console.error("[EventListener] Error processing CreatePackage:", error);
      throw error;
    }
  }

  /**
   * Handle StatusUpdated event - update existing package status only
   */
  private async handleStatusUpdated(
    event: BlockchainEventDelivery & { output: StatusUpdatedEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      // Only update existing packages (don't create new ones)
      const pkg = await convexServerClient.getPackageByExternalId(output.externalId);

      if (!pkg) {
        console.warn(
          `[EventListener] Package not found for StatusUpdated event: ${output.externalId}. Skipping update.`,
        );
        return;
      }

      await convexServerClient.updatePackageStatus({
        externalId: output.externalId,
        status: output.status,
      });

      console.log(
        `[EventListener] Package status updated: ${output.externalId} -> ${output.status}`,
      );
    } catch (error) {
      console.error("[EventListener] Error updating package status:", error);
      throw error;
    }
  }

  /**
   * Handle a package being transferred to PM3, and thus the end of its lifecycle
   */
  private async handleTransferToPM3(
    event: BlockchainEventDelivery & { output: TransferToPM3Event },
  ): Promise<void> {
    try {
      if (!this.packageService) return;
      console.log(
        "[EventListener] Handling TransferToPM3 event for package:",
        event.output.externalId,
      );
      const blockchainPackage = await this.packageService.readBlockchainPackage(
        event.output.externalId,
      );

      console.log(
        "[EventListener] Event TransferToPM3 - blockchainPackage:",
        blockchainPackage,
      );

      const pkg = await convexServerClient.getPackageByExternalId(event.output.externalId);
      
      if (pkg) {
        await convexServerClient.updatePackageStatus({
          externalId: event.output.externalId,
          status: blockchainPackage.status,
          ownerOrgMSP: blockchainPackage.ownerOrgMSP,
        });
      }
    } catch (error) {
      console.error(
        `[EventListener] Error when transfering package to PM3: ${error}`,
      );
    }
  }

  /**
   * Handle TransferExecuted event - finalize transfer (transfer must exist)
   */
  private async handleTransferExecuted(
    event: BlockchainEventDelivery & { output: TransferExecutedEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

      console.log("handleTransferExecuted event:", event);
      
      if (output.newOwner === this.nodeMSP) {
        const blockchainPackage =
          await this.packageService.readBlockchainPackage(output.externalId);
        console.log("Fetched blockchain package:", blockchainPackage);
        
        const packageDetailsAndPII =
          (await this.packageService.readPackageDetailsAndPII(
            output.externalId,
          )) as StoreObject;
        console.log("Fetched package details and PII:", packageDetailsAndPII);
        
        // Create or update package with full details
        await convexServerClient.createPackage({
          externalId: output.externalId,
          name: output.externalId,
          recipientOrgMSP: blockchainPackage.recipientOrgMSP,
          ownerOrgMSP: output.newOwner,
          senderOrgMSP: blockchainPackage.senderOrgMSP,
          status: blockchainPackage.status,
          mspId: this.nodeMSP,
          packageDetails: packageDetailsAndPII.packageDetails,
          pii: packageDetailsAndPII.pii,
          salt: packageDetailsAndPII.salt,
        });
      } else {
        const blockchainPackage =
          await this.packageService.readBlockchainPackage(output.externalId);
        
        await convexServerClient.updatePackageStatus({
          externalId: output.externalId,
          status: blockchainPackage.status,
          ownerOrgMSP: output.newOwner,
          termsId: output.termsId,
        });
      }

      // Update transfer status
      const transfer = await convexServerClient.getTransferByTransferId(output.termsId);
      
      if (transfer) {
        await convexServerClient.updateTransferStatus({
          transferId: output.termsId,
          status: "executed",
          blockchainTxId: event.txid,
        });

        // Log activity event for transfer execution
        await convexServerClient.logActivityEvent({
          type: "TransferExecuted",
          packageExternalId: output.externalId,
          title: "Transfer Executed",
          description: `Transfer ${output.termsId} executed - ownership transferred to ${output.newOwner}`,
          oldStatus: "accepted",
          newStatus: "executed",
          metadata: {
            transferId: output.termsId,
            newOwner: output.newOwner,
            fromMSP: transfer.fromMSP,
            toMSP: transfer.toMSP,
            blockchainTxId: event.txid,
          },
        });
      }

      // Deactivate announcements for this package
      await convexServerClient.deactivateAnnouncements({
        packageExternalId: output.externalId,
      });

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
   * Handle DeletePackage event - soft delete existing packages only
   */
  private async handleDeletePackage(
    event: BlockchainEventDelivery & { output: DeletePackageEvent },
  ): Promise<void> {
    try {
      const output = event.output;

      // Soft delete by setting status to failed (only if package exists)
      const pkg = await convexServerClient.getPackageByExternalId(output.externalId);
      
      if (!pkg) {
        console.warn(
          `[EventListener] Package not found for DeletePackage event: ${output.externalId}. Skipping delete.`,
        );
        return;
      }

      await convexServerClient.updatePackageStatus({
        externalId: output.externalId,
        status: "failed",
      });

      // Mark all active announcements for this package as inactive
      await convexServerClient.deactivateAnnouncements({
        packageExternalId: output.externalId,
      });

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
      const packageExternalId = event.value.externalId || event.value.id;

      if (!packageExternalId) {
        console.warn(
          "[EventListener] PACKAGE_ANNOUNCE message missing package id, skipping",
        );
        return;
      }

      // Create announcement
      await convexServerClient.createAnnouncement({
        messageId: event.id,
        messageHash: event.hash,
        packageExternalId: packageExternalId,
        announcerMSP: announcerMSP,
        announcerNode: announcerNode,
        isActive: true,
        price: event.value.price || undefined,
        messageData: event.value,
        packageDetails: event.value,
        expiresAt: event.value.expiresAt ? new Date(event.value.expiresAt).getTime() : undefined,
      });

      // Log activity event for announcement
      await convexServerClient.logActivityEvent({
        type: "PackageAnnouncement",
        packageExternalId: packageExternalId,
        title: "Package Announced",
        description: `Package announced by ${announcerMSP}`,
        metadata: {
          announcerMSP: announcerMSP,
          announcerNode: announcerNode,
          price: event.value.price,
          messageId: event.id,
        },
      });

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
   * Handle TRANSFER_OFFER message - store transfer offer in DB
   */
  private async handleTransferOffer(
    event: FireFlyDatatypeMessage,
  ): Promise<void> {
    try {
      const senderNode = event.author;

      // The value should contain transfer offer details
      const offerValue = event.value;

      if (!offerValue || !offerValue.externalPackageId) {
        console.warn(
          "[EventListener] TRANSFER_OFFER message missing package id, skipping",
        );
        return;
      }

      // Try to find the active announcement for this package
      const announcements = await convexServerClient.getAnnouncementsByPackage(
        offerValue.externalPackageId
      );
      const activeAnnouncement = announcements.find((a: any) => a.isActive);

      await convexServerClient.createOffer({
        messageId: event.id,
        messageHash: event.hash,
        externalPackageId: offerValue.externalPackageId,
        fromMSP: offerValue.fromMSP,
        toMSP: offerValue.toMSP,
        price: offerValue.price,
        expiryISO: offerValue.expiryISO,
        senderNode: senderNode,
        signingKey: event.signingKey,
        announcementMessageId: activeAnnouncement?.messageId,
        messageData: offerValue,
      });

      // Log activity event for offer
      await convexServerClient.logActivityEvent({
        type: "TransferOffer",
        packageExternalId: offerValue.externalPackageId,
        title: `Transfer Offer: $${offerValue.price}`,
        description: `Offer from ${offerValue.fromMSP} to ${offerValue.toMSP}`,
        metadata: {
          fromMSP: offerValue.fromMSP,
          toMSP: offerValue.toMSP,
          price: offerValue.price,
          expiryISO: offerValue.expiryISO,
          messageId: event.id,
        },
      });

      console.log(
        `[EventListener] Transfer offer stored: ${offerValue.externalPackageId} from ${offerValue.fromMSP} with price ${offerValue.price}`,
      );
    } catch (error) {
      console.error("[EventListener] Error handling transfer offer:", error);
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
   * Handle StatusUpdatedAfterPropose event - update package status after transfer proposal
   */
  private async handleStatusUpdatedAfterPropose(
    event: BlockchainEventDelivery & { output: StatusUpdatedAfterProposeEvent },
  ): Promise<void> {
    try {
      const output = event.output;
      console.log(
        "[EventListener] Handling StatusUpdatedAfterPropose for package:",
        output.externalId,
      );

      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

      // Check if package exists
      let pkg = await convexServerClient.getPackageByExternalId(output.externalId);
      
      if (!pkg) {
        console.log(
          `[EventListener] Package ${output.externalId} not found - creating from blockchain and announcement data`,
        );
        
        // Fetch package from blockchain
        const blockchainPackage = await this.packageService.readBlockchainPackage(output.externalId);
        
        // Try to fetch announcement for additional details
        const announcements = await convexServerClient.getAnnouncementsByPackage(output.externalId);
        const announcement = announcements.find((a: any) => a.isActive);
        
        // Extract and clean packageDetails from announcement (remove extra fields like id, price)
        let cleanedPackageDetails = undefined;
        if (announcement?.packageDetails) {
          const details = announcement.packageDetails;
          cleanedPackageDetails = {
            pickupLocation: details.pickupLocation,
            dropLocation: details.dropLocation,
            size: details.size,
            weightKg: details.weightKg,
            urgency: details.urgency,
          };
        }
        
        // Create package with all available information
        await convexServerClient.createPackage({
          externalId: output.externalId,
          name: announcement?.packageDetails?.name || output.externalId,
          recipientOrgMSP: blockchainPackage.recipientOrgMSP,
          ownerOrgMSP: blockchainPackage.ownerOrgMSP,
          senderOrgMSP: blockchainPackage.senderOrgMSP,
          status: output.status,
          mspId: blockchainPackage.ownerOrgMSP,
          packageDetails: cleanedPackageDetails,
        });
        
        console.log(`[EventListener] Package ${output.externalId} created from proposal`);
        
        // Refetch the package
        pkg = await convexServerClient.getPackageByExternalId(output.externalId);
      } else {
        // Update package status if it already exists
        await convexServerClient.updatePackageStatus({
          externalId: output.externalId,
          status: output.status,
        });
      }

      // Get offer for price
      const offer = await convexServerClient.getOfferByPackage(output.externalId);

      const transferTerms: TransferTerms = {
        externalPackageId: output.externalId,
        fromMSP: output.caller,
        toMSP: output.toMSP,
        expiryISO: output.expiryISO,
        price: offer?.price || 0,
      };

      // Create/update transfer
      await convexServerClient.createTransfer({
        transferId: output.termsId,
        externalId: output.externalId,
        fromMSP: transferTerms.fromMSP,
        toMSP: transferTerms.toMSP,
        price: transferTerms.price,
        status: "proposed",
        mspId: output.caller,
      });

      // Log activity event for transfer proposal
      await convexServerClient.logActivityEvent({
        type: "StatusUpdatedAfterPropose",
        packageExternalId: output.externalId,
        title: "Transfer Proposed",
        description: `From ${transferTerms.fromMSP} to ${transferTerms.toMSP}`,
        newStatus: "proposed",
        metadata: {
          transferId: output.termsId,
          fromMSP: transferTerms.fromMSP,
          toMSP: transferTerms.toMSP,
          price: transferTerms.price,
        },
      });

      console.log(
        `[EventListener] Transfer ${output.termsId} updated with status proposed`,
      );

      // Auto-accept if we are the toMSP (transporter) or recipientOrgMSP (final recipient)
      const shouldAutoAccept = transferTerms.toMSP === this.nodeMSP

      if (shouldAutoAccept) {
        console.log(
          `[EventListener] Auto-accepting transfer ${output.termsId} (toMSP: ${transferTerms.toMSP}, our MSP: ${this.nodeMSP}, recipientOrgMSP: ${pkg?.recipientOrgMSP})`,
        );
        
        // If we're a transporter (not final recipient), use the offer price
        if (pkg && pkg.recipientOrgMSP !== this.nodeMSP) {
          transferTerms.price = offer?.price || transferTerms.price;
        }
        
        await this.packageService.acceptTransfer(
          output.externalId,
          output.termsId,
          transferTerms,
        );
        await this.packageService.updateStatusAfterAccept(
          output.externalId,
          output.termsId,
        );
      }

      console.log(
        `[EventListener] Package ${output.externalId} status updated to ${output.status} after propose`,
      );
    } catch (error) {
      console.error(
        "[EventListener] Error handling StatusUpdatedAfterPropose:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle StatusUpdatedAfterAccept event - update package status after transfer acceptance
   */
  private async handleStatusUpdatedAfterAccept(
    event: BlockchainEventDelivery & { output: StatusUpdatedAfterAcceptEvent },
  ): Promise<void> {
    try {
      const output = event.output;
      console.log(
        "[EventListener] Handling StatusUpdatedAfterAccept for package:",
        output.externalId,
      );

      // Update package status
      const packageData = await convexServerClient.getPackageByExternalId(output.externalId);

      if (!packageData) {
        console.warn(
          `[EventListener] Package not found for StatusUpdatedAfterAccept event: ${output.externalId}. Skipping update.`,
        );
        return;
      }

      await convexServerClient.updatePackageStatus({
        externalId: output.externalId,
        status: output.status,
      });

      console.log(
        `[EventListener] Package ${output.externalId} status updated to ${output.status} after accept`,
      );

      // Update transfer status
      const transfer = await convexServerClient.getTransferByTransferId(output.termsId);
      
      if (!transfer) {
        console.warn(
          `[EventListener] Transfer not found for StatusUpdatedAfterAccept event: ${output.termsId}. Skipping update.`,
        );
        return;
      }

      await convexServerClient.updateTransferStatus({
        transferId: output.termsId,
        status: "accepted",
      });

      // Log activity event for transfer acceptance
      await convexServerClient.logActivityEvent({
        type: "StatusUpdatedAfterAccept",
        packageExternalId: output.externalId,
        title: "Transfer Accepted",
        description: `Transfer ${output.termsId} accepted`,
        oldStatus: "proposed",
        newStatus: "accepted",
        metadata: {
          transferId: output.termsId,
          fromMSP: transfer.fromMSP,
          toMSP: transfer.toMSP,
        },
      });

      if (
        transfer.toMSP === packageData.recipientOrgMSP &&
        transfer.fromMSP === this.nodeMSP
      ) {
        console.log(
          `[EventListener] Executing transfer ${output.termsId} to recipient`,
        );
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }
        const storeObject = await this.packageService.readPackageDetailsAndPII(
          output.externalId,
        );
        const transferTerms =
          await this.packageService.readPrivateTransferTerms(
            output.externalId,
            output.termsId,
          );

        await this.packageService.executeTransfer(
          output.externalId,
          output.termsId,
          storeObject as any,
          transferTerms as TransferTerms,
        );
      }

      console.log(
        `[EventListener] Transfer ${output.termsId} marked as accepted`,
      );
    } catch (error) {
      console.error(
        "[EventListener] Error handling StatusUpdatedAfterAccept:",
        error,
      );
      throw error;
    }
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
