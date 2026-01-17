import { argv } from "node:process";
import { getHTML } from "./crawl";

async function main() {
  if (argv.length !== 3) {
    console.error("Usage: npm run start <website url>");
    process.exit(1);
  }

  const baseURL = argv[2];

  console.log(`Starting crawl of ${baseURL}...`);
  const html = await getHTML(baseURL);
  console.log(html);
  process.exit(0);
}

main();
