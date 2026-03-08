import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// ── Shared value helpers ──────────────────────────────────────────────────────

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

// ── Schema ────────────────────────────────────────────────────────────────────

export default defineSchema({
  // ── Users ─────────────────────────────────────────────────────────────────
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    goals: v.optional(v.string()),
    productDescription: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    gmailConnected: v.optional(v.boolean()),
    onboardingComplete: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  // ── Projects ──────────────────────────────────────────────────────────────
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

  // ── Workflow Runs ─────────────────────────────────────────────────────────
  // One run per pipeline execution for a project
  workflowRuns: defineTable({
    projectId: v.id("projects"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    currentStep: v.optional(workflowStepName),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // ── Workflow Steps ────────────────────────────────────────────────────────
  // Individual step tracking within a run
  workflowSteps: defineTable({
    runId: v.id("workflowRuns"),
    projectId: v.id("projects"),
    step: workflowStepName,
    status: stepStatus,
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    retryCount: v.number(),
    metadata: v.optional(v.string()), // JSON-serialized step metadata
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_project_step", ["projectId", "step"]),

  // ── ICP Profiles ──────────────────────────────────────────────────────────
  icpProfiles: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    // Segment identity
    segmentName: v.string(),
    isPrimary: v.boolean(),
    // Demographics
    jobTitles: v.array(v.string()),
    seniorityLevels: v.optional(v.array(v.string())),
    industries: v.array(v.string()),
    companySizeRange: v.optional(v.string()), // e.g. "50-200"
    geographies: v.optional(v.array(v.string())),
    // Psychographics
    responsibilities: v.optional(v.array(v.string())),
    goals: v.optional(v.array(v.string())),
    challenges: v.optional(v.array(v.string())),
    // Confidence & notes
    confidenceScore: v.optional(v.number()), // 0-1
    reasoning: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"]),

  // ── Discussion Sources ────────────────────────────────────────────────────
  // Raw evidence from online discussions (Reddit, forums, etc.)
  discussionSources: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    // Source identification
    sourceType: v.union(
      v.literal("reddit"),
      v.literal("hackernews"),
      v.literal("forum"),
      v.literal("review_site"),
      v.literal("other")
    ),
    url: v.string(),
    postId: v.optional(v.string()), // Platform-specific ID
    // Content
    title: v.optional(v.string()),
    body: v.string(),
    author: v.optional(v.string()),
    community: v.optional(v.string()), // subreddit, forum name, etc.
    // Metadata
    score: v.optional(v.number()), // upvotes/likes
    commentCount: v.optional(v.number()),
    postedAt: v.optional(v.number()),
    fetchedAt: v.number(),
    // Quality
    relevanceScore: v.optional(v.number()), // 0-1
    isFiltered: v.optional(v.boolean()), // flagged as spam/irrelevant
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"])
    .index("by_url", ["url"]),

  // ── Pain Points ───────────────────────────────────────────────────────────
  // Clustered pain points with evidence
  painPoints: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    // Theme
    theme: v.string(),
    description: v.string(),
    category: v.optional(v.string()), // e.g. "usability", "pricing", "integration"
    // Strength signals
    frequency: v.number(), // how many sources mention it
    sentiment: v.union(
      v.literal("very_negative"),
      v.literal("negative"),
      v.literal("neutral"),
      v.literal("mixed")
    ),
    confidenceScore: v.number(), // 0-1
    // Evidence links (IDs of discussionSources)
    evidenceSnippets: v.array(
      v.object({
        sourceId: v.id("discussionSources"),
        quote: v.string(),
        url: v.string(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"]),

  // ── Messaging Angles ──────────────────────────────────────────────────────
  messagingAngles: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    // Core message
    angle: v.string(),
    valueProp: v.string(),
    // Linked pain points
    supportingPainPointIds: v.array(v.id("painPoints")),
    // Creative outputs
    hooks: v.array(v.string()),
    ctaVariants: v.optional(v.array(v.string())),
    landingPageCopy: v.optional(v.string()),
    // Metadata
    targetSegment: v.optional(v.string()),
    channel: v.optional(v.string()), // email, linkedin, ad, etc.
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"]),

  // ── Lead Lists ────────────────────────────────────────────────────────────
  leadLists: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    // Provider info
    provider: v.string(), // "apollo", "linkedin", etc.
    // Search criteria used
    searchCriteria: v.string(), // JSON-serialized search params
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalResults: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"]),

  // ── Leads ─────────────────────────────────────────────────────────────────
  leads: defineTable({
    projectId: v.id("projects"),
    leadListId: v.id("leadLists"),
    // Person
    firstName: v.string(),
    lastName: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    // Company
    companyName: v.optional(v.string()),
    companyDomain: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    companySize: v.optional(v.string()),
    industry: v.optional(v.string()),
    // Enrichment
    source: v.string(), // provider name
    confidence: v.optional(v.number()), // 0-1
    enrichmentMetadata: v.optional(v.string()), // JSON - provider-specific data
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_lead_list", ["leadListId"]),

  // ── Outreach Drafts ───────────────────────────────────────────────────────
  outreachDrafts: defineTable({
    projectId: v.id("projects"),
    runId: v.id("workflowRuns"),
    leadId: v.id("leads"),
    // Content
    channel: v.union(
      v.literal("email"),
      v.literal("linkedin"),
      v.literal("twitter"),
      v.literal("other")
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    // Personalization context (what inputs drove this draft)
    personalizationInputs: v.optional(v.string()), // JSON
    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("rejected")
    ),
    // Versioning
    version: v.number(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"])
    .index("by_lead", ["leadId"]),

  // ── Chat ──────────────────────────────────────────────────────────────────
  chatThreads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),
})
