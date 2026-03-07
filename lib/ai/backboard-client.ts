/**
 * Backboard AI client wrapper for structured generation.
 *
 * Provides a thin layer over the Backboard SDK for creating assistants,
 * threads, and sending messages with structured (non-streaming) responses.
 * Used by all agent runners in the pipeline.
 */

import { BackboardClient } from "backboard-sdk"

let _client: BackboardClient | null = null

/**
 * Singleton Backboard client. Requires BACKBOARD_API_KEY env var.
 */
export function getBackboardClient(): BackboardClient {
  if (!_client) {
    const apiKey = process.env.BACKBOARD_API_KEY
    if (!apiKey) {
      throw new Error("BACKBOARD_API_KEY environment variable is not set")
    }
    _client = new BackboardClient({ apiKey })
  }
  return _client
}

export interface AgentAssistantConfig {
  name: string
  systemPrompt: string
}

export interface AgentGenerationOptions {
  /** Content/prompt to send to the assistant */
  content: string
  /** LLM provider to use (defaults to "openai") */
  llmProvider?: string
  /** Model name to use (defaults to "gpt-4o") */
  modelName?: string
}

export interface AgentGenerationResult {
  /** Raw text response from the assistant */
  content: string
  /** Backboard assistant ID (for reuse) */
  assistantId: string
  /** Backboard thread ID (for context tracking) */
  threadId: string
}

/**
 * Create an assistant, a thread, send a message, and return the full response.
 * Used for structured (non-streaming) agent generation steps.
 */
export async function generateStructured(
  config: AgentAssistantConfig,
  options: AgentGenerationOptions
): Promise<AgentGenerationResult> {
  const client = getBackboardClient()

  // Create a dedicated assistant for this agent role
  const assistant = await client.createAssistant({
    name: config.name,
    system_prompt: config.systemPrompt,
  })

  // Create a thread for this generation
  const thread = await client.createThread(assistant.assistantId)

  // Send the message and get a non-streaming response.
  // With stream: false, addMessage returns a MessageResponse with a .content string property.
  const response = await client.addMessage(thread.threadId, {
    content: options.content,
    llmProvider: options.llmProvider ?? "openai",
    modelName: options.modelName ?? "gpt-4o",
    stream: false,
  })

  // The SDK returns a MessageResponse object with .content as the assistant's text reply.
  // We need to handle multiple possible shapes defensively:
  // 1. MessageResponse object with .content string (expected)
  // 2. Plain string (unlikely but safe)
  // 3. Object without .content (unexpected — log and try toString)
  let content: string

  if (typeof response === "string") {
    content = response
  } else if (
    typeof response === "object" &&
    response !== null &&
    "content" in response &&
    typeof (response as unknown as Record<string, unknown>).content === "string"
  ) {
    content = (response as unknown as Record<string, unknown>).content as string
  } else if (
    typeof response === "object" &&
    response !== null &&
    typeof (response as { toString?: () => string }).toString === "function"
  ) {
    // MessageResponse has a custom toString() that returns the content
    const str = (response as { toString: () => string }).toString()
    // Avoid "[object Object]"
    if (str && str !== "[object Object]") {
      content = str
    } else {
      // Last resort: try to stringify and log for debugging
      const serialized = JSON.stringify(response, null, 2)
      console.error(
        "[BackboardClient] Unexpected response shape:",
        serialized.slice(0, 500)
      )
      content = serialized
    }
  } else {
    const serialized = String(response)
    console.error(
      "[BackboardClient] Unexpected response type:",
      typeof response,
      serialized.slice(0, 500)
    )
    content = serialized
  }

  console.log(
    `[BackboardClient] Agent "${config.name}" response (${content.length} chars):`,
    content.slice(0, 200) + (content.length > 200 ? "..." : "")
  )

  return {
    content,
    assistantId: assistant.assistantId,
    threadId: thread.threadId,
  }
}

/**
 * Extract JSON from a response that may contain markdown code fences,
 * preamble text, or other wrapping around the JSON payload.
 */
export function extractJson(text: string): string {
  // Try to extract from ```json ... ``` fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Try to find raw JSON object or array (greedy — outermost braces/brackets)
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // Return the original text as-is and let JSON.parse surface the error
  return text.trim()
}
