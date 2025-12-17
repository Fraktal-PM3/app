import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  packages: defineTable({
    // Core package identifiers
    externalId: v.string(), // UUID - blockchain package ID
    name: v.string(), // Human-readable package name
    
    // Organization MSP identifiers
    recipientOrgMSP: v.string(),
    ownerOrgMSP: v.string(),
    senderOrgMSP: v.string(),
    mspId: v.optional(v.string()), // MSP that created/owns this package
    
    // Package status and terms
    status: v.string(), // pending, proposed, ready_for_pickup, picked_up, in_transit, delivered, succeeded, failed
    termsId: v.optional(v.string()),
    
    // Package details (nested object)
    packageDetails: v.optional(v.object({
      pickupLocation: v.object({
        address: v.string(),
        lat: v.optional(v.number()),
        lng: v.optional(v.number()),
      }),
      dropLocation: v.object({
        address: v.string(),
        lat: v.optional(v.number()),
        lng: v.optional(v.number()),
      }),
      size: v.object({
        width: v.number(),
        height: v.number(),
        depth: v.number(),
      }),
      weightKg: v.number(),
      urgency: v.string(), // high, medium, low, none
    })),
    
    // PII (personally identifiable information)
    pii: v.optional(v.object({
      senderName: v.optional(v.string()),
      senderContact: v.optional(v.string()),
      recipientName: v.optional(v.string()),
      recipientContact: v.optional(v.string()),
    })),
    
    // Blockchain metadata
    salt: v.optional(v.string()),
    
    // Timestamps
    updatedAt: v.optional(v.number()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_ownerOrgMSP", ["ownerOrgMSP"])
    .index("by_senderOrgMSP", ["senderOrgMSP"])
    .index("by_recipientOrgMSP", ["recipientOrgMSP"])
    .index("by_status", ["status"]),

  transfers: defineTable({
    // Transfer identifiers
    transferId: v.string(), // Unique transfer ID
    externalId: v.string(), // Blockchain package ID
    packageId: v.optional(v.id("packages")), // Reference to package document
    
    // Party identifiers
    fromMSP: v.string(), // MSP initiating the transfer
    toMSP: v.string(), // MSP targeted to receive
    
    // Transfer details
    status: v.string(), // pending, proposed, accepted, executed, rejected
    price: v.optional(v.number()),
    
    // References
    announcementMessageId: v.optional(v.string()), // Links to announcement
    
    // Blockchain metadata
    mspId: v.string(), // MSP that initiated this transfer action
    blockchainTxId: v.optional(v.string()),
    blockchainData: v.optional(v.any()),
    
    // Timestamps
    updatedAt: v.optional(v.number()),
  })
    .index("by_transferId", ["transferId"])
    .index("by_externalId", ["externalId"])
    .index("by_fromMSP", ["fromMSP"])
    .index("by_toMSP", ["toMSP"])
    .index("by_status", ["status"]),

  packageAnnouncements: defineTable({
    // FireFly message identifiers
    messageId: v.string(), // FireFly message ID
    messageHash: v.optional(v.string()),
    
    // Package reference
    packageId: v.optional(v.id("packages")),
    packageExternalId: v.string(), // External package ID from announcement
    
    // Announcement metadata
    announcerMSP: v.string(), // MSP ID of the announcer
    announcerNode: v.string(), // FireFly node/author
    isActive: v.boolean(), // Whether announcement is still valid
    price: v.optional(v.number()),
    
    // Message data
    messageData: v.optional(v.any()),
    packageDetails: v.optional(v.any()), // Package details payload
    
    // Expiration and status
    expiresAt: v.optional(v.number()),
    transferStatus: v.optional(v.string()), // accepted, pending
    
    // Timestamps
    updatedAt: v.optional(v.number()),
  })
    .index("by_messageId", ["messageId"])
    .index("by_packageExternalId", ["packageExternalId"])
    .index("by_announcerMSP", ["announcerMSP"])
    .index("by_isActive", ["isActive"]),

  transferOffers: defineTable({
    // Firefly message identifiers
    messageId: v.optional(v.string()), // Firefly message ID
    messageHash: v.optional(v.string()),
    
    // Package references
    packageId: v.optional(v.id("packages")),
    externalPackageId: v.string(), // Blockchain package ID
    
    // Party identifiers
    fromMSP: v.string(), // Transporter MSP offering delivery
    toMSP: v.string(), // Sender MSP receiving the offer
    
    // Offer details
    price: v.number(), // Offered price
    expiryISO: v.string(), // Proposed delivery date/time
    
    // Firefly metadata
    senderNode: v.optional(v.string()),
    signingKey: v.optional(v.string()),
    
    // References
    announcementMessageId: v.optional(v.string()),
    messageData: v.optional(v.any()),
    
    // Timestamps
    updatedAt: v.optional(v.number()),
  })
    .index("by_messageId", ["messageId"])
    .index("by_externalPackageId", ["externalPackageId"])
    .index("by_fromMSP", ["fromMSP"])
    .index("by_toMSP", ["toMSP"])
    .index("by_announcementMessageId", ["announcementMessageId"]),

  systemState: defineTable({
    key: v.string(), // e.g., "lastEventSync", "fireflyNodeId"
    value: v.optional(v.string()),
    lastSyncTimestamp: v.optional(v.number()),
    metadata: v.optional(v.any()),
    
    // Timestamps
    updatedAt: v.optional(v.number()),
  })
    .index("by_key", ["key"]),

  activityEvents: defineTable({
    // Event type and identifiers
    type: v.string(), // CreatePackage, StatusUpdatedAfterPropose, StatusUpdatedAfterAccept, TransferExecuted, etc.
    
    // Related entity references
    packageId: v.optional(v.id("packages")),
    packageExternalId: v.optional(v.string()),
    transferId: v.optional(v.id("transfers")),
    announcementId: v.optional(v.id("packageAnnouncements")),
    offerId: v.optional(v.id("transferOffers")),
    
    // Event details
    title: v.string(),
    description: v.string(),
    
    // Status information (for tracking changes)
    oldStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    
    // Additional metadata
    metadata: v.optional(v.any()),
  })
    .index("by_packageExternalId", ["packageExternalId"])
    .index("by_type", ["type"])
    .index("by_packageId", ["packageId"]),
});
