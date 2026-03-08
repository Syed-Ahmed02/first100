/**
 * Research Discovery Agent — Generates search queries to find relevant
 * online discussions based on ICP segments and product context.
 *
 * Uses Vercel AI SDK generateText() with Output.object() and OpenRouter.
 */

import { generateText, Output } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai"
import { DISCUSSION_SITE_ALLOWLIST } from "@/lib/providers/exa"
import type { IcpAgentOutput } from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert research strategist. Given ICP segments and a product description,
generate targeted search queries to find online discussions where the target audience
complains about problems the product could solve.

Guidelines:
- Generate 4-6 search queries.
- Target discussion-heavy sites only: ${DISCUSSION_SITE_ALLOWLIST.join(", ")}.
- Focus on complaints, frustrations, and unmet needs.
- Include product category keywords and competitor names if relevant.
- Phrase queries to surface forum threads, review discussions, and complaint posts.
- Do not mention websites outside the allowlist.`

const QueryGenOutputSchema = z.object({
  queries: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("Search queries targeting pain points on approved discussion websites"),
})

export interface QueryGenInput {
  productDescription: string
  targetAudience: string
  icpSegments: IcpAgentOutput["segments"]
}

export interface QueryGenOutput {
  queries: string[]
}

/**
 * Generate search queries based on ICP and product context.
 */
export async function generateSearchQueries(
  input: QueryGenInput
): Promise<QueryGenOutput> {
  const segmentSummary = input.icpSegments
    .map(
      (s) =>
        `- ${s.segmentName} (${s.isPrimary ? "PRIMARY" : "alternate"}): ${s.jobTitles.join(", ")} in ${s.industries.join(", ")}. Challenges: ${s.challenges?.join(", ") ?? "N/A"}`
    )
    .join("\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

ICP Segments:
${segmentSummary}

Generate 4-6 search queries to find online discussions where this audience complains about relevant problems.`

  const { output: result } = await generateText({
    model: getModel(),
    output: Output.object({ schema: QueryGenOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!result) {
    throw new Error(
      "[ResearchDiscoveryAgent] Failed to generate structured output"
    )
  }

  console.log(
    `[ResearchDiscoveryAgent] Generated ${result.queries.length} search queries`
  )

  return result
}
