/**
 * Research Discovery Agent — Uses Exa search to find relevant online discussions,
 * then extracts evidence from them.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import type { IcpAgentOutput } from "@/lib/validation"

const QUERY_GEN_SYSTEM_PROMPT = `You are an expert research strategist. Given ICP segments and a product description,
generate targeted search queries to find online discussions where the target audience
complains about problems the product could solve.

You MUST respond with valid JSON containing a "queries" array of strings. Each string should be a search query targeting pain points and complaints.

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

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    console.error(
      "[ResearchDiscoveryAgent] Failed to parse JSON. Raw content:",
      result.content.slice(0, 500)
    )
    console.error(
      "[ResearchDiscoveryAgent] Extracted JSON string:",
      jsonStr.slice(0, 500)
    )
    throw err
  }

  if (!parsed.queries || !Array.isArray(parsed.queries)) {
    throw new Error("Invalid query generation output: missing queries array")
  }

  return { queries: parsed.queries }
}
