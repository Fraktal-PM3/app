import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Create a new package announcement
export const create = mutation({
  args: {
    messageId: v.string(),
    messageHash: v.optional(v.string()),
    packageExternalId: v.string(),
    announcerMSP: v.string(),
    announcerNode: v.string(),
    isActive: v.boolean(),
    price: v.optional(v.number()),
    messageData: v.optional(v.any()),
    packageDetails: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
    transferStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if announcement already exists
    const existing = await ctx.db
      .query("packageAnnouncements")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (existing) {
      console.log(`[Convex] Announcement ${args.messageId} already exists, updating...`);
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Try to find package reference
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.packageExternalId))
      .first();

    const id = await ctx.db.insert("packageAnnouncements", {
      ...args,
      packageId: pkg?._id,
      updatedAt: Date.now(),
    });

    console.log(`[Convex] Created announcement: ${args.messageId}`);
    return id;
  },
});

// Update announcement status
export const updateStatus = mutation({
  args: {
    messageId: v.string(),
    isActive: v.optional(v.boolean()),
    transferStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db
      .query("packageAnnouncements")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (!announcement) {
      console.error(`[Convex] Announcement ${args.messageId} not found`);
      throw new Error(`Announcement ${args.messageId} not found`);
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.transferStatus) updates.transferStatus = args.transferStatus;

    await ctx.db.patch(announcement._id, updates);
    console.log(`[Convex] Updated announcement ${args.messageId}`);
    return announcement._id;
  },
});

// Deactivate announcement
export const deactivate = mutation({
  args: {
    packageExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("packageAnnouncements")
      .filter((q) => q.eq(q.field("packageExternalId"), args.packageExternalId))
      .collect();

    for (const announcement of announcements) {
      await ctx.db.patch(announcement._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    console.log(`[Convex] Deactivated announcements for package ${args.packageExternalId}`);
    return announcements.length;
  },
});
