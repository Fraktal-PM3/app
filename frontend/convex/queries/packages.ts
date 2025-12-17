import { v } from "convex/values";
import { query } from "../_generated/server";

// List all packages
export const list = query({
  args: {},
  handler: async (ctx) => {
    const packages = await ctx.db.query("packages").collect();
    return packages;
  },
});

// Get package by Convex ID
export const getById = query({
  args: { id: v.id("packages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get package by external ID (blockchain ID)
export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();
  },
});

// Get packages by owner MSP
export const getByOwnerMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("ownerOrgMSP"), args.mspId))
      .collect();
  },
});

// Get packages by sender MSP
export const getBySenderMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("senderOrgMSP"), args.mspId))
      .collect();
  },
});

// Get packages by recipient MSP
export const getByRecipientMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("recipientOrgMSP"), args.mspId))
      .collect();
  },
});

// Get packages by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();
  },
});

// Get packages relevant to an MSP (as sender, owner, or recipient)
export const getByMSP = query({
  args: { mspId: v.string() },
  handler: async (ctx, args) => {
    const allPackages = await ctx.db.query("packages").collect();
    
    return allPackages.filter(
      (pkg) =>
        pkg.ownerOrgMSP === args.mspId ||
        pkg.senderOrgMSP === args.mspId ||
        pkg.recipientOrgMSP === args.mspId
    );
  },
});
