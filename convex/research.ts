import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Store ICP profiles for a project run.
 */
export const storeIcpProfiles = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    profiles: v.array(
      v.object({
        segmentName: v.string(),
        isPrimary: v.boolean(),
        jobTitles: v.array(v.string()),
        seniorityLevels: v.optional(v.array(v.string())),
        industries: v.array(v.string()),
        companySizeRange: v.optional(v.string()),
        geographies: v.optional(v.array(v.string())),
        responsibilities: v.optional(v.array(v.string())),
        goals: v.optional(v.array(v.string())),
        challenges: v.optional(v.array(v.string())),
        confidenceScore: v.optional(v.number()),
        reasoning: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const profile of args.profiles) {
      const id = await ctx.db.insert("icpProfiles", {
        projectId: args.projectId,
        runId: args.runId,
        ...profile,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get ICP profiles for a project.
 */
export const getIcpProfiles = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("icpProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})

/**
 * Store discussion sources for a project run.
 */
export const storeDiscussionSources = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    sources: v.array(
      v.object({
        sourceType: v.union(
          v.literal("reddit"),
          v.literal("hackernews"),
          v.literal("forum"),
          v.literal("review_site"),
          v.literal("other")
        ),
        url: v.string(),
        postId: v.optional(v.string()),
        title: v.optional(v.string()),
        body: v.string(),
        author: v.optional(v.string()),
        community: v.optional(v.string()),
        score: v.optional(v.number()),
        commentCount: v.optional(v.number()),
        postedAt: v.optional(v.number()),
        relevanceScore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const source of args.sources) {
      const id = await ctx.db.insert("discussionSources", {
        projectId: args.projectId,
        runId: args.runId,
        ...source,
        fetchedAt: now,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get discussion sources for a project.
 */
export const getDiscussionSources = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("discussionSources")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})

/**
 * Store pain points for a project run.
 */
export const storePainPoints = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    painPoints: v.array(
      v.object({
        theme: v.string(),
        description: v.string(),
        category: v.optional(v.string()),
        frequency: v.number(),
        sentiment: v.union(
          v.literal("very_negative"),
          v.literal("negative"),
          v.literal("neutral"),
          v.literal("mixed")
        ),
        confidenceScore: v.number(),
        evidenceSnippets: v.array(
          v.object({
            sourceId: v.id("discussionSources"),
            quote: v.string(),
            url: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []
    for (const pp of args.painPoints) {
      const id = await ctx.db.insert("painPoints", {
        projectId: args.projectId,
        runId: args.runId,
        ...pp,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

/**
 * Get pain points for a project.
 */
export const getPainPoints = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("painPoints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})
