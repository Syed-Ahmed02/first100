/**
 * Evidence Extraction Agent — Uses LLM to extract structured evidence from
 * raw page content fetched by the browser provider.
 *
 * Uses Vercel AI SDK generateText() with Output.object() and OpenRouter.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import {
  DiscoveryAgentOutputSchema,
  type DiscoveryAgentOutput,
} from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert evidence extractor. Given raw content from online discussions,
extract and normalize the evidence into structured discussion source objects.

Guidelines:
- Extract the most relevant complaint/pain-point text from each source.
- Clean up the text: remove excess formatting, ads, navigation.
- Focus on substantive complaints, frustrations, and feature requests.
- Assign relevance scores based on how closely the content relates to the product/audience.
- Filter out spam, promotional content, and irrelevant posts (relevanceScore < 0.2).
- Preserve enough context to understand the complaint.
- Keep the body text to ~500-1000 chars per source (the most relevant parts).`

export interface EvidenceExtractionInput {
  productDescription: string
  targetAudience: string
  rawPages: Array<{
    url: string
    content: string
    query: string
  }>
}

export async function runEvidenceExtractionAgent(
  input: EvidenceExtractionInput
): Promise<DiscoveryAgentOutput> {
  const pagesSummary = input.rawPages
    .map(
      (p, i) =>
        `[Page ${i + 1}] URL: ${p.url}
Query: ${p.query}
Content (first 3000 chars):
${p.content.slice(0, 3000)}`
    )
    .join("\n\n===\n\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

Below are ${input.rawPages.length} raw pages fetched from online discussions. Extract and normalize the evidence.

${pagesSummary}`

  const { output: result } = await generateText({
    model: getModel(),
    output: Output.object({ schema: DiscoveryAgentOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!result) {
    throw new Error(
      "[EvidenceExtractionAgent] Failed to generate structured output"
    )
  }

  console.log(
    `[EvidenceExtractionAgent] Extracted ${result.sources.length} sources from ${input.rawPages.length} pages`
  )

  return result
}
