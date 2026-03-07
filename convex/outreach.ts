import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Store outreach drafts for a project run.
 */
export const storeDrafts = mutation({
  args: {
    projectId: v.id("projects"),
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
        projectId: args.projectId,
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
 * Get outreach drafts for a project.
 */
export const getDrafts = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachDrafts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
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
