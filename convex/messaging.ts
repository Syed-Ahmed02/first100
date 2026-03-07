import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Store messaging angles for a project run.
 */
export const storeMessagingAngles = mutation({
  args: {
    projectId: v.id("projects"),
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
        projectId: args.projectId,
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
 * Get messaging angles for a project.
 */
export const getMessagingAngles = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messagingAngles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})
