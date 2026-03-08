import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Store messaging angles for a user run.
 */
export const storeMessagingAngles = mutation({
  args: {
    userId: v.id("users"),
    runId: v.id("workflowRuns"),
    angles: v.array(
      v.object({
        angle: v.string(),
        valueProp: v.string(),
        supportingPainPointIds: v.array(v.id("painPoints")),
        hooks: v.array(v.string()),
        ctaVariants: v.optional(v.array(v.string())),
        landingPageCopy: v.optional(v.string()),
        targetSegment: v.optional(v.string()),
        channel: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const angle of args.angles) {
      const id = await ctx.db.insert("messagingAngles", {
        userId: args.userId,
        runId: args.runId,
        ...angle,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get messaging angles for the current user.
 */
export const getMessagingAngles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user) return []

    return await ctx.db
      .query("messagingAngles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
  },
})

/**
 * Get messaging angles for a run.
 */
export const getMessagingAnglesByRun = query({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messagingAngles")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()
  },
})
