import FireFly from "@hyperledger/firefly-sdk";
import type {
  AcceptTransferEvent,
  BlockchainEventDelivery,
  CreatePackageEvent,
  DeletePackageEvent,
  FireFlyDatatypeMessage,
  ProposeTransferEvent,
  StatusUpdatedEvent,
  TransferExecutedEvent,
} from "fraktal-lib";
import { PackageService, Status, isPackageDetailsMessage } from "fraktal-lib";
import dbConnect from "../lib/dbService";
import eventBus from "../lib/eventBus";
import PackageModel from "../models/package";
import PackageAnnouncementModel, {
  PackageAnnouncementDocument,
} from "../models/packageAnnouncement";
import SystemStateModel from "../models/systemState";
import TransferModel from "../models/transfer";
import TransferOfferModel from "../models/transferOffer";

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
        `[EventListener] Successfully initialized. Node MSP: ${this.nodeMSP}`
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
          `[EventListener] Detected node MSP: ${this.nodeMSP}, ${this.nodeOrg}`
        );
      } else {
        console.warn(
          "[EventListener] Could not extract MSP from verifier or node org identity, will process all events"
        );
        this.nodeMSP = null;
      }
    } catch (error) {
      console.error("[EventListener] Failed to fetch node identity:", error);
      console.warn(
        "[EventListener] Continuing without MSP filtering (will process all events)"
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
          { upsert: true, new: true }
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
    event: BlockchainEventDelivery | FireFlyDatatypeMessage
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
        `[EventListener] Filtering out event - no matching MSP fields (ours: ${this.nodeMSP})`
      );
      return false;
    }

    // For FireFly datatype messages, check signingKey
    if ("signingKey" in event && event.signingKey) {
      const eventMSP = event.signingKey.split(":")[0];
      const isRelevant = eventMSP === this.nodeMSP;

      if (!isRelevant) {
        console.log(
          `[EventListener] Filtering out message from MSP: ${eventMSP} (ours: ${this.nodeMSP})`
        );
      }

      return isRelevant;
    }

    // If we can't determine, log and accept to be safe
    console.warn(
      "[EventListener] Could not determine event MSP, accepting event"
    );
    return true;
  }

  /**
   * Extract MSP ID from an event
   * - For blockchain events: Use the caller field from output
   * - For messages: Extract from signingKey field (before first ":")
   */
  private extractMSP(
    event: BlockchainEventDelivery | FireFlyDatatypeMessage
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
        event: BlockchainEventDelivery & { output: CreatePackageEvent }
      ) => {
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }

        const { ownerOrgMSP, recipientOrgMSP } = event.output;

        if (ownerOrgMSP !== this.nodeMSP && recipientOrgMSP !== this.nodeMSP)
          return;

        console.log("[EventListener] CreatePackage event received: ", event);

        try {
          await this.handleCreatePackage(event);
          eventBus.emitBlockchainEvent("CreatePackage", event);
        } catch (error) {
          console.error("[EventListener] Error handling CreatePackage:", error);
        }
      }
    );

    // StatusUpdated event
    await this.packageService.onEvent(
      "StatusUpdated",
      async (
        event: BlockchainEventDelivery & { output: StatusUpdatedEvent }
      ) => {
        console.log("[EventListener] StatusUpdated event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleStatusUpdated(event);
          eventBus.emitBlockchainEvent("StatusUpdated", event);
        } catch (error) {
          console.error("[EventListener] Error handling StatusUpdated:", error);
        }
      }
    );

    // ProposeTransfer event
    await this.packageService.onEvent(
      "ProposeTransfer",
      async (
        event: BlockchainEventDelivery & { output: ProposeTransferEvent }
      ) => {
        console.log("[EventListener] ProposeTransfer event received");
        console.log("[EventListener] Event details: ", event);
        if (!this.packageService) {
          throw new Error("PackageService not initialized");
        }

        const { recipientOrgMSP } =
          await this.packageService.readBlockchainPackage(
            event.output.externalId,
          );

        if (
          event.output.parsedTerms.toMSP !== this.nodeMSP &&
          event.output.parsedTerms.fromMSP !== this.nodeMSP &&
          recipientOrgMSP !== this.nodeMSP
        )
          return;

        try {
           if (process.env.NEXT_PUBLIC_RECEIVER === "TRUE" && event.output.price === 0) {
            await this.handleProposeTransferRecive(event);
          } else { 
            await this.handleProposeTransfer(event);
          }
          eventBus.emitBlockchainEvent("ProposeTransfer", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling ProposeTransfer:",
            error
          );
        }
      }
    );

    // AcceptTransfer event
    await this.packageService.onEvent(
      "AcceptTransfer",
      async (
        event: BlockchainEventDelivery & { output: AcceptTransferEvent }
      ) => {
        console.log("[EventListener] AcceptTransfer event received: ", event);

        await dbConnect();

        const transfer = await TransferModel.findOne({
          transferId: event.output.termsId,
        });

        if (!transfer) return;

        try {
          await this.handleAcceptTransfer(event);
          eventBus.emitBlockchainEvent("AcceptTransfer", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling AcceptTransfer:",
            error
          );
        }
      }
    );

    // TransferExecuted event (note: fraktal-lib uses "TransferExecuted" not "ExecuteTransfer")
    await this.packageService.onEvent(
      "TransferExecuted",
      async (
        event: BlockchainEventDelivery & { output: TransferExecutedEvent }
      ) => {
        console.log("[EventListener] TransferExecuted event received: ", event);

        const transfer = await TransferModel.findOne({
          transferId: event.output.termsId,
        });

        console.log("TransferExecuted - found transfer:", transfer);

        if (!transfer) return;

        try {
          await this.handleTransferExecuted(event);
          eventBus.emitBlockchainEvent("TransferExecuted", event);
        } catch (error) {
          console.error(
            "[EventListener] Error handling TransferExecuted:",
            error
          );
        }
      }
    );

    // DeletePackage event
    await this.packageService.onEvent(
      "DeletePackage",
      async (
        event: BlockchainEventDelivery & { output: DeletePackageEvent }
      ) => {
        console.log("[EventListener] DeletePackage event received: ", event);

        if (!this.isRelevantEvent(event)) return;

        try {
          await this.handleDeletePackage(event);
          eventBus.emitBlockchainEvent("DeletePackage", event);
        } catch (error) {
          console.error("[EventListener] Error handling DeletePackage:", error);
        }
      }
    );

    // Message event (private messages from FireFly datatypes)
    await this.packageService.onEvent(
      "message",
      async (event: FireFlyDatatypeMessage) => {
        console.log("[EventListener] message event received: ", event);

        try {
          // Check message tag to determine message type
          const messageTag = (event as any).tag || event.header?.tag;

          if (
            messageTag === "PACKAGE_ANNOUNCE" &&
            isPackageDetailsMessage(event)
          ) {
            // Handle package announcements
            console.log("[EventListener] PACKAGE_ANNOUNCE message detected");
            await this.handlePackageAnnouncement(event);
            eventBus.emitBlockchainEvent("PackageAnnouncement", event);
          } else if (messageTag === "TRANSFER_OFFER") {
            // Handle transfer offers (private messages)
            console.log("[EventListener] TRANSFER_OFFER message detected");
            await this.handleTransferOffer(event);
            eventBus.emitBlockchainEvent("TransferOffer", event);
          } else {
            // Emit generic message event for other message types
            eventBus.emitBlockchainEvent("message", event);
          }
        } catch (error) {
          console.error("[EventListener] Error handling message:", error);
        }
      }
    );

    console.log("[EventListener] All event listeners registered successfully");
  }

  /**
   * Handle CreatePackage event - only emit event, DB is managed via API endpoints
   * Package is already created in DB via POST /api/packages
   */
  private async handleCreatePackage(
    event: BlockchainEventDelivery & { output: CreatePackageEvent }
  ): Promise<void> {
    try {
      const output = event.output;
      console.log(
        `[EventListener] CreatePackage event processed (DB not modified): ${output.externalId}`
      );
      // Just log the event - DB modifications are handled exclusively via API endpoints
      // Package creation in DB: POST /api/packages
      // Package blockchain submission: POST /api/packages/create
    } catch (error) {
      console.error("[EventListener] Error processing CreatePackage:", error);
      throw error;
    }
  }

  /**
   * Handle StatusUpdated event - update existing package status only
   */
  private async handleStatusUpdated(
    event: BlockchainEventDelivery & { output: StatusUpdatedEvent }
  ): Promise<void> {
    try {
      const output = event.output;

      // Only update existing packages (don't create new ones)
      const updated = await PackageModel.findOneAndUpdate(
        { id: output.externalId },
        {
          status: output.status,
          mspId: this.extractMSP(event),
        },
        { new: true }
      );

      if (!updated) {
        console.warn(
          `[EventListener] Package not found for StatusUpdated event: ${output.externalId}. Skipping update.`
        );
        return;
      }

      console.log(
        `[EventListener] Package status updated: ${output.externalId} -> ${output.status}`
      );
    } catch (error) {
      console.error("[EventListener] Error updating package status:", error);
      throw error;
    }
  }

  /**
   * Automatically accept a transfer proposal if it's directed to our node
   */
  private async autoAcceptTransferIfRelevant(
    output: ProposeTransferEvent,
    activeAnnouncement: PackageAnnouncementDocument | null,
  ): Promise<void> {
    // Handle both 'terms' (library type) and 'parsedTerms' (actual runtime data)
    const terms = (output as any).parsedTerms || output.terms;

    if (!terms) {
      console.log(
        "[EventListener] No terms found in ProposeTransferEvent, skipping auto-accept",
      );
      return;
    }

    if (!this.nodeMSP || terms.toMSP !== this.nodeMSP) {
      console.log(
        `[EventListener] Transfer not directed to our node (toMSP: ${terms.toMSP}, ourMSP: ${this.nodeMSP}), skipping auto-accept`,
      );
      return;
    }

    console.log(
      `[EventListener] Transfer ${output.termsId} is directed to our node, proceeding with auto-accept`,
    );

    // Update announcement status if exists
    if (activeAnnouncement) {
      await PackageAnnouncementModel.findByIdAndUpdate(
        activeAnnouncement._id,
        { transferStatus: "accepted" },
        { new: true },
      );
      console.log(
        `[EventListener] Updated announcement ${activeAnnouncement._id} transferStatus to 'accepted'`,
      );
    }

    // Automatically accept the transfer proposal
    try {
      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

      console.log(
        `[EventListener] Auto-accepting transfer proposal ${output.termsId} for package ${output.externalId}`,
      );
      console.log(
        `[EventListener] Auto-accepting transfer proposal ${output.termsId} for package ${output.externalId}`,
      );

      // As the recipient (toMSP), we need to read the private transfer terms
      // that were shared with us during the proposal
      console.log(
        `[EventListener] We are the recipient (${terms.toMSP}), reading private transfer terms`,
      );
      const privateTransferTerms = await this.packageService.readPrivateTransferTerms(
        output.termsId
      );
      console.log(
        `[EventListener] Retrieved private transfer terms for ${output.termsId}:`,
        JSON.stringify(privateTransferTerms, null, 2)
      );

      // Accept the transfer (not propose - it's already proposed!)
      await this.packageService.acceptTransfer(
        output.externalId,
        output.termsId,
        privateTransferTerms as any,
      );

      console.log(
        `[EventListener] Successfully auto-accepted transfer ${output.termsId}`,
      );
    } catch (acceptError: any) {
      // Check if error is about already proposed status
      if (acceptError?.message?.includes("already in PROPOSED status")) {
        console.log(
          `[EventListener] Transfer ${output.termsId} already proposed, this is expected during auto-accept`,
        );
      } else {
        console.error(
          `[EventListener] Failed to auto-accept transfer ${output.termsId}:`,
          acceptError,
        );
      }
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
      console.log(
        "[EventListener] Handling ProposeTransfer for package:",
        output.externalId,
        event,
      );
      console.log("handleProposeTransfer - output:", output);

      const transferData: Record<string, any> = {
        transferId: output.termsId,
        externalId: output.externalId,
        fromMSP: output.parsedTerms.fromMSP,
        toMSP: output.parsedTerms.toMSP,
        status: output.status,
        mspId: this.extractMSP(event) || "",
        blockchainTxId: event.txid,
        blockchainData: output,
      };

      // Link transfer to active announcement for this package
      const activeAnnouncement = await PackageAnnouncementModel.findOne({
        packageExternalId: output.externalId,
        isActive: true,
      }).sort({ createdAt: -1 });

      await PackageModel.findOneAndUpdate(
        { id: output.externalId },
        { status: output.status },
      );

      if (activeAnnouncement) {
        transferData.announcementMessageId = activeAnnouncement.messageId;
        console.log(
          `[EventListener] Linked transfer ${transferData.transferId} to announcement ${activeAnnouncement.messageId}`,
        );
      }

      // Persist transfer record
      await TransferModel.findOneAndUpdate(
        { transferId: transferData.transferId },
        transferData,
        { upsert: true, new: true },
      );

      console.log(
        `[EventListener] Transfer proposed and persisted: ${transferData.transferId}`,
      );
      
      // Auto-accept transfer if it's directed to our node
      await this.autoAcceptTransferIfRelevant(output, activeAnnouncement);
    } catch (error) {
      console.error("[EventListener] Error persisting ProposeTransfer:", error);
      throw error;
    }
  }

  /**
 * Handle ProposeTransfer event for receiver nodes - only accept free transfers (price = 0)
 */
  private async handleProposeTransferRecive(
    event: BlockchainEventDelivery & { output: ProposeTransferEvent },
  ): Promise<void> {
    try {
      const output = event.output;
      console.log("[EventListener] Processing ProposeTransfer event for receiver:", JSON.stringify(output, null, 2));
      
      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

            console.log(
              `[EventListener] Auto-accepting transfer proposal ${output.termsId} for package ${output.externalId}`
            );

            // Retrieve the private transfer terms (includes salt and price)
            const privateTransferTerms =
              await this.packageService.readPrivateTransferTerms(
                output.termsId,
              );


      console.log(
        `[EventListener] Retrieved private transfer terms for ${output.termsId}:`,
        JSON.stringify(privateTransferTerms, null, 2)
      );

      // Only process transfers with price = 0 (receiver nodes only accept free transfers)
      if (privateTransferTerms.price !== 0 && privateTransferTerms.price !== "0") {
        console.log(
          `[EventListener] Receiver node ignoring transfer with price ${privateTransferTerms.price} (only accepting price = 0)`,
        );
        return;
      }

      

      // Handle both 'terms' (library type) and 'parsedTerms' (actual runtime data)
      const terms = (output as any).parsedTerms || output.terms;

      if (!terms) {
        console.error("[EventListener] ProposeTransfer event missing terms/parsedTerms:", output);
        throw new Error("ProposeTransfer event missing terms data");
      }

      

      console.log(
        `[EventListener] Receiver node processing free transfer (price = 0) for package ${output.externalId}`,
      );

      // Find package by id and link it (optional - package may not be in local DB)
      const pkg = await PackageModel.findOne({
        id: output.externalId,
      });

      if (!pkg) {
        console.log(
          `[EventListener] ProposeTransfer for package ${output.externalId} - package not in local DB (likely from another node's announcement)`,
        );
      }

      const transferData: Record<string, any> = {
        transferId: output.termsId,
        externalId: output.externalId,
        fromMSP: terms.fromMSP,
        toMSP: terms.toMSP,
        status: Status.PROPOSED,
        mspId: this.extractMSP(event) || "",
        blockchainTxId: event.txid,
        blockchainData: output,
      };

      // Link to package if it exists locally
      if (pkg) {
        transferData.packageId = pkg._id;
      }

      // Link transfer to active announcement for this package
      const activeAnnouncement = await PackageAnnouncementModel.findOne({
        packageExternalId: output.externalId,
        isActive: true,
      }).sort({ createdAt: -1 });

      if (activeAnnouncement) {
        transferData.announcementMessageId = activeAnnouncement.messageId;
        console.log(
          `[EventListener] Linked transfer ${transferData.transferId} to announcement ${activeAnnouncement.messageId}`,
        );
      }

      // Persist transfer record
      await TransferModel.findOneAndUpdate(
        { transferId: transferData.transferId },
        transferData,
        { upsert: true, new: true },
      );

      console.log(
        `[EventListener] Free transfer proposed and persisted: ${transferData.transferId}`,
      );

      if (!this.nodeMSP || terms.recipientMSP !== this.nodeMSP) {
        console.log(
          `[EventListener] Transfer not directed to our node (toMSP: ${terms.recipientMSP}, ourMSP: ${this.nodeMSP}), skipping auto-accept`,
        );
        return;
    }

      // Auto-accept the free transfer
      await this.autoAcceptTransferIfRelevant(output, activeAnnouncement);
    } catch (error) {
      console.error("[EventListener] Error persisting ProposeTransfer:", error);
      throw error;
    }
  }

  /**
   * Handle AcceptTransfer event - update transfer status (transfer must exist)
   */
  private async handleAcceptTransfer(
    event: BlockchainEventDelivery & { output: AcceptTransferEvent }
  ): Promise<void> {
    try {
      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

      const output = event.output;
      const blockchainPackage = await this.packageService.readBlockchainPackage(output.externalId);

      if (!blockchainPackage) {
        throw new Error(`Blockchain package not found: ${output.externalId}`);
      }

      console.log("handleAcceptTransfer output:", output);

      const updated = await TransferModel.findOneAndUpdate(
        { transferId: output.termsId },
        {
          status: blockchainPackage.status,
          mspId: this.extractMSP(event),
          blockchainTxId: event.txid,
        },
        { new: true },
      );

      await PackageModel.findOneAndUpdate(
        { id: output.externalId },
        { status: blockchainPackage.status },
      );

      if (!updated) {
        console.warn(
          `[EventListener] Transfer not found for AcceptTransfer event: ${output.termsId}. Skipping update.`
        );
        return;
      }

      console.log(`[EventListener] Transfer accepted: ${output.termsId}`);
    } catch (error) {
      console.error(
        "[EventListener] Error updating transfer acceptance:",
        error
      );
      throw error;
    }
  }

  /**
   * Handle TransferExecuted event - finalize transfer (transfer must exist)
   */
  private async handleTransferExecuted(
    event: BlockchainEventDelivery & { output: TransferExecutedEvent }
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
          await this.packageService.readPackageDetailsAndPII(output.externalId);
        console.log("Fetched package details and PII:", packageDetailsAndPII);
        await PackageModel.findOneAndUpdate(
          { id: output.externalId },
          {
            ...blockchainPackage,
            ...packageDetailsAndPII,
            mspId: this.nodeMSP,
            name: output.externalId,
            id: output.externalId,
          },
          { new: true, upsert: true },
        );
      } else {
        const blockchainPackage =
          await this.packageService.readBlockchainPackage(output.externalId);
        await PackageModel.findOneAndUpdate(
          { id: output.externalId },
          {
            ...blockchainPackage,
            mspId: output.newOwner, // Update owner to the new owner
          },
          { new: true },
        );
      }

      const executed = await TransferModel.findOneAndUpdate(
        { transferId: output.termsId },
        {
          status: event.output.status,
          mspId: this.extractMSP(event),
          blockchainTxId: event.txid,
        },
        { new: true }
      );

      if (!executed) {
        console.warn(
          `[EventListener] Transfer not found for TransferExecuted event: ${output.termsId}. Skipping update.`
        );
        return;
      }

      // Mark all active announcements for this package as inactive
      // since it has been transferred to a new owner
      await PackageAnnouncementModel.updateMany(
        {
          packageExternalId: output.externalId,
          isActive: true,
        },
        {
          $set: { isActive: false },
        }
      );

      console.log(`[EventListener] Transfer executed: ${output.termsId}`);
      console.log(
        `[EventListener] Marked announcements as inactive for package: ${output.externalId}`
      );

      // Check if I'm the transporter (the one who executed the transfer)
      if (this.nodeMSP && executed.toMSP === this.nodeMSP) {
        console.log(
          `[EventListener] I am the transporter who executed transfer ${output.termsId}. Proposing transfer to recipient...`
        );
        await this.proposeTransferToRecipient(
          output.externalId,
          output.termsId
        );
      }
    } catch (error) {
      console.error(
        "[EventListener] Error updating transfer execution:",
        error
      );
      throw error;
    }
  }

  /**
   * Propose a new transfer to the recipient
   */
  private async proposeTransferToRecipient(
    externalId: string,
    termsId: string
  ): Promise<void> {
    try {
      if (!this.packageService) {
        throw new Error("PackageService not initialized");
      }

      // Get package from database to find recipientMSP
      const pkg = await this.packageService.readBlockchainPackage(externalId);

      if (!pkg || !pkg.recipientOrgMSP) {
        console.error(
          `[EventListener] Could not find package or recipient MSP for ${externalId}. Cannot propose transfer to recipient.`
        );
        return;
      }

      // Read private transfer terms to get the salt
      const transferTerms = await this.packageService.readPrivateTransferTerms(
        termsId
      );

      if (!transferTerms || !transferTerms.salt) {
        console.error(
          `[EventListener] Could not read transfer terms for ${termsId}. Cannot propose transfer.`
        );
        return;
      }

      // Propose a new transfer to the recipient using fraktal-lib
      console.log(
        `[EventListener] Proposing new transfer to recipient ${pkg.recipientOrgMSP} for package ${externalId}...`
      );

      const terms = {
        price: 0,
        id: crypto.randomUUID(),
        salt: transferTerms.salt,
      };

      const proposeResult = await this.packageService.proposeTransfer(
        externalId,
        pkg.recipientOrgMSP,
        terms as any, // Type assertion needed - fraktal-lib types don't include salt property
        new Date(Date.now() + 24 * 7 * 60 * 60 * 1000).toISOString() // 7 days expiry
      );

      console.log(
        `[EventListener] Transfer proposed to recipient successfully: ${JSON.stringify(
          proposeResult
        )}`
      );
    } catch (error) {
      console.error(
        "[EventListener] Error proposing transfer to recipient:",
        error
      );
      // Don't throw - we don't want to break the event listener
    }
  }

  /**
   * Handle DeletePackage event - soft delete existing packages only
   */
  private async handleDeletePackage(
    event: BlockchainEventDelivery & { output: DeletePackageEvent }
  ): Promise<void> {
    try {
      const output = event.output;

      // Soft delete by setting status to failed (only if package exists)
      const deleted = await PackageModel.findOneAndUpdate(
        { id: output.externalId },
        {
          status: "failed",
          mspId: this.extractMSP(event),
        },
        { new: true }
      );

      if (!deleted) {
        console.warn(
          `[EventListener] Package not found for DeletePackage event: ${output.externalId}. Skipping delete.`
        );
        return;
      }

      // Mark all active announcements for this package as inactive
      await PackageAnnouncementModel.updateMany(
        {
          packageExternalId: output.externalId,
          isActive: true,
        },
        {
          $set: { isActive: false },
        }
      );

      console.log(`[EventListener] Package deleted: ${output.externalId}`);
      console.log(
        `[EventListener] Marked announcements as inactive for deleted package: ${output.externalId}`
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
    event: FireFlyDatatypeMessage
  ): Promise<void> {
    try {
      // Extract MSP from signingKey (format: "MSP_ID:certificate...")
      const announcerMSP = event.signingKey.split(":")[0];
      const announcerNode = event.author;

      // The value should contain package details with an id field
      const packageExternalId = event.value.externalId || event.value.id;

      if (!packageExternalId) {
        console.warn(
          "[EventListener] PACKAGE_ANNOUNCE message missing package id, skipping"
        );
        return;
      }

      // Try to find the package in our database
      const pkg = await PackageModel.findOne({
        id: packageExternalId,
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
        packageDetails: event.value,
        expiresAt: event.value.expiresAt ? event.value.expiresAt : undefined,
      } as Partial<PackageAnnouncementDocument>;

      // Upsert announcement (create or update if exists)
      await PackageAnnouncementModel.findOneAndUpdate(
        { messageId: event.id },
        announcementData,
        { upsert: true, new: true }
      );

      console.log(
        `[EventListener] Package announcement stored: ${packageExternalId} from ${announcerMSP}`
      );
    } catch (error) {
      console.error(
        "[EventListener] Error handling package announcement:",
        error
      );
      throw error;
    }
  }

  /**
   * Handle TRANSFER_OFFER message - store transfer offer in DB
   */
  private async handleTransferOffer(
    event: FireFlyDatatypeMessage
  ): Promise<void> {
    try {
      const senderNode = event.author;

      // The value should contain transfer offer details
      const offerValue = event.value;

      if (!offerValue || !offerValue.externalPackageId) {
        console.warn(
          "[EventListener] TRANSFER_OFFER message missing package id, skipping"
        );
        return;
      }

      // Try to find the package in our database
      const pkg = await PackageModel.findOne({
        id: offerValue.externalPackageId,
      });

      // Try to find the active announcement for this package
      const activeAnnouncement = await PackageAnnouncementModel.findOne({
        packageExternalId: offerValue.externalPackageId,
        isActive: true,
      }).sort({ createdAt: -1 });

      const transferOfferData = {
        messageId: event.id,
        messageHash: event.hash,
        externalPackageId: offerValue.externalPackageId,
        packageId: pkg ? pkg._id : undefined,
        fromMSP: offerValue.fromMSP,
        toMSP: offerValue.toMSP,
        price: offerValue.price,
        createdISO: offerValue.createdISO,
        expiryISO: offerValue.expiryISO,
        senderNode: senderNode,
        signingKey: event.signingKey,
        announcementMessageId: activeAnnouncement
          ? activeAnnouncement.messageId
          : undefined,
        messageData: offerValue,
        packageDetails: offerValue,
      };

      // Upsert transfer offer (create or update if exists)
      await TransferOfferModel.findOneAndUpdate(
        { externalPackageId: offerValue.externalPackageId },
        transferOfferData,
        { upsert: true, new: true }
      );

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
        "[EventListener] Max reconnection attempts reached. Giving up."
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[EventListener] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
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
