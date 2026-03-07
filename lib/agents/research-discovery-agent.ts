/**
 * Research Discovery Agent — Uses Exa search to find relevant online discussions,
 * then extracts evidence from them.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import type { IcpAgentOutput } from "@/lib/validation"

const QUERY_GEN_SYSTEM_PROMPT = `You are an expert research strategist. Given ICP segments and a product description,
generate targeted search queries to find online discussions where the target audience
complains about problems the product could solve.

You MUST respond with valid JSON matching this schema:

{
  "queries": [
    "string — a search query targeting pain points and complaints"
  ]
}

Guidelines:
- Generate 4-6 search queries.
- Target Reddit, forums, review sites, and community discussions.
- Focus on complaints, frustrations, and unmet needs.
- Include product category keywords and competitor names if relevant.
- Mix broad queries with specific ones.
- Respond ONLY with the JSON object.`

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

Generate 4-6 search queries to find online discussions where this audience complains about relevant problems. Respond with JSON only.`

  const result = await generateStructured(
    {
      name: "Research Query Generator",
      systemPrompt: QUERY_GEN_SYSTEM_PROMPT,
    },
    {
      content: prompt,
      modelName: "gpt-4o",
    }
  )

  const jsonStr = extractJson(result.content)
  const parsed = JSON.parse(jsonStr)

  if (!parsed.queries || !Array.isArray(parsed.queries)) {
    throw new Error("Invalid query generation output: missing queries array")
  }

  return { queries: parsed.queries }
}
