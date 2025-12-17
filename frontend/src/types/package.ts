// Package types that match the Convex schema

import z from "zod";
import { Status } from "fraktal-lib";

// Re-export Status from fraktal-lib for convenience
export { Status };

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
 * Package type matching the Convex Package schema
 */
export type Package = {
  _id: string;
  id: string; // UUID - same as blockchain externalId
  name: string; // Human-readable package name/identifier
  recipientOrgMSP: string; // MSP of the recipient
  termsId?: string;
  status: string;
  packageDetails?: PackageDetails;
  salt?: string;
  pii?: PII;
  mspId?: string; // Current owner MSP
  ownerOrgMSP: string; // Original creator MSP (never changes)
  senderOrgMSP: string; // Sender MSP (same as ownerOrgMSP initially)
  price?: number;
  active?: string; // "true", "false", "pending"
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Transfer type matching the Convex Transfer schema
 */
export type Transfer = {
  _id: string;
  transferId: string;
  packageId?: string; // Reference to Package
  externalId: string; // External package ID
  fromMSP: string; // MSP initiating the transfer
  toMSP: string; // MSP targeted to receive the package
  status: "pending" | "proposed" | "accepted" | "executed" | "rejected";
  mspId: string;
  price?: number; // Price for the transfer (from private transfer terms)
  announcementMessageId?: string; // References PackageAnnouncement.messageId
  blockchainTxId?: string;
  blockchainData?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * PackageAnnouncement type matching the Convex PackageAnnouncement schema
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
  transferStatus?: "accepted" | "pending"; // Client-side status for transfer proposals
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

/**
 * TransferOffer schema for creating new offers (used in API)
 */
export const TransferOfferSchema = z.object({
  externalPackageId: z.string(),
  fromMSP: z.string(),
  toMSP: z.string(),
  price: z.number(),
  expiryISO: z.coerce.date().transform((date) => date.toISOString()),
});

export type TransferOfferInput = z.infer<typeof TransferOfferSchema>;

/**
 * TransferOffer type matching the Convex TransferOffer schema
 * (for private message offers, not blockchain transfers)
 */
export type TransferOffer = {
  _id: string;
  messageId: string; // Firefly message ID
  messageHash?: string;
  packageId?: string; // Reference to Package
  externalPackageId: string; // Blockchain package ID
  fromMSP: string; // Transporter MSP offering delivery
  toMSP: string; // Sender MSP receiving offer
  price: number; // Offered price
  expiryISO: string; // Proposed delivery date/time
  senderNode: string; // Firefly node that sent the offer
  signingKey?: string;
  announcementMessageId?: string; // References PackageAnnouncement.messageId
  messageData?: Record<string, any>;
  createdAt?: string; // When we received/stored this offer
  updatedAt?: string;
};
