import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Create a lead list for a project run.
 */
export const createLeadList = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    provider: v.string(),
    searchCriteria: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadLists", {
      projectId: args.projectId,
      runId: args.runId,
      provider: args.provider,
      searchCriteria: args.searchCriteria,
      status: "pending",
      createdAt: Date.now(),
    })
  },
})

/**
 * Update a lead list status.
 */
export const updateLeadList = mutation({
  args: {
    leadListId: v.id("leadLists"),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalResults: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status }
    if (args.totalResults !== undefined) patch.totalResults = args.totalResults
    if (args.error !== undefined) patch.error = args.error
    await ctx.db.patch(args.leadListId, patch)
  },
})

/**
 * Store leads for a lead list.
 */
export const storeLeads = mutation({
  args: {
    projectId: v.id("projects"),
    leadListId: v.id("leadLists"),
    leads: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        title: v.optional(v.string()),
        email: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        companyName: v.optional(v.string()),
        companyDomain: v.optional(v.string()),
        companyDescription: v.optional(v.string()),
        companySize: v.optional(v.string()),
        industry: v.optional(v.string()),
        source: v.string(),
        confidence: v.optional(v.number()),
        enrichmentMetadata: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const lead of args.leads) {
      const id = await ctx.db.insert("leads", {
        projectId: args.projectId,
        leadListId: args.leadListId,
        ...lead,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get leads for a project.
 */
export const getLeads = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})

/**
 * Get lead lists for a project.
 */
export const getLeadLists = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leadLists")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})
