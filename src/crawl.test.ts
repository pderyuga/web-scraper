import { describe, it, expect } from "vitest";
import {
  normalizeURL,
  getH1FromHTML,
  getFirstParagraphFromHTML,
  getURLsFromHTML,
  getImagesFromHTML,
  extractPageData,
} from "./crawl";

describe("normalizeURL", () => {
  it("should normalize basic urls", () => {
    const expected = "blog.boot.dev/path";
    expect(normalizeURL("https://blog.boot.dev/path/")).toBe(expected);
    expect(normalizeURL("https://blog.boot.dev/path")).toBe(expected);
    expect(normalizeURL("http://blog.boot.dev/path/")).toBe(expected);
    expect(normalizeURL("https://blog.boot.dev/path")).toBe(expected);
  });

  it("should normalize urls with wwww", () => {
    const expected = "boot.dev/path";
    expect(normalizeURL("https://www.boot.dev/path/")).toBe(expected);
  });

  it("should normalize urls with search params and hash", () => {
    const expected = "example.com/page?a=1&b=2";
    expect(normalizeURL("https://example.com/page?b=2&a=1#section-hash")).toBe(
      expected,
    );
  });

  it("should normalize urls with non-http(s) protocol", () => {
    expect(normalizeURL("ftp://example.com/pub/file.tar.gz")).toBe(
      "example.com/pub/file.tar.gz",
    );
  });

  it("should normalize urls with authentication", () => {
    expect(normalizeURL("ftp://user:password@example.com/file.txt")).toBe(
      "example.com/file.txt",
    );
  });

  it("should handle data urls", () => {
    expect(normalizeURL("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==")).toBe(
      "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
    );
  });
});

describe("getH1FromHTML", () => {
  it("returns first h1 heading from html", () => {
    const inputBody = `<html><body><h1>Test Title</h1></body></html>`;
    const actual = getH1FromHTML(inputBody);
    const expected = "Test Title";
    expect(actual).toEqual(expected);
  });

  it("returns first h1 heading if multiple h1 headings exist", () => {
    const inputBody = `<html><body><h1>Test Title 1</h1><h1>Test Title 2</h1></body></html>`;
    const actual = getH1FromHTML(inputBody);
    const expected = "Test Title 1";
    expect(actual).toEqual(expected);
  });

  it("returns empty string if no heading is found", () => {
    const inputBody = `<html><body><p>This is a paragraph</p></body></html>`;
    const actual = getH1FromHTML(inputBody);
    const expected = "";
    expect(actual).toEqual(expected);
  });
});

describe("getFirstParagraphFromHTML", () => {
  it("returns first paragraph inside main, if it exists", () => {
    const inputBody = `
    <html><body>
      <p>Outside paragraph.</p>
      <main>
        <p>Main paragraph.</p>
      </main>
    </body></html>
  `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "Main paragraph.";
    expect(actual).toEqual(expected);
  });

  it("falls back to first outside paragraph", () => {
    const inputBody = `
    <html><body>
      <p>Outside paragraph 1.</p>
      <p>Outside paragraph 2.</p>
    </body></html>
  `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "Outside paragraph 1.";
    expect(actual).toEqual(expected);
  });

  it("returns empty string if no parahraph is found", () => {
    const inputBody = `<html><body><h1>Test Title</h1></body></html>`;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "";
    expect(actual).toEqual(expected);
  });
});

describe("getURLsFromHTML", () => {
  it("should return absolute urls", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><a href="https://blog.boot.dev"><span>Boot.dev</span></a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://blog.boot.dev/"];

    expect(actual).toEqual(expected);
  });

  it("should return relative urls as absolute urls", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://blog.boot.dev/path/one"];

    expect(actual).toEqual(expected);
  });

  it("should return empty array if no urls found", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><p>I am not a link</p></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected: string[] = [];

    expect(actual).toEqual(expected);
  });

  it("should handle anchor tags with no href attribute", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><a>Link without href</a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected: string[] = [];

    expect(actual).toEqual(expected);
  });
});

describe("getImagesFromHTML", () => {
  it("should return absolute image urls", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><img src="https://blog.boot.dev/logo.png" alt="Logo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = ["https://blog.boot.dev/logo.png"];

    expect(actual).toEqual(expected);
  });

  it("should return absolute image urls given relative image urls", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><img src="/logo.png" alt="Logo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = ["https://blog.boot.dev/logo.png"];

    expect(actual).toEqual(expected);
  });

  it("should return all image urls if multiple urls found", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody =
      `<html><body>` +
      `<img src="/logo.png" alt="Logo">` +
      `<img src="https://cdn.boot.dev/banner.jpg">` +
      `</body></html>`;
    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = [
      "https://blog.boot.dev/logo.png",
      "https://cdn.boot.dev/banner.jpg",
    ];
    expect(actual).toEqual(expected);
  });

  it("should handle image tags with no src attribute", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `<html><body><img alt="Image without src"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected: string[] = [];

    expect(actual).toEqual(expected);
  });
});

describe("extractPageData", () => {
  it("should extract basic page data", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `
    <html><body>
      <h1>Test Title</h1>
      <p>This is the first paragraph.</p>
      <a href="/link1">Link 1</a>
      <img src="/image1.jpg" alt="Image 1">
    </body></html>
  `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://blog.boot.dev",
      h1: "Test Title",
      firstParagraph: "This is the first paragraph.",
      outgoingLinks: ["https://blog.boot.dev/link1"],
      imageURLs: ["https://blog.boot.dev/image1.jpg"],
    };

    expect(actual).toEqual(expected);
  });

  it("should handle empty HTML with no extractable content", () => {
    const inputURL = "https://example.com";
    const inputBody = `<html><body></body></html>`;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://example.com",
      h1: "",
      firstParagraph: "",
      outgoingLinks: [],
      imageURLs: [],
    };

    expect(actual).toEqual(expected);
  });

  it("should handle mixed valid and invalid elements", () => {
    const inputURL = "https://blog.boot.dev";
    const inputBody = `
    <html><body>
      <h1>Blog Post</h1>
      <p>Introduction text.</p>
      <a href="/valid-link">Valid Link</a>
      <a>Invalid Link without href</a>
      <img src="/valid-image.png" alt="Valid">
      <img alt="Invalid without src">
    </body></html>
  `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://blog.boot.dev",
      h1: "Blog Post",
      firstParagraph: "Introduction text.",
      outgoingLinks: ["https://blog.boot.dev/valid-link"],
      imageURLs: ["https://blog.boot.dev/valid-image.png"],
    };

    expect(actual).toEqual(expected);
  });

  it("should handle page with only some content types", () => {
    const inputURL = "https://example.com/page";
    const inputBody = `
    <html><body>
      <h1>Only Title and Links</h1>
      <a href="/link1">Link 1</a>
      <a href="/link2">Link 2</a>
    </body></html>
  `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://example.com/page",
      h1: "Only Title and Links",
      firstParagraph: "",
      outgoingLinks: [
        "https://example.com/link1",
        "https://example.com/link2",
      ],
      imageURLs: [],
    };

    expect(actual).toEqual(expected);
  });
});
