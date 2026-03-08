/**
 * Pain Synthesis Agent — Clusters evidence from discussion sources into
 * recurring pain points with confidence scores and evidence snippets.
 *
 * Uses Vercel AI SDK generateText() with Output.object() and OpenRouter.
 */

import { generateText, Output } from "ai"
import { getModel } from "@/lib/ai"
import {
  PainSynthesisOutputSchema,
  type PainSynthesisOutput,
} from "@/lib/validation"

const SYSTEM_PROMPT = `You are an expert qualitative researcher specializing in pain point analysis.

Given a set of discussion source evidence (posts, comments, reviews from online communities), 
cluster them into recurring pain points/themes.

Guidelines:
- Group similar complaints under a single theme.
- Each pain point should have at least 1 evidence snippet.
- Frequency should reflect how many distinct sources mention this theme.
- Rank pain points by frequency and severity.
- Be specific about the pain — vague themes are not useful.
- Confidence score reflects how well the evidence supports the theme.
- Generate 3-8 pain points, depending on evidence available.`

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

${sourceSummaries}`

  const { output: result } = await generateText({
    model: getModel(),
    output: Output.object({ schema: PainSynthesisOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!result) {
    throw new Error("[PainSynthesisAgent] Failed to generate structured output")
  }

  console.log(
    `[PainSynthesisAgent] Synthesized ${result.painPoints.length} pain points from ${input.sources.length} sources`
  )

  return result
}
