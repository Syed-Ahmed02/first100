import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// ── Step name and status validators (mirror schema) ────────────────────────

const workflowStepName = v.union(
  v.literal("icp_research"),
  v.literal("discussion_discovery"),
  v.literal("evidence_extraction"),
  v.literal("pain_synthesis"),
  v.literal("messaging_generation"),
  v.literal("lead_generation"),
  v.literal("outreach_generation")
)

const stepStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("skipped")
)

// ── Pipeline step order ────────────────────────────────────────────────────

export const PIPELINE_STEPS = [
  "icp_research",
  "discussion_discovery",
  "evidence_extraction",
  "pain_synthesis",
  "messaging_generation",
  "lead_generation",
  "outreach_generation",
] as const

export type PipelineStep = (typeof PIPELINE_STEPS)[number]

function getRetryStartStep(step: PipelineStep): PipelineStep {
  switch (step) {
    case "evidence_extraction":
      return "discussion_discovery"
    default:
      return step
  }
}

// ── Workflow Run CRUD ──────────────────────────────────────────────────────

/**
 * Create a new workflow run for the current user and initialize all steps as pending.
 */
export const createRun = mutation({
  args: {},
  handler: async (ctx) => {
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

    // Create the run
    const runId = await ctx.db.insert("workflowRuns", {
      userId: user._id,
      status: "pending",
      createdAt: now,
    })

    // Initialize all pipeline steps
    for (const step of PIPELINE_STEPS) {
      await ctx.db.insert("workflowSteps", {
        runId,
        userId: user._id,
        step: step as PipelineStep,
        status: "pending",
        retryCount: 0,
        createdAt: now,
      })
    }

    return runId
  },
})

/**
 * Get the latest workflow run for the current user.
 */
export const getLatestRun = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (!user) return null

    const runs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1)

    return runs[0] ?? null
  },
})

/**
 * Get all runs for the current user.
 */
export const listRuns = query({
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
      .query("workflowRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect()
  },
})

/**
 * Get all steps for a workflow run.
 */
export const getSteps = query({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()
  },
})

/**
 * Get steps for the current user's latest run.
 */
export const getCurrentUserSteps = query({
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

    const runs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1)

    const latestRun = runs[0]
    if (!latestRun) return []

    return await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", latestRun._id))
      .collect()
  },
})

/**
 * Get a workflow run by ID.
 */
export const getRun = query({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId)
  },
})

// ── Workflow Run Mutations ─────────────────────────────────────────────────

/**
 * Start a workflow run.
 */
export const startRun = mutation({
  args: {
    runId: v.id("workflowRuns"),
    currentStep: v.optional(workflowStepName),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "running",
      currentStep: args.currentStep ?? "icp_research",
      startedAt: Date.now(),
      completedAt: undefined,
      error: undefined,
    })
  },
})

/**
 * Complete a workflow run.
 */
export const completeRun = mutation({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "completed",
      currentStep: undefined,
      completedAt: Date.now(),
    })
  },
})

/**
 * Fail a workflow run.
 */
export const failRun = mutation({
  args: {
    runId: v.id("workflowRuns"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      currentStep: undefined,
      error: args.error,
      completedAt: Date.now(),
    })
  },
})

/**
 * Cancel a workflow run.
 */
export const cancelRun = mutation({
  args: { runId: v.id("workflowRuns") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "cancelled",
      currentStep: undefined,
      completedAt: Date.now(),
    })
  },
})

/**
 * Reset a run from a specific step so it can be retried.
 */
