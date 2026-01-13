import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Create a new transfer offer
export const create = mutation({
  args: {
    messageId: v.optional(v.string()),
    messageHash: v.optional(v.string()),
    externalPackageId: v.string(),
    fromMSP: v.string(),
    toMSP: v.string(),
    price: v.number(),
    expiryISO: v.string(),
    senderNode: v.optional(v.string()),
    signingKey: v.optional(v.string()),
    announcementMessageId: v.optional(v.string()),
    messageData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if offer already exists (by messageId if provided)
    if (args.messageId) {
      const existing = await ctx.db
        .query("transferOffers")
        .filter((q) => q.eq(q.field("messageId"), args.messageId))
        .first();

      if (existing) {
        console.log(`[Convex] Offer ${args.messageId} already exists, updating...`);
        await ctx.db.patch(existing._id, {
          ...args,
          updatedAt: Date.now(),
        });
        return existing._id;
      }
    }

    // Try to find package reference
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalPackageId))
      .first();

    const id = await ctx.db.insert("transferOffers", {
      ...args,
      packageId: pkg?._id,
      updatedAt: Date.now(),
    });

    console.log(`[Convex] Created transfer offer: ${args.messageId || id}`);
    return id;
  },
});

// Update transfer offer
export const update = mutation({
  args: {
    messageId: v.string(),
    price: v.optional(v.number()),
    expiryISO: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db
      .query("transferOffers")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (!offer) {
      console.error(`[Convex] Offer ${args.messageId} not found`);
      throw new Error(`Offer ${args.messageId} not found`);
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.price !== undefined) updates.price = args.price;
    if (args.expiryISO) updates.expiryISO = args.expiryISO;

    await ctx.db.patch(offer._id, updates);
    console.log(`[Convex] Updated offer ${args.messageId}`);
    return offer._id;
  },
});
