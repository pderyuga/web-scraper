import { describe, it, expect } from "vitest";
import {
  normalizeURL,
  getH1FromHTML,
  getFirstParagraphFromHTML,
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