export const resetRunFromStep = mutation({
  args: {
    runId: v.id("workflowRuns"),
    step: workflowStepName,
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

    const run = await ctx.db.get(args.runId)
    if (!run || run.userId !== user._id) {
      throw new Error("Run not found")
    }

    const startStep = getRetryStartStep(args.step as PipelineStep)
    const startIndex = PIPELINE_STEPS.indexOf(startStep)

    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()

    for (const stepDoc of steps) {
      const stepIndex = PIPELINE_STEPS.indexOf(stepDoc.step as PipelineStep)
      if (stepIndex >= startIndex) {
        await ctx.db.patch(stepDoc._id, {
          status: "pending",
          startedAt: undefined,
          completedAt: undefined,
          durationMs: undefined,
          error: undefined,
          metadata: undefined,
        })
      }
    }

    async function deleteByRun(
      table:
        | "icpProfiles"
        | "discussionSources"
        | "painPoints"
        | "messagingAngles"
        | "leadLists"
        | "outreachDrafts"
    ) {
      const docs = await ctx.db
        .query(table)
        .withIndex("by_run", (q) => q.eq("runId", args.runId))
        .collect()

      for (const doc of docs) {
        await ctx.db.delete(doc._id)
      }
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("icp_research")) {
      await deleteByRun("icpProfiles")
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("discussion_discovery")) {
      await deleteByRun("discussionSources")
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("pain_synthesis")) {
      await deleteByRun("painPoints")
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("messaging_generation")) {
      await deleteByRun("messagingAngles")
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("lead_generation")) {
      const leadLists = await ctx.db
        .query("leadLists")
        .withIndex("by_run", (q) => q.eq("runId", args.runId))
        .collect()

      for (const leadList of leadLists) {
        const leads = await ctx.db
          .query("leads")
          .withIndex("by_lead_list", (q) => q.eq("leadListId", leadList._id))
          .collect()

        for (const lead of leads) {
          const drafts = await ctx.db
            .query("outreachDrafts")
            .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
            .collect()

          for (const draft of drafts) {
            await ctx.db.delete(draft._id)
          }

          await ctx.db.delete(lead._id)
        }

        await ctx.db.delete(leadList._id)
      }
    }

    if (startIndex <= PIPELINE_STEPS.indexOf("outreach_generation")) {
      await deleteByRun("outreachDrafts")
    }

    await ctx.db.patch(args.runId, {
      status: "pending",
      currentStep: startStep,
      completedAt: undefined,
      error: undefined,
    })

    return { runId: args.runId, startStep }
  },
})

// ── Step Mutations ─────────────────────────────────────────────────────────

/**
 * Update a step's status.
 */
export const updateStep = mutation({
  args: {
    stepId: v.id("workflowSteps"),
    status: stepStatus,
    error: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const step = await ctx.db.get(args.stepId)
    if (!step) throw new Error("Step not found")

    const patch: Record<string, unknown> = { status: args.status }

    if (args.status === "running") {
      patch.startedAt = now
    }

    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = now
      if (step.startedAt) {
        patch.durationMs = now - step.startedAt
      }
    }

    if (args.status === "failed") {
      patch.retryCount = step.retryCount + 1
    }

    if (args.error !== undefined) {
      patch.error = args.error
    }

    if (args.metadata !== undefined) {
      patch.metadata = args.metadata
    }

    await ctx.db.patch(args.stepId, patch)

    // Update the run's currentStep
    if (args.status === "running") {
      await ctx.db.patch(step.runId, { currentStep: step.step })
    }
  },
})

/**
 * Start a specific step by step name within a run.
 */
export const startStep = mutation({
  args: {
    runId: v.id("workflowRuns"),
    step: workflowStepName,
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()

    const targetStep = steps.find((s) => s.step === args.step)
    if (!targetStep) throw new Error(`Step ${args.step} not found in run`)

    await ctx.db.patch(targetStep._id, {
      status: "running",
      startedAt: Date.now(),
    })

    await ctx.db.patch(args.runId, { currentStep: args.step })
  },
})

/**
 * Complete a specific step by step name within a run.
 */
export const completeStep = mutation({
  args: {
    runId: v.id("workflowRuns"),
    step: workflowStepName,
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()

    const targetStep = steps.find((s) => s.step === args.step)
    if (!targetStep) throw new Error(`Step ${args.step} not found in run`)

    const now = Date.now()
    await ctx.db.patch(targetStep._id, {
      status: "completed",
      completedAt: now,
      durationMs: targetStep.startedAt ? now - targetStep.startedAt : undefined,
      metadata: args.metadata,
    })
  },
})

/**
 * Fail a specific step by step name within a run.
 */
export const failStep = mutation({
  args: {
    runId: v.id("workflowRuns"),
    step: workflowStepName,
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect()

    const targetStep = steps.find((s) => s.step === args.step)
    if (!targetStep) throw new Error(`Step ${args.step} not found in run`)

    const now = Date.now()
    await ctx.db.patch(targetStep._id, {
      status: "failed",
      completedAt: now,
      durationMs: targetStep.startedAt ? now - targetStep.startedAt : undefined,
      error: args.error,
      retryCount: targetStep.retryCount + 1,
    })
  },
})

