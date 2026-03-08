/**
 * Pipeline orchestrator — Chains research agents together in sequence,
 * persisting intermediate results to Convex via ConvexHttpClient.
 *
 * Pipeline steps (Phase 2 — Research):
 * 1. ICP Research
 * 2. Discussion Discovery (Exa search)
 * 3. Evidence Extraction (Exa search contents)
 * 4. Pain Synthesis
 * 5. Messaging Generation
 * 6. Lead Generation
 * 7. Outreach Generation
 */

import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

import { runIcpAgent } from "@/lib/agents/icp-agent"
import { generateSearchQueries } from "@/lib/agents/research-discovery-agent"
import { runEvidenceExtractionAgent } from "@/lib/agents/evidence-extraction-agent"
import { runPainSynthesisAgent } from "@/lib/agents/pain-synthesis-agent"
import { runMessagingAgent } from "@/lib/agents/messaging-agent"
import { runLeadAgent } from "@/lib/agents/lead-agent"
import { runOutreachAgent } from "@/lib/agents/outreach-agent"
import { searchDiscussions } from "@/lib/providers/exa"
import type {
  Lead,
  MessagingAngle,
  PainPoint,
  PipelineStep,
} from "@/lib/validation"

export interface PipelineInput {
  userId: Id<"users">
  runId: Id<"workflowRuns">
  productDescription: string
  targetAudience: string
  startFromStep?: PipelineStep
}

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  return new ConvexHttpClient(url)
}

/**
 * Run the full GTM pipeline (Phase 2 + Phase 3 steps).
 * This is a long-running process called from an API route.
 */
