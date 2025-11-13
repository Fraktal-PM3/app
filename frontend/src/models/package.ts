import mongoose, { Schema, Document, Model } from "mongoose";

// Define the TypeScript interface
export interface IPackage extends Document {
  packageID: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the schema
const PackageSchema: Schema<IPackage> = new Schema(
  {
    packageID: { type: String, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Avoid model overwrite in dev (important for Next.js hot reload)
const Package: Model<IPackage> =
  mongoose.models.Package || mongoose.model<IPackage>("Package", PackageSchema);

export default Package;
