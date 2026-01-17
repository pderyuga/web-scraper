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
  baseURL: string;
  pages: Record<string, number>;
  limit: LimitFunction;

  maxPages: number;
  shouldStop = false;
  allTasks = new Set<Promise<void>>();
  abortController = new AbortController();

  constructor(baseURL: string, maxConcurrency: number, maxPages: number) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = Math.max(1, maxPages);
  }

  private addPageVisit(normalizedURL: string): boolean {
    // Check if shouldStop is already true
    if (this.shouldStop) {
      // return false immediately if so
      return false;
    }

    // Check if the number of unique pages visited has reached maxPages
    if (Object.keys(this.pages).length >= this.maxPages) {
      // Set shouldStop to true
      this.shouldStop = true;
      // Print message
      console.log("Reached maximum number of pages to crawl.");
      // Call this.abortController.abort() to cancel any in-flight fetch requests
      this.abortController.abort();
      // Return false
      return false;
    }

    // If the pages object already has an entry for the normalized version of the current URL
    if (normalizedURL in this.pages) {
      // increment the count
      this.pages[normalizedURL]++;
      // return false
      return false;
    }
    // Otherwise, add an entry to the pages object for the normalized version of the current URL, and set the count to 1
    this.pages[normalizedURL] = 1;
    // return true
    return true;
  }

  private async getHTML(currentURL: string): Promise<string> {
    console.log(`Crawling ${currentURL}...`);
    return await this.limit(async () => {
      let response;
      // same fetch logic and error handling as before
      try {
        response = await fetch(currentURL, {
          method: "GET",
          headers: {
            "User-Agent": "BootCrawler/1.0",
          },
          signal: this.abortController.signal,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Request was aborted, this is expected when maxPages is reached
          console.error("Fetch aborted");
          process.exit(0);
        }
        throw new Error(`Got Network error: ${(err as Error).message}`);
      }

      if (response.status >= 400) {
        throw new Error(
          `Got HTTP error: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        throw new Error(`Got non-HTML response: ${contentType}`);
      }

      const htmlText = await response.text();

      // Extract just the body content
      const dom = new JSDOM(htmlText);
      const body = dom.window.document.body;

      return body ? body.outerHTML : htmlText;
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
    const html = await this.getHTML(currentURL);

    if (!html) {
      console.error(`Could not fetch html from ${currentURL}`);
      return;
    }

    console.log(html);

    // get all the URLs from the response body HTML
    const nextUrls = getURLsFromHTML(html, this.baseURL);

    // Create an array of promises for each URL by calling this.crawlPage(nextURL)
    const promises = nextUrls.map((nextUrl) => {
      // Create the crawl task
      const task = this.crawlPage(nextUrl);

      // Add to tracking set
      this.allTasks.add(task);

      // Remove from set when complete (success or failure)
      task.finally(() => {
        this.allTasks.delete(task);
      });

      return task;
    });

    await Promise.all(promises);
  }

  async crawl() {
    await this.crawlPage(this.baseURL);
    return this.pages;
  }
}

export async function crawlSiteAsync(
  baseURL: string,
  maxConcurrency: number = 5,
  maxPages: number = 20,
) {
  const crawlerInstance = new ConcurrentCrawler(
    baseURL,
    maxConcurrency,
    maxPages,
  );
  const pages = await crawlerInstance.crawl();

  return pages;
}
