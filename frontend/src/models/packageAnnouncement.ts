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
import type { PackageDetails } from "@/lib/packageSchemas";

/**
 * PackageAnnouncement model
 * Tracks broadcast announcements of packages available for bidding/transfer
 * These are messages with tag "PACKAGE_ANNOUNCE" and package details datatype
 */
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "packageAnnouncements",
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class PackageAnnouncement {
  public _id!: mongoose.Types.ObjectId;

  // FireFly message identifiers
  @prop({ required: true, unique: true })
  public messageId!: string; // FireFly message ID

  @prop()
  public messageHash?: string; // Hash of the message content

  // Package reference
  @prop({ ref: () => Package })
  public packageId?: any; // Reference to Package document

  @prop({ required: true })
  public packageExternalId!: string; // External package ID from the announcement

  // Announcement metadata
  @prop({ required: true })
  public announcerMSP!: string; // MSP ID of the organization that announced (from signingKey)

  @prop({ required: true })
  public announcerNode!: string; // FireFly node/author that sent the message

  @prop({ default: true })
  public isActive!: boolean; // Whether this announcement is still valid (not transferred/expired)

  @prop()
  public price?: number; // Suggested price from the announcement

  @prop()
  public messageData?: Record<string, any>; // Full message data from FireFly

  @prop()
  public packageDetails?: PackageDetails & { price: number }; // Package details payload from the announcement

  @prop()
  public expiresAt?: Date; // Optional expiration date for the announcement

  // Timestamps (added automatically by timestamps: true)
  public createdAt?: Date;
  public updatedAt?: Date;
}

// Export the model with hot reload handling for Next.js
let PackageAnnouncementModel: ReturnType<
  typeof getModelForClass<typeof PackageAnnouncement>
>;
try {
  PackageAnnouncementModel =
    (mongoose.models && (mongoose.models.PackageAnnouncement as any)) ||
    getModelForClass(PackageAnnouncement);
} catch (err) {
  PackageAnnouncementModel = getModelForClass(PackageAnnouncement);
}

// Export types for use in other files
export type PackageAnnouncementDocument = DocumentType<PackageAnnouncement>;

export default PackageAnnouncementModel;
