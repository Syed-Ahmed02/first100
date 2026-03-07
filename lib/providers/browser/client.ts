/**
 * Browserbase + Puppeteer browser extraction provider.
 *
 * Uses Browserbase for cloud-hosted headless browser sessions,
 * connecting via Puppeteer for page extraction.
 * Falls back to direct fetch for simple pages.
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core"
import Browserbase from "@browserbasehq/sdk"
import type { BrowserExtractionProvider, FetchedPage } from "../types"

function getBrowserbaseClient(): Browserbase {
  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) {
    throw new Error("BROWSERBASE_API_KEY environment variable is not set")
  }
  return new Browserbase({ apiKey })
}

/**
 * Extract text content from a page, stripping navigation, ads, etc.
 */
async function extractPageContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Remove script, style, nav, footer, header, and ad elements
    const removeSelectors = [
      "script",
      "style",
      "nav",
      "footer",
      "header",
      "aside",
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      ".ad",
      ".ads",
      ".advertisement",
      ".sidebar",
      "#sidebar",
      ".nav",
      "#nav",
      ".cookie-banner",
      ".popup",
    ]

    for (const selector of removeSelectors) {
      document.querySelectorAll(selector).forEach((el) => el.remove())
    }

    // Get the main content area, or fall back to body
    const main =
      document.querySelector("main") ??
      document.querySelector('[role="main"]') ??
      document.querySelector("article") ??
      document.querySelector(".content") ??
      document.querySelector("#content") ??
      document.body

    // Get text, cleaning up excessive whitespace
    const text = main?.innerText ?? document.body.innerText ?? ""
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  })
}

export class BrowserbasePuppeteerProvider implements BrowserExtractionProvider {
  name = "browserbase-puppeteer"

  async fetchPage(url: string): Promise<FetchedPage> {
    const pages = await this.fetchPages([url])
    return pages[0]
  }

  async fetchPages(urls: string[]): Promise<FetchedPage[]> {
    const bb = getBrowserbaseClient()
    const results: FetchedPage[] = []

    // Process URLs in batches to avoid overwhelming resources
    const batchSize = 3
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(
        batch.map((url) => this.fetchSinglePage(bb, url))
      )

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === "fulfilled") {
          results.push(result.value)
        } else {
          results.push({
            url: batch[j],
            content: "",
            success: false,
            error: result.reason?.message ?? "Unknown error",
          })
        }
      }
    }

    return results
  }

  private async fetchSinglePage(
    bb: Browserbase,
    url: string
  ): Promise<FetchedPage> {
    let browser: Browser | null = null

    try {
      // Create a new Browserbase session
      const session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      })

      // Connect Puppeteer to the Browserbase session
      browser = await puppeteer.connect({
        browserWSEndpoint: session.connectUrl,
      })

      const pages = await browser.pages()
      const page = pages[0] ?? (await browser.newPage())

      // Navigate to the URL with a timeout
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })

      // Wait a bit for dynamic content to load
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
        // Ignore timeout — some pages never fully stop network activity
      })

      // Extract the content
      const content = await extractPageContent(page)

      await page.close()
      await browser.close()

      return {
        url,
        content: content.slice(0, 10000), // Cap at 10k chars
        success: true,
      }
    } catch (error) {
      if (browser) {
        try {
          await browser.close()
        } catch {
          // Ignore cleanup errors
        }
      }

      return {
        url,
        content: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

/**
 * Convenience function: fetch multiple pages using Browserbase + Puppeteer.
 */
export async function fetchPagesWithBrowser(
  urls: string[]
): Promise<FetchedPage[]> {
  const provider = new BrowserbasePuppeteerProvider()
  return provider.fetchPages(urls)
}

/**
 * Convenience function: fetch a single page.
 */
export async function fetchPageWithBrowser(url: string): Promise<FetchedPage> {
  const provider = new BrowserbasePuppeteerProvider()
  return provider.fetchPage(url)
}
