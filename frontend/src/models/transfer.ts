import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
  DocumentType,
  Ref,
} from "@typegoose/typegoose";
import mongoose from "mongoose";
import { Package } from "./package";

// Transfer status values (must match Status enum from fraktal-lib)
// Note: Status enum is imported from fraktal-lib in types/package.ts
const TransferStatusValues = [
  "pending",
  "proposed",
  "accepted",
  "executed",
  "rejected",
] as const;

// Main Transfer class
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "transfers",
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Transfer {
  public _id!: mongoose.Types.ObjectId;

  // Blockchain identifiers
  @prop({ required: true, unique: true })
  public transferId!: string;

  // Package references
  @prop({ ref: () => Package })
  public packageId?: any;

  @prop({ required: true })
  public externalId!: string; // Blockchain package ID

  // Party identifiers
  @prop({ required: true })
  public fromMSP!: string; // MSP initiating the transfer

  @prop({ required: true })
  public toMSP!: string; // MSP targeted to receive the package

  // Transfer status
  @prop({
    required: true,
    enum: TransferStatusValues,
    default: "proposed",
  })
  public status!: string;

  // Transfer price (from private transfer terms)
  @prop({ default: 0 })
  public price?: number;

  // Announcement reference (links transfer to the announcement that triggered it)
  @prop()
  public announcementMessageId?: string; // References PackageAnnouncement.messageId

  // Blockchain metadata
  @prop({ required: true })
  public mspId!: string; // MSP ID of the organization that initiated this transfer action

  @prop()
  public blockchainTxId?: string; // Transaction ID from Firefly

  @prop()
  public blockchainData?: Record<string, any>; // Additional event data

  // Timestamps (added automatically by timestamps: true)
  public createdAt?: Date;
  public updatedAt?: Date;
}

// Export the model with hot reload handling for Next.js
let TransferModel: ReturnType<typeof getModelForClass<typeof Transfer>>;
try {
  TransferModel =
    (mongoose.models && (mongoose.models.Transfer as any)) ||
    getModelForClass(Transfer);
} catch (err) {
  TransferModel = getModelForClass(Transfer);
}

// Export types for use in other files
export type TransferDocument = DocumentType<Transfer>;

export default TransferModel;
