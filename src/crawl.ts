import { JSDOM } from "jsdom";
import pLimit, { type LimitFunction } from "p-limit";

export function normalizeURL(url: string): string {
  const urlObj = new URL(url);

  // Sort search params alphabetically
  urlObj.searchParams.sort();
  // Set protocol to http (we will remove this later)
  urlObj.protocol = "http";
  // Strip "www" from hostname, if it exists
  urlObj.hostname = urlObj.hostname.replace(/^www\./, "");

  // Strip hash
  urlObj.hash = "";

  // Strip authentication
  urlObj.username = "";
  urlObj.password = "";

  let urlString = urlObj.href;

  // Remove trailing slash
  urlString = urlString.replace(/\/$/, "");

  // Remove "http://" prefix
  urlString = urlString.replace(/^(http:)?\/\//, "");

  return urlString;
}

export function getH1FromHTML(html: string): string {
  const dom = new JSDOM(html);
  const h1 = dom.window.document.querySelector("h1");
  return h1?.textContent.trim() ?? "";
}

export function getFirstParagraphFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const main = document.querySelector("main");
  const paragraph = main?.querySelector("p") ?? document.querySelector("p");
  const firstParagraph = paragraph?.textContent.trim() ?? "";
  return firstParagraph;
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  const links: string[] = [];
  try {
    const dom = new JSDOM(html, { url: baseURL });
    const document = dom.window.document;
    const linkElements = document.querySelectorAll("a");

    linkElements.forEach((link) => {
      if (link.href) links.push(link.href);
    });
  } catch (err) {
    console.error("failed to parse HTML", err);
  }

  return links;
}

export function getImagesFromHTML(html: string, baseURL: string): string[] {
  const images: string[] = [];
  try {
    const dom = new JSDOM(html, { url: baseURL });
    const document = dom.window.document;
    const imageElements = document.querySelectorAll("img");

    imageElements.forEach((img) => {
      if (img.src) images.push(img.src);
    });
  } catch (err) {
    console.error("failed to parse HTML", err);
  }

  return images;
}

export type ExtractedPageData = {
  url: string;
  h1: string;
  firstParagraph: string;
  outgoingLinks: string[];
  imageURLs: string[];
};

export function extractPageData(
  html: string,
  pageURL: string,
): ExtractedPageData {
  const h1 = getH1FromHTML(html);
  const firstParagraph = getFirstParagraphFromHTML(html);
  const outgoingLinks = getURLsFromHTML(html, pageURL);
  const imageURLs = getImagesFromHTML(html, pageURL);

  return {
    url: pageURL,
    h1,
    firstParagraph,
    outgoingLinks,
    imageURLs,
  };
}

class ConcurrentCrawler {
  private baseURL: string;
  private pages: Record<string, ExtractedPageData>;
  private limit: LimitFunction;

  private maxPages: number;
  private shouldStop = false;
  private allTasks = new Set<Promise<void>>();
  private abortController = new AbortController();

  private visited = new Set<string>();

  constructor(baseURL: string, maxConcurrency: number, maxPages: number) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = Math.max(1, maxPages);
  }

  private addPageVisit(normalizedURL: string): boolean {
    // Check if shouldStop is already true or the page has already been visited
    if (this.shouldStop || this.visited.has(normalizedURL)) {
      // return false immediately if so
      return false;
    }

    // Check if the number of unique pages visited has reached maxPages
    if (this.visited.size >= this.maxPages) {
      // Set shouldStop to true
      this.shouldStop = true;
      // Print message
      console.log("Reached maximum number of pages to crawl.");
      // Return false - don't abort in-flight requests, let them complete
      return false;
    }

    // Otherwise, keep track of page visit and return true
    this.visited.add(normalizedURL);

    return true;
  }

  private async getHTML(currentURL: string): Promise<string> {
    console.log(`Crawling ${currentURL}...`);

    return await this.limit(async () => {
      const response = await fetch(currentURL, {
        method: "GET",
        headers: {
          "User-Agent": "BootCrawler/1.0",
        },
        signal: this.abortController.signal,
      });

      if (response.status >= 400) {
        throw new Error(
          `Got HTTP error: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        throw new Error(`Got non-HTML response: ${contentType}`);
      }

      return response.text();
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    // check shouldStop at the very beginning
    if (this.shouldStop) {
      // return immediately if it’s true
      return;
    }

    // Make sure the currentURL is on the same domain as the baseURL
    const baseUrlObj = new URL(this.baseURL);
    const currentUrlObj = new URL(currentURL);
    if (baseUrlObj.hostname !== currentUrlObj.hostname) {
      // If not, just return
      return;
    }

    // Get normalized version of currentURL
    const normalizedURL = normalizeURL(currentURL);

    // Call addPageVisit method
    const isNewPage = this.addPageVisit(normalizedURL);
    // If it is not a new page return early
    if (!isNewPage) {
      return;
    }

    // Get the HTML from the current URL and print it
    let html = "";
    try {
      html = await this.getHTML(currentURL);
    } catch (err) {
      console.log(`${(err as Error).message}`);
      return;
    }

    // Extract page data and store it immediately after successful fetch
    const pageData = extractPageData(html, currentURL);
    this.pages[normalizedURL] = pageData;

    // Don't create child tasks if we should stop
    if (this.shouldStop) {
      return;
    }

    // get all the URLs from the response body HTML
    const nextUrls = pageData.outgoingLinks;

    // Create an array of promises for each URL by calling this.crawlPage(nextURL)
    const promises: Promise<void>[] = [];
    for (const nextUrl of nextUrls) {
      // Don't create crawl task if we should stop
      if (this.shouldStop) {
        break;
      }

      // Create the crawl task
      const task = this.crawlPage(nextUrl);

      // Add to tracking set
      this.allTasks.add(task);

      // Remove from set when complete (success or failure)
      task.finally(() => {
        this.allTasks.delete(task);
      });
      promises.push(task);
    }

    await Promise.all(promises);
  }

  async crawl(): Promise<Record<string, ExtractedPageData>> {
    const rootTask = this.crawlPage(this.baseURL);
    this.allTasks.add(rootTask);
    try {
      await rootTask;
    } finally {
      this.allTasks.delete(rootTask);
    }
    await Promise.allSettled(Array.from(this.allTasks));

    console.log(
      `Crawl complete. Collected ${Object.keys(this.pages).length} pages.`,
    );

    return this.pages;
  }
}

export async function crawlSiteAsync(
  baseURL: string,
  maxConcurrency: number = 5,
  maxPages: number = 20,
): Promise<Record<string, ExtractedPageData>> {
  const crawlerInstance = new ConcurrentCrawler(
    baseURL,
    maxConcurrency,
    maxPages,
  );
  const pages = await crawlerInstance.crawl();

  return pages;
}
