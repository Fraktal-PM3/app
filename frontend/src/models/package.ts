import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
  DocumentType,
} from "@typegoose/typegoose";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Define enums
export enum Urgency {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

// Status values for Typegoose enum (must match Status enum from fraktal-lib)
// Note: Status enum is imported from fraktal-lib in types/package.ts
const StatusValues = [
  "pending",
  "proposed",
  "ready_for_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "succeeded",
  "failed",
] as const;

// Nested classes for subdocuments
@modelOptions({ schemaOptions: { _id: false } })
class Location {
  @prop({ required: true })
  public address!: string;

  @prop()
  public lat?: number;

  @prop()
  public lng?: number;
}

@modelOptions({ schemaOptions: { _id: false } })
class Size {
  @prop({ required: true, min: 0 })
  public width!: number;

  @prop({ required: true, min: 0 })
  public height!: number;

  @prop({ required: true, min: 0 })
  public depth!: number;
}

@modelOptions({ schemaOptions: { _id: false } })
class PackageDetails {
  @prop({ required: true, _id: false })
  public pickupLocation!: Location;

  @prop({ required: true, _id: false })
  public dropLocation!: Location;

  @prop({ required: true, _id: false })
  public size!: Size;

  @prop({ required: true, min: 0 })
  public weightKg!: number;

  @prop({ required: true, enum: Urgency })
  public urgency!: Urgency;
}

@modelOptions({ schemaOptions: { _id: false } })
class PII {
  @prop()
  public senderName?: string;

  @prop()
  public senderContact?: string;

  @prop()
  public recipientName?: string;

  @prop()
  public recipientContact?: string;
}

// Main Package class
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "packages",
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Package {
  public _id!: mongoose.Types.ObjectId;

  @prop({ required: true, unique: true, default: () => randomUUID() })
  public id!: string; // UUID - same as blockchain externalId

  @prop({ required: true })
  public name!: string; // Human-readable package name/identifier

  @prop({ required: true })
  public recipientMSP!: string; // MSP ID of the recipient organization

  @prop({ required: true })
  public ownerOrgMSP!: string; // Owner MSP ID of the package

  @prop({ required: true })
  public senderOrgMSP!: string; // Sender MSP ID of the package

  @prop({ default: "null" })
  public termsId?: string;

  @prop({ default: "pending", enum: StatusValues })
  public status!: string;

  @prop({ _id: false })
  public packageDetails?: PackageDetails;

  // not safe but working for testing purposes
  @prop()
  public salt?: string;

  @prop({ _id: false })
  public pii?: PII;

  // Blockchain metadata
  @prop()
  public mspId?: string; // MSP ID of the organization that created/owns this package

  // Timestamps (added automatically by timestamps: true)
  public createdAt?: Date;
  public updatedAt?: Date;
}

// Export the model with hot reload handling for Next.js
let PackageModel: ReturnType<typeof getModelForClass<typeof Package>>;
try {
  PackageModel =
    (mongoose.models && (mongoose.models.Package as any)) ||
    getModelForClass(Package);
} catch (err) {
  PackageModel = getModelForClass(Package);
}

// Export types for use in other files
export type PackageDocument = DocumentType<Package>;

export default PackageModel;
