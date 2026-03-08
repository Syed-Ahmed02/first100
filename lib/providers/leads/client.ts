/**
 * Lead provider abstraction with Apollo-via-Apify first, plus fallback.
 */

import { generateText, Output } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai"
import {
  LeadSchema,
  type IcpSegment,
  type MessagingAngle,
  type PainPoint,
} from "@/lib/validation"
import { fetchApolloLeadsViaApify } from "@/lib/providers/apollo"

export interface LeadProviderInput {
  productDescription: string
  targetAudience: string
  icpSegments: IcpSegment[]
  messagingAngles: MessagingAngle[]
  painPoints: PainPoint[]
  maxLeads?: number
}

const LeadFallbackOutputSchema = z.object({
  leads: z.array(LeadSchema),
})

function buildSearchCriteria(input: LeadProviderInput) {
  const primary = input.icpSegments.find((segment) => segment.isPrimary)
  const fallback = input.icpSegments[0]
  const segment = primary ?? fallback

  const roles = segment?.jobTitles ?? []
  const industries = segment?.industries ?? []
  const geographies = segment?.geographies ?? []
  const companySizeRange = segment?.companySizeRange ?? ""
  const painThemes = input.painPoints.slice(0, 3).map((pain) => pain.theme)

  return {
    roles,
    industries,
    geographies,
    companySizeRange,
    painThemes,
    maxLeads: input.maxLeads ?? 25,
  }
}

async function runLlmLeadFallback(
  input: LeadProviderInput,
  searchCriteria: Record<string, unknown>
) {
  const primarySegment = input.icpSegments.find((segment) => segment.isPrimary)
  const segmentName = primarySegment?.segmentName ?? input.icpSegments[0]?.segmentName

  const prompt = `Product: ${input.productDescription}
Target Audience: ${input.targetAudience}
Primary Segment: ${segmentName ?? "General B2B"}

Search Criteria:
${JSON.stringify(searchCriteria, null, 2)}

Generate 8-15 realistic synthetic leads suitable for outbound planning.
Use clearly fake emails/domains when unsure (for demo safety).
`

  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: LeadFallbackOutputSchema }),
    prompt,
  })

  if (!output) {
    throw new Error("[LeadProviderFallback] Failed to generate fallback leads")
  }

  return {
    provider: "llm_fallback",
    searchCriteria,
    leads: output.leads.slice(0, (searchCriteria.maxLeads as number) ?? 25),
  }
}

export async function findLeads(input: LeadProviderInput) {
  const searchCriteria = buildSearchCriteria(input)

  try {
    const apolloLeads = await fetchApolloLeadsViaApify({
      searchCriteria,
      maxLeads: (searchCriteria.maxLeads as number) ?? 25,
    })

    if (apolloLeads.length > 0) {
      return {
        provider: "apollo_apify",
        searchCriteria,
        leads: apolloLeads,
      }
    }
  } catch (error) {
    console.error("[LeadProvider] Apollo via Apify failed:", error)
  }

  return runLlmLeadFallback(input, searchCriteria)
}
