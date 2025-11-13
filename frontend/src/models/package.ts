import mongoose, { Schema, Document, Model } from "mongoose";

// Define enums
export enum Urgency {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

// Define nested schemas
const LocationSchema = new Schema({
  address: { type: String, required: true },
  lat: { type: Number, required: false },
  lng: { type: Number, required: false }
}, { _id: false });

const SizeSchema = new Schema({
  width: { type: Number, required: true, min: 0 },
  height: { type: Number, required: true, min: 0 },
  depth: { type: Number, required: true, min: 0 }
}, { _id: false });

const PackageDetailsSchema = new Schema({
  pickupLocation: { type: LocationSchema, required: true },
  dropLocation: { type: LocationSchema, required: true },
  size: { type: SizeSchema, required: true },
  weightKg: { type: Number, required: true, min: 0 },
  urgency: { 
    type: String, 
    required: true,
    enum: Object.values(Urgency)
  }
}, { _id: false });

// Define the TypeScript interface
export interface IPackage extends Document {
  packageID: string;
  active: boolean;
  packageDetails?: {
    pickupLocation: {
      address: string;
      lat?: number;
      lng?: number;
    };
    dropLocation: {
      address: string;
      lat?: number;
      lng?: number;
    };
    size: {
      width: number;
      height: number;
      depth: number;
    };
    weightKg: number;
    urgency: Urgency;
  };
  price?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the schema
const PackageSchema: Schema<IPackage> = new Schema(
  {
    packageID: { type: String, required: true },
    active: { type: Boolean, default: true },
    packageDetails: { type: PackageDetailsSchema, required: false },
    price: { type: Number, required: false, min: 0, default: 0 }
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Avoid model overwrite in dev (important for Next.js hot reload)
const Package: Model<IPackage> =
  mongoose.models.Package || mongoose.model<IPackage>("Package", PackageSchema);

export default Package;