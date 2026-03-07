/**
 * Reddit scraping provider — Public Reddit web scraping without using the Reddit API.
 *
 * Uses Browserbase + Puppeteer to fetch Reddit pages (old.reddit.com for simpler DOM),
 * then extracts posts and comments from the page content.
 */

import { fetchPagesWithBrowser } from "../browser"
import type {
  DiscussionProvider,
  DiscussionSearchOptions,
  DiscussionSearchResult,
} from "../types"
import { searchDiscussions } from "../exa"

/**
 * Convert a reddit.com URL to old.reddit.com for easier scraping.
 */
function toOldReddit(url: string): string {
  return url
    .replace("https://www.reddit.com", "https://old.reddit.com")
    .replace("https://reddit.com", "https://old.reddit.com")
}

/**
 * Extract subreddit from a Reddit URL.
 */
function extractSubreddit(url: string): string | undefined {
  const match = url.match(/reddit\.com\/r\/([^/]+)/)
  return match ? match[1] : undefined
}

/**
 * Extract post ID from a Reddit URL.
 */
function extractPostId(url: string): string | undefined {
  const match = url.match(/\/comments\/([a-z0-9]+)/)
  return match ? match[1] : undefined
}

export class RedditScrapingProvider implements DiscussionProvider {
  name = "reddit"

  /**
   * Search for Reddit discussions using Exa (since we can't use Reddit's API),
   * filtered to reddit.com domains.
   */
  async search(
    options: DiscussionSearchOptions
  ): Promise<DiscussionSearchResult[]> {
    // Use Exa to find Reddit posts
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

/**
 * Scrape Reddit posts by their URLs using Browserbase + Puppeteer.
 * Returns the text content of each page.
 */
export async function scrapeRedditPages(urls: string[]): Promise<
  Array<{
    url: string
    content: string
    postId?: string
    subreddit?: string
    success: boolean
    error?: string
  }>
> {
  // Convert to old.reddit.com for simpler DOM
  const oldRedditUrls = urls.map(toOldReddit)

  const fetchedPages = await fetchPagesWithBrowser(oldRedditUrls)

  return fetchedPages.map((page, i) => ({
    url: urls[i], // Return original URL
    content: page.content,
    postId: extractPostId(urls[i]),
    subreddit: extractSubreddit(urls[i]),
    success: page.success,
    error: page.error,
  }))
}
