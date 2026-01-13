import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Set system state value
export const set = mutation({
  args: {
    key: v.string(),
    value: v.optional(v.string()),
    lastSyncTimestamp: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("systemState")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const id = await ctx.db.insert("systemState", {
      ...args,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Get system state value
export const get = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("systemState")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    return state;
  },
});
