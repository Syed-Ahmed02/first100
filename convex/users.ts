import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Get or create the current authenticated user.
 * Called on first load after auth to ensure a user record exists.
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const tokenIdentifier = identity.tokenIdentifier

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique()

    if (existing) return existing._id

    const userId = await ctx.db.insert("users", {
      tokenIdentifier,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      avatarUrl: identity.pictureUrl ?? undefined,
      onboardingComplete: false,
    })
    return userId
  },
})

/**
 * Get the current user's profile (returns null if no user record yet).
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()
  },
})

/**
 * Complete onboarding — save profile + goals + product info.
 */
export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    goals: v.string(),
    productDescription: v.string(),
    targetAudience: v.optional(v.string()),
    gmailConnected: v.optional(v.boolean()),
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

    await ctx.db.patch(user._id, {
      name: args.name,
      goals: args.goals,
      productDescription: args.productDescription,
      targetAudience: args.targetAudience,
      gmailConnected: args.gmailConnected ?? false,
      onboardingComplete: true,
    })

    return user._id
  },
})
