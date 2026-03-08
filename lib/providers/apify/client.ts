/**
 * Thin Apify actor client for lead extraction runs.
 */

interface ApifyRunResponseData {
  data?: {
    status?: string
    defaultDatasetId?: string
  }
}

function getApifyConfig() {
  const token = process.env.APIFY_API_KEY
  const actorId = process.env.APIFY_ACTOR_ID
  return { token, actorId }
}

export async function runApifyActor(input: Record<string, unknown>) {
  const { token, actorId } = getApifyConfig()
  if (!token || !actorId) {
    throw new Error("APIFY_API_KEY or APIFY_ACTOR_ID is missing")
  }

  const waitForFinishSecs = 180
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&waitForFinish=${waitForFinishSecs}`

  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!runResponse.ok) {
    throw new Error(`Apify actor run failed with status ${runResponse.status}`)
  }

  const runData = (await runResponse.json()) as ApifyRunResponseData
  const datasetId = runData.data?.defaultDatasetId
  const status = runData.data?.status ?? "UNKNOWN"

  if (status !== "SUCCEEDED" || !datasetId) {
    throw new Error(`Apify actor did not succeed (status=${status})`)
  }

  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
  const datasetResponse = await fetch(datasetUrl, { method: "GET" })

  if (!datasetResponse.ok) {
    throw new Error(
      `Apify dataset fetch failed with status ${datasetResponse.status}`
    )
  }

  const items = (await datasetResponse.json()) as unknown
  if (!Array.isArray(items)) return []
  return items
}
