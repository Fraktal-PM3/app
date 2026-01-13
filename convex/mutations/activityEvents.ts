import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Log an activity event
export const logEvent = mutation({
  args: {
    type: v.string(),
    packageId: v.optional(v.id("packages")),
    packageExternalId: v.optional(v.string()),
    transferId: v.optional(v.id("transfers")),
    announcementId: v.optional(v.id("packageAnnouncements")),
    offerId: v.optional(v.id("transferOffers")),
    title: v.string(),
    description: v.string(),
    oldStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("activityEvents", args);
    console.log(`[Convex] Activity event logged: ${args.type} - ${args.title}`);
    return id;
  },
});
