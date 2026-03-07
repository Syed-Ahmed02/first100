/**
 * ICP Agent — Generates Ideal Customer Profile segments from product/audience input.
 *
 * Uses Backboard for structured LLM generation, validates output with Zod.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import { IcpAgentOutputSchema, type IcpAgentOutput } from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert B2B market researcher and go-to-market strategist.

Your task is to generate Ideal Customer Profile (ICP) segments given a product description and target audience.

You MUST respond with valid JSON containing a "segments" array. Each segment object must have these fields:
- "segmentName" (string): descriptive name for this ICP segment
- "isPrimary" (boolean): true for the best-fit segment (exactly one should be primary)
- "jobTitles" (array of strings): common job titles
- "seniorityLevels" (array of strings): e.g. Director, VP, Manager
- "industries" (array of strings): target industries
- "companySizeRange" (string): e.g. "50-200" or "201-1000"
- "geographies" (array of strings): target regions
- "responsibilities" (array of strings): key responsibilities
- "goals" (array of strings): what this persona is trying to achieve
- "challenges" (array of strings): major pain points and frustrations
- "confidenceScore" (number): 0 to 1
- "reasoning" (string): why this segment was identified

Guidelines:
- Generate 2-3 ICP segments, ranked by fit.
- Make exactly ONE segment primary (isPrimary: true).
- Be specific about job titles, industries, and company sizes.
- Ground challenges in realistic business problems.
- Confidence scores should reflect how well the segment matches the product.
- Respond ONLY with the JSON object, no additional text or explanation.`

export interface IcpAgentInput {
  productDescription: string
  targetAudience: string
}

export async function runIcpAgent(
  input: IcpAgentInput
): Promise<IcpAgentOutput> {
  const prompt = `Product Description:
${input.productDescription}

Target Audience:
${input.targetAudience}

Based on this product and audience, generate 2-3 ICP segments. Respond with the JSON only.`

  const result = await generateStructured(
    {
      name: "ICP Research Agent",
      systemPrompt: SYSTEM_PROMPT,
    },
    {
      content: prompt,
      modelName: "gpt-4o",
    }
  )

  const jsonStr = extractJson(result.content)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    console.error(
      "[IcpAgent] Failed to parse JSON. Raw content:",
      result.content.slice(0, 500)
    )
    console.error("[IcpAgent] Extracted JSON string:", jsonStr.slice(0, 500))
    throw err
  }

  return IcpAgentOutputSchema.parse(parsed)
}
