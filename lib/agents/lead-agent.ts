/**
 * Lead Agent — Builds lead-search intent and resolves normalized leads via providers.
 */

import { type IcpSegment, type MessagingAngle, type PainPoint } from "@/lib/validation"
import { findLeads } from "@/lib/providers/leads"

export interface LeadAgentInput {
  productDescription: string
  targetAudience: string
  icpSegments: IcpSegment[]
  messagingAngles: MessagingAngle[]
  painPoints: PainPoint[]
  maxLeads?: number
}

export async function runLeadAgent(input: LeadAgentInput) {
  return findLeads({
    productDescription: input.productDescription,
    targetAudience: input.targetAudience,
    icpSegments: input.icpSegments,
    messagingAngles: input.messagingAngles,
    painPoints: input.painPoints,
    maxLeads: input.maxLeads ?? 25,
  })
}
