export type Package = {
  _id: string;
  packageID: string;
  externalId?: string;
  termsId?: string;
  active: string;
  packageDetails?: {
    pickupLocation: { address: string; lat?: number; lng?: number };
    dropLocation: { address: string; lat?: number; lng?: number };
    size: { width: number; height: number; depth: number };
    weightKg: number;
    urgency: "high" | "medium" | "low" | "none";
  };
  price?: number;
  pii?: {
    senderName?: string;
    senderContact?: string;
    recipientName?: string;
    recipientContact?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export const Status = {
  PENDING: "pending",
  READY_FOR_PICKUP: "ready_for_pickup",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  PROPOSED: "proposed",
} as const;
