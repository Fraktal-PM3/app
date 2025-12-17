// SSE Event Type Definitions

// Blockchain event output structures
export interface CreatePackageOutput {
  externalId: string;
  status: string;
  ownerOrgMSP: string;
  packageDetails?: any;
}

export interface StatusUpdatedOutput {
  externalId: string;
  status: string;
}

export interface DeletePackageOutput {
  externalId: string;
}

export interface StatusUpdatedAfterProposeOutput {
  externalId: string;
  termsId: string;
  status: string;
  caller: string;
}

export interface StatusUpdatedAfterAcceptOutput {
  externalId: string;
  termsId: string;
  status: string;
  caller: string;
}

export interface TransferExecutedOutput {
  externalId: string;
  termsId: string;
  newOwner: string;
}

// Blockchain event wrapper structure
export interface BlockchainEvent<T> {
  output: T;
  timestamp: string;
}

// Message event structures
export interface PackageAnnouncementValue {
  id: string; // Package external ID
  [key: string]: any; // Additional package details
}

export interface TransferOfferValue {
  termsId: string;
  fromMSP: string;
  toMSP: string;
  price: number;
  externalPackageId: string;
}

export interface MessageEvent {
  id: string;
  value?: any;
  author: string;
  signingKey?: string;
  hash: string;
  created: string;
}

// Typed SSE Events
export type CreatePackageEvent = BlockchainEvent<CreatePackageOutput>;
export type StatusUpdatedEvent = BlockchainEvent<StatusUpdatedOutput>;
export type DeletePackageEvent = BlockchainEvent<DeletePackageOutput>;
export type StatusUpdatedAfterProposeEvent = BlockchainEvent<StatusUpdatedAfterProposeOutput>;
export type StatusUpdatedAfterAcceptEvent = BlockchainEvent<StatusUpdatedAfterAcceptOutput>;
export type TransferExecutedEvent = BlockchainEvent<TransferExecutedOutput>;
export type PackageAnnouncementEvent = MessageEvent & {
  value: PackageAnnouncementValue;
};
export type TransferOfferEvent = MessageEvent & {
  value: TransferOfferValue;
};

// Event handler types
export type EventHandler<T = any> = (data: T) => void;
export type AllEventsHandler = (eventName: string, data: any) => void;

// Connection states
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
