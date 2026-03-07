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
  seniorityLevels: z
    .array(z.string())
    .optional()
    .describe("Typical seniority levels"),
  industries: z.array(z.string()).describe("Target industries"),
  companySizeRange: z
    .string()
    .optional()
    .describe("Company size range, e.g. '50-200'"),
  geographies: z.array(z.string()).optional().describe("Target geographies"),
  responsibilities: z
    .array(z.string())
    .optional()
    .describe("Key responsibilities"),
  goals: z
    .array(z.string())
    .optional()
    .describe("What this persona is trying to achieve"),
  challenges: z
    .array(z.string())
    .optional()
    .describe("Major challenges and frustrations"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Confidence score 0-1"),
  reasoning: z.string().optional().describe("Why this segment was identified"),
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
  url: z.string().url(),
  postId: z.string().optional(),
  title: z.string().optional(),
  body: z.string(),
  author: z.string().optional(),
  community: z.string().optional(),
  score: z.number().optional(),
  commentCount: z.number().optional(),
  postedAt: z.number().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
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
    .optional()
    .describe("Category: usability, pricing, integration, etc."),
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
    .optional()
    .describe("Call-to-action variants"),
  landingPageCopy: z
    .string()
    .optional()
    .describe("Suggested landing page copy"),
  targetSegment: z
    .string()
    .optional()
    .describe("Which ICP segment this targets"),
  channel: z
    .string()
    .optional()
    .describe("Intended channel: email, linkedin, ad, etc."),
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
  title: z.string().optional(),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  companyDescription: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  source: z.string().describe("Provider that returned this lead"),
  confidence: z.number().min(0).max(1).optional(),
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
  subject: z.string().optional(),
  body: z.string(),
  personalizationInputs: z
    .record(z.string(), z.string())
    .optional()
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
