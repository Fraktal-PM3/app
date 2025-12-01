import {
  prop,
  getModelForClass,
  modelOptions,
  Severity,
  DocumentType,
} from "@typegoose/typegoose";
import mongoose from "mongoose";

// Main TransferOffer class (for private message offers, not blockchain transfers)
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "transferOffers",
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class TransferOffer {
  public _id!: mongoose.Types.ObjectId;

  // Firefly message identifiers
  @prop({ required: true, unique: true })
  public messageId!: string; // Firefly message ID

  @prop()
  public messageHash?: string; // Hash of message content

  // Package references
  @prop({ ref: "Package" })
  public packageId?: any; // MongoDB document reference

  @prop({ required: true })
  public externalPackageId!: string; // Blockchain package ID

  // Party identifiers
  @prop({ required: true })
  public fromMSP!: string; // Transporter MSP offering the delivery

  @prop({ required: true })
  public toMSP!: string; // Sender MSP receiving the offer

  // Offer details
  @prop({ required: true })
  public price!: number; // Offered price for delivery

  @prop({ required: true })
  public offerCreatedAt!: Date; // When the offer was created (from message data)

  @prop({ required: true })
  public deliveryDate!: Date; // Proposed delivery date/time (expiryISO from message)

  // Firefly message metadata
  @prop({ required: true })
  public senderNode!: string; // Firefly node/author that sent the offer

  @prop()
  public signingKey?: string; // Signing key from message (contains MSP)

  // Announcement reference (links offer to the announcement)
  @prop()
  public announcementMessageId?: string; // References PackageAnnouncement.messageId

  // Full message data from Firefly
  @prop()
  public messageData?: Record<string, any>;

  // Timestamps (added automatically by timestamps: true)
  public createdAt?: Date; // When we received/stored this offer
  public updatedAt?: Date;
}

// Export the model with hot reload handling for Next.js
let TransferOfferModel: ReturnType<typeof getModelForClass<typeof TransferOffer>>;
try {
  TransferOfferModel =
    (mongoose.models && (mongoose.models.TransferOffer as any)) ||
    getModelForClass(TransferOffer);
} catch (err) {
  TransferOfferModel = getModelForClass(TransferOffer);
}

// Export types for use in other files
export type TransferOfferDocument = DocumentType<TransferOffer>;

export default TransferOfferModel;
