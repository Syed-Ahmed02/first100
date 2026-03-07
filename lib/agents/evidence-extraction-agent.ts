/**
 * Evidence Extraction Agent — Uses LLM to extract structured evidence from
 * raw page content fetched by the browser provider.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import {
  DiscoveryAgentOutputSchema,
  type DiscoveryAgentOutput,
  type DiscussionSource,
} from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert evidence extractor. Given raw content from online discussions,
extract and normalize the evidence into structured discussion source objects.

You MUST respond with valid JSON containing two fields:
1. "sources" — an array of source objects, each with:
   - "sourceType" (string): one of "reddit", "hackernews", "forum", "review_site", or "other"
   - "url" (string): the source URL
   - "postId" (string): platform-specific ID if available
   - "title" (string): title of the post/thread
   - "body" (string): the complaint/discussion text (cleaned, relevant portions)
   - "author" (string): author if available
   - "community" (string): subreddit, forum name, etc.
   - "score" (number): upvotes if available
   - "commentCount" (number): comment count if available
   - "relevanceScore" (number): 0 to 1, how relevant this is to the product/audience
2. "searchQueries" — an array of strings, the queries that found these sources

Guidelines:
- Extract the most relevant complaint/pain-point text from each source.
- Clean up the text: remove excess formatting, ads, navigation.
- Focus on substantive complaints, frustrations, and feature requests.
- Assign relevance scores based on how closely the content relates to the product/audience.
- Filter out spam, promotional content, and irrelevant posts (relevanceScore < 0.2).
- Preserve enough context to understand the complaint.
- Keep the body text to ~500-1000 chars per source (the most relevant parts).
- Respond ONLY with the JSON object.`

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

${pagesSummary}

Respond with the JSON only.`

  const result = await generateStructured(
    {
      name: "Evidence Extraction Agent",
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
      "[EvidenceExtractionAgent] Failed to parse JSON. Raw content:",
      result.content.slice(0, 500)
    )
    console.error(
      "[EvidenceExtractionAgent] Extracted JSON string:",
      jsonStr.slice(0, 500)
    )
    throw err
  }

  return DiscoveryAgentOutputSchema.parse(parsed)
}
