import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    // Auth0 subject ID (e.g. "auth0|abc123")
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Onboarding fields
    goals: v.optional(v.string()),
    productDescription: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    // App connections
    gmailConnected: v.optional(v.boolean()),
    // Onboarding state
    onboardingComplete: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    productDescription: v.string(),
    targetAudience: v.optional(v.string()),
    goals: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
})
