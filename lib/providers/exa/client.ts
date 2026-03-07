/**
 * Exa search provider — Uses the Exa API for discovering relevant
 * online discussions across the web.
 */

import Exa from "exa-js"
import type {
  DiscussionProvider,
  DiscussionSearchOptions,
  DiscussionSearchResult,
} from "../types"

let _exa: Exa | null = null

function getExaClient(): Exa {
  if (!_exa) {
    const apiKey = process.env.EXA_API_KEY
    if (!apiKey) {
      throw new Error("EXA_API_KEY environment variable is not set")
    }
    _exa = new Exa(apiKey)
  }
  return _exa
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
  // Reddit: extract subreddit
  const redditMatch = url.match(/reddit\.com\/r\/([^/]+)/)
  if (redditMatch) return redditMatch[1]

  // HN: just "hackernews"
  if (url.includes("news.ycombinator.com")) return "hackernews"

  return undefined
}

export class ExaDiscussionProvider implements DiscussionProvider {
  name = "exa"

  async search(
    options: DiscussionSearchOptions
  ): Promise<DiscussionSearchResult[]> {
    const exa = getExaClient()

    const results = await exa.searchAndContents(options.query, {
      numResults: options.numResults ?? 10,
      type: "auto",
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains,
      startPublishedDate: options.startDate,
      highlights: {
        highlightsPerUrl: 3,
        numSentences: 3,
      },
      text: { maxCharacters: 2000 },
    })

    return results.results.map(
      (r): DiscussionSearchResult => ({
        url: r.url,
        title: r.title ?? "",
        snippet:
          (r.highlights && r.highlights.length > 0
            ? r.highlights.join(" ... ")
            : undefined) ?? r.text?.slice(0, 500),
        publishedDate: r.publishedDate ?? undefined,
        author: r.author ?? undefined,
        sourceType: inferSourceType(r.url),
        community: inferCommunity(r.url),
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
  const allResults: DiscussionSearchResult[] = []
  const seenUrls = new Set<string>()

  for (const query of queries) {
    try {
      const results = await provider.search({
        query,
        numResults: options?.numResultsPerQuery ?? 5,
        includeDomains: options?.includeDomains,
      })

      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url)
          allResults.push(result)
        }
      }
    } catch (err) {
      console.error(`Exa search failed for query "${query}":`, err)
      // Continue with other queries
    }
  }

  return {
    results: allResults,
    queriesUsed: queries,
  }
}
