import { EventEmitter } from "events";
import type {
  BlockchainEventDelivery,
  CreatePackageEvent,
  StatusUpdatedEvent,
  DeletePackageEvent,
  StatusUpdatedAfterProposeEvent,
  StatusUpdatedAfterAcceptEvent,
  TransferExecutedEvent,
  FireFlyDatatypeMessage,
} from "fraktal-lib";

/**
 * Typed blockchain events from fraktal-lib
 */
type TypedBlockchainEvent =
  | (BlockchainEventDelivery & { output: CreatePackageEvent })
  | (BlockchainEventDelivery & { output: StatusUpdatedEvent })
  | (BlockchainEventDelivery & { output: DeletePackageEvent })
  | (BlockchainEventDelivery & { output: StatusUpdatedAfterProposeEvent })
  | (BlockchainEventDelivery & { output: StatusUpdatedAfterAcceptEvent })
  | (BlockchainEventDelivery & { output: TransferExecutedEvent })
  | FireFlyDatatypeMessage;

/**
 * Event envelope with typed data
 */
interface TypedEventEnvelope {
  eventName: string;
  data: TypedBlockchainEvent;
}

/**
 * Global event bus for broadcasting blockchain events
 * from the background service to SSE clients
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many SSE clients to listen
  }

  /**
   * Emit a blockchain event to all listeners
   */
  emitBlockchainEvent(eventName: string, data: TypedBlockchainEvent): void {
    this.emit("blockchain-event", { eventName, data });
  }

  /**
   * Subscribe to all blockchain events
   */
  onBlockchainEvent(callback: (event: TypedEventEnvelope) => void): () => void {
    this.on("blockchain-event", callback);
    return () => this.off("blockchain-event", callback);
  }

  /**
   * Subscribe to specific blockchain event type
   */
  onSpecificEvent(
    eventName: string,
    callback: (data: TypedBlockchainEvent) => void,
  ): () => void {
    this.on(`blockchain-event:${eventName}`, callback);
    return () => this.off(`blockchain-event:${eventName}`, callback);
  }
}

// Global singleton - stored on globalThis to ensure it's truly global
declare global {
  var eventBusInstance: EventBus | undefined;
}

function getEventBus(): EventBus {
  if (!globalThis.eventBusInstance) {
    globalThis.eventBusInstance = new EventBus();
  }
  return globalThis.eventBusInstance;
}

// Get the singleton instance
const eventBus = getEventBus();

export default eventBus;
export { getEventBus };
export type { TypedBlockchainEvent, TypedEventEnvelope };
