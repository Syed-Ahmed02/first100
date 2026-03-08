/**
 * Pipeline execution API route.
 *
 * POST /api/pipeline/run
 * Body: { userId, runId, productDescription, targetAudience }
 *
 * Starts the research pipeline in the background and returns immediately.
 * The pipeline updates Convex step statuses as it progresses,
 * and the dashboard subscribes to those in real-time.
 */

import { NextRequest } from "next/server"
import { after } from "next/server"
import { runResearchPipeline } from "@/lib/workflows"
import type { Id } from "@/convex/_generated/dataModel"
import type { PipelineStep } from "@/lib/validation"

export const maxDuration = 300 // 5 minutes — pipeline can be long-running

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, runId, productDescription, targetAudience, startFromStep } = body as {
      userId: string
      runId: string
      productDescription: string
      targetAudience: string
      startFromStep?: PipelineStep
    }

    // Validate required fields
    if (!userId || !runId || !productDescription) {
      return Response.json(
        {
          error:
            "Missing required fields: userId, runId, productDescription",
        },
        { status: 400 }
      )
    }

    // Schedule the pipeline as an after-response task so it can keep running
    // even after the HTTP response has been sent.
    after(async () => {
      try {
        await runResearchPipeline({
          userId: userId as Id<"users">,
          runId: runId as Id<"workflowRuns">,
          productDescription,
          targetAudience: targetAudience ?? "",
          startFromStep,
        })
      } catch (err) {
        console.error("Pipeline execution error:", err)
      }
    })

    // Return immediately — progress is streamed via Convex subscriptions.
    return Response.json({
      status: "started",
      userId,
      runId,
    })
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error"
    console.error("Pipeline API error:", err)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
