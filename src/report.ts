import * as fs from "node:fs";
import * as path from "node:path";
import { ExtractedPageData } from "./crawl";

export const DEFAULT_REPORT_NAME = "report.csv";

// Helper function to escape CSV fields (quotes, commas, newlines) before joining with commas
function csvEscape(field: string) {
  const str = field ?? "";
  const needsQuoting = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function writeCSVReport(
  pageData: Record<string, ExtractedPageData>, // object returned by crawler
  filename = DEFAULT_REPORT_NAME, // csv file to create
): void {
  if (!pageData || Object.keys(pageData).length === 0) {
    console.log("No data to write to CSV");
    return;
  }

  const headers = [
    "page_url",
    "h1",
    "first_paragraph",
    "outgoing_link_urls",
    "image_urls",
  ];
  const csvHeader: string[] = [headers.join(",")];

  const content = [];
  for (const page of Object.values(pageData)) {
    const url = csvEscape(page.url);
    const h1 = csvEscape(page.h1);
    const firstParagraph = csvEscape(page.firstParagraph);
    const outgoingLinks = csvEscape(page.outgoingLinks.join("; "));
    const imageUrls = csvEscape(page.imageURLs.join("; "));
    const row = [url, h1, firstParagraph, outgoingLinks, imageUrls];
    const csvRow = row.join(",");
    content.push(csvRow);
  }

  const csvContent = content.join("\n");

  const fullCsvString = `${csvHeader}\n${csvContent}`;

  const outputFilePath = path.resolve(process.cwd(), filename);
  try {
    fs.writeFileSync(outputFilePath, fullCsvString, "utf-8");
    console.log(`CSV file successfully written to ${outputFilePath}`);
  } catch (err) {
    console.error("Error writing CSV file:", err);
  }
}
