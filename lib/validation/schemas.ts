/**
 * Shared Zod schemas for agent handoff contracts.
 *
 * These schemas define the typed output each agent produces.
 * They serve as the contract between pipeline steps and are used for:
 * - Validating structured LLM outputs
 * - Type-safe agent-to-agent handoffs
 * - Frontend display typing
 */

import { z } from "zod"

// ── Pipeline Step Names ──────────────────────────────────────────────────────

export const PipelineStepSchema = z.enum([
  "icp_research",
  "discussion_discovery",
  "evidence_extraction",
  "pain_synthesis",
  "messaging_generation",
  "lead_generation",
  "outreach_generation",
])
export type PipelineStep = z.infer<typeof PipelineStepSchema>

export const StepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
])
export type StepStatus = z.infer<typeof StepStatusSchema>

// ── Step display metadata ────────────────────────────────────────────────────

export const STEP_DISPLAY: Record<
  PipelineStep,
  { label: string; description: string; order: number }
> = {
  icp_research: {
    label: "ICP Research",
    description: "Identify ideal customer profile segments",
    order: 0,
  },
  discussion_discovery: {
    label: "Discussion Discovery",
    description: "Find relevant online discussions and sources",
    order: 1,
  },
  evidence_extraction: {
    label: "Evidence Extraction",
    description: "Extract complaints and insights from sources",
    order: 2,
  },
  pain_synthesis: {
    label: "Pain Synthesis",
    description: "Cluster evidence into recurring pain points",
    order: 3,
  },
  messaging_generation: {
    label: "Messaging",
    description: "Generate positioning, hooks, and campaign angles",
    order: 4,
  },
  lead_generation: {
    label: "Lead Generation",
    description: "Find and normalize qualified leads",
    order: 5,
  },
  outreach_generation: {
    label: "Outreach",
    description: "Create personalized outbound drafts",
    order: 6,
  },
}

// ── ICP Agent Output ─────────────────────────────────────────────────────────

