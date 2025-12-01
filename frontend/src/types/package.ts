// Package types that match the MongoDB models

import z from "zod";

export enum Status {
  PENDING = "pending",
  READY_FOR_PICKUP = "ready_for_pickup",
  PICKED_UP = "picked_up",
  IN_TRANSIT = "in_transit",
  DELIVERED = "delivered",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  PROPOSED = "proposed",
}

export enum Urgency {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

export type Location = {
  address: string;
  lat?: number;
  lng?: number;
};

export type Size = {
  width: number;
  height: number;
  depth: number;
};

export type PackageDetails = {
  pickupLocation: Location;
  dropLocation: Location;
  size: Size;
  weightKg: number;
  urgency: Urgency | "high" | "medium" | "low" | "none";
};

export type PII = {
  senderName?: string;
  senderContact?: string;
  recipientName?: string;
  recipientContact?: string;
};

/**
 * Package type matching the Package MongoDB model
 */
export type Package = {
  _id: string;
  id: string; // UUID - same as blockchain externalId
  name: string; // Human-readable package name/identifier
  termsId?: string;
  status: string;
  packageDetails?: PackageDetails;
  salt?: string;
  pii?: PII;
  mspId?: string;
  price?: number;
  active?: string; // "true", "false", "pending"
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Transfer status enum matching Transfer model
 */
export enum TransferStatus {
  PROPOSED = "proposed",
  ACCEPTED = "accepted",
  EXECUTED = "executed",
  REJECTED = "rejected",
}

/**
 * Transfer type matching the Transfer MongoDB model
 */
export type Transfer = {
  _id: string;
  transferId: string;
  packageId?: string; // Reference to Package
  externalId: string; // External package ID
  fromMSP: string; // MSP initiating the transfer
  toMSP: string; // MSP targeted to receive the package
  status: TransferStatus;
  mspId: string;
  price?: number; // Price for the transfer (from private transfer terms)
  blockchainTxId?: string;
  blockchainData?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * PackageAnnouncement type matching the PackageAnnouncement MongoDB model
 */
export type PackageAnnouncement = {
  _id: string;
  messageId: string;
  messageHash?: string;
  packageExternalId: string;
  packageId?: string; // Reference to Package
  announcerMSP: string;
  announcerNode: string;
  isActive: boolean;
  price?: number; // Price for bidding (from announcement details)
  expiresAt?: string;
  packageDetails?: PackageDetails;
  messageData?: any;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * System state type for storing configuration
 */
export type SystemState = {
  _id: string;
  key: string;
  value?: string;
  lastSyncTimestamp?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

export const TransferOfferSchema = z.object({
  externalPackageId: z.string(),
  fromMSP: z.string(),
  toMSP: z.string(),
  price: z.number(),
  createdISO: z.coerce.date().transform((date) => date.toISOString()),
  expiryISO: z.coerce.date().transform((date) => date.toISOString()),
});

export type TransferOffer = z.infer<typeof TransferOfferSchema>;