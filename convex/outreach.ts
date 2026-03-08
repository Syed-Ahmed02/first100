import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Store outreach drafts for a user run.
 */
export const storeDrafts = mutation({
  args: {
    userId: v.id("users"),
    runId: v.id("workflowRuns"),
    drafts: v.array(
      v.object({
        leadId: v.id("leads"),
        channel: v.union(
          v.literal("email"),
          v.literal("linkedin"),
          v.literal("twitter"),
          v.literal("other")
        ),
        subject: v.optional(v.string()),
        body: v.string(),
        personalizationInputs: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const draft of args.drafts) {
      const id = await ctx.db.insert("outreachDrafts", {
        userId: args.userId,
        runId: args.runId,
        ...draft,
        status: "draft",
        version: 1,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get outreach drafts for the current user.
 */
export const getDrafts = query({
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
      .query("outreachDrafts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
  },
})

/**
 * Get outreach drafts for a run.
 */
export const getDraftsByRun = query({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachDrafts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()
  },
})

/**
 * Update an outreach draft's status.
 */
export const updateDraftStatus = mutation({
  args: {
    draftId: v.id("outreachDrafts"),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.draftId, { status: args.status })
  },
})

/**
 * Get outreach drafts for a specific lead.
 */
export const getDraftsByLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachDrafts")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect()
  },
})
