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

  // Send the message and get a non-streaming response
  const response = await client.addMessage(thread.threadId, {
    content: options.content,
    llmProvider: options.llmProvider ?? "openai",
    modelName: options.modelName ?? "gpt-4o",
    stream: false,
  })

  // Extract content from the response
  const rawResponse = response as unknown
  const content =
    typeof rawResponse === "object" &&
    rawResponse !== null &&
    "content" in rawResponse
      ? String((rawResponse as { content: unknown }).content)
      : String(rawResponse)

  return {
    content,
    assistantId: assistant.assistantId,
    threadId: thread.threadId,
  }
}

/**
 * Extract JSON from a response that may contain markdown code fences.
 */
export function extractJson(text: string): string {
  // Try to extract from ```json ... ``` fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Try to find raw JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // Return the original text as-is
  return text.trim()
}
