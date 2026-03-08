/**
 * OpenRouter AI client via Vercel AI SDK.
 *
 * Provides the model factory used by all agents and chat routes.
 * Default model: google/gemini-3-pro-preview via OpenRouter.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const DEFAULT_MODEL = "google/gemini-3-pro-preview" as const

let _provider: ReturnType<typeof createOpenRouter> | null = null

/**
 * Singleton OpenRouter provider. Reads OPENROUTER_API_KEY from env.
 */
function getProvider() {
  if (!_provider) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set")
    }
    _provider = createOpenRouter({ apiKey })
  }
  return _provider
}

/**
 * Get a language model instance for the given model ID.
 * Defaults to google/gemini-3-pro-preview.
 */
export function getModel(modelId: string = DEFAULT_MODEL) {
  return getProvider().chat(modelId)
}
