/**
 * Exa discussion provider — Uses Exa's AI SDK tool to search
 * discussion-heavy websites and return content-rich results that can be
 * passed directly into evidence extraction.
 */

import { webSearch, type ExaSearchConfig } from "@exalabs/ai-sdk"
import type {
  DiscussionProvider,
  DiscussionSearchOptions,
  DiscussionSearchResult,
} from "../types"

export const DISCUSSION_SITE_ALLOWLIST = [
  "reddit.com",
  "news.ycombinator.com",
  "producthunt.com",
  "indiehackers.com",
  "g2.com",
  "capterra.com",
  "trustradius.com",
  "quora.com",
  "stackoverflow.com",
] as const

interface ExaSearchApiResult {
  url: string
  title?: string | null
  text?: string | null
  summary?: string | null
  highlights?: string[] | null
  publishedDate?: string | null
  author?: string | null
}

interface ExaSearchApiResponse {
  results?: ExaSearchApiResult[]
}

type ExaSearchTool = {
  execute: (input: { query: string }) => Promise<ExaSearchApiResponse>
}

function getDiscussionSearchConfig(
  options: DiscussionSearchOptions
): ExaSearchConfig {
  return {
    type: "auto",
    numResults: options.numResults ?? 10,
    includeDomains:
      options.includeDomains && options.includeDomains.length > 0
        ? options.includeDomains
        : [...DISCUSSION_SITE_ALLOWLIST],
    excludeDomains: options.excludeDomains,
    startPublishedDate: options.startDate,
    contents: {
      text: {
        maxCharacters: 4000,
        includeHtmlTags: false,
      },
      highlights: {
        query:
          "Customer complaints, frustrations, pain points, unmet needs, and feature requests",
        highlightsPerUrl: 3,
        numSentences: 3,
      },
      summary: {
        query: "Summarize the main complaint or unmet need discussed here.",
      },
      livecrawl: "preferred",
      livecrawlTimeout: 10000,
    },
  }
}

async function runExaSearch(
  query: string,
  options: DiscussionSearchOptions
): Promise<ExaSearchApiResult[]> {
  const tool = webSearch(getDiscussionSearchConfig(options)) as unknown as ExaSearchTool

  if (typeof tool.execute !== "function") {
    throw new Error("Exa AI SDK webSearch tool does not expose an execute function")
  }

  const response = await tool.execute({ query })
  return Array.isArray(response.results) ? response.results : []
}

function getSnippet(result: ExaSearchApiResult): string | undefined {
  if (result.highlights && result.highlights.length > 0) {
    return result.highlights.join(" ... ")
  }

  if (result.summary) {
    return result.summary
  }

  if (result.text) {
    return result.text.slice(0, 500)
  }

  return undefined
}

/**
 * Detect source type from URL.
 */
function inferSourceType(
  url: string
): "reddit" | "hackernews" | "forum" | "review_site" | "other" {
  const lower = url.toLowerCase()
  if (lower.includes("reddit.com")) return "reddit"
  if (lower.includes("news.ycombinator.com")) return "hackernews"
  if (
    lower.includes("g2.com") ||
    lower.includes("capterra.com") ||
    lower.includes("trustradius.com")
  )
    return "review_site"
  if (
    lower.includes("producthunt.com") ||
    lower.includes("indiehackers.com") ||
    lower.includes("quora.com") ||
    lower.includes("stackoverflow.com") ||
    lower.includes("forum") ||
    lower.includes("community") ||
    lower.includes("discourse")
  )
    return "forum"
  return "other"
}

/**
 * Extract community/subreddit from URL.
 */
function inferCommunity(url: string): string | undefined {
  const redditMatch = url.match(/reddit\.com\/r\/([^/]+)/)
  if (redditMatch) return redditMatch[1]

  if (url.includes("news.ycombinator.com")) return "hackernews"

  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return undefined
  }
}

export class ExaDiscussionProvider implements DiscussionProvider {
  name = "exa"

  async search(
    options: DiscussionSearchOptions
  ): Promise<DiscussionSearchResult[]> {
    const results = await runExaSearch(options.query, options)

    return results.map(
      (result): DiscussionSearchResult => ({
        url: result.url,
        title: result.title ?? "",
        snippet: getSnippet(result),
        text: result.text ?? undefined,
        summary: result.summary ?? undefined,
        highlights: result.highlights ?? undefined,
        matchedQuery: options.query,
        publishedDate: result.publishedDate ?? undefined,
        author: result.author ?? undefined,
        sourceType: inferSourceType(result.url),
        community: inferCommunity(result.url),
      })
    )
  }
}

/**
 * Search for discussions specifically about complaints and pain points.
 */
export async function searchDiscussions(
  queries: string[],
  options?: {
    numResultsPerQuery?: number
    includeDomains?: string[]
  }
): Promise<{
  results: DiscussionSearchResult[]
  queriesUsed: string[]
}> {
  const provider = new ExaDiscussionProvider()
  const resultsByUrl = new Map<string, DiscussionSearchResult>()

  for (const query of queries) {
    try {
      const results = await provider.search({
        query,
        numResults: options?.numResultsPerQuery ?? 5,
        includeDomains: options?.includeDomains,
      })

      for (const result of results) {
        const existing = resultsByUrl.get(result.url)
        resultsByUrl.set(result.url, {
          ...existing,
          ...result,
          snippet: existing?.snippet ?? result.snippet,
          text: existing?.text ?? result.text,
          summary: existing?.summary ?? result.summary,
          highlights: existing?.highlights ?? result.highlights,
          matchedQuery: existing?.matchedQuery ?? result.matchedQuery,
        })
      }
    } catch (err) {
      console.error(`Exa search failed for query "${query}":`, err)
      // Continue with other queries
    }
  }

  return {
    results: Array.from(resultsByUrl.values()),
    queriesUsed: queries,
  }
}
