import { v } from "convex/values";
import { query } from "../_generated/server";

// Get system state by key
export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

// List all system state entries
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("systemState").collect();
  },
});