export async function runResearchPipeline(input: PipelineInput): Promise<void> {
  const convex = getConvexClient()
  const startFromStep = normalizeRetryStartStep(input.startFromStep)

  try {
    // Start the run
    await convex.mutation(api.workflows.startRun, {
      runId: input.runId,
      currentStep: startFromStep,
    })

    let icpOutput: Awaited<ReturnType<typeof runIcpAgent>> | undefined

    // ── Step 1: ICP Research ──────────────────────────────────────────────
    if (shouldRunStep("icp_research", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "icp_research",
      })

      try {
        icpOutput = await runIcpAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
        })

        // Store ICP profiles
        await convex.mutation(api.research.storeIcpProfiles, {
          userId: input.userId,
          runId: input.runId,
          profiles: icpOutput.segments.map((s) => ({
            segmentName: s.segmentName,
            isPrimary: s.isPrimary,
            jobTitles: s.jobTitles,
            seniorityLevels: s.seniorityLevels,
            industries: s.industries,
            companySizeRange: s.companySizeRange,
            geographies: s.geographies,
            responsibilities: s.responsibilities,
            goals: s.goals,
            challenges: s.challenges,
            confidenceScore: s.confidenceScore,
            reasoning: s.reasoning,
          })),
        })

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "icp_research",
          metadata: JSON.stringify({
            segmentCount: icpOutput.segments.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "ICP research failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "icp_research",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `ICP research failed: ${errorMsg}`,
        })
        throw err
      }
    } else {
      const storedIcpProfiles = await convex.query(
        api.research.getIcpProfilesByRun,
        { runId: input.runId }
      )

      if (storedIcpProfiles.length === 0) {
        throw new Error("Cannot retry from this step because ICP results are missing")
      }

      icpOutput = {
        segments: storedIcpProfiles.map((profile) => ({
          segmentName: profile.segmentName,
          isPrimary: profile.isPrimary,
          jobTitles: profile.jobTitles,
          seniorityLevels: profile.seniorityLevels ?? [],
          industries: profile.industries,
          companySizeRange: profile.companySizeRange ?? "",
          geographies: profile.geographies ?? [],
          responsibilities: profile.responsibilities ?? [],
          goals: profile.goals ?? [],
          challenges: profile.challenges ?? [],
          confidenceScore: profile.confidenceScore ?? 0,
          reasoning: profile.reasoning ?? "",
        })),
      }
    }

    // ── Step 2: Discussion Discovery ─────────────────────────────────────
    let discoveryResults: Awaited<ReturnType<typeof searchDiscussions>> | null =
      null
    if (shouldRunStep("discussion_discovery", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "discussion_discovery",
      })

      try {
        if (!icpOutput) {
          throw new Error("ICP results are unavailable for discussion discovery")
        }

        // Generate search queries from ICP
        const queryOutput = await generateSearchQueries({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          icpSegments: icpOutput.segments,
        })

        // Run Exa search with the generated queries
        discoveryResults = await searchDiscussions(queryOutput.queries, {
          numResultsPerQuery: 5,
        })

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "discussion_discovery",
          metadata: JSON.stringify({
            queriesUsed: discoveryResults.queriesUsed.length,
            resultsFound: discoveryResults.results.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Discussion discovery failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "discussion_discovery",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Discussion discovery failed: ${errorMsg}`,
        })
        throw err
      }
    }

    // ── Step 3: Evidence Extraction ──────────────────────────────────────
    let extractedSources: Awaited<ReturnType<typeof runEvidenceExtractionAgent>>
    let storedSourceIds: Id<"discussionSources">[] = []
    if (shouldRunStep("evidence_extraction", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "evidence_extraction",
      })

      try {
        if (!discoveryResults) {
          throw new Error("Discovery results are unavailable for evidence extraction")
        }

        const searchResultsWithContent = discoveryResults.results.filter((result) => {
          const content = result.text ?? result.summary ?? result.snippet ?? ""
          return content.trim().length > 50
        })

        if (searchResultsWithContent.length === 0) {
          throw new Error("No Exa discussion results contained usable content")
        }

        extractedSources = await runEvidenceExtractionAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          searchQueries: discoveryResults.queriesUsed,
          searchResults: searchResultsWithContent,
        })

        // Store discussion sources in Convex
        const sourcesToStore = extractedSources.sources
          .filter((s) => (s.relevanceScore ?? 0.5) >= 0.2)
          .map((s) => ({
            sourceType: s.sourceType,
            url: s.url,
            postId: s.postId,
            title: s.title,
            body: s.body,
            author: s.author,
            community: s.community,
            score: s.score,
            commentCount: s.commentCount,
            postedAt: s.postedAt,
            relevanceScore: s.relevanceScore,
          }))

        if (sourcesToStore.length > 0) {
          storedSourceIds = (await convex.mutation(
            api.research.storeDiscussionSources,
            {
              userId: input.userId,
              runId: input.runId,
              sources: sourcesToStore,
            }
          )) as Id<"discussionSources">[]
        }

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "evidence_extraction",
          metadata: JSON.stringify({
            resultsAttempted: discoveryResults.results.length,
            resultsWithContent: searchResultsWithContent.length,
            sourcesExtracted: extractedSources.sources.length,
            sourcesStored: sourcesToStore.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Evidence extraction failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "evidence_extraction",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Evidence extraction failed: ${errorMsg}`,
        })
        throw err
      }
    } else {
      const storedSources = await convex.query(
        api.research.getDiscussionSourcesByRun,
        { runId: input.runId }
      )

      if (storedSources.length === 0) {
        throw new Error("Cannot retry from this step because extracted sources are missing")
      }

      storedSourceIds = storedSources.map((source) => source._id)
      extractedSources = {
        sources: storedSources.map((source) => ({
          sourceType: source.sourceType,
          url: source.url,
          postId: source.postId ?? "",
          title: source.title ?? "",
          body: source.body,
          author: source.author ?? "",
          community: source.community ?? "",
          score: source.score ?? 0,
          commentCount: source.commentCount ?? 0,
          postedAt: source.postedAt ?? 0,
          relevanceScore: source.relevanceScore ?? 0,
        })),
        searchQueries: [],
      }
    }

    let painPointsForCampaign: Array<{
      _id: Id<"painPoints">
      theme: string
      description: string
      category?: string
      frequency: number
      sentiment: PainPoint["sentiment"]
      confidenceScore: number
      evidenceSnippets: Array<{
        sourceId: Id<"discussionSources">
        quote: string
        url: string
      }>
    }> = []

    // ── Step 4: Pain Synthesis ───────────────────────────────────────────
    if (shouldRunStep("pain_synthesis", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "pain_synthesis",
      })

      try {
        const painOutput = await runPainSynthesisAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          sources: extractedSources.sources.map((s) => ({
            url: s.url,
            body: s.body,
            title: s.title,
            community: s.community,
            sourceType: s.sourceType,
          })),
        })

        // Store pain points, mapping evidence snippets to stored source IDs
        const painPointsToStore = painOutput.painPoints.map((pp) => ({
          theme: pp.theme,
          description: pp.description,
          category: pp.category,
          frequency: pp.frequency,
          sentiment: pp.sentiment,
          confidenceScore: pp.confidenceScore,
          evidenceSnippets: pp.evidenceSnippets.map((es) => {
            // Try to find the matching stored source by URL
            const matchedSourceIndex = extractedSources.sources.findIndex(
              (s) => s.url === es.sourceUrl
            )
            const sourceId =
              matchedSourceIndex >= 0 &&
              matchedSourceIndex < storedSourceIds.length
                ? storedSourceIds[matchedSourceIndex]
                : storedSourceIds[0]

            return {
              sourceId: sourceId,
              quote: es.quote,
              url: es.sourceUrl,
            }
          }),
        }))

        // Only store if we have valid source IDs
        if (storedSourceIds.length > 0 && painPointsToStore.length > 0) {
          await convex.mutation(api.research.storePainPoints, {
            userId: input.userId,
            runId: input.runId,
            painPoints: painPointsToStore,
          })
        }

        painPointsForCampaign = await convex.query(api.research.getPainPointsByRun, {
          runId: input.runId,
        })

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "pain_synthesis",
          metadata: JSON.stringify({
            painPointCount: painOutput.painPoints.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Pain synthesis failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "pain_synthesis",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Pain synthesis failed: ${errorMsg}`,
        })
        throw err
      }
    } else {
      painPointsForCampaign = await convex.query(api.research.getPainPointsByRun, {
        runId: input.runId,
      })

      if (painPointsForCampaign.length === 0) {
        throw new Error("Cannot retry from this step because pain points are missing")
      }
    }

    // ── Step 5: Messaging Generation ─────────────────────────────────────
    let messagingAnglesForCampaign: Array<{
      _id: Id<"messagingAngles">
      angle: string
      valueProp: string
      hooks: string[]
      ctaVariants?: string[]
      landingPageCopy?: string
      targetSegment?: string
      channel?: string
    }> = []

    if (shouldRunStep("messaging_generation", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "messaging_generation",
      })

      try {
        if (!icpOutput) {
          throw new Error("ICP results are unavailable for messaging generation")
        }
        if (painPointsForCampaign.length === 0) {
          throw new Error("Pain points are unavailable for messaging generation")
        }

        const messagingOutput = await runMessagingAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          icpSegments: icpOutput.segments,
          painPoints: painPointsForCampaign.map((pain) => ({
            theme: pain.theme,
            description: pain.description,
            category: pain.category ?? "",
            frequency: pain.frequency,
            sentiment: pain.sentiment,
            confidenceScore: pain.confidenceScore,
            evidenceSnippets: pain.evidenceSnippets.map((snippet) => ({
              sourceUrl: snippet.url,
              quote: snippet.quote,
            })),
          })),
        })

        const defaultSupportingPainPointIds = painPointsForCampaign
          .slice(0, 3)
          .map((pain) => pain._id)

        await convex.mutation(api.messaging.storeMessagingAngles, {
          userId: input.userId,
          runId: input.runId,
          angles: messagingOutput.angles.map((angle) => ({
            angle: angle.angle,
            valueProp: angle.valueProp,
            supportingPainPointIds: defaultSupportingPainPointIds,
            hooks: angle.hooks,
            ctaVariants:
              angle.ctaVariants.length > 0 ? angle.ctaVariants : undefined,
            landingPageCopy: angle.landingPageCopy || undefined,
            targetSegment: angle.targetSegment || undefined,
            channel: angle.channel || undefined,
          })),
        })

        messagingAnglesForCampaign = await convex.query(
          api.messaging.getMessagingAnglesByRun,
          { runId: input.runId }
        )

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "messaging_generation",
          metadata: JSON.stringify({
            angleCount: messagingAnglesForCampaign.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Messaging generation failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "messaging_generation",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Messaging generation failed: ${errorMsg}`,
        })
        throw err
      }
    } else {
      messagingAnglesForCampaign = await convex.query(
        api.messaging.getMessagingAnglesByRun,
        { runId: input.runId }
      )

      if (messagingAnglesForCampaign.length === 0) {
        throw new Error(
          "Cannot retry from this step because messaging angles are missing"
        )
      }
    }

    // ── Step 6: Lead Generation ──────────────────────────────────────────
    let storedLeadsForCampaign: Array<{
      _id: Id<"leads">
      firstName: string
      lastName: string
      title?: string
      email?: string
      linkedinUrl?: string
      companyName?: string
      companyDomain?: string
      companyDescription?: string
      companySize?: string
      industry?: string
      source: string
      confidence?: number
    }> = []

    if (shouldRunStep("lead_generation", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "lead_generation",
      })

      let leadListId: Id<"leadLists"> | null = null

      try {
        if (!icpOutput) {
          throw new Error("ICP results are unavailable for lead generation")
        }

        const leadOutput = await runLeadAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          icpSegments: icpOutput.segments,
          messagingAngles: messagingAnglesForCampaign.map(
            (angle): MessagingAngle => ({
              angle: angle.angle,
              valueProp: angle.valueProp,
              hooks: angle.hooks,
              ctaVariants: angle.ctaVariants ?? [],
              landingPageCopy: angle.landingPageCopy ?? "",
              targetSegment: angle.targetSegment ?? "",
              channel: angle.channel ?? "",
            })
          ),
          painPoints: painPointsForCampaign.map((pain): PainPoint => ({
            theme: pain.theme,
            description: pain.description,
            category: pain.category ?? "",
            frequency: pain.frequency,
            sentiment: pain.sentiment,
            confidenceScore: pain.confidenceScore,
            evidenceSnippets: pain.evidenceSnippets.map((snippet) => ({
              sourceUrl: snippet.url,
              quote: snippet.quote,
            })),
          })),
          maxLeads: 25,
        })

        leadListId = await convex.mutation(api.leads.createLeadList, {
          userId: input.userId,
          runId: input.runId,
          provider: leadOutput.provider,
          searchCriteria: JSON.stringify(leadOutput.searchCriteria),
        })

        await convex.mutation(api.leads.updateLeadList, {
          leadListId,
          status: "fetching",
        })

        const normalizedLeads = leadOutput.leads.map((lead) => ({
          firstName: lead.firstName,
          lastName: lead.lastName,
          title: lead.title || undefined,
          email: lead.email || undefined,
          linkedinUrl: lead.linkedinUrl || undefined,
          companyName: lead.companyName || undefined,
          companyDomain: lead.companyDomain || undefined,
          companyDescription: lead.companyDescription || undefined,
          companySize: lead.companySize || undefined,
          industry: lead.industry || undefined,
          source: lead.source || leadOutput.provider,
          confidence: lead.confidence,
          enrichmentMetadata: undefined,
        }))

        if (normalizedLeads.length > 0) {
          await convex.mutation(api.leads.storeLeads, {
            userId: input.userId,
            leadListId,
            leads: normalizedLeads,
          })
        }

        await convex.mutation(api.leads.updateLeadList, {
          leadListId,
          status: "completed",
          totalResults: normalizedLeads.length,
        })

        storedLeadsForCampaign = await convex.query(api.leads.getLeadsByRun, {
          runId: input.runId,
        })

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "lead_generation",
          metadata: JSON.stringify({
            provider: leadOutput.provider,
            leadCount: storedLeadsForCampaign.length,
          }),
        })
      } catch (err) {
        if (leadListId) {
          await convex.mutation(api.leads.updateLeadList, {
            leadListId,
            status: "failed",
            error: err instanceof Error ? err.message : "Lead generation failed",
          })
        }

        const errorMsg = err instanceof Error ? err.message : "Lead generation failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "lead_generation",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Lead generation failed: ${errorMsg}`,
        })
        throw err
      }
    } else {
      storedLeadsForCampaign = await convex.query(api.leads.getLeadsByRun, {
        runId: input.runId,
      })

      if (storedLeadsForCampaign.length === 0) {
        throw new Error("Cannot retry from this step because leads are missing")
      }
    }

    // ── Step 7: Outreach Generation ──────────────────────────────────────
    if (shouldRunStep("outreach_generation", startFromStep)) {
      await convex.mutation(api.workflows.startStep, {
        runId: input.runId,
        step: "outreach_generation",
      })

      try {
        if (storedLeadsForCampaign.length === 0) {
          throw new Error("Leads are unavailable for outreach generation")
        }

        const outreachOutput = await runOutreachAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          leads: storedLeadsForCampaign.map((lead): Lead => ({
            firstName: lead.firstName,
            lastName: lead.lastName,
            title: lead.title ?? "",
            email: lead.email ?? "",
            linkedinUrl: lead.linkedinUrl ?? "",
            companyName: lead.companyName ?? "",
            companyDomain: lead.companyDomain ?? "",
            companyDescription: lead.companyDescription ?? "",
            companySize: lead.companySize ?? "",
            industry: lead.industry ?? "",
            source: lead.source,
            confidence: lead.confidence ?? 0.5,
          })),
          messagingAngles: messagingAnglesForCampaign.map(
            (angle): MessagingAngle => ({
              angle: angle.angle,
              valueProp: angle.valueProp,
              hooks: angle.hooks,
              ctaVariants: angle.ctaVariants ?? [],
              landingPageCopy: angle.landingPageCopy ?? "",
              targetSegment: angle.targetSegment ?? "",
              channel: angle.channel ?? "",
            })
          ),
          painPoints: painPointsForCampaign.map((pain): PainPoint => ({
            theme: pain.theme,
            description: pain.description,
            category: pain.category ?? "",
            frequency: pain.frequency,
            sentiment: pain.sentiment,
            confidenceScore: pain.confidenceScore,
            evidenceSnippets: pain.evidenceSnippets.map((snippet) => ({
              sourceUrl: snippet.url,
              quote: snippet.quote,
            })),
          })),
        })

        const draftsToStore = outreachOutput.drafts
          .filter(
            (item) =>
              item.leadIndex >= 0 && item.leadIndex < storedLeadsForCampaign.length
          )
          .map((item) => ({
            leadId: storedLeadsForCampaign[item.leadIndex]!._id,
            channel: item.draft.channel,
            subject: item.draft.subject || undefined,
            body: item.draft.body,
            personalizationInputs: JSON.stringify(item.draft.personalizationInputs),
          }))

        if (draftsToStore.length > 0) {
          await convex.mutation(api.outreach.storeDrafts, {
            userId: input.userId,
            runId: input.runId,
            drafts: draftsToStore,
          })
        }

        await convex.mutation(api.workflows.completeStep, {
          runId: input.runId,
          step: "outreach_generation",
          metadata: JSON.stringify({
            draftsGenerated: draftsToStore.length,
            leadsUsed: storedLeadsForCampaign.length,
          }),
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Outreach generation failed"
        await convex.mutation(api.workflows.failStep, {
          runId: input.runId,
          step: "outreach_generation",
          error: errorMsg,
        })
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error: `Outreach generation failed: ${errorMsg}`,
        })
        throw err
      }
    }

    // ── Complete the run ─────────────────────────────────────────────────
    await convex.mutation(api.workflows.completeRun, { runId: input.runId })
  } catch (err) {
    // Final fallback — ensure the run is marked as failed
    try {
      const run = await convex.query(api.workflows.getRun, {
        runId: input.runId,
      })
      if (run && run.status === "running") {
        await convex.mutation(api.workflows.failRun, {
          runId: input.runId,
          error:
            err instanceof Error ? err.message : "Pipeline failed unexpectedly",
        })
      }
    } catch {
      // If even this fails, nothing more to do
    }
    throw err
  }
}

function normalizeRetryStartStep(step?: PipelineStep): PipelineStep {
  if (!step) return "icp_research"
  if (step === "evidence_extraction") return "discussion_discovery"
  return step
}

function shouldRunStep(step: PipelineStep, startFromStep: PipelineStep): boolean {
  return (
    STEP_ORDER[step] >= STEP_ORDER[startFromStep]
  )
}

const STEP_ORDER: Record<PipelineStep, number> = {
  icp_research: 0,
  discussion_discovery: 1,
  evidence_extraction: 2,
  pain_synthesis: 3,
  messaging_generation: 4,
  lead_generation: 5,
  outreach_generation: 6,
}
