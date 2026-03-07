/**
 * ICP Agent — Generates Ideal Customer Profile segments from product/audience input.
 *
 * Uses Backboard for structured LLM generation, validates output with Zod.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import { IcpAgentOutputSchema, type IcpAgentOutput } from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert B2B market researcher and go-to-market strategist.

Your task is to generate Ideal Customer Profile (ICP) segments given a product description and target audience.

You MUST respond with valid JSON matching this exact schema:

{
  "segments": [
    {
      "segmentName": "string — descriptive name for this ICP segment",
      "isPrimary": boolean — true for the best-fit segment (exactly one should be primary),
      "jobTitles": ["string — common job titles"],
      "seniorityLevels": ["string — e.g. Director, VP, Manager"],
      "industries": ["string — target industries"],
      "companySizeRange": "string — e.g. '50-200' or '201-1000'",
      "geographies": ["string — target regions"],
      "responsibilities": ["string — key responsibilities"],
      "goals": ["string — what this persona is trying to achieve"],
      "challenges": ["string — major pain points and frustrations"],
      "confidenceScore": number — 0 to 1,
      "reasoning": "string — why this segment was identified"
    }
  ]
}

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
  const parsed = JSON.parse(jsonStr)
  return IcpAgentOutputSchema.parse(parsed)
}
