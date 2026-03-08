/**
 * ICP Agent — Generates Ideal Customer Profile segments from product/audience input.
 *
 * Uses Vercel AI SDK generateText() with output.object() and OpenRouter for structured LLM generation.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import { IcpAgentOutputSchema, type IcpAgentOutput } from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert B2B market researcher and go-to-market strategist.

Your task is to generate Ideal Customer Profile (ICP) segments given a product description and target audience.

Guidelines:
- Generate 2-3 ICP segments, ranked by fit.
- Make exactly ONE segment primary (isPrimary: true).
- Be specific about job titles, industries, and company sizes.
- Ground challenges in realistic business problems.
- Confidence scores should reflect how well the segment matches the product.
- Return every schema field for every segment.
- Use empty arrays for missing list values and empty strings for missing text values.`

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

Based on this product and audience, generate 2-3 ICP segments.`

  const { output: result } = await generateText({
    model: getModel(),
    output: Output.object({ schema: IcpAgentOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!result) {
    throw new Error("[IcpAgent] Failed to generate structured output")
  }

  console.log(
    `[IcpAgent] Generated ${result.segments.length} segments, primary: ${result.segments.find((s) => s.isPrimary)?.segmentName}`
  )

  return result
}
