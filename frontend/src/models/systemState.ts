import {
  prop,
  getModelForClass,
  modelOptions,
  DocumentType,
} from "@typegoose/typegoose";
import mongoose from "mongoose";

// Main SystemState class for tracking service state
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "system_state",
  },
})
export class SystemState {
  public _id!: mongoose.Types.ObjectId;

  @prop({ required: true, unique: true })
  public key!: string; // e.g., "lastEventSync", "fireflyNodeId"

  @prop()
  public value?: string; // Flexible value storage

  @prop()
  public lastSyncTimestamp?: Date; // Last successful event sync

  @prop()
  public metadata?: Record<string, any>; // Additional metadata

  // Timestamps
  public createdAt?: Date;
  public updatedAt?: Date;
}

// Export the model with hot reload handling for Next.js
let SystemStateModel: ReturnType<typeof getModelForClass<typeof SystemState>>;
try {
  SystemStateModel =
    (mongoose.models && (mongoose.models.SystemState as any)) ||
    getModelForClass(SystemState);
} catch (err) {
  SystemStateModel = getModelForClass(SystemState);
}

// Export types for use in other files
export type SystemStateDocument = DocumentType<SystemState>;

export default SystemStateModel;
