import { argv } from "node:process";
import { crawlSiteAsync } from "./crawl";

async function main() {
  if (argv.length !== 3) {
    console.error("Usage: npm run start <website url>");
    process.exit(1);
  }

  const baseURL = argv[2];

  console.log(`Starting crawl of ${baseURL}...`);

  const pages = await crawlSiteAsync(baseURL);

  console.log(pages);

  process.exit(0);
}

main();