export const IcpSegmentSchema = z.object({
  segmentName: z.string().describe("Name of the ICP segment"),
  isPrimary: z.boolean().describe("Whether this is the primary target segment"),
  jobTitles: z.array(z.string()).describe("Common job titles in this segment"),
  seniorityLevels: z.array(z.string()).describe("Typical seniority levels"),
  industries: z.array(z.string()).describe("Target industries"),
  companySizeRange: z
    .string()
    .describe("Company size range, e.g. '50-200'. Use an empty string if unknown."),
  geographies: z.array(z.string()).describe("Target geographies"),
  responsibilities: z.array(z.string()).describe("Key responsibilities"),
  goals: z.array(z.string()).describe("What this persona is trying to achieve"),
  challenges: z
    .array(z.string())
    .describe("Major challenges and frustrations"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score 0-1"),
  reasoning: z
    .string()
    .describe("Why this segment was identified. Use an empty string if brief."),
})
export type IcpSegment = z.infer<typeof IcpSegmentSchema>

export const IcpAgentOutputSchema = z.object({
  segments: z
    .array(IcpSegmentSchema)
    .min(1)
    .max(5)
    .describe("1-5 ICP segments, first should be primary"),
})
export type IcpAgentOutput = z.infer<typeof IcpAgentOutputSchema>

// ── Discussion Discovery Agent Output ────────────────────────────────────────

export const DiscussionSourceSchema = z.object({
  sourceType: z.enum(["reddit", "hackernews", "forum", "review_site", "other"]),
  url: z
    .string()
    .describe("Source URL. Return the full URL string, or an empty string if unavailable."),
  postId: z.string().describe("Platform-specific ID. Use an empty string if unavailable."),
  title: z.string().describe("Source title. Use an empty string if unavailable."),
  body: z.string(),
  author: z.string().describe("Author name. Use an empty string if unavailable."),
  community: z
    .string()
    .describe("Community or forum name. Use an empty string if unavailable."),
  score: z.number().describe("Engagement score. Use 0 if unavailable."),
  commentCount: z.number().describe("Comment count. Use 0 if unavailable."),
  postedAt: z
    .number()
    .describe("Unix timestamp in ms. Use 0 if unavailable."),
  relevanceScore: z.number().min(0).max(1),
})
export type DiscussionSource = z.infer<typeof DiscussionSourceSchema>

export const DiscoveryAgentOutputSchema = z.object({
  sources: z.array(DiscussionSourceSchema),
  searchQueries: z.array(z.string()).describe("Queries used to find sources"),
})
export type DiscoveryAgentOutput = z.infer<typeof DiscoveryAgentOutputSchema>

// ── Pain Synthesis Agent Output ──────────────────────────────────────────────

export const EvidenceSnippetSchema = z.object({
  sourceUrl: z.string(),
  quote: z.string(),
})

export const PainPointSchema = z.object({
  theme: z.string().describe("Short label for the pain point"),
  description: z.string().describe("Detailed description of the pain point"),
  category: z
    .string()
    .describe("Category: usability, pricing, integration, etc. Use an empty string if none."),
  frequency: z.number().describe("How many sources mention this"),
  sentiment: z.enum(["very_negative", "negative", "neutral", "mixed"]),
  confidenceScore: z.number().min(0).max(1),
  evidenceSnippets: z
    .array(EvidenceSnippetSchema)
    .describe("Supporting quotes with source URLs"),
})
export type PainPoint = z.infer<typeof PainPointSchema>

export const PainSynthesisOutputSchema = z.object({
  painPoints: z.array(PainPointSchema),
})
export type PainSynthesisOutput = z.infer<typeof PainSynthesisOutputSchema>

// ── Messaging Agent Output ───────────────────────────────────────────────────

export const MessagingAngleSchema = z.object({
  angle: z.string().describe("Messaging angle name"),
  valueProp: z.string().describe("Core value proposition"),
  hooks: z.array(z.string()).describe("Attention-grabbing hooks"),
  ctaVariants: z
    .array(z.string())
    .describe("Call-to-action variants"),
  landingPageCopy: z
    .string()
    .describe("Suggested landing page copy. Use an empty string if not provided."),
  targetSegment: z
    .string()
    .describe("Which ICP segment this targets. Use an empty string if broad."),
  channel: z
    .string()
    .describe("Intended channel: email, linkedin, ad, etc. Use an empty string if unspecified."),
})
export type MessagingAngle = z.infer<typeof MessagingAngleSchema>

export const MessagingAgentOutputSchema = z.object({
  angles: z.array(MessagingAngleSchema),
})
export type MessagingAgentOutput = z.infer<typeof MessagingAgentOutputSchema>

// ── Lead Agent Output ────────────────────────────────────────────────────────

export const LeadSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().describe("Job title. Use an empty string if unavailable."),
  email: z.string().describe("Email address. Use an empty string if unavailable."),
  linkedinUrl: z.string().describe("LinkedIn URL. Use an empty string if unavailable."),
  companyName: z.string().describe("Company name. Use an empty string if unavailable."),
  companyDomain: z.string().describe("Company domain. Use an empty string if unavailable."),
  companyDescription: z
    .string()
    .describe("Company description. Use an empty string if unavailable."),
  companySize: z.string().describe("Company size. Use an empty string if unavailable."),
  industry: z.string().describe("Industry. Use an empty string if unavailable."),
  source: z.string().describe("Provider that returned this lead"),
  confidence: z.number().min(0).max(1),
})
export type Lead = z.infer<typeof LeadSchema>

export const LeadAgentOutputSchema = z.object({
  leads: z.array(LeadSchema),
  searchCriteria: z
    .record(z.string(), z.unknown())
    .describe("Filters used for lead search"),
  provider: z.string(),
})
export type LeadAgentOutput = z.infer<typeof LeadAgentOutputSchema>

// ── Outreach Agent Output ────────────────────────────────────────────────────

export const OutreachDraftSchema = z.object({
  channel: z.enum(["email", "linkedin", "twitter", "other"]),
  subject: z.string().describe("Subject line. Use an empty string for non-email drafts."),
  body: z.string(),
  personalizationInputs: z
    .record(z.string(), z.string())
    .describe("Key personalization data used"),
})
export type OutreachDraft = z.infer<typeof OutreachDraftSchema>

export const OutreachAgentOutputSchema = z.object({
  drafts: z.array(
    z.object({
      leadIndex: z.number().describe("Index into the leads array"),
      draft: OutreachDraftSchema,
    })
  ),
})
export type OutreachAgentOutput = z.infer<typeof OutreachAgentOutputSchema>
