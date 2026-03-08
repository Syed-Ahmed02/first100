/**
 * Evidence Extraction Agent — Uses LLM to extract structured evidence from
 * Exa discussion search results and their returned page contents.
 *
 * Uses Vercel AI SDK generateText() with Output.object() and OpenRouter.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import type { DiscussionSearchResult } from "@/lib/providers"
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
  searchQueries: string[]
  searchResults: DiscussionSearchResult[]
}

export async function runEvidenceExtractionAgent(
  input: EvidenceExtractionInput
): Promise<DiscoveryAgentOutput> {
  const resultsSummary = input.searchResults
    .map(
      (result, i) =>
        `[Result ${i + 1}] URL: ${result.url}
Matched Query: ${result.matchedQuery ?? "N/A"}
Source Type: ${result.sourceType}
Community: ${result.community ?? "N/A"}
Title: ${result.title || "N/A"}
Author: ${result.author ?? "N/A"}
Published Date: ${result.publishedDate ?? "N/A"}
Snippet: ${result.snippet ?? "N/A"}
Summary: ${result.summary ?? "N/A"}
Highlights:
${result.highlights?.join("\n- ") ?? "N/A"}
Content (first 3000 chars):
${(result.text ?? result.snippet ?? "").slice(0, 3000)}`
    )
    .join("\n\n===\n\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

Search Queries Used:
${input.searchQueries.join("\n")}

Below are ${input.searchResults.length} Exa search results from discussion-focused websites. Extract and normalize the evidence.

${resultsSummary}`

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
    `[EvidenceExtractionAgent] Extracted ${result.sources.length} sources from ${input.searchResults.length} search results`
  )

  return {
    ...result,
    searchQueries: input.searchQueries,
  }
}
