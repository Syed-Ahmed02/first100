/**
 * Apollo normalization over Apify actor output.
 */

import { runApifyActor } from "@/lib/providers/apify"
import type { Lead } from "@/lib/validation"

interface ApolloLeadFetchInput {
  searchCriteria: Record<string, unknown>
  maxLeads: number
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" }
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

function normalizeApolloRecord(record: Record<string, unknown>): Lead | null {
  const fullName =
    asString(record.name) ||
    `${asString(record.first_name)} ${asString(record.last_name)}`.trim()

  const fromFullName = splitName(fullName)

  const firstName = asString(record.first_name) || fromFullName.firstName
  const lastName = asString(record.last_name) || fromFullName.lastName

  if (!firstName && !lastName) return null

  const companyName =
    asString(record.company_name) ||
    asString(record.organization_name) ||
    asString(record.account_name)

  const companyDomain =
    asString(record.company_domain) ||
    asString(record.organization_website_url) ||
    asString(record.website_url)

  return {
    firstName,
    lastName,
    title: asString(record.title),
    email: asString(record.email),
    linkedinUrl:
      asString(record.linkedin_url) || asString(record.linkedin_profile_url),
    companyName,
    companyDomain,
    companyDescription:
      asString(record.company_description) || asString(record.organization_description),
    companySize:
      asString(record.company_size) || asString(record.organization_num_employees),
    industry: asString(record.industry),
    source: "apollo_apify",
    confidence: 0.75,
  }
}

export async function fetchApolloLeadsViaApify(input: ApolloLeadFetchInput) {
  const rawItems = await runApifyActor({
    searchCriteria: input.searchCriteria,
    maxLeads: input.maxLeads,
  })

  const normalized: Lead[] = []
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue
    const lead = normalizeApolloRecord(raw as Record<string, unknown>)
    if (!lead) continue
    normalized.push(lead)
    if (normalized.length >= input.maxLeads) break
  }

  return normalized
}
