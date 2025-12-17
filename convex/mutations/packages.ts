import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Create a new package
export const create = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    recipientOrgMSP: v.string(),
    ownerOrgMSP: v.string(),
    senderOrgMSP: v.string(),
    status: v.string(),
    mspId: v.optional(v.string()),
    termsId: v.optional(v.string()),
    packageDetails: v.optional(v.any()),
    pii: v.optional(v.any()),
    salt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if package already exists
    const existing = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    if (existing) {
      console.log(`[Convex] Package ${args.externalId} already exists, updating...`);
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const id = await ctx.db.insert("packages", {
      ...args,
      updatedAt: Date.now(),
    });
    
    console.log(`[Convex] Created package: ${args.externalId}`);
    return id;
  },
});

// Update package status
export const updateStatus = mutation({
  args: {
    externalId: v.string(),
    status: v.string(),
    termsId: v.optional(v.string()),
    ownerOrgMSP: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    if (!pkg) {
      console.log(`[Convex] Package ${args.externalId} not found for status update - skipping (package may not involve this MSP)`);
      return null;
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.termsId) updates.termsId = args.termsId;
    if (args.ownerOrgMSP) updates.ownerOrgMSP = args.ownerOrgMSP;

    await ctx.db.patch(pkg._id, updates);
    console.log(`[Convex] Updated package ${args.externalId} status to ${args.status}`);
    return pkg._id;
  },
});

// Delete a package
export const deletePackage = mutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    if (!pkg) {
      console.error(`[Convex] Package ${args.externalId} not found for deletion`);
      return null;
    }

    await ctx.db.delete(pkg._id);
    console.log(`[Convex] Deleted package: ${args.externalId}`);
    return pkg._id;
  },
});

// Update package details
export const updateDetails = mutation({
  args: {
    externalId: v.string(),
    packageDetails: v.optional(v.any()),
    pii: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();

    if (!pkg) {
      throw new Error(`Package ${args.externalId} not found`);
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.packageDetails) updates.packageDetails = args.packageDetails;
    if (args.pii) updates.pii = args.pii;

    await ctx.db.patch(pkg._id, updates);
    return pkg._id;
  },
});
