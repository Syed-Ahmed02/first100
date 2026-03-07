import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Create a new chat thread for the current user.
 */
export const createThread = mutation({
  args: {
    backboardAssistantId: v.string(),
    backboardThreadId: v.string(),
    title: v.string(),
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

    const now = Date.now()
    const threadId = await ctx.db.insert("chatThreads", {
      userId: user._id,
      backboardAssistantId: args.backboardAssistantId,
      backboardThreadId: args.backboardThreadId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    })

    return threadId
  },
})

/**
 * List all chat threads for the current user, most recent first.
 */
export const listThreads = query({
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

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    // Sort by updatedAt descending
    return threads.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

/**
 * Get a single chat thread by ID (with ownership check).
 */
export const getThread = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user) return null

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== user._id) return null

    return thread
  },
})

/**
 * Update thread title and updatedAt timestamp.
 */
export const updateThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
    title: v.optional(v.string()),
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

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== user._id) {
      throw new Error("Thread not found")
    }

    await ctx.db.patch(args.threadId, {
      ...(args.title !== undefined && { title: args.title }),
      updatedAt: Date.now(),
    })
  },
})

/**
 * Delete a chat thread and all its messages.
 */
export const deleteThread = mutation({
  args: { threadId: v.id("chatThreads") },
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

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== user._id) {
      throw new Error("Thread not found")
    }

    // Delete all messages in the thread
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()

    for (const msg of messages) {
      await ctx.db.delete(msg._id)
    }

    await ctx.db.delete(args.threadId)
  },
})

/**
 * Save a message to a chat thread.
 */
export const saveMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
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

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== user._id) {
      throw new Error("Thread not found")
    }

    const messageId = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    })

    // Update thread's updatedAt
    await ctx.db.patch(args.threadId, { updatedAt: Date.now() })

    return messageId
  },
})

/**
 * Get all messages for a chat thread (ordered by creation time).
 */
export const listMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user) return []

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== user._id) return []

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()

    return messages.sort((a, b) => a.createdAt - b.createdAt)
  },
})
