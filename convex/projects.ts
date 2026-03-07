import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * List all projects for the current user.
 */
export const list = query({
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
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
  },
})

/**
 * Get a single project by ID.
 */
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const project = await ctx.db.get(args.projectId)
    if (!project) return null

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user || project.userId !== user._id) return null

    return project
  },
})

/**
 * Create a new project.
 */
export const create = mutation({
  args: {
    name: v.string(),
    productDescription: v.string(),
    targetAudience: v.optional(v.string()),
    goals: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user) throw new Error("User not found")

    return await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      productDescription: args.productDescription,
      targetAudience: args.targetAudience,
      goals: args.goals,
      status: "draft",
      createdAt: Date.now(),
    })
  },
})

/**
 * Update project status.
 */
export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const project = await ctx.db.get(args.projectId)
    if (!project) throw new Error("Project not found")

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user || project.userId !== user._id) throw new Error("Not authorized")

    await ctx.db.patch(args.projectId, { status: args.status })
  },
})
