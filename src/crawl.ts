import { JSDOM } from "jsdom";

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

export async function getHTML(url: string) {
  console.log(`Crawling ${url}...`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "BootCrawler/1.0",
      },
    });

    // If the HTTP status code is an error-level code (400+), print an error and return
    if (response.status >= 400) {
      console.error(
        `Got HTTP error: ${response.status} ${response.statusText}`,
      );
      return;
    }

    // If the response content-type header is not text/html print an error and return
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.error(`Got non-HTML response: ${contentType}`);
      return;
    }

    const htmlText = await response.text();

    // Extract just the body content
    const dom = new JSDOM(htmlText);
    const body = dom.window.document.body;

    return body ? body.outerHTML : htmlText;
  } catch (error) {
    console.error("Fetch failed:", (error as Error).message);
    return;
  }
}

export async function crawlPage(
  baseURL: string, // root URL of the website we're crawling
  currentURL: string = baseURL, // current URL we are crawling
  pages: Record<string, number> = {}, // object used to keep track of the number of times we've seen each internal link
) {
  // Make sure the currentURL is on the same domain as the baseURL
  const baseUrlObj = new URL(baseURL);
  const currentUrlObj = new URL(currentURL);
  if (baseUrlObj.hostname !== currentUrlObj.hostname) {
    // If not, just return the current pages
    return pages;
  }

  // Get normalized version of currentURL
  const normalizedCurrentURL = normalizeURL(currentURL);

  // If the pages object already has an entry for the normalized version of the current URL
  if (normalizedCurrentURL in pages) {
    // just increment the count and return the current pages
    pages[normalizedCurrentURL]++;
    return pages;
  }
  // Otherwise, add an entry to the pages object for the normalized version of the current URL, and set the count to 1
  pages[normalizedCurrentURL] = 1;

  // Get the HTML from the current URL and print it
  const html = await getHTML(currentURL);

  if (!html) {
    console.error(`Could not fetch html from ${currentURL}`);
    return pages;
  }

  console.log(html);

  // get all the URLs from the response body HTML
  const allUrls = getURLsFromHTML(html, baseURL);

  // Recursively crawl each URL you found on the page and update the pages to keep an aggregate count
  for (const url of allUrls) {
    pages = await crawlPage(baseURL, url, pages);
  }

  return pages;
}
