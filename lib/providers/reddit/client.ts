/**
 * Reddit discussion provider — Uses Exa search constrained to Reddit domains
 * so Reddit results stay inside the same Exa-based discovery flow.
 */

import type {
  DiscussionProvider,
  DiscussionSearchOptions,
  DiscussionSearchResult,
} from "../types"
import { searchDiscussions } from "../exa"

/**
 * Extract subreddit from a Reddit URL.
 */
function extractSubreddit(url: string): string | undefined {
  const match = url.match(/reddit\.com\/r\/([^/]+)/)
  return match ? match[1] : undefined
}

export class RedditDiscussionProvider implements DiscussionProvider {
  name = "reddit"

  /**
   * Search for Reddit discussions using Exa, filtered to Reddit domains.
   */
  async search(
    options: DiscussionSearchOptions
  ): Promise<DiscussionSearchResult[]> {
    const { results } = await searchDiscussions([options.query], {
      numResultsPerQuery: options.numResults ?? 10,
      includeDomains: ["reddit.com"],
    })

    return results.map((r) => ({
      ...r,
      sourceType: "reddit" as const,
      community: extractSubreddit(r.url),
    }))
  }
}
