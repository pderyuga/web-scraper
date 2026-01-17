import { describe, it, expect } from "vitest";
import { normalizeURL } from "./crawl";

describe("add function", () => {
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
