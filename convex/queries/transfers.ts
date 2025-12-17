import { v } from "convex/values";
import { query } from "../_generated/server";

// List all transfers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transfers").collect();
  },
});

// Get transfer by ID
export const getById = query({
  args: { id: v.id("transfers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get transfer by transfer ID
export const getByTransferId = query({
  args: { transferId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("transferId"), args.transferId))
      .first();
  },
});

// Get transfers by package external ID
export const getByPackage = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .collect();
  },
});

// Get transfers from an MSP
export const getByFromMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("fromMSP"), args.mspId))
      .collect();
  },
});

// Get transfers to an MSP
export const getByToMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("toMSP"), args.mspId))
      .collect();
  },
});

// Get transfers by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfers")
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();
  },
});

// Get transfers relevant to an MSP (from or to)
export const getByMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    const allTransfers = await ctx.db.query("transfers").collect();
    
    return allTransfers.filter(
      (transfer) =>
        transfer.fromMSP === args.mspId || transfer.toMSP === args.mspId
    );
  },
});
