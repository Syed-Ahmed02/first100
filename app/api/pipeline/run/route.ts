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

    // Run the pipeline without awaiting (fire-and-forget style with error handling).
    // We use waitUntil-like pattern: start the promise, handle errors internally,
    // and return immediately so the client doesn't timeout.
    //
    // The pipeline reports progress via Convex mutations, so the dashboard
    // updates in real-time via Convex subscriptions.
    const pipelinePromise = runResearchPipeline({
      userId: userId as Id<"users">,
      runId: runId as Id<"workflowRuns">,
      productDescription,
      targetAudience: targetAudience ?? "",
      startFromStep,
    })

    // For deployments that support waitUntil (e.g. Vercel), use it.
    // Otherwise the pipeline runs as a detached promise.
    // Since Next.js 16 route handlers can be long-running with maxDuration,
    // we await the pipeline to ensure it completes.
    pipelinePromise.catch((err) => {
      console.error("Pipeline execution error:", err)
    })

    // Return immediately — the pipeline reports progress via Convex
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
