/**
 * Outreach Agent — Generates personalized drafts for each lead.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import {
  OutreachAgentOutputSchema,
  type OutreachAgentOutput,
  type Lead,
  type MessagingAngle,
  type PainPoint,
} from "@/lib/validation"

export interface OutreachAgentInput {
  productDescription: string
  targetAudience: string
  leads: Lead[]
  messagingAngles: MessagingAngle[]
  painPoints: PainPoint[]
}

const SYSTEM_PROMPT = `You are a B2B SDR and copywriter.

Generate concise, personalized outreach drafts for each lead.

Guidelines:
- Generate one draft per lead index when possible.
- Keep tone direct, non-spammy, and relevant to the lead role/company.
- Use validated pain points and messaging angles for context.
- Email drafts should include a short subject.
- Keep body practical and skimmable.
- Return all schema fields.`

export async function runOutreachAgent(
  input: OutreachAgentInput
): Promise<OutreachAgentOutput> {
  const leadsSummary = input.leads
    .map(
      (lead, index) =>
        `[${index}] ${lead.firstName} ${lead.lastName} — ${lead.title || "N/A"} at ${lead.companyName || "N/A"} (${lead.industry || "N/A"})`
    )
    .join("\n")

  const messagingSummary = input.messagingAngles
    .slice(0, 4)
    .map((angle) => `- ${angle.angle}: ${angle.valueProp}`)
    .join("\n")

  const painSummary = input.painPoints
    .slice(0, 5)
    .map((pain) => `- ${pain.theme}: ${pain.description}`)
    .join("\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

Leads:
${leadsSummary}

Messaging Angles:
${messagingSummary}

Pain Points:
${painSummary}

Generate personalized drafts.`

  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: OutreachAgentOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!output) {
    throw new Error("[OutreachAgent] Failed to generate structured output")
  }

  return output
}
