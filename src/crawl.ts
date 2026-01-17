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
