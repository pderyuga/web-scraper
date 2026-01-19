import { argv } from "node:process";
import { crawlSiteAsync } from "./crawl";
import { writeCSVReport } from "./report";

const DEFAULT_MAX_CONCURRENCY = 5;
const DEFAULT_MAX_PAGES = 20;

async function main() {
  if (argv.length < 3) {
    console.log("not enough arguments provided");
    console.log(
      "usage: npm run start <URL> <maxConcurrency> (optional, default=5) <maxPages> (optional, default=20)",
    );
    process.exit(1);
  }
  if (argv.length > 5) {
    console.log("too many arguments provided");
    process.exit(1);
  }

  const baseURL = argv[2];
  const maxConcurrency = Number(argv[3]) ?? DEFAULT_MAX_CONCURRENCY;
  const maxPages = Number(argv[4]) ?? DEFAULT_MAX_PAGES;

  console.log(
    `starting crawl of: ${baseURL} (concurrency=${maxConcurrency}, maxPages=${maxPages})...`,
  );

  const pages = await crawlSiteAsync(baseURL, maxConcurrency, maxPages);

  writeCSVReport(pages);

  process.exit(0);
}

main();
