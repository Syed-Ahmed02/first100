/**
 * Messaging Agent — Generates campaign messaging angles from validated pain points.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import {
  MessagingAgentOutputSchema,
  type MessagingAgentOutput,
  type IcpSegment,
  type PainPoint,
} from "@/lib/validation"

export interface MessagingAgentInput {
  productDescription: string
  targetAudience: string
  icpSegments: IcpSegment[]
  painPoints: PainPoint[]
}

const SYSTEM_PROMPT = `You are a B2B messaging strategist.

Generate practical messaging angles grounded in pain-point evidence.

Guidelines:
- Create 3-6 messaging angles.
- Keep value props specific and testable.
- Hooks should be short and high-signal.
- CTA variants should be realistic for outbound or landing pages.
- Set targetSegment to a real segment name when possible.
- Return all schema fields. Use empty strings/arrays where needed.`

export async function runMessagingAgent(
  input: MessagingAgentInput
): Promise<MessagingAgentOutput> {
  const segmentSummary = input.icpSegments
    .map(
      (segment) =>
        `- ${segment.segmentName}: roles=${segment.jobTitles.join(", ")}, industries=${segment.industries.join(", ")}`
    )
    .join("\n")

  const painSummary = input.painPoints
    .map(
      (pain, index) =>
        `[${index + 1}] ${pain.theme} (freq=${pain.frequency}, sentiment=${pain.sentiment}): ${pain.description}`
    )
    .join("\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

ICP Segments:
${segmentSummary}

Validated Pain Points:
${painSummary}

Generate campaign messaging angles.`

  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: MessagingAgentOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!output) {
    throw new Error("[MessagingAgent] Failed to generate structured output")
  }

  return output
}
