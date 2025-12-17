import { v } from "convex/values";
import { query } from "../_generated/server";

// List all announcements
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("packageAnnouncements").collect();
  },
});

// List active announcements only
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("packageAnnouncements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get announcement by ID
export const getById = query({
  args: { id: v.id("packageAnnouncements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get announcement by message ID
export const getByMessageId = query({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packageAnnouncements")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

// Get announcements by package external ID
export const getByPackage = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packageAnnouncements")
      .withIndex("by_packageExternalId", (q) => q.eq("packageExternalId", args.externalId))
      .collect();
  },
});

// Get announcements by announcer MSP
export const getByAnnouncerMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packageAnnouncements")
      .withIndex("by_announcerMSP", (q) => q.eq("announcerMSP", args.mspId))
      .collect();
  },
});
