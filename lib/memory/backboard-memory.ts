/**
 * Backboard Memory API wrapper.
 *
 * Backboard is retained ONLY for its cross-thread/cross-agent memory API.
 * All LLM generation now goes through OpenRouter via Vercel AI SDK.
 */

import { BackboardClient } from "backboard-sdk"

let _client: BackboardClient | null = null

/**
 * Singleton Backboard client for memory operations only.
 */
function getClient(): BackboardClient {
  if (!_client) {
    const apiKey = process.env.BACKBOARD_API_KEY
    if (!apiKey) {
      throw new Error("BACKBOARD_API_KEY environment variable is not set")
    }
    _client = new BackboardClient({ apiKey })
  }
  return _client
}

export interface MemoryEntry {
  content: string
  metadata?: Record<string, unknown>
}

/**
 * Store a memory entry in Backboard for cross-agent retrieval.
 */
export async function storeMemory(
  threadId: string,
  entry: MemoryEntry
): Promise<void> {
  const client = getClient()
  await client.addMessage(threadId, {
    content: entry.content,
    stream: false,
    memory: "Auto",
  })
}

/**
 * Retrieve memories relevant to a query from Backboard.
 */
export async function retrieveMemories(
  threadId: string,
  query: string
): Promise<string[]> {
  const client = getClient()
  const response = await client.addMessage(threadId, {
    content: query,
    stream: false,
    memory: "Auto",
  })

  if (typeof response === "string") return [response]
  if (
    typeof response === "object" &&
    response !== null &&
    "content" in response
  ) {
    return [(response as { content: string }).content]
  }
  return []
}

export { getClient as getBackboardClient }
