/**
 * DiscussionProvider — Abstraction layer for online discussion sources.
 *
 * Defines the common interface that all discussion source providers
 * (Exa, Reddit, HackerNews, etc.) implement.
 */

export interface DiscussionSearchResult {
  url: string
  title: string
  snippet?: string
  publishedDate?: string
  author?: string
  score?: number
  sourceType: "reddit" | "hackernews" | "forum" | "review_site" | "other"
  community?: string
}

export interface DiscussionSearchOptions {
  query: string
  numResults?: number
  /** Only search within these domains */
  includeDomains?: string[]
  /** Exclude results from these domains */
  excludeDomains?: string[]
  /** ISO date string — results published after this date */
  startDate?: string
}

export interface DiscussionProvider {
  name: string
  search(options: DiscussionSearchOptions): Promise<DiscussionSearchResult[]>
}

/**
 * Raw page content fetched by a browser extraction provider.
 */
export interface FetchedPage {
  url: string
  content: string
  /** Whether this was a successful fetch */
  success: boolean
  /** Error message if fetch failed */
  error?: string
}

export interface BrowserExtractionProvider {
  name: string
  fetchPages(urls: string[]): Promise<FetchedPage[]>
  fetchPage(url: string): Promise<FetchedPage>
}
