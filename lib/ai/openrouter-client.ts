/**
 * OpenRouter AI client via Vercel AI SDK.
 *
 * Provides the model factory used by all agents and chat routes.
 * Default model: openai/gpt-4o via OpenRouter.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const DEFAULT_MODEL = "openai/gpt-4o" as const

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
 * Defaults to openai/gpt-4o.
 */
export function getModel(modelId: string = DEFAULT_MODEL) {
  return getProvider().chat(modelId)
}
