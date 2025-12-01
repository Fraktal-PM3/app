import { z } from "zod";

// Enums matching the blockchain package schema
export const UrgencyEnum = z.enum(["high", "medium", "low", "none"]);
export const StatusEnum = z.enum([
  "pending",
  "ready_for_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "succeeded",
  "failed",
  "proposed",
]);

// Location schema
export const LocationSchema = z
  .object({
    address: z.string().min(1, "Address is required"),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .strict();

// Size schema
export const SizeSchema = z
  .object({
    width: z.number().positive("Width must be positive"),
    height: z.number().positive("Height must be positive"),
    depth: z.number().positive("Depth must be positive"),
  })
  .strict();

// Package details schema
export const PackageDetailsSchema = z
  .object({
    pickupLocation: LocationSchema,
    dropLocation: LocationSchema,
    size: SizeSchema,
    weightKg: z.number().positive("Weight must be positive"),
    urgency: UrgencyEnum,
  })
  .strict();

// PII schema
export const PIISchema = z
  .object({
    senderName: z.string().optional(),
    senderContact: z.string().optional(),
    recipientName: z.string().optional(),
    recipientContact: z.string().optional(),
  })
  .strict();

// Package creation request schema
export const CreatePackageRequestSchema = z
  .object({
    name: z.string().min(1, "Package name is required"),
    packageDetails: PackageDetailsSchema,
    pii: PIISchema,
    salt: z.string().min(1, "Salt is required"),
    recipientMSP: z.string().min(1, "Recipient organization is required"),
  })
  .strict();

// Type exports
export type Location = z.infer<typeof LocationSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type PackageDetails = z.infer<typeof PackageDetailsSchema>;
export type PII = z.infer<typeof PIISchema>;
export type CreatePackageRequest = z.infer<typeof CreatePackageRequestSchema>;
