import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Create a new transfer
export const create = mutation({
  args: {
    transferId: v.string(),
    externalId: v.string(),
    fromMSP: v.string(),
    toMSP: v.string(),
    status: v.string(),
    mspId: v.string(),
    price: v.optional(v.number()),
    announcementMessageId: v.optional(v.string()),
    blockchainTxId: v.optional(v.string()),
    blockchainData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if transfer already exists
    const existing = await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("transferId"), args.transferId))
      .first();

    if (existing) {
      console.log(`[Convex] Transfer ${args.transferId} already exists, updating...`);
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Try to find package reference
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    const id = await ctx.db.insert("transfers", {
      ...args,
      packageId: pkg?._id,
      updatedAt: Date.now(),
    });

    console.log(`[Convex] Created transfer: ${args.transferId}`);
    return id;
  },
});

// Update transfer status
export const updateStatus = mutation({
  args: {
    transferId: v.string(),
    status: v.string(),
    blockchainTxId: v.optional(v.string()),
    blockchainData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("transferId"), args.transferId))
      .first();

    if (!transfer) {
      console.error(`[Convex] Transfer ${args.transferId} not found for status update`);
      throw new Error(`Transfer ${args.transferId} not found`);
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.blockchainTxId) updates.blockchainTxId = args.blockchainTxId;
    if (args.blockchainData) updates.blockchainData = args.blockchainData;

    await ctx.db.patch(transfer._id, updates);
    console.log(`[Convex] Updated transfer ${args.transferId} status to ${args.status}`);
    return transfer._id;
  },
});

// Execute transfer (change ownership)
export const execute = mutation({
  args: {
    externalId: v.string(),
    transferId: v.string(),
    newOwner: v.string(),
    blockchainTxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update transfer status
    const transfer = await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("transferId"), args.transferId))
      .first();

    if (transfer) {
      await ctx.db.patch(transfer._id, {
        status: "executed",
        updatedAt: Date.now(),
      });
    }

    // Update package owner
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    if (pkg) {
      await ctx.db.patch(pkg._id, {
        ownerOrgMSP: args.newOwner,
        updatedAt: Date.now(),
      });
      console.log(`[Convex] Executed transfer ${args.transferId}, new owner: ${args.newOwner}`);
    }

    return transfer?._id;
  },
});
