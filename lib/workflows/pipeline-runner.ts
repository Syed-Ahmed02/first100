/**
 * Pipeline orchestrator — Chains research agents together in sequence,
 * persisting intermediate results to Convex via ConvexHttpClient.
 *
 * Pipeline steps (Phase 2 — Research):
 * 1. ICP Research
 * 2. Discussion Discovery (Exa search)
 * 3. Evidence Extraction (Browserbase + Puppeteer)
 * 4. Pain Synthesis
 *
 * Phase 3 steps (not implemented here):
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
import { searchDiscussions } from "@/lib/providers/exa"
import { fetchPagesWithBrowser } from "@/lib/providers/browser"

export interface PipelineInput {
  projectId: Id<"projects">
  runId: Id<"workflowRuns">
  productDescription: string
  targetAudience: string
}

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  return new ConvexHttpClient(url)
}

/**
 * Run the full research pipeline (Phase 2 steps).
 * This is a long-running process called from an API route.
 */
export async function runResearchPipeline(input: PipelineInput): Promise<void> {
  const convex = getConvexClient()

  try {
    // Start the run
    await convex.mutation(api.workflows.startRun, { runId: input.runId })

    // ── Step 1: ICP Research ──────────────────────────────────────────────
    await convex.mutation(api.workflows.startStep, {
      runId: input.runId,
      step: "icp_research",
    })

    let icpOutput
    try {
      icpOutput = await runIcpAgent({
        productDescription: input.productDescription,
        targetAudience: input.targetAudience,
      })

      // Store ICP profiles
      await convex.mutation(api.research.storeIcpProfiles, {
        projectId: input.projectId,
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

    // ── Step 2: Discussion Discovery ─────────────────────────────────────
    await convex.mutation(api.workflows.startStep, {
      runId: input.runId,
      step: "discussion_discovery",
    })

    let discoveryResults: Awaited<ReturnType<typeof searchDiscussions>>
    try {
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

    // ── Step 3: Evidence Extraction ──────────────────────────────────────
    await convex.mutation(api.workflows.startStep, {
      runId: input.runId,
      step: "evidence_extraction",
    })

    let extractedSources: Awaited<ReturnType<typeof runEvidenceExtractionAgent>>
    let storedSourceIds: Id<"discussionSources">[] = []
    try {
      // Fetch page contents using Browserbase + Puppeteer
      const urlsToFetch = discoveryResults.results.map((r) => r.url)
      const fetchedPages = await fetchPagesWithBrowser(urlsToFetch)

      // Build input for the extraction agent
      const rawPages = fetchedPages
        .filter((p) => p.success && p.content.length > 100)
        .map((p, i) => ({
          url: p.url,
          content: p.content,
          query:
            discoveryResults.queriesUsed[
              Math.floor(
                (i * discoveryResults.queriesUsed.length) / fetchedPages.length
              )
            ] ?? "",
        }))

      if (rawPages.length === 0) {
        // No pages could be fetched — use snippets from Exa instead
        const fallbackPages = discoveryResults.results
          .filter((r) => r.snippet && r.snippet.length > 50)
          .map((r) => ({
            url: r.url,
            content: `Title: ${r.title}\n\n${r.snippet}`,
            query: discoveryResults.queriesUsed[0] ?? "",
          }))

        if (fallbackPages.length > 0) {
          extractedSources = await runEvidenceExtractionAgent({
            productDescription: input.productDescription,
            targetAudience: input.targetAudience,
            rawPages: fallbackPages,
          })
        } else {
          throw new Error("No pages could be fetched and no snippets available")
        }
      } else {
        extractedSources = await runEvidenceExtractionAgent({
          productDescription: input.productDescription,
          targetAudience: input.targetAudience,
          rawPages,
        })
      }

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
            projectId: input.projectId,
            runId: input.runId,
            sources: sourcesToStore,
          }
        )) as Id<"discussionSources">[]
      }

      await convex.mutation(api.workflows.completeStep, {
        runId: input.runId,
        step: "evidence_extraction",
        metadata: JSON.stringify({
          pagesAttempted: urlsToFetch.length,
          pagesSuccessful: fetchedPages.filter((p) => p.success).length,
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

    // ── Step 4: Pain Synthesis ───────────────────────────────────────────
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
              : storedSourceIds[0] // fallback to first source

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
          projectId: input.projectId,
          runId: input.runId,
          painPoints: painPointsToStore,
        })
      }

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

    // ── Steps 5-7 skipped (Phase 3) ─────────────────────────────────────
    // Skip messaging, lead gen, and outreach for Phase 2
    for (const step of [
      "messaging_generation",
      "lead_generation",
      "outreach_generation",
    ] as const) {
      await convex.mutation(api.workflows.updateStep, {
        stepId: await getStepId(convex, input.runId, step),
        status: "skipped",
        metadata: JSON.stringify({ reason: "Phase 3 — not yet implemented" }),
      })
    }

    // ── Complete the run ─────────────────────────────────────────────────
    await convex.mutation(api.workflows.completeRun, { runId: input.runId })
  } catch (err) {
    // Final fallback — ensure the run is marked as failed
    try {
      const run = await convex.query(api.workflows.getLatestRun, {
        projectId: input.projectId,
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

/**
 * Helper to find a step document ID by run ID and step name.
 */
async function getStepId(
  convex: ConvexHttpClient,
  runId: Id<"workflowRuns">,
  stepName: string
): Promise<Id<"workflowSteps">> {
  const steps = await convex.query(api.workflows.getSteps, { runId })
  const step = steps.find((s) => s.step === stepName)
  if (!step) throw new Error(`Step ${stepName} not found in run`)
  return step._id
}
