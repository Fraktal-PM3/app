import { v } from "convex/values";
import { query } from "../_generated/server";

// List all transfer offers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transferOffers").collect();
  },
});

// Get offer by ID
export const getById = query({
  args: { id: v.id("transferOffers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get offer by message ID
export const getByMessageId = query({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transferOffers")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

// Get offers by package external ID
export const getByPackage = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transferOffers")
      .withIndex("by_externalPackageId", (q) => q.eq("externalPackageId", args.externalId))
      .collect();
  },
});

// Get offers by announcement
export const getByAnnouncement = query({
  args: { announcementMessageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transferOffers")
      .withIndex("by_announcementMessageId", (q) => 
        q.eq("announcementMessageId", args.announcementMessageId)
      )
      .collect();
  },
});

// Get offers from an MSP
export const getByFromMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transferOffers")
      .withIndex("by_fromMSP", (q) => q.eq("fromMSP", args.mspId))
      .collect();
  },
});

// Get offers to an MSP
export const getByToMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transferOffers")
      .withIndex("by_toMSP", (q) => q.eq("toMSP", args.mspId))
      .collect();
  },
});

// Get offers relevant to an MSP (from or to)
export const getByMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    const allOffers = await ctx.db.query("transferOffers").collect();
    
    return allOffers.filter(
      (offer) => offer.fromMSP === args.mspId || offer.toMSP === args.mspId
    );
  },
});
