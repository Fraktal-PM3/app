import { query } from "../_generated/server";
import { v } from "convex/values";

// Get recent activities (packages, transfers, announcements combined)
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get activity events directly from the log
    const events = await ctx.db
      .query("activityEvents")
      .order("desc")
      .take(limit);

    // Transform to activity format
    return events.map((event) => ({
      id: event._id,
      type: event.type,
      timestamp: event._creationTime,
      title: event.title,
      description: event.description,
      metadata: {
        ...event.metadata,
        packageExternalId: event.packageExternalId,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      },
    }));
  },
});
