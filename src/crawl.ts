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
