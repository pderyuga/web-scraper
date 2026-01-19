import { argv } from "node:process";
import { crawlSiteAsync } from "./crawl";
import { writeCSVReport } from "./report";

async function main() {
  if (argv.length < 3 || argv.length > 5) {
    console.error("usage: npm run start <URL> <maxConcurrency> <maxPages>");
    process.exit(1);
  }

  const baseURL = argv[2];
  const maxConcurrency = Number(argv[3]) ?? 5;
  const maxPages = Number(argv[4]) ?? 20;

  console.log(`Starting crawl of ${baseURL}...`);

  const pages = await crawlSiteAsync(baseURL, maxConcurrency, maxPages);

  writeCSVReport(pages);

  process.exit(0);
}

main();
