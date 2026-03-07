/**
 * Pain Synthesis Agent — Clusters evidence from discussion sources into
 * recurring pain points with confidence scores and evidence snippets.
 */

import { generateStructured, extractJson } from "@/lib/ai"
import {
  PainSynthesisOutputSchema,
  type PainSynthesisOutput,
  type DiscussionSource,
} from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert qualitative researcher specializing in pain point analysis.

Given a set of discussion source evidence (posts, comments, reviews from online communities), 
cluster them into recurring pain points/themes.

You MUST respond with valid JSON containing a "painPoints" array. Each pain point object must have:
- "theme" (string): short label for the pain point
- "description" (string): detailed description of the pain point
- "category" (string): e.g. usability, pricing, integration, performance, support
- "frequency" (number): how many sources mention this pain point
- "sentiment" (string): one of "very_negative", "negative", "neutral", or "mixed"
- "confidenceScore" (number): 0 to 1
- "evidenceSnippets" (array): each snippet has:
  - "sourceUrl" (string): URL of the source
  - "quote" (string): exact or near-exact quote from the source

Guidelines:
- Group similar complaints under a single theme.
- Each pain point should have at least 1 evidence snippet.
- Frequency should reflect how many distinct sources mention this theme.
- Rank pain points by frequency and severity.
- Be specific about the pain — vague themes are not useful.
- Confidence score reflects how well the evidence supports the theme.
- Generate 3-8 pain points, depending on evidence available.
- Respond ONLY with the JSON object, no additional text.`

export interface PainSynthesisInput {
  productDescription: string
  targetAudience: string
  sources: Array<{
    url: string
    body: string
    title?: string
    community?: string
    sourceType: string
  }>
}

export async function runPainSynthesisAgent(
  input: PainSynthesisInput
): Promise<PainSynthesisOutput> {
  const sourceSummaries = input.sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] (${s.sourceType}) ${s.community ? `r/${s.community}` : ""} — ${s.url}
Title: ${s.title ?? "N/A"}
Content: ${s.body.slice(0, 1500)}`
    )
    .join("\n\n---\n\n")

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}

Below are ${input.sources.length} discussion sources collected from online communities. 
Analyze them and cluster the complaints/pain points into themes.

${sourceSummaries}

Respond with the JSON only.`

  const result = await generateStructured(
    {
      name: "Pain Synthesis Agent",
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
      "[PainSynthesisAgent] Failed to parse JSON. Raw content:",
      result.content.slice(0, 500)
    )
    console.error(
      "[PainSynthesisAgent] Extracted JSON string:",
      jsonStr.slice(0, 500)
    )
    throw err
  }

  return PainSynthesisOutputSchema.parse(parsed)
}
